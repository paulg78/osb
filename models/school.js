var mongoose = require("mongoose");

var schoolSchema = new mongoose.Schema({
    name: String,
    quota: Number,
    district: String
});

module.exports = mongoose.model("School", schoolSchema);
