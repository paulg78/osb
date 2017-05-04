var mongoose = require("mongoose");

var studentSchema = new mongoose.Schema({
   fname: String,
   lname: String,
   gender: String,
   grade: String,
   school: String,
   slot: mongoose.Schema.Types.ObjectId
});

studentSchema.virtual('fullName').get(function () {
  return this.fname + ' ' + this.lname;
});

module.exports = mongoose.model("Student", studentSchema);