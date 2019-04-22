var mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    fname: {
        type: String
    },
    lname: {
        type: String
    },
    grade: {
        type: String
    },
    schoolCode: { // used as a key to school
        type: String
    },
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot'
    },
    served: {
        type: Boolean
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

studentSchema.virtual('school', {
    ref: 'School',
    localField: 'schoolCode',
    foreignField: 'schoolCode',
    justOne: true
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
