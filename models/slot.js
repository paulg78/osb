var mongoose = require("mongoose");

var slotSchema = mongoose.Schema({
   sdate: Date,
   max: Number, // students allowed in slot
   count: Number // students in slot
});

slotSchema.virtual('remaining').get(function() {
   return this.max - this.count;
});

module.exports = mongoose.model("Slot", slotSchema);
