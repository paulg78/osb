var mongoose = require("mongoose");

var slotSchema = mongoose.Schema({
   time: String,
   max: Number,
   students: [
      {
         type: mongoose.Schema.Types.ObjectId, 
         ref: "Student"
      }]
});

module.exports = mongoose.model("Slot", slotSchema);