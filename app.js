var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    cookieParser = require("cookie-parser"),
    // LocalStrategy = require("passport-local"),
    flash        = require("connect-flash"),
    Campground  = require("./models/campground"),
    Student     = require("./models/student"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    Event        = require("./models/event"),
    session = require("express-session"),
    seedDB      = require("./seeds"),
    methodOverride = require("method-override");

// added for password set/reset features
var LocalStrategy = require('passport-local').Strategy;
var async = require('async');
var crypto = require('crypto');
    
//requiring routes
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    studentRoutes   = require("./routes/students"),
    // slotRoutes      = require("./routes/slots"),
    // dayRoutes       = require("./routes/days"),
    eventRoutes       = require("./routes/events"),
    indexRoutes      = require("./routes/index");
    
mongoose.connect("mongodb://localhost/yelp_camp_v9");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(cookieParser('secret'));
app.use(flash());

// seedDB(); //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.success = req.flash('success');
   res.locals.error = req.flash('error');
   next();
});

app.use("/", indexRoutes);
app.use("/resetpw/:token", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/students", studentRoutes);
app.use("/events", eventRoutes);
app.use("/events/:eventId", eventRoutes);
app.use("/events/:eventId/days/:dayId", eventRoutes);
// app.use("/days/:dayId/slots", slotRoutes);
// app.use("/days/:dayId/slots/:slotId/students/:studentId", slotRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("Server running on port " + process.env.PORT + ", IP " + process.env.IP);
});