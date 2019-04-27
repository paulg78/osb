var mongoose = require("mongoose");

var schoolSchema = new mongoose.Schema({
    name: {
        type: String
    },
    schoolCode: {
        type: String,
        required: true,
        unique: true
    },
    quota: Number,
    district: String
}, { toJSON: { virtuals: true } });

schoolSchema.virtual('students', {
    ref: 'Student',
    localField: 'schoolCode',
    foreignField: 'schoolCode',
    justOne: false,
    options: { sort: { fname: 1, lname: 1 } }
});

schoolSchema.virtual('nbrStudents', {
    ref: 'Student',
    localField: 'schoolCode',
    foreignField: 'schoolCode',
    count: true
});

schoolSchema.virtual('nbrUsers', {
    ref: 'User',
    localField: 'schoolCode',
    foreignField: 'schoolCode',
    count: true
});

module.exports = mongoose.model("School", schoolSchema);
