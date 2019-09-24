var
  compression = require('compression'),
  express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  passport = require("passport"),
  flash = require("connect-flash"),
  User = require("./models/user"),
  methodOverride = require("method-override");

const winston = require('winston');

global.logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({
      level: process.env.APPLOGLEVEL,
      timestamp: true,
      colorize: false
    })
  ]
});
/* global logger */
// added for password set/reset features
var LocalStrategy = require('passport-local').Strategy;

//requiring routes
var
  studentRoutes = require("./routes/students"),
  schoolRoutes = require("./routes/schools"),
  dayRoutes = require("./routes/days"),
  slotRoutes = require("./routes/slots"),
  indexRoutes = require("./routes/index"),
  userRoutes = require("./routes/users");

console.log("process.env.DATABASEURL='" + process.env.DATABASEURL + "'");
console.log("process.env.APPLOGLEVEL='" + process.env.APPLOGLEVEL + "'");

mongoose.connect(process.env.DATABASEURL, { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true, useUnifiedTopology: true });

// force SSL no longer needed; since doing it with apache on AWS lightsail
// console.log("process.env.FORCESSL='" + process.env.FORCESSL + "'");
// if (process.env.FORCESSL == 'y') {
//   logger.debug("https redirection enabled");
//   // redirect http to https
//   var forceSsl = function(req, res, next) {
//     if (req.headers['x-forwarded-proto'] !== 'https') {
//       return res.redirect(['https://', req.get('Host'), req.url].join(''));
//     }
//     return next();
//   };
//   app.use(forceSsl);
// }

app.use(compression());
app.enable('trust proxy');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(flash());

var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);

var store = new MongoDBStore({
  uri: process.env.DATABASEURL,
  collection: 'mySessions'
});

store.on('connected', function() {
  store.client; // The underlying MongoClient object from the MongoDB driver
});

// Catch errors
store.on('error', function(err) {
  if (err) {
    logger.error("Connection to session storage failed.");
  }
});

app.use(session({
  secret: process.env.SESSIONSECRET,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12 // 12 hours
  },
  store: store,
  resave: true,
  saveUninitialized: true
}));

// PASSPORT CONFIGURATION
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({
    username: username.toLowerCase()
  }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, {
      message: 'Incorrect username.'
    });
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      }
      else {
        return done(null, false, {
          message: 'Incorrect password.'
        });
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

app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use("/", indexRoutes);
app.use("/users", userRoutes);
app.use("/students", studentRoutes);
app.use("/schools", schoolRoutes);
app.use("/days", dayRoutes);
app.use("/slots", slotRoutes);

console.log('process.env.PRODSERVER=' + process.env.PRODSERVER);
if (process.env.PRODSERVER == 'lightsail') { // has to be 3000 for lightsail
  app.listen(3000, function() {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
  });
}
else { // heroku or dev environment
  app.listen(process.env.PORT || 3000, function() {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
  });
}
logger.info("Zulu time is 6 hours after Mountain Daily Time (Mar-Nov)");
