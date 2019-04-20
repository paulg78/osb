var express = require("express");
var router = express.Router();
var User = require("../models/user");
var middleware = require("../middleware");
var shared = require("../shared");
var async = require('async');
// const https = require("https");
const request = require("request");
const MEMBERS_URI = 'https://' + process.env.MCUSER + ':' + process.env.MCAPI + '@' + process.env.MCDC + '.api.mailchimp.com/3.0/lists/' + process.env.MCLISTID + '/members';
const MCtimeout = 5000;

/* global logger */
function emailHash(email) {
    return require('crypto').createHash('md5').update(email, 'utf8').digest('hex');
}


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
    logger.debug("req.body.schoolCode=" + req.body.schoolCode);
    logger.debug("req.body.schoolName=" + req.body.schoolName);
    logger.debug("req.body.email=" + req.body.email);

    var newUser = {
        username: req.body.email,
        name: shared.myTrim(req.body.name),
        phone: shared.myTrim(req.body.phone),
        role: "role_sc",
        schoolCode: req.body.schoolCode,
        email: shared.myTrim(req.body.email).toLowerCase()
    };

    const ehash = emailHash(newUser.email);

    async.waterfall([
        checkMailChimp,
        updateMailChimp,
        createUser
    ], function(err, MCresult, status) {
        if (err) {
            // logger.debug("user save error=" + err.message);
            if (err.message.indexOf("E11000") >= 0) { // duplicate key error
                req.flash('error', "Sorry, that username is already in use. Please make up another one and try again.");
            }
            else {
                req.flash('error', "System error on user create.");
                logger.error("System error on user create: " + err.message);
            }
            return res.redirect("back");
        }
        res.render('users/registerComplete', {
            MCstatus: status,
            MCresult: MCresult,
            user: newUser,
            schoolName: req.body.schoolName
        });
    });


    function checkMailChimp(callback) {
        logger.debug('Checking Mailchimp with email=' + newUser.email);
        request.get({
            uri: MEMBERS_URI + '/' + ehash + '?fields=status',
            json: true,
            timeout: MCtimeout
        }, function(err, response) {
            // logger.debug('JSON.stringify(response)=' + JSON.stringify(response));
            if (err) {
                logger.error(err);
                callback(null, 'error');
            }
            else {
                callback(null, response.body.status);
            }
        });
    }


    function updateMailChimp(status, callback) {
        logger.debug('status=' + status);
        switch (status) {
            case 404: // not on MC list
            case 'subscribed':
            case 'unsubscribed':
                request.put({
                    uri: MEMBERS_URI + '/' + ehash,
                    body: {
                        email_address: newUser.email,
                        status: 'subscribed',
                        merge_fields: {
                            NAME: newUser.name,
                            SCHOOLCODE: newUser.schoolCode,
                            SCHOOLNAME: req.body.schoolName
                        }
                    },
                    json: true,
                    timeout: MCtimeout
                }, function(err, response) {
                    // logger.debug('JSON.stringify(response)=' + JSON.stringify(response));
                    if (err) {
                        logger.error('email=' + newUser.email + ', ' + err);
                        callback(null, 'fail', status);
                    }
                    else if (response.statusCode != 200) {
                        logger.error('email=' + newUser.email + ', statusCode=' + response.statusCode + ', title=' + response.body.title + ', ' + response.body.detail);
                        callback(null, 'fail', status);
                    }
                    else {
                        callback(null, 'success', status);
                    }
                });
                break;

            case 'cleaned': // invalid email address on MC
            case 'error': // MailChimp check failed
            default: // unexpected value
                callback(null, 'none', status);
        }
    }

    function createUser(MCresult, status, callback) {
        logger.debug('MCresult=' + MCresult);
        // Create a new user in DB
        User.create(newUser, function(err) {
            if (err) {
                callback(err, MCresult, status);
            }
            else {
                logger.debug("created user, username=" + newUser.username);
                callback(null, MCresult, status);
            }
        });
    }

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
        email: shared.myTrim(req.body.email),
        phone: shared.myTrim(req.body.phone)
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
        email: shared.myTrim(req.body.email),
        phone: shared.myTrim(req.body.phone)
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
    User.findOneAndDelete({
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
