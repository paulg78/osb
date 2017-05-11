var mongoose = require("mongoose");

var daySchema = new mongoose.Schema({
   date: String,
   slots: [{
         type: mongoose.Schema.Types.ObjectId,
         ref: "Slot"
      }]
      // slots: [{
      //    time: String,
      //    max: Number,
      //    students: [{
      //       type: mongoose.Schema.Types.ObjectId,
      //       ref: "Student"
      //    }]
      // }]
});

module.exports = mongoose.model("Day", daySchema);
