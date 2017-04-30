var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");

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


module.exports = router;