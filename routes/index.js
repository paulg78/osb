var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var async = require('async');
var crypto = require('crypto');
// var nodemailer = require('nodemailer');

//root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
   res.render("register"); 
});

//handle sign up logic
// router.post("/register", function(req, res){
//     var newUser = new User({username: req.body.username, email: req.body.email, school: req.body.school});
//     User.register(newUser, req.body.password, function(err, user){
//         if(err){
//             console.log(err);
//             req.flash("error", err.message);
//             return res.render("register");
//         }
//         passport.authenticate("local")(req, res, function(){
//           req.flash("success", "Successfully Signed Up!" + req.body.username);
//           res.redirect("/students"); 
//         });
//     });
// });

router.post('/register', function(req, res) {
  var user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      school: req.body.school
    });

  user.save(function(err) {
    req.logIn(user, function(err) {
      res.redirect('/');
    });
  });
});

//show login form
router.get("/login", function(req, res){
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
    if (err) return next(err);
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, function(err) {
      if (err) return next(err);
      return res.redirect('/days');
    });
  })(req, res, next);
});

// logout route
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "LOGGED YOU OUT!");
   res.redirect("/students");
});

// show reset password form
router.get('/forgotpw', function(req, res) {
  res.render('forgotpw', {
    user: req.user
  });
});

// reset password
router.post('/forgotpw', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgotpw');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      console.log("would send email, if it worked with token=" + token);
      req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
      res.redirect('/login');
    //   var smtpTransport = nodemailer.createTransport('SMTP', {
    //     service: 'mailgun',
    //     auth: {
    //       user: 'postmaster@sandbox5842e29e3bda404180f96b4f068180e3.mailgun.org',
    //       pass: '76c848986564bac79fe7b264fdd1b933'
    //     }
    //   });
    //   var mailOptions = {
    //     to: user.email,
    //     from: 'paulg7884@gmail.com',
    //     subject: 'Node.js Password Reset',
    //     text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
    //       'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
    //       'http://' + req.headers.host + '/reset/' + token + '\n\n' +
    //       'If you did not request this, please ignore this email and your password will remain unchanged.\n'
    //   };
    //   smtpTransport.sendMail(mailOptions, function(err) {
    //     req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
    //     done(err, 'done');
    //   });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgotpw');
  });
});

// show password reset form if token valid
router.get('/resetpw/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgotpw');
    }
    console.log("userfound username=" + user.username + ", token=" + user.resetPasswordToken);
    res.render('resetpw', { user: user });
  });
});

// reset password
router.post('/resetpw/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          
          req.logIn(user, function(err) {
            if (err) { 
              done(err, user); 
              return;
            }
            req.flash('success', 'Success! Your password has been changed.');
            res.redirect('/days');          
         
          // req.logIn(user, function(err) {
          //   done(err, user);
          });
        });
      });
    },
    function(user, done) {
      console.log("Password has been reset");
      // var smtpTransport = nodemailer.createTransport('SMTP', {
      //   service: 'SendGrid',
      //   auth: {
      //     user: '!!! YOUR SENDGRID USERNAME !!!',
      //     pass: '!!! YOUR SENDGRID PASSWORD !!!'
      //   }
      // });
      // var mailOptions = {
      //   to: user.email,
      //   from: 'passwordreset@demo.com',
      //   subject: 'Your password has been changed',
      //   text: 'Hello,\n\n' +
      //     'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      // };
      // smtpTransport.sendMail(mailOptions, function(err) {
      //   req.flash('success', 'Success! Your password has been changed.');
      //   done(err);
      // });
    }
  ], function(err) {
    res.redirect('/');
  });
});

module.exports = router;