var mongoose = require("mongoose");

var eventSchema = new mongoose.Schema({
   name: String,
   days: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Day"
   }]
});

module.exports = mongoose.model("Event", eventSchema);
