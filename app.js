var express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  passport = require("passport"),
  flash = require("connect-flash"),
  User = require("./models/user"),
  methodOverride = require("method-override");

const winston = require('winston');
// const fs = require('fs');

// const logDir = 'log';
// // Create the log directory if it does not exist
// if (!fs.existsSync(logDir)) {
//   fs.mkdirSync(logDir);
// }

// const tsFormat = () => (new Date()).toLocaleDateString('en-US', {
//   year: '2-digit',
//   month: 'numeric',
//   day: 'numeric'
// }) + '-' + (new Date()).toLocaleTimeString('en-US', {
//   timeZone: "America/Denver",
//   hour12: false
// });
global.logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({
      level: process.env.APPLOGLEVEL,
      colorize: false
    })
    // new(winston.transports.File)({
    //   filename: `${logDir}/results.log`,
    //   timestamp: tsFormat,
    //   level: process.env.CONLOGLEVEL
    // })
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
  userRoutes = require("./routes/users"),
  userUpdateRoutes = require("./routes/userUpdates");

console.log("process.env.DATABASEURL=" + process.env.DATABASEURL);
logger.debug("process.env.DATABASEURL=" + process.env.DATABASEURL);

mongoose.connect(process.env.DATABASEURL, { useNewUrlParser: true });

// redirect http to https
var forceSsl = function (req, res, next) {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  return next();
};
app.use(forceSsl);

app.enable('trust proxy');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(flash());

app.use(require("express-session")({
  secret: process.env.SESSIONSECRET,
  resave: false,
  saveUninitialized: false
}));

var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);

app.use(session({
  secret: process.env.SESSIONSECRET,
  store: new MongoDBStore({ mongooseConnection: mongoose.connection }),
  resave: false,
  saveUninitialized: false
}));

// PASSPORT CONFIGURATION
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(function (username, password, done) {
  User.findOne({
    username: username.toLowerCase()
  }, function (err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, {
      message: 'Incorrect username.'
    });
    user.comparePassword(password, function (err, isMatch) {
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

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.use(function (req, res, next) {
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
app.use("/userUpdates", userUpdateRoutes);

app.listen(process.env.PORT, process.env.IP, function () {
  logger.debug("Server running on port " + process.env.PORT + ", IP " + process.env.IP);
});
