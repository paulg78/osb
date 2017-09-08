var mongoose = require("mongoose");

var slotSchema = mongoose.Schema({
   sdate: Date,
   time: String,
   max: Number, // students allowed in slot
   count: Number, // students in slot
   // students: [{
   //    type: mongoose.Schema.Types.ObjectId,
   //    ref: "Student"
   // }]
});

module.exports = mongoose.model("Slot", slotSchema);
