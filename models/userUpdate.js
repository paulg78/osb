var mongoose = require("mongoose");

var userUpdateSchema = mongoose.Schema({
   updateDate: Date,
   creates: String,
   updates: [],
   deletes: []
});

module.exports = mongoose.model("UserUpdate", userUpdateSchema);
