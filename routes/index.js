var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
/* global logger */

//root route
router.get("/", function (req, res) {
    res.render("landing");
});

//show login form
router.get("/login", function (req, res) {
    // logger.debug("back to login");
    res.render("login");
});

//show help
router.get("/help", function (req, res) {
    res.render("help");
});

router.post('/login', function (req, res, next) {
    // logger.debug("at login, req.body=" + req.body.username + "-" + req.body.password);
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/login');
        }
        else if (!user) {
            req.flash('error', 'Username or password not valid.');
            return res.redirect('/login');
        }

        req.logIn(user, function (err) {
            if (err) return next(err);
            // logger.debug("logged in user=" + user);
            if (user.role == 'role_sc') {
                return res.redirect('/students');
            }
            else {
                return res.redirect('/days');
            }
        });
    })(req, res, next);
});

// logout route
router.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

// show request username/password reset password form
router.get('/requestpwreset', function (req, res) {
    res.render('requestpwreset', {
        user: req.user
    });
});

// show username/password reset form
router.post('/requestpwreset', function (req, res) {
    if (isNaN(req.body.PIN)) { // user entered non-numeric PIN
        req.flash('error', "A valid PIN contains only digits; PIN entered was " + req.body.PIN);
        return res.redirect('/requestpwreset');
    }
    User.findOne({
        email: req.body.email.toLowerCase(),
        PIN: req.body.PIN
    }, { username: 1, school: 1 }, function (err, user) {
        if (err) {
            req.flash('error', "System error on user lookup " + req.body.email + "-" + req.body.PIN);
            logger.error("System error on user lookup " + req.body.email + "-" + req.body.PIN);
            return res.redirect('/requestpwreset');
        }
        if (user == null) {
            req.flash('error', "No account found for PIN " + req.body.PIN + ", email address " + req.body.email);
            return res.redirect('/requestpwreset');
        }
        else {
            // logger.debug("in requestpwreset user=" + user);
            res.render('resetpw', {
                username: user.username,
                school: user.school
            });
        }
    });
});


// show username/password reset form (with school for counselors)
// used to re-render reset form with an error message
router.get('/resetpw/:username/:school', function (req, res) {
    res.render('resetpw', {
        username: req.params.username,
        school: req.params.school
    });
});


// show username/password reset form (without school for non-counselor roles)
// used to re-render reset form with an error message
router.get('/resetpw/:username', function (req, res) {
    res.render('resetpw', {
        username: req.params.username,
        school: null
    });
});


// reset username/password
router.post('/resetpw/:username', function (req, res) {
    // logger.debug("req.body.password=" + req.body.password);
    // logger.debug("req.body.confirm=" + req.body.confirm);
    // logger.debug("req.body.username=" + req.body.username);
    // logger.debug("req.params.username=" + req.params.username);

    User.findOne({
        username: req.params.username
    }, { username: 1, school: 1 }, function (err, user) {
        if (err) {
            logger.error("System error finding user in resetpw: " + err.message);
            req.flash('error', 'System error on finding user.');
            return res.redirect('/requestpwreset');
        }
        if (!user) {
            logger.error("User not found in resetpw: " + err.message);
            req.flash('error', 'System error: User not found.');
            return res.redirect('/requestpwreset');
        }
        // logger.debug("in resetpw, user=" + user);
        // disallow new numeric username to avoid dup usernames when uploading new users, which are
        // created with username = a numeric PIN
        if (req.body.username != user.username && !isNaN(req.body.username)) { // user is changing username to a number
            req.flash('error', "Sorry, a new username cannot be numeric. A new username must contain at least one non-digit character.");
            return res.redirect("/resetpw/" + req.params.username + "/" + user.school);
        }

        if (req.body.password != req.body.confirm) {
            req.flash('error', "Password confirmation doesn't match first password entered.");
            return res.redirect("/resetpw/" + req.params.username + "/" + user.school);
        }
        user.username = req.body.username.toLowerCase();
        user.password = req.body.password;
        // logger.debug("user.password before save=" + user.password);

        user.save(function (err) {
            if (err) {
                // logger.debug("user save error=" + err.message);
                if (err.message.indexOf("E11000") >= 0) { // duplicate key error
                    req.flash('error', "Sorry, that username is already in use. Please make up another one.");
                    return res.redirect("/resetpw/" + req.params.username + "/" + user.school);
                }
                else {
                    req.flash('error', "Error--new password didn't save.");
                    logger.error("System error on user username/password save: " + err.message);
                    return res.redirect("/resetpw/" + req.params.username + "/" + user.school);
                }
            }
            else {
                // logger.debug("user.password after save=" + user.password);
                req.flash('success', 'Success! Your new username/password has been saved.');
                res.redirect('/login');
            }
        });
    });
});

module.exports = router;
