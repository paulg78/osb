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
    school: String, // no longer used; was school name
    schoolCode: { // used as a key to school
        type: String
    },
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot'
    },
    served: {
        type: Boolean
    }
});

studentSchema.virtual('fullName').get(function() {
    return this.fname + ' ' + this.lname;
});

studentSchema.virtual('servedyn').get(function() {
    if (this.served) {
        return "yes";
    }
    else {
        return "no";
    }
});

module.exports = mongoose.model("Student", studentSchema);
