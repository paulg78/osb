var mongoose = require("mongoose");

var eventSchema = new mongoose.Schema({
   name: String,
   days: [{
         type: mongoose.Schema.Types.ObjectId,
         ref: "Day"
      }]
      // days: [{
      //    date: String,
      //    slots: [{
      //       time: String,
      //       max: Number,
      //       students: [{
      //          type: mongoose.Schema.Types.ObjectId,
      //          ref: "Student"
      //       }]
      //    }]
      // }]
});

module.exports = mongoose.model("Event", eventSchema);
