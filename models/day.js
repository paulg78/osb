var mongoose = require("mongoose");

// var slotSchema = new mongoose.Schema({
//    time: String,
//    max: Number,
//    students: [Schema.Types.ObjectId]
// });

var daySchema = new mongoose.Schema({
   date: String,
   slots: [ 
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Slot"
      }
   ]
});

module.exports = mongoose.model("Day", daySchema);
// module.exports = mongoose.model("Slot", slotSchema);