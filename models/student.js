var mongoose = require("mongoose");

var studentSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    gender: String,
    grade: String,
    school: String,
    day: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Day'
    },
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot'
    }
});

studentSchema.virtual('fullName').get(function () {
    return this.fname + ' ' + this.lname;
});

module.exports = mongoose.model("Student", studentSchema);
