var mongoose = require("mongoose");

var slotSchema = mongoose.Schema({
   sdate: {
      type: Date,
      required: true,
      unique: true
   },
   max: Number, // nbr of students allowed in slot
   avCnt: Number // available count
});

module.exports = mongoose.model("Slot", slotSchema);
