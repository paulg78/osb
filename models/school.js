var mongoose = require("mongoose");

var schoolSchema = new mongoose.Schema({
    name: {
        type: String
        // required: true,
        // unique: true
    },
    schoolCode: String,
    quota: Number,
    district: String
});

module.exports = mongoose.model("School", schoolSchema);
