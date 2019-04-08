var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var shared = require("../shared");
var async = require('async');

/* global logger */

//subscribe - show form to subscribe new user to mailchimp
router.get("/subscribe", function(req, res) {
    res.render("users/subscribe");
});

//subscribe - show form to subscribe new user to mailchimp
router.get("/newsubscribe", function(req, res) {
    res.render("users/newsubscribe");
});

// REGISTER - add new user to DB
router.post("/register", function(req, res) {
    logger.debug("In User Register");
    logger.debug("req.body.name=" + req.body.name);
    logger.debug("req.body.phone=" + req.body.phone);
    // logger.debug("req.body.username=" + req.body.username);
    logger.debug("req.body.schoolCode=" + req.body.schoolCode);
    logger.debug("req.body.schoolName=" + req.body.schoolName);
    logger.debug("req.body.email=" + req.body.email);

    if (req.body.password != req.body.confirm) {
        logger.debug("password mismatch");
        req.flash('error', "Password confirmation doesn't match first password entered.");
        return res.redirect("back");
    }

    var newUser = {
        username: req.body.email,
        name: shared.myTrim(req.body.name),
        phone: shared.myTrim(req.body.phone),
        role: "role_sc",
        schoolCode: req.body.schoolCode,
        email: req.body.email
    };

    // logger.debug("user.password before save=" + user.password);

    // Create a new user and save to DB
    User.create(newUser, function(err) {
        if (err) {
            // logger.debug("user save error=" + err.message);
            if (err.message.indexOf("E11000") >= 0) { // duplicate key error
                req.flash('error', "Sorry, that username is already in use. Please make up another one.");
                return res.redirect("back");
            }
            else {
                req.flash('error', "System error on user create.");
                logger.error("System error on user create: " + err.message);
                return res.redirect("back");
            }
        }
        else {
            logger.debug("created user, username=" + newUser.username);
            res.render('resetpw', {
                schoolCode: newUser.schoolCode,
                school: req.body.schoolName,
                username: newUser.username,
                email: newUser.email
            });
        }
    });
});


// All user routes other than those above start here; blocks user actions by role_sc
router.use(middleware.isLoggedIn, function(req, res, next) {
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
router.get("/", function(req, res) {

    User.find({}, { name: 1, email: 1, username: 1, role: 1, password: 1, schoolCode: 1 })
        .populate('school', { _id: 0, name: 1 })
        .sort({ name: 1 })
        .exec(function(err, allUsers) {
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
router.post("/", function(req, res) {
    // get data from form and add to users collection

    var newUser = {
        username: shared.myTrim(req.body.username.toLowerCase()),
        name: shared.myTrim(req.body.name),
        role: shared.myTrim(req.body.role),
        schoolCode: shared.myTrim(req.body.schoolCode),
        email: shared.myTrim(req.body.email)
    };

    // Create a new user and save to DB
    User.create(newUser, function(err) {
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
router.get("/new", function(req, res) {
    res.render("users/new");
});

// Find user and render edit user form
router.get("/:id/edit", function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
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

router.get("/stats", function(req, res) {
    var stats = {};
    async.waterfall([
        getCountNoPw,
        getCountWithPw,
    ], function(err, stats) {
        if (err) {
            logger.error(err);
        }
        res.render("users/stats", {
            stats: stats
        });
    });

    function getCountNoPw(callback) {
        User.countDocuments({
                password: null
            })
            .exec(function(err, cnt) {
                if (!err) {
                    stats.noPw = cnt;
                }
                callback(err, stats);
            });
    }

    function getCountWithPw(stats, callback) {
        User.countDocuments({
                password: { $ne: null }
            })
            .exec(function(err, cnt) {
                if (!err) {
                    stats.withPw = cnt;
                }
                callback(err, stats);
            });
    }

});

// Update user in database
router.put("/:id", function(req, res) {
    var newData = {
        name: shared.myTrim(req.body.name),
        schoolCode: shared.myTrim(req.body.schoolCode),
        role: shared.myTrim(req.body.role),
        email: shared.myTrim(req.body.email)
    };
    if (res.locals.currentUser.role == "role_wa") { // only admin can update key fields
        newData.username = shared.myTrim(req.body.username.toLowerCase());
    }

    User.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function(err, user) {
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
router.delete("/:userId", middleware.isLoggedIn, function(req, res) {
    // logger.debug("user to delete=" + req.params.userId);
    User.findOneAndRemove({
        _id: req.params.userId
    }, function(err, user) {
        if (err) {
            logger.error("Error deleting user: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        req.flash("success", "Deleted " + user.name);
        res.redirect("back");
    });
});


module.exports = router;
