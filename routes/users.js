var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");
var async = require('async');

// All user routes start here; blocks user actions by role_sc
router.use(middleware.isLoggedIn, function (req, res, next) {
    // console.log("went to all user routes");
    if (res.locals.currentUser.role == 'role_sc') {
        res.redirect("back");
    }
    else {
        // console.log("going to next user route");
        next('route');
    }
});

//INDEX - show all users
router.get("/", function (req, res) {

    User.find().sort({
        name: 1
    }).exec(function (err, allUsers) {
        if (err) {
            console.log(err);
        }
        else {
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
        username: req.body.username.toLowerCase(),
        name: req.body.name,
        role: req.body.role,
        school: req.body.school
    };

    // Create a new user and save to DB
    User.create(newUser, function (err) {
        if (err) {
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            req.flash("success", "New user created");
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
            console.log(err);
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
    console.log("IN put (update user)!");
    var newData = {
        username: req.body.username,
        name: req.body.name,
        role: req.body.role,
        school: req.body.school
    };

    User.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function (err, user) {
        if (err) {
            console.log("edit error");
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            console.log("Updating user");
            req.flash("success", "Successfully Updated!");
            // res.redirect("/users/" + user._id);
            res.redirect("/users");
        }
    });
});

// Delete user
router.delete("/:userId", middleware.isLoggedIn, function (req, res) {
    // console.log("user to delete=" + req.params.userId);
    User.findOneAndRemove({
        _id: req.params.userId
    }, function (err, user) {
        if (err) {
            console.log("Error deleting user: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        req.flash("success", "Deleted " + user.name);
        res.redirect("back");
    });
});

// upload users from CSV file
router.get("/uploadUsers", function (req, res) {
    res.render("users/uploadUsers");
});

// update database users
router.post("/createUsers", function (req, res) {
    function myTrim(x) {
        if (x != undefined) {
            return x.replace(/^\s+|\s+$/gm, '');
        }
        else {
            return undefined;
        }
    }

    var users = JSON.parse(req.body.usersString);
    var numUsers = users.length;
    var row = 1; // skip column heading
    var sc1col = 7; // column of first school counselor
    var col = sc1col;
    console.log("Starting User upload");

    async.whilst(
        function () {
            return row < numUsers;
        },
        function (userCallback) {
            // console.log("async user iteratee called");
            // console.log("row=" + row + ", col=" + col);
            var user = {
                name: myTrim(users[row][col]),
                username: myTrim(users[row][col + 1]),
                role: "role_sc",
                school: users[row][0]
            };
            if (user.name != undefined && user.name.length > 0 &&
                user.username != undefined && user.username.length > 0) {
                user.username = user.username.toLowerCase();
                User.create(user, function (err) {
                    if (err) {
                        if (err.message.indexOf("E11000") < 0) {
                            console.log("row=" + (row + 1) + ", Error, user=" + user.name + ", " + err.message);
                        }
                        else { // duplicate key error
                            // console.log("row=" + (row + 1) + ", " + user.username + " already in DB");
                        }

                    }
                    else {
                        console.log("row=" + (row + 1) + ", created user=" + user.name);
                    }
                    col += 2; // move to next counselor
                    // console.log("calling userCallback with row=" + row);
                    userCallback(null); // don't stop for errors
                });
            }
            else {
                if (col == sc1col) {
                    console.log("row=" + (row + 1) + " missing data, user=" + user.name + ", username=" + user.username);
                }
                row++;
                col = sc1col;
                userCallback(null); // don't stop for errors
            }
        },
        function (err) {
            if (err) {
                console.log("error while creating users--shouldn't happen since errors are just logged in console.");
                req.flash("error", "error while uploading users");
            }
            else {
                req.flash("success", "Users uploaded!");
            }
            console.log("User upload complete");
            res.redirect("/users");
        }
    );
});

module.exports = router;
