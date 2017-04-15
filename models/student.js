var mongoose = require("mongoose");

var studentSchema = new mongoose.Schema({
   fname: String,
   lname: String,
   gender: String,
   grade: String,
   school: String
});

module.exports = mongoose.model("Student", studentSchema);