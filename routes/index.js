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
router.get("/osbInfo", function(req, res) {
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
    logger.debug("req.query.email=" + req.query.email);
    logger.debug("req.query.schoolCode=" + req.query.schoolCode);

    User.findOne({
            schoolCode: req.query.schoolCode,
            email: req.query.email.toLowerCase()
        }, { _id: 0, username: 1, schoolCode: 1 })
        .populate({ path: 'school', select: 'name' })
        .exec(function(err, user) {
            if (err) {
                req.flash('error', "System error on user lookup " + req.query.email + "-" + req.query.schoolCode);
                logger.error("System error on user lookup " + req.query.email + "-" + req.query.schoolCode);
                return res.redirect('/requestpwreset');
            }
            if (user == null) {
                req.flash('error', "No account found for School Code " + req.query.schoolCode + ", email address " + req.query.email);
                return res.redirect('/requestpwreset');
            }
            else {
                logger.debug("in requestpwreset user=" + user);
                res.render('resetpw', {
                    schoolCode: req.query.schoolCode,
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
    logger.debug("req.query.email=" + req.query.email);
    logger.debug("req.query.schoolCode=" + req.query.schoolCode);

    var email = req.query.email.toLowerCase();
    var tester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/; // copied from email-validator package code

    if (!tester.test(email)) {
        req.flash("error", "Please check email address; " + email + " does not look valid.");
        return res.redirect('backToregister' + "/" + email + "/" + req.query.schoolCode);
    }

    // find/verify school code
    School.findOne({
        schoolCode: req.query.schoolCode
    }, { _id: 0, name: 1 }, function(err, school) {
        if (err) {
            var errmsg = "System error on schoolCode lookup: " + req.query.schoolCode;
            req.flash('error', errmsg);
            logger.error(errmsg);
            return res.redirect('back');
        }
        if (school == null) {
            req.flash('error', "School not found for School Code " + req.query.schoolCode);
            return res.redirect('back');
        }
        logger.debug("school=" + school);
        // verify user not yet registered
        User.findOne({
            schoolCode: req.query.schoolCode,
            email: email
        }, function(err, user) {
            if (err) {
                var errmsg = "System error on user lookup: " + email + "-" + req.query.schoolCode;
                req.flash('error', errmsg);
                logger.error(errmsg);
                return res.redirect('back');
            }
            if (user == null) {
                res.render('registerData', {
                    schoolCode: req.query.schoolCode,
                    email: email,
                    schoolName: school.name
                });
            }
            else {
                req.flash("error", email + " is already registered with School Code " + req.query.schoolCode); // flash doesn't work with res.render
                // res.redirect("back");  // loses form content
                res.redirect('backToregister' + "/" + email + "/" + req.query.schoolCode);
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



// show username/password reset form for registering a new user
router.post('/register', function(req, res) {

    User.findOne({
        schoolCode: req.body.schoolCode,
        email: req.body.email.toLowerCase()
    }, { username: 1 }, function(err, user) {
        if (err) {
            req.flash('error', "System error on user lookup " + req.body.email + "-" + req.body.schoolCode);
            logger.error("System error on user lookup " + req.body.email + "-" + req.body.schoolCode);
            return res.redirect('back');
        }
        if (user == null) {
            // create user
            var newUser = {
                username: shared.myTrim(req.body.username.toLowerCase()),
                name: shared.myTrim(req.body.name),
                role: 'role_sc',
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
                    // logger.debug("in requestpwreset user=" + user);
                    res.render('resetpw', {
                        schoolCode: req.body.schoolCode,
                        username: user.username,
                        school: user.school
                    });
                }
            });
        }
        else {
            req.flash("error", newUser.username + " is already in the database");
            return res.redirect("back");
        }
    });
});


// show username/password reset form
// used to re-render reset form with an error message
router.get('/resetpw/:username/:schoolCode/:school', function(req, res) {
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
    logger.debug("req.body.username=" + req.body.username);
    logger.debug("req.body.newUsername=" + req.body.newUsername);
    logger.debug("req.body.schoolCode=" + req.body.schoolCode);

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

            var resetpwRoute = "/resetpw/" + user.username + "/" + req.body.schoolCode + "/" + (user.school ? user.school.name : "none");
            // logger.debug('resetpwRoute=' + resetpwRoute);

            if (req.body.password != req.body.confirm) {
                logger.debug("password mismatch");
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
                        req.flash('error', "Sorry, that username is already in use. Please make up another one.");
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
