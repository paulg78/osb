var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var bcrypt = require('bcrypt-nodejs');
/* global logger */

var UserSchema = new mongoose.Schema({
  username: { // email address
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: {
    type: String,
    required: true
  }, // values: role_sc, role_al, role_wa
  name: {
    type: String,
    required: true
  },
  school: {
    type: String
  }
});

UserSchema.pre('save', function (next) {
  var user = this;
  var SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function (err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    logger.debug("in compare");
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
