var mongoose = require("mongoose");

var schoolSchema = new mongoose.Schema({
    name: String,
    quota: Number
});

module.exports = mongoose.model("School", schoolSchema);
