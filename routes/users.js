var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");
var async = require('async');

//INDEX - show all users
router.get("/", middleware.isLoggedIn, function (req, res) {
    // Get all users from DB
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
router.post("/", middleware.isLoggedIn, function (req, res) {
    // get data from form and add to users collection

    var newUser = {
        username: req.body.username.toLowerCase(),
        name: req.body.name,
        role: req.body.role,
        school: req.body.school
    };

    // Create a new user and save to DB
    User.create(newUser, function (err, newlyCreated) {
        if (err) {
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            //redirect back to users page
            // console.log(newlyCreated);
            req.flash("success", "New user created");
            res.redirect("/users");
        }
    });
});

//NEW - show form to create new user
router.get("/new", middleware.isLoggedIn, function (req, res) {
    res.render("users/new");
});

// Find user and render new user form
router.get("/:id/edit", function (req, res) {
    //find the user with provided ID
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

// upload users from CSV file
router.get("/uploadUsers", middleware.isLoggedIn, function (req, res) {
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
    var sc1col = 7;
    var col = sc1col;

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
                User.create(user, function (err, newuser) {
                    if (err) {
                        console.log("row=" + row + ", Error, user=" + user.name + ", " + err.message);
                    }
                    else {
                        console.log("row=" + row + ", created user=" + user.name);
                    }
                    col += 2; // move to next counselor
                    // console.log("calling userCallback with row=" + row);
                    userCallback(null); // don't stop for errors                
                });
            }
            else {
                if (col == sc1col) {
                    console.log("row=" + row + " missing data, user=" + user.name + ", username=" + user.username);
                }
                row++;
                col = sc1col;
                userCallback(null); // don't stop for errors           
            }
        },
        function (err) {
            if (err) {
                console.log("error while creating users--shouldn't happen since errors are just logged in console.");
            }
            res.redirect("/users");
        }
    );
});

module.exports = router;
