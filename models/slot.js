var mongoose = require("mongoose");

var slotSchema = mongoose.Schema({
   sdate: Date,
   max: Number, // nbr of students allowed in slot
   avCnt: Number // available count
});

module.exports = mongoose.model("Slot", slotSchema);
