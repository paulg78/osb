var mongoose = require("mongoose");

var userUpdateSchema = mongoose.Schema({
   updateDate: Date,
   creates: String, // also includes name updates
   deletes: String
});

module.exports = mongoose.model("UserUpdate", userUpdateSchema);
