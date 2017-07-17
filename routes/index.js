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
  logger.debug("back to login");
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
  // req.flash("success", "LOGGED YOU OUT!");
  res.redirect("/");
});

// show reset password form
router.get('/requestpwreset', function (req, res) {
  res.render('requestpwreset', {
    user: req.user
  });
});

function sendEmail(emailAddress, subject, text, callBack) {
  logger.debug("emailing " + emailAddress + ", subject: " + subject + ", text: " + text);
  var mailgun = new Mailgun({
    apiKey: process.env.APIKEY,
    domain: 'test.coloradospringsbridge.com'
  });

  var data = {
    from: 'admin@coloradospringsbridge.com',
    to: emailAddress,
    subject: subject,
    text: text
  };

  mailgun.messages().send(data, function (err, body) {
    callBack(err);
  });
}

// reset password
router.post('/requestpwreset', function (req, res, next) {
  async.waterfall([

      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },

      function (token, done) {
        User.findOne({
          username: req.body.username.toLowerCase()
        }, function (err, user) {
          if (!user) {
            req.flash('error', "No account with email address " + req.body.username + " exists.");
            return res.redirect('/requestpwreset');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },

      function (token, user, done) {
        var subject, text;
        var link = req.protocol + "://" + req.get('host') + '/resetpw/' + token;
        if (user.password == undefined) {
          subject = "Register for Assistance League Operation School Bell";
          text = "To register, create a password after clicking on the following link\n" +
            "or pasting it into a browser:\n\n" + link + "\n";
        }
        else {
          subject = "Reset password for Assistance League Operation School Bell";
          text = "To reset your password, create a new password after clicking on the\n" +
            "following link or pasting it into a browser\n\n" + link + "\n";
        }
        sendEmail(user.username, subject, text, function (err) {
          logger.info("username=" + user.username + ", resetLink=" + link);
          done(err);
        });
      }
    ],
    function (err) {
      if (err) {
        req.flash('error', 'email error: ' + err.message);
        logger.error('error: ' + err.message);
        res.redirect('/requestpwreset');
      }
      else {
        req.flash('success', 'An e-mail has been sent to ' + req.body.username + ' with further instructions.');
        res.redirect('/login');
      }
    });
});

// show password reset form if token valid
router.get('/resetpw/:token', function (req, res) {
  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  }, function (err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/requestpwreset');
    }
    else if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/requestpwreset');
    }
    logger.debug("userfound username=" + user.username + ", token=" + user.resetPasswordToken);
    res.render('resetpw', {
      user: user
    });
  });
});

// reset password
router.post('/resetpw/:token', function (req, res) {
  if (req.body.password != req.body.confirm) {
    req.flash('error', "Password confirmation doesn't match first password entered.");
    return res.redirect('back');
  }
  User.findOne({
    resetPasswordToken: req.params.token
  }, function (err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    if (!user) {
      req.flash('error', 'System error: User not found.');
      return res.redirect('/requestpwreset');
    }

    var isRegistering = user.password == undefined;
    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    user.save(function (err) {
      if (err) {
        req.flash('failureRedirect', "Error--new password didn't save.");
        return res.redirect('/requestpwreset');
      }
      req.flash('success', 'Success! Your new password has been saved.');
      var subject, text;
      if (isRegistering) {
        subject = "Successfully Registered for Operation School Bell";
      }
      else {
        subject = "Successfully Reset password for Operation School Bell";
      }
      text = "You may now login with your new password!";
      sendEmail(user.username, subject, text, function (err) {
        if (err) {
          logger.error('Error sending email.');
        }
      });
      // no need to wait on the email callback
      res.redirect('/login');
    });
  });
});

module.exports = router;
