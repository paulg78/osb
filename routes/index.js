var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var School = require("../models/school");
var shared = require("../shared");
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
router.post('/requestpwreset', function(req, res) {

    User.findOne({
        email: req.body.email.toLowerCase(),
        schoolCode: req.body.schoolCode
    }, { username: 1, school: 1 }, function(err, user) {
        if (err) {
            req.flash('error', "System error on user lookup " + req.body.email + "-" + req.body.PIN);
            logger.error("System error on user lookup " + req.body.email + "-" + req.body.PIN);
            return res.redirect('/requestpwreset');
        }
        if (user == null) {
            req.flash('error', "No account found for School Code " + req.body.schoolCode + ", email address " + req.body.email);
            return res.redirect('/requestpwreset');
        }
        else {
            // logger.debug("in requestpwreset user=" + user);
            res.render('resetpw', {
                schoolCode: req.body.schoolCode,
                username: user.username,
                school: user.school
            });
        }
    });
});


// show first registration form
router.get('/register', function(req, res) {
    res.render('register', {
        email: '',
        schoolCode: '',
        errmsg: ''
    });
});

// show second registration form
router.get('/registerData', function(req, res) {
    logger.debug("req.query.email=" + req.query.email);
    logger.debug("req.query.schoolCode=" + req.query.schoolCode);
    // todo: verify a valid email address
    // see: https://stackoverflow.com/questions/18022365/mongoose-validate-email-syntax

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
            email: req.query.email.toLowerCase(),
            schoolCode: req.query.schoolCode
        }, function(err, user) {
            if (err) {
                var errmsg = "System error on user lookup: " + req.query.email + "-" + req.query.schoolCode;
                req.flash('error', errmsg);
                logger.error(errmsg);
                return res.redirect('back');
            }
            if (user == null) {
                res.render('registerData', {
                    schoolCode: req.query.schoolCode,
                    email: req.query.email,
                    schoolName: school.name
                });
            }
            else {
                req.flash("error", req.query.email + " is already registered with School Code " + req.query.schoolCode);
                // res.redirect("back");  // loses form content
                // res.render('register', { message: req.flash('error') }); // loses the err msg
                res.render('register', {
                    email: req.query.email,
                    schoolCode: req.query.schoolCode,
                    errmsg: req.query.email + " is already registered with School Code " + req.query.schoolCode
                });
            }
        });
    });
});

// show username/password reset form for registering a new user
router.post('/register', function(req, res) {


    User.findOne({
        email: req.body.email.toLowerCase(),
        schoolCode: req.body.schoolCode
    }, { username: 1, school: 1 }, function(err, user) {
        if (err) {
            req.flash('error', "System error on user lookup " + req.body.email + "-" + req.body.PIN);
            logger.error("System error on user lookup " + req.body.email + "-" + req.body.PIN);
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


// show username/password reset form (with school for counselors)
// used to re-render reset form with an error message
router.get('/resetpw/:PIN/:username/:school', function(req, res) {
    res.render('resetpw', {
        PIN: req.params.PIN,
        username: req.params.username,
        school: req.params.school
    });
});


// show username/password reset form (without school for non-counselor roles)
// used to re-render reset form with an error message
router.get('/resetpw/:PIN/:username', function(req, res) {
    res.render('resetpw', {
        PIN: req.params.PIN,
        username: req.params.username,
        school: null
    });
});


// reset username/password
router.post('/resetpw/:PIN', function(req, res) {
    logger.debug("req.body.password=" + req.body.password);
    logger.debug("req.body.confirm=" + req.body.confirm);
    logger.debug("req.body.username=" + req.body.username);
    logger.debug("req.params.PIN=" + req.params.PIN);

    User.findOne({
        PIN: parseInt(req.params.PIN, 10)
    }, { username: 1, school: 1 }, function(err, user) {
        if (err) {
            logger.error("System error finding user in resetpw: " + err.message);
            req.flash('error', 'System error finding user; PIN: ' + req.params.PIN);
            return res.redirect('/requestpwreset');
        }
        if (!user) {
            logger.error("System error: User not found in resetpw; PIN: " + req.params.PIN);
            req.flash('error', 'User not found with PIN: ' + req.params.PIN);
            return res.redirect('/requestpwreset');
        }

        // logger.debug("in resetpw, user=" + user);
        // disallow new numeric username to avoid dup usernames when uploading new users, which are
        // created with username = a numeric PIN
        if (req.body.username != user.username && !isNaN(req.body.username)) { // user is changing username to a number
            req.flash('error', "Sorry, a new username cannot be numeric. A new username must contain at least one non-digit character.");
            return res.redirect("/resetpw/" + req.params.PIN + "/" + user.username + "/" + user.school);
        }

        if (req.body.password != req.body.confirm) {
            logger.debug("password mismatch");
            req.flash('error', "Password confirmation doesn't match first password entered.");
            return res.redirect("/resetpw/" + req.params.PIN + "/" + user.username + "/" + user.school);
        }
        user.username = req.body.username.toLowerCase();
        user.password = req.body.password;
        // logger.debug("user.password before save=" + user.password);

        user.save(function(err) {
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
