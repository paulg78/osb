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
router.get('/requestpwresetData', function(req, res) {
    logger.debug("req.query.email=" + req.query.email);
    logger.debug("req.query.schoolCode=" + req.query.schoolCode);

    User.findOne({
            email: req.query.email.toLowerCase(),
            schoolCode: req.query.schoolCode
        }, { _id: 0, username: 1, schoolCode: 1 })
        .populate({ path: 'school', select: 'name' })
        .exec(function(err, user) {
            if (err) {
                req.flash('error', "System error on user lookup " + req.query.email + "-" + req.query.PIN);
                logger.error("System error on user lookup " + req.query.email + "-" + req.query.PIN);
                return res.redirect('/requestpwreset');
            }
            if (user == null) {
                req.flash('error', "No account found for School Code " + req.query.schoolCode + ", email address " + req.query.email);
                return res.redirect('/requestpwreset');
            }
            else {
                logger.debug("in requestpwreset user=" + user);
                logger.debug('user.school=' + user.school);
                res.render('resetpw', {
                    schoolCode: req.query.schoolCode,
                    username: user.username,
                    school: user.school.name
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
                req.flash("error", req.query.email + " is already registered with School Code " + req.query.schoolCode); // doesn't work with res.render
                // res.redirect("back");  // loses form content
                // res.render('register', { message: req.flash('error') }); // loses the err msg
                // res.render('register', {
                //     email: req.query.email,
                //     schoolCode: req.query.schoolCode,
                //     errmsg: req.query.email + " is already registered with School Code " + req.query.schoolCode
                // });
                res.redirect('backToregister' + "/" + req.query.email + "/" + req.query.schoolCode);
            }
        });
    });
});


// show first registration form after error
router.get('/backToregister/:email/:schoolCode', function(req, res) {
    res.render('register', {
        email: req.params.email,
        schoolCode: req.params.schoolCode,
        errmsg: req.params.email + " is already registered with School Code " + req.params.schoolCode
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
router.post('/resetpw', function(req, res) {
    logger.debug("req.body.password=" + req.body.password);
    logger.debug("req.body.confirm=" + req.body.confirm);
    logger.debug("req.body.username=" + req.body.username);
    logger.debug("req.body.newUsername=" + req.body.newUsername);
    logger.debug("req.body.schoolCode=" + req.body.schoolCode);

    User.findOne({
        username: req.body.username
    }, { username: 1, school: 1 }, function(err, user) {
        if (err) {
            var errmsg = 'System error finding user; username=' + req.body.username;
            logger.error(errmsg + ";" + err.message);
            req.flash('error', errmsg);
            return res.redirect('/requestpwreset');
        }
        if (!user) {
            var errmsg = 'System error user not found; username=' + req.body.username;
            logger.error(errmsg);
            req.flash('error', errmsg);
            return res.redirect('/requestpwreset');
        }

        if (req.body.password != req.body.confirm) {
            logger.debug("password mismatch");
            req.flash('error', "Password confirmation doesn't match first password entered.");
            return res.redirect("/resetpw/" + user.username + "/" + req.body.schoolCode + "/" + user.school);
        }
        user.username = req.body.newUsername.toLowerCase();
        user.password = req.body.password;
        // logger.debug("user.password before save=" + user.password);

        user.save(function(err) {
            if (err) {
                // logger.debug("user save error=" + err.message);
                if (err.message.indexOf("E11000") >= 0) { // duplicate key error
                    req.flash('error', "Sorry, that username is already in use. Please make up another one.");
                    return res.redirect("/resetpw/" + user.username + "/" + req.body.schoolCode + "/" + user.school);
                }
                else {
                    req.flash('error', "Error--new password didn't save.");
                    logger.error("System error on user username/password save: " + err.message);
                    return res.redirect("/resetpw/" + user.username + "/" + req.body.schoolCode + "/" + user.school);
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
