var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Event = require("../models/event");
var async = require('async');
var crypto = require('crypto');
var Mailgun = require('mailgun-js');
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
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/login');
    }
    else if (!user) {
      req.flash('error', 'User Id or password not valid.');
      return res.redirect('/login');
    }

    req.logIn(user, function (err) {
      if (err) return next(err);

      return res.redirect('/events');
    });
  })(req, res, next);
});

// logout route
router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

// show reset password form
router.get('/requestpwreset', function (req, res) {
  res.render('requestpwreset', {
    user: req.user
  });
});

// reset password
router.post('/requestpwreset', function (req, res) {

  User.findOne({
    username: req.body.username.toLowerCase()
  }, function (err, user) {
    if (err) {
      req.flash('error', "System error on user lookup " + req.body.username);
      logger.error("System error on user lookup " + req.body.username);
      return res.redirect('/requestpwreset');
    }
    if (user == null) {
      req.flash('error', "No account with Username " + req.body.username + " exists.");
      return res.redirect('/requestpwreset');
    }
    // logger.debug("userfound username=" + user.username + ", token=" + user.resetPasswordToken);
    // res.render('resetpw', {
    //   username: user.username
    // });
    res.redirect("/resetpw/" + user.username);
  });
});


// show password reset form if token valid
router.get('/resetpw/:username', function (req, res) {
  res.render('resetpw', {
    username: req.params.username
  });
});



// reset password
router.post('/resetpw/:username', function (req, res) {
  if (req.body.password != req.body.confirm) {
    req.flash('error', "Password confirmation doesn't match first password entered.");
    // res.render('resetpw', {
    //   username: req.params.username
    // });
    return res.redirect("/resetpw/" + req.params.username);
  }
  User.findOne({
    username: req.params.username
  }, function (err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    if (!user) {
      req.flash('error', 'System error: User not found.');
      return res.redirect('/requestpwreset');
    }

    user.password = req.body.password;

    user.save(function (err) {
      if (err) {
        req.flash('error', "Error--new password didn't save.");
        return res.redirect('/requestpwreset');
      }
      req.flash('success', 'Success! Your new password has been saved.');
      // no need to wait on the email callback
      res.redirect('/login');
    });
  });
});

module.exports = router;
