var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");
var shared = require("../shared");
var async = require('async');
var fs = require('fs');

/* global logger */

// All user routes start here; blocks user actions by role_sc
router.use(middleware.isLoggedIn, function (req, res, next) {
    // logger.debug("went to all user routes");
    if (res.locals.currentUser.role == 'role_sc') {
        res.redirect("back");
    }
    else {
        // logger.debug("going to next user route");
        next('route');
    }
});

//INDEX - show all users
router.get("/", function (req, res) {

    User.find({}, { name: 1, email: 1, username: 1, role: 1, school: 1, PIN: 1 }).sort({
        name: 1
    }).exec(function (err, allUsers) {
        if (err) {
            logger.error(err);
        }
        else {
            // logger.debug("allUsers=" + allUsers);
            res.render("users/index", {
                users: allUsers
            });
        }
    });
});

//CREATE - add new user to DB
router.post("/", function (req, res) {
    // get data from form and add to users collection

    var newUser = {
        username: shared.myTrim(req.body.username.toLowerCase()),
        name: shared.myTrim(req.body.name),
        role: shared.myTrim(req.body.role),
        school: shared.myTrim(req.body.school),
        PIN: parseInt(shared.myTrim(req.body.PIN), 10),
        email: shared.myTrim(req.body.email)
    };

    // Create a new user and save to DB
    User.create(newUser, function (err) {
        if (err) {
            var msg = err.message;
            if (msg.indexOf("E11000") >= 0) { // duplicate key error
                msg = newUser.username + " is already in the database";
            }
            logger.error(msg);
            req.flash("error", msg);
            res.redirect("back");
        }
        else {
            req.flash("success", "New user " + newUser.username + " created");
            res.redirect("/users");
        }
    });
});

//NEW - show form to create new user
router.get("/new", function (req, res) {
    res.render("users/new");
});

// Find user and render new user form
router.get("/:id/edit", function (req, res) {
    User.findById(req.params.id, function (err, foundUser) {
        if (err) {
            logger.error(err);
        }
        else {
            res.render("users/edit", {
                user: foundUser
            });
        }
    });
});


// Update user in database
router.put("/:id", function (req, res) {
    var newData = {
        name: shared.myTrim(req.body.name),
        role: req.body.role,
        email: shared.myTrim(req.body.email)
    };
    if (res.locals.currentUser.role == "role_wa") { // only admin can update key fields
        newData.username = shared.myTrim(req.body.username.toLowerCase());
        newData.PIN = parseInt(shared.myTrim(req.body.PIN), 10);
        newData.school = shared.myTrim(req.body.school);
    }

    User.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function (err, user) {
        if (err) {
            logger.error("edit error");
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            req.flash("success", "Successfully Updated!");
            res.redirect("/users");
        }
    });
});

// Delete user
router.delete("/:userId", middleware.isLoggedIn, function (req, res) {
    // logger.debug("user to delete=" + req.params.userId);
    User.findOneAndRemove({
        _id: req.params.userId
    }, function (err, user) {
        if (err) {
            logger.error("Error deleting user: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        req.flash("success", "Deleted " + user.name);
        res.redirect("back");
    });
});


// upload users from CSV file -- show form
router.get("/uploadUsers", function (req, res) {
    res.render("users/uploadUsers");
});


// upload users from CSV file -- determine changes
// Only uploads school counselors; assumes all valid counselors are in the update file
// (create user, delete user, or update user's name)
router.post("/uploadUsers2", function (req, res) {
    logger.info("Starting User upload--determine changes");
    var users = JSON.parse(req.body.usersString);
    var numRows = users.length;
    var sc1col = 7; // column of first school counselor
    var col = sc1col;

    // populate userUpdates array with name, email, school
    var row = 1; // skip column heading
    var userUpdates = [];
    while (row < numRows) {
        logger.debug("row=" + row + ", col=" + col);
        var user = {
            name: shared.myTrim(users[row][col]),
            email: shared.myTrim(users[row][col + 1]),
            school: shared.myTrim(users[row][0])
        };
        if (user.name != undefined && user.name.length > 0 &&
            user.email != undefined && user.email.length > 0) {
            user.email = user.email.toLowerCase();
            userUpdates.push(user);
            logger.info("row=" + (row + 1) + ", user update=" + user.name + ", email=" + user.email);
            col += 2; // move to next counselor
        }
        else {
            if (col == sc1col) {
                logger.info("row=" + (row + 1) + " missing data, user=" + user.name + ", email=" + user.email);
            }
            row++;
            col = sc1col;
        }
    }

    // sort user updates by email/school to match User query order
    userUpdates.sort(function (a, b) {
        if (a.email < b.email) {
            return -1;
        }
        if (a.email > b.email) {
            return 1;
        }
        if (a.school < b.school) {
            return -1;
        }
        if (a.school > b.school) {
            return 1;
        }
        return 0;
    });


    // find existing users
    User.find({ role: "role_sc" }, { _id: 0, name: 1, email: 1, school: 1 }).sort({ email: 1, school: 1 })
        .exec(function (err, usersFound) {
            if (err) {
                logger.error(err);
                req.flash("error", "error finding existing users");
                return res.redirect("back");
            }

            // compare arrays to determine action and populate updates array
            var updates = []; // users to create, update or delete
            var r1 = 0;
            var r2 = 0;
            while (r1 < usersFound.length && r2 < userUpdates.length) {
                logger.debug("comparing: " + usersFound[r1].email + usersFound[r1].school + "--" + userUpdates[r2].email + userUpdates[r2].school);
                if (usersFound[r1].email == userUpdates[r2].email && usersFound[r1].school == userUpdates[r2].school) { // updated user already in db
                    if (usersFound[r1].name != userUpdates[r2].name) { // name update
                        userUpdates[r2].action = 'U';
                        updates.push(userUpdates[r2]);
                    }
                    r1++;
                    r2++;
                }
                else if (usersFound[r1].email + usersFound[r1].school < userUpdates[r2].email + userUpdates[r2].school) { // delete user who is not in updates
                    usersFound[r1].action = 'D';
                    updates.push(usersFound[r1++]);
                }
                else { // add user
                    userUpdates[r2].action = 'C';
                    updates.push(userUpdates[r2++]);
                }
            }
            // Reached end of one array; process users on the rest of the other array
            // delete remaining users not in the update list, if any
            while (r1 < usersFound.length) {
                logger.debug("comparing: " + usersFound[r1].email + usersFound[r1].school + "--no match in update array");
                usersFound[r1].action = 'D';
                updates.push(usersFound[r1++]);
            }
            // create remaining users on update list, if any
            while (r2 < userUpdates.length) {
                logger.debug("comparing: " + "no match with existing users" + "--" + userUpdates[r2].email + userUpdates[r2].school);
                userUpdates[r2].action = 'C';
                updates.push(userUpdates[r2++]);
            }

            global.upd = updates;
            res.render("users/uploadUserPlan", {
                users: updates
            });
        });
});


// upload users from CSV file -- update db
router.post("/createUsers", function (req, res) {
    // logger.debug("global.upd:");
    // for (var i = 0; i < global.upd.length; i++) {
    //     logger.debug("i=" + i + ":" + global.upd[i].name + ", " +
    //         global.upd[i].email + ", " +
    //         global.upd[i].school + ", " +
    //         global.upd[i].action);
    // }

    var pin;
    const fname = 'userupload.txt';

    function nextPIN(pin) {
        return pin + 1 + Math.floor(Math.random() * 25); // adds between 1 and 25
    }

    logger.info("Starting User updates");
    fs.appendFile(fname, new Date() + "\r\n", function (err) {
        if (err) {
            logger.error("Error on first write to file " + fname);
        }
        else {
            logger.debug("Started writing user log");
        }
    });
    User.find({}, { _id: 0, PIN: 1 }).sort({ PIN: -1 }).limit(1)
        .exec(function (err, maxPinUser) {
            if (err) {
                logger.error(err);
                res.redirect("/users");
            }
            else {
                logger.debug("maxPinUser[0]=" + maxPinUser[0]);
                pin = nextPIN(maxPinUser[0].PIN);
                logger.debug("first pin=" + pin);
                var i = 0;
                var numUpdates = global.upd.length;
                async.whilst(function () {
                        return i < numUpdates;
                    },
                    function (userCallback) {
                        // logger.debug("async user iteratee called");
                        logger.info("i=" + i + ": " + global.upd[i].name + ", " +
                            global.upd[i].email + ", " +
                            global.upd[i].school + ", " +
                            global.upd[i].action);
                        switch (global.upd[i].action) {
                        case "C":
                            var user = {
                                name: global.upd[i].name,
                                email: global.upd[i].email,
                                role: "role_sc",
                                school: global.upd[i].school,
                                username: pin.toString(),
                                PIN: pin
                            };
                            User.create(user, function (err) {
                                if (err) {
                                    logger.error("error creating user:" + err.message);
                                }
                                else {
                                    pin = nextPIN(pin);
                                    fs.appendFile(fname, user.username + ", " + user.name + ", " + user.email + ", " + user.school + "\r\n", function (err) {
                                        if (err) {
                                            logger.error("Error: " + user.email + ", msg=" + err.message);
                                        }
                                    });
                                }
                                i++; // move to next update
                                userCallback(null); // don't stop for errors
                            });
                            break;
                        case "U":
                            // var user = {
                            //     name: global.upd[i].name,
                            // };
                            User.findOneAndUpdate({ email: global.upd[i].email, school: global.upd[i].school }, {
                                $set: { name: global.upd[i].name }
                            }, function (err) {
                                if (err) {
                                    logger.error("error updating user:" + err.message);
                                }
                                i++; // move to next update
                                userCallback(null); // don't stop for errors
                            });
                            break;
                        case "D":
                            User.findOneAndRemove({ email: global.upd[i].email, school: global.upd[i].school }, function (err) {
                                if (err) {
                                    logger.error("error deleting user:" + err.message);
                                }
                                i++; // move to next update
                                userCallback(null); // don't stop for errors
                            });
                            break;
                        default:
                            logger.error("invalid action=" + global.upd[i].action);
                            i++; // move to next update
                            userCallback(null); // don't stop for errors
                        }
                    },
                    function (err) {
                        if (err) {
                            logger.error("error while creating users--shouldn't happen since errors are just logged in console.");
                            req.flash("error", "error while uploading users");
                        }
                        else {
                            req.flash("success", "Users uploaded!");
                        }
                        logger.info("User upload complete");
                        res.redirect("/users");
                    });
            }
        });
});

module.exports = router;
