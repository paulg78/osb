var mongoose = require("mongoose");

var daySchema = new mongoose.Schema({
   date: Date,
   slots: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot"
   }]
});

module.exports = mongoose.model("Day", daySchema);
