var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var School = require("../models/school");
var shared = require("../shared");
var middleware = require("../middleware");

/* global logger */

//root route
router.get("/", function(req, res) {
    res.render("landing");
});

//show login form
router.get("/login", function(req, res) {
    // logger.debug("back to login");
    res.render("login");
});

//show help
router.get("/help", function(req, res) {
    res.render("help");
});

//show OSB Info
router.get("/osbInfo", middleware.isLoggedIn, function(req, res) {
    var fs = require('fs');
    fs.readFile('osbInfo.txt', function(err, txt) {
        if (err) {
            req.flash('error', "Error reading OSB info " + err);
            res.redirect('back');
        }
        else {
            // logger.debug("txt=" + txt);
            res.render("osbInfo", { osbInfo: txt });
        }
    });
});


//show OSB Info Edit form
router.get("/editOsbInfo", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect('back');
    }
    var fs = require('fs');
    fs.readFile('osbInfo.txt', function(err, txt) {
        if (err) {
            req.flash('error', "Error reading OSB info " + err);
            res.redirect('back');
        }
        else {
            // logger.debug("txt=" + txt);
            res.render("editOsbInfo", { osbInfo: txt });
        }
    });
});

// Save OSB Info
router.post("/osbInfo", function(req, res) {
    var fs = require('fs');
    // logger.debug('req.body.osbInfoText=' + req.body.osbInfoText);
    // delete first char (an extraneous comma)
    fs.writeFile('osbInfo.txt', req.body.osbInfoText.toString().substr(1), function(err) {
        if (err) {
            req.flash('error', "Error saving text " + err);
            res.redirect('back');
        }
        else {
            req.flash('success', "OSB Info updated.");
            res.redirect("osbInfo");
        }
    });
});

router.post('/login', function(req, res, next) {
    // logger.debug("at login, req.body=" + req.body.username + "-" + req.body.password);
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/login');
        }
        else if (!user) {
            req.flash('error', 'Username or password not valid.');
            return res.redirect('/login');
        }

        req.logIn(user, function(err) {
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
router.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

// show request username/password reset password form
router.get('/requestpwreset', function(req, res) {
    res.render('requestpwreset');
});

// show username/password reset form for password reset (existing user)
router.get('/requestpwresetData', function(req, res) {
    // logger.debug("req.query.email='" + req.query.email + "'");
    // logger.debug("req.query.schoolCode='" + req.query.schoolCode + "'");

    var
        schoolCodeT = shared.myTrim(req.query.schoolCode),
        emailT = shared.myTrim(req.query.email).toLowerCase();
    User.findOne({
            schoolCode: schoolCodeT,
            email: emailT
        }, { _id: 0, username: 1, schoolCode: 1 })
        .populate({ path: 'school', select: 'name' })
        .exec(function(err, user) {
            if (err) {
                req.flash('error', "System error on user lookup " + emailT + "-" + schoolCodeT);
                logger.error("System error on user lookup " + emailT + "-" + schoolCodeT);
                return res.redirect('/requestpwreset');
            }
            if (user == null) {
                req.flash('error', "No account found for School Code " + schoolCodeT + ", email address " + emailT + ". You must register before setting a password.");
                return res.redirect('/requestpwreset');
            }
            else {
                // logger.debug("in requestpwreset user=" + user);
                res.render('resetpw', {
                    schoolCode: schoolCodeT,
                    username: user.username,
                    school: user.school ? user.school.name : 'none'
                });
            }
        });
});


// show first registration form
router.get('/register', function(req, res) {
    res.render('register', {
        email: '',
        schoolCode: ''
    });
});

// show second registration form
router.get('/registerData', function(req, res) {
    // logger.debug('In get /registerData');
    // logger.debug("req.query.email='" + req.query.email + "'");
    // logger.debug("req.query.schoolCode='" + req.query.schoolCode + "'");

    var
        schoolCodeT = shared.myTrim(req.query.schoolCode),
        emailT = shared.myTrim(req.query.email).toLowerCase();
    var tester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/; // copied from email-validator package code

    if (!tester.test(emailT)) {
        req.flash("error", "Please check email address; '" + emailT + "' does not look valid.");
        // redirect fails if emailT is blank
        if (emailT == '') {
            emailT = '@';
        }
        return res.redirect('backToregister' + "/" + encodeURIComponent(emailT) + "/" + schoolCodeT);
    }

    // find/verify school code
    School.findOne({
        schoolCode: schoolCodeT
    }, { _id: 0, name: 1 }, function(err, school) {
        if (err) {
            var errmsg = "System error on schoolCode lookup: " + schoolCodeT;
            req.flash('error', errmsg);
            logger.error(errmsg);
            return res.redirect('back');
        }
        if (school == null) {
            req.flash('error', "School not found for School Code " + schoolCodeT);
            return res.redirect('back');
        }
        // logger.debug("school=" + school);
        // verify user not yet registered
        User.findOne({
            schoolCode: schoolCodeT,
            email: emailT
        }, function(err, user) {
            if (err) {
                var errmsg = "System error on user lookup: " + emailT + "-" + schoolCodeT;
                req.flash('error', errmsg);
                logger.error(errmsg);
                return res.redirect('back');
            }
            if (user == null) {
                res.render('registerData', {
                    schoolCode: schoolCodeT,
                    email: emailT,
                    schoolName: school.name
                });
            }
            else {
                req.flash("error", emailT + " is already registered with School Code " + schoolCodeT); // flash doesn't work with res.render
                // res.redirect("back");  // loses form content
                res.redirect('backToregister' + "/" + encodeURIComponent(emailT) + "/" + schoolCodeT);
            }
        });
    });
});


// show first registration form after error
router.get('/backToregister/:email/:schoolCode', function(req, res) {
    res.render('register', {
        email: req.params.email,
        schoolCode: req.params.schoolCode,
    });
});


// show username/password reset form
// used to re-render reset form with an error message
router.get('/resetpw/:username/:schoolCode/:school', function(req, res) {
    // logger.debug('In get resetpw');
    res.render('resetpw', {
        schoolCode: req.params.schoolCode,
        username: req.params.username,
        school: req.params.school
    });
});


// reset username/password
router.post('/resetpw', function(req, res) {
    // logger.debug("req.body.password=" + req.body.password);
    // logger.debug("req.body.confirm=" + req.body.confirm);
    // logger.debug("req.body.username=" + req.body.username);
    // logger.debug("req.body.newUsername=" + req.body.newUsername);
    // logger.debug("req.body.schoolCode=" + req.body.schoolCode);

    User.findOne({
            username: req.body.username
        }, { username: 1, schoolCode: 1 })
        .populate({ path: 'school', select: 'name' })
        .exec(function(err, user) {
            if (err) {
                var errmsg = 'System error finding user; username=' + req.body.username;
                logger.error(errmsg + ";" + err.message);
                req.flash('error', errmsg);
                return res.redirect('/requestpwreset');
            }
            if (!user) {
                errmsg = 'System error user not found; username=' + req.body.username;
                logger.error(errmsg);
                req.flash('error', errmsg);
                return res.redirect('/requestpwreset');
            }
            // logger.debug('school name=' + (user.school ? user.school.name : "none"));

            var resetpwRoute = "/resetpw/" + encodeURIComponent(user.username) + "/" + req.body.schoolCode + "/" + (user.school ? encodeURIComponent(user.school.name) : "none");
            // logger.debug('resetpwRoute=' + resetpwRoute);

            if (req.body.password != req.body.confirm) {
                // logger.debug("password mismatch");
                req.flash('error', "Password confirmation doesn't match first password entered.");
                return res.redirect(resetpwRoute);
            }
            user.username = req.body.newUsername.toLowerCase();
            user.password = req.body.password;
            // logger.debug("user.password before save=" + user.password);

            user.save(function(err) {
                if (err) {
                    // logger.debug("user save error=" + err.message);
                    if (err.message.indexOf("E11000") >= 0) { // duplicate key error
                        req.flash('error', "Sorry, username " + user.username + " is already in use. Please make up another one.");
                    }
                    else {
                        req.flash('error', "Error--new password didn't save.");
                        logger.error("System error on user username/password save: " + err.message);
                    }
                    res.redirect(resetpwRoute);
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
