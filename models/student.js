var mongoose = require("mongoose");

var studentSchema = new mongoose.Schema({
    fname: {
        type: String
    },
    lname: {
        type: String
    },
    grade: {
        type: String
    },
    school: String,
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot'
    },
    served: {
        type: Boolean
    }
});

studentSchema.virtual('fullName').get(function () {
    return this.fname + ' ' + this.lname;
});

module.exports = mongoose.model("Student", studentSchema);
