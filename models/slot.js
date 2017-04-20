var mongoose = require("mongoose");
// var Schema = mongoose.Schema;

// original version
// var slotSchema = new mongoose.Schema({
//    time: String,
//    max: Number,
//    students: [Schema.Types.ObjectId]
// });

var slotSchema = mongoose.Schema({
   time: String,
   max: Number,
   students: [
      {
         type: mongoose.Schema.Types.ObjectId, 
         ref: "Student"
      }]
});


// var daySchema = new mongoose.Schema({
//    date: String,
//    slots: [ Schema.Types.ObjectId ]
// });

// module.exports = mongoose.model("Day", daySchema);
module.exports = mongoose.model("Slot", slotSchema);