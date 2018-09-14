var mongoose = require("mongoose");

var slotSchema = mongoose.Schema({
   sdate: Date,
   max: Number, // students allowed in slot
   count: Number // students in slot
});

module.exports = mongoose.model("Slot", slotSchema);
