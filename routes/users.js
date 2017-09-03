var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");
var shared = require("../shared");
var async = require('async');
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

    User.find({}, { name: 1, username: 1, role: 1, school: 1 }).sort({
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
        school: shared.myTrim(req.body.school)
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
        username: shared.myTrim(req.body.username),
        name: shared.myTrim(req.body.name),
        role: shared.myTrim(req.body.role),
        school: shared.myTrim(req.body.school)
    };

    User.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function (err, user) {
        if (err) {
            logger.error("edit error");
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            logger.info("Updating user");
            req.flash("success", "Successfully Updated!");
            // res.redirect("/users/" + user._id);
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

// upload users from CSV file -- updated db
router.post("/createUsers", function (req, res) {

    var users = JSON.parse(req.body.usersString);
    var numUsers = users.length;
    var row = 1; // skip column heading
    var sc1col = 7; // column of first school counselor
    var col = sc1col;
    logger.info("Starting User upload");

    async.whilst(
        function () {
            return row < numUsers;
        },
        function (userCallback) {
            // logger.debug("async user iteratee called");
            // logger.debug("row=" + row + ", col=" + col);
            var user = {
                name: shared.myTrim(users[row][col]),
                username: shared.myTrim(users[row][col + 1]),
                role: "role_sc",
                school: shared.myTrim(users[row][0])
            };
            if (user.name != undefined && user.name.length > 0 &&
                user.username != undefined && user.username.length > 0) {
                user.username = user.username.toLowerCase();
                User.create(user, function (err) {
                    if (err) {
                        if (err.message.indexOf("E11000") < 0) {
                            logger.error("row=" + (row + 1) + ", Error, user=" + user.name + ", " + err.message);
                        }
                        else { // duplicate key error
                            // logger.debug("row=" + (row + 1) + ", " + user.username + " already in DB");
                        }

                    }
                    else {
                        logger.info("row=" + (row + 1) + ", created user=" + user.name + ", username=" + user.username);
                    }
                    col += 2; // move to next counselor
                    // logger.debug("calling userCallback with row=" + row);
                    userCallback(null); // don't stop for errors
                });
            }
            else {
                if (col == sc1col) {
                    logger.info("row=" + (row + 1) + " missing data, user=" + user.name + ", username=" + user.username);
                }
                row++;
                col = sc1col;
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
        }
    );
});

module.exports = router;
