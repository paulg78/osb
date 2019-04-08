var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var bcrypt = require('bcrypt-nodejs');
/* global logger */

var UserSchema = new mongoose.Schema({
    username: { // users create this value so have to verify uniqueness
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
    },
    email: String, // email address
    // PIN: { // no longer used
    //     type: Number
    // },
    role: {
        type: String,
        required: true
    }, // values: role_sc, role_al, role_wa
    name: {
        type: String,
        required: true
    },
    schoolCode: { // used with email address for registration and username/pw reset
        // also is a key to school
        type: String
    },
    phone: String
});

UserSchema.virtual('school', {
    ref: 'School',
    localField: 'schoolCode',
    foreignField: 'schoolCode',
    justOne: true
});

UserSchema.pre('save', function(next) {
    var user = this;
    var SALT_FACTOR = 5;
    // logger.debug("in UserSchema pre save");
    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, null, function(err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        // logger.debug("in comparePassword, isMatch=" + isMatch);
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

UserSchema.virtual('hasPw').get(function() {
    if (this.password == null) {
        return "N";
    }
    else {
        return "Y";
    }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
