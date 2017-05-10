var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Event = require("../models/event");
var async = require('async');
var crypto = require('crypto');
// var nodemailer = require('nodemailer');

//root route
router.get("/", function(req, res) {
  res.render("landing");
});

//show login form
router.get("/login", function(req, res) {
  console.log("back to login");
  res.render("login");
});

//handling login logic
// router.post("/login", passport.authenticate("local", 
//     {
//         successRedirect: "/days",
//         failureRedirect: "/login"
//     }), function(req, res){
//         console.log("do nothing function called");
// });
router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/login');      
    }
    else if (!user) {
      req.flash('error', 'User Id or password not valid.');
      return res.redirect('/login');
    }    
 
    req.logIn(user, function(err) {
      if (err) return next(err);

      // If there is only one event, go right to days for that event
      Event.find({}, 'name', function(err, allEvents) {
        if (err) {
          console.log(err);
        }
        else {
          if (allEvents.length == 1) {
            res.redirect("events/" + allEvents[0]._id + "/days");
          }
          else {
            return res.redirect('/events');
          }
        }
      });

    });
  })(req, res, next);
});

// logout route
router.get("/logout", function(req, res) {
  req.logout();
  req.flash("success", "LOGGED YOU OUT!");
  res.redirect("/");
});

// show reset password form
router.get('/requestpwreset', function(req, res) {
  res.render('requestpwreset', {
    user: req.user
  });
});

function sendEmail(emailAddress, subject, text) {
  console.log("emailing " + emailAddress + " text: " + text);
}

// reset password
router.post('/requestpwreset', function(req, res, next) {
  async.waterfall([

    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },

    function(token, done) {
      User.findOne({
        username: req.body.username
      }, function(err, user) {
        if (!user) {
          req.flash('error', "No account with email address " + req.body.username + " exists.");
          return res.redirect('/requestpwreset');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    
    function(token, user, done) {
      var subject, text;
      if (user.password == undefined) {
        subject = "Register for OSB";
        text = "register token=" + token;
      }
      else {
        subject = "Reset password for OSB";
        text = "reset token=" + token;        
      }
      sendEmail(user.username, subject, text);
      // console.log("would send email, if it worked with token=" + token);
      req.flash('success', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
      res.redirect('/login');
      //   var smtpTransport = nodemailer.createTransport('SMTP', {
      //     service: 'mailgun',
      //     auth: {
      //       user: 'postmaster@sandbox5842e29e3bda404180f96b4f068180e3.mailgun.org',
      //       pass: '76c848986564bac79fe7b264fdd1b933'
      //     }
      //   });
      //   var mailOptions = {
      //     to: user.username,
      //     from: 'paulg7884@gmail.com',
      //     subject: 'Node.js Password Reset',
      //     text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
      //       'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
      //       'http://' + req.headers.host + '/reset/' + token + '\n\n' +
      //       'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      //   };
      //   smtpTransport.sendMail(mailOptions, function(err) {
      //     req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
      //     done(err, 'done');
      //   });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/requestpwreset');
  });
});

// show password reset form if token valid
router.get('/resetpw/:token', function(req, res) {
  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  }, function(err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/requestpwreset');      
    }
    else if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/requestpwreset');
    }
    console.log("userfound username=" + user.username + ", token=" + user.resetPasswordToken);
    res.render('resetpw', {
      user: user
    });
  });
});

// reset password
router.post('/resetpw/:token', function(req, res) {
  if (req.body.password != req.body.confirm) {
    req.flash('error', "Password confirmation doesn't match first password entered.");
    return res.redirect('back');  
  }
  async.waterfall([
    function(done) {
      User.findOne({
        resetPasswordToken: req.params.token
      }, function(err, user) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');      
        }
        else if (!user) {
          req.flash('error', 'System error: User not found.');
          return res.redirect('/requestpwreset');
    }        

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          if (err) {
            req.flash('failureRedirect', "Error--new password didn't save.");
            res.redirect('/requestpwreset');
          }
          else {
            done(err, user);
            req.flash('success', 'Success! Your new password has been saved.');
            res.redirect('/login');
            return;
          }
        });
      });
    },
    function(user, done) {
      sendEmail(user.username, "password changed", "text that works for reset or register");
      // var smtpTransport = nodemailer.createTransport('SMTP', {
      //   service: 'SendGrid',
      //   auth: {
      //     user: '!!! YOUR SENDGRID USERNAME !!!',
      //     pass: '!!! YOUR SENDGRID PASSWORD !!!'
      //   }
      // });
      // var mailOptions = {
      //   to: user.username,
      //   from: 'passwordreset@demo.com',
      //   subject: 'Your password has been changed',
      //   text: 'Hello,\n\n' +
      //     'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
      // };
      // smtpTransport.sendMail(mailOptions, function(err) {
      //   req.flash('success', 'Success! Your password has been changed.');
      //   done(err);
      // });
    }
  ], function(err) {
    res.redirect('/login');
  });
});

module.exports = router;