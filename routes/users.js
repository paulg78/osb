var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");

//INDEX - show all users
router.get("/", function (req, res) {
    // Get all users from DB
    User.find({}, function (err, allUsers) {
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
        username: req.body.username,
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


//middleware
// function isLoggedIn(req, res, next){
//     if(req.isAuthenticated()){
//         return next();
//     }
//     req.flash("error", "You must be signed in to do that!");
//     res.redirect("/login");
// }

module.exports = router;
