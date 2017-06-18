var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var School = require("../models/school");
var Slot = require("../models/slot");
var middleware = require("../middleware");
// var request = require("request");
var async = require('async');

// List Students (all or by school)
router.get("/", middleware.isLoggedIn,
    function (req, res, next) {
        if (res.locals.currentUser.role == 'role_sc') {
            // console.log("skipping to next students handler");
            next();
        }
        else { // list all students
            // console.log("after next");
            Student.find()
                .populate('day', 'date')
                .populate('slot', 'time')
                .sort({
                    fname: 1,
                    lname: 1
                })
                .exec(function (err, queryResponse) {
                    if (err) {
                        console.log(err.errmsg);
                        req.flash("error", "System Error: " + err.message);
                        res.redirect("back");
                    }
                    else {
                        // console.log("school=" + qrySchool);
                        res.render("students/index", {
                            students: queryResponse
                        });
                    }
                });
        }
    },
    function (req, res) { //  List students for school counselor
        School.findOne({
                name: res.locals.currentUser.school
            })
            .exec(function (err, qrySchool) {
                if (err) {
                    console.log(err.errmsg);
                    req.flash("error", "System Error: " + err.message);
                    return res.redirect("back");
                }
                if (qrySchool == null) {
                    console.log("School missing from database: " + res.locals.currentUser.school);
                    req.flash("error", "School missing from database: " + res.locals.currentUser.school);
                    return res.redirect("back");
                }
                // console.log("in list students for a school");
                Student.find({
                        school: res.locals.currentUser.school
                    })
                    .populate('day', 'date')
                    .populate('slot', 'time')
                    // Alternate syntax that also works:
                    // .populate({
                    //     path: 'day',
                    //     select: 'date'
                    // }).populate({
                    //     path: 'slot',
                    //     select: 'time'
                    // })
                    .exec(function (err, queryResponse) {
                        if (err) {
                            console.log(err);
                            req.flash("error", "System Error: " + err.message);
                            return res.redirect("back");
                        }
                        // console.log("school=" + qrySchool);
                        res.render("students/bySchool", {
                            students: queryResponse,
                            qrySchool: qrySchool
                        });
                    });
            });
    }
);

function firstLetterUpCase(val) {
    if (val == null) {
        return "";
    }
    var str = val.toString().trim();
    if (str.length > 0) {
        var s = str[0].toUpperCase() + str.substring(1, str.length);
        return s;
    }
    return str;
}

// formats student attributes; returns error message or empty string if no errors
function studentValid(student) {
    student.fname = firstLetterUpCase(student.fname);
    student.lname = firstLetterUpCase(student.lname);
    student.gender = firstLetterUpCase(student.gender);
    student.grade = student.grade.toString().trim();
    if (student.fname == "" || student.lname == "" || student.grade == "") {
        return "first name, last name, and grade are required fields";
    }
    var len = student.grade.length;
    if ((len == 1 && (student.grade < "1" || student.grade > "9")) ||
        (len == 2 && (student.grade < "10" || student.grade > "12")) ||
        (len < 1) || (len > 2)
    ) {
        return "grade must be a number from 1 to 12";
    }
    return "";
}

//CREATE - add new student to DB
router.post("/", middleware.isLoggedIn, function (req, res) {

    var studentData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade,
        school: res.locals.currentUser.school,
        day: null,
        slot: null
    };

    var result = studentValid(studentData);
    if (result == "") {
        Student.create(studentData, function (err, newStudent) {
            if (err) {
                console.log("create failed: " + err.message);
                res.status(500).send(err.message);
            }
            else {
                res.json(newStudent);
            }
        });
    }
    else {
        res.status(500).send(result);
    }
});

// Find student and render form
router.get("/:id/edit", middleware.isLoggedIn, function (req, res) {
    Student.findById(req.params.id, function (err, foundStudent) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("students/edit", {
                student: foundStudent
            });
        }
    });
});

// Update student in database
router.put("/:id", function (req, res) {
    var newData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade
    };

    var result = studentValid(newData);
    if (result == "") {
        Student.findByIdAndUpdate(req.params.id, {
            $set: newData
        }, function (err, student) {
            if (err) {
                console.log("edit database error");
                req.flash("error", err.message);
                res.redirect("back");
            }
            else {
                // console.log("Updating student");
                req.flash("success", "Successfully Updated!");
                res.redirect("/students");
            }
        });
    }
    else {
        console.log("edit validation error");
        req.flash("error", result);
        res.redirect("back");
    }
});

// Returns index of item in array arr if present; otherwise returns null
function getItemIndex(arr, item) {
    for (var i = 0, iLen = arr.length; i < iLen; i++) {
        if (arr[i] == item) return i;
    }
    return null;
}

// Delete student
router.delete("/:studentId", middleware.isLoggedIn, function (req, res) {
    // console.log("student to delete=" + req.params.studentId);
    Student.findOneAndRemove({
        _id: req.params.studentId
    }, function (err, student) {
        if (err) {
            console.log("Error deleting student: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        if (student.slot != null) {
            Slot.findById(student.slot, function (err, slot) {
                if (err) {
                    console.log("Error finding slot: " + err.message);
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                var delIndex = getItemIndex(slot.students, req.params.studentId);
                // console.log("delIndex=" + delIndex);
                if (delIndex == null) {
                    var err = "Error: student not found in slot";
                    console.log(err);
                    req.flash("error", err);
                    return res.redirect("back");
                }
                // console.log("slot.students before: " + slot.students);
                slot.students.splice(delIndex, 1);
                // console.log("slot.students after: " + slot.students);
                slot.save(function (err) {
                    if (err) {
                        console.log("Error saving updated slot: " + err.message);
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                });
            });
        }
        req.flash("success", "Deleted " + student.fullName);
        res.redirect("back");
    });
});


// generate students for capacity testing
router.get("/genStuds", function (req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }
    School.find(function (err, schools) {
        if (err) {
            console.log("error finding schools");
            req.flash("error", err.msg);
            return res.redirect("back");
        }

        var schoolNbr = 0;
        async.whilst(
            function () {
                return schoolNbr < schools.length;
            },
            function (schoolCallback) {
                //console.log("school iteratee called for schoolNbr=" + schoolNbr);
                Student.find({
                        school: schools[schoolNbr].name
                    })
                    .count(function (err, nbrStuds) {
                        if (err) {
                            console.log("Error finding students!");
                            nbrStuds = 0;
                        }

                        var studNbr = nbrStuds;
                        async.whilst(
                            function () {
                                return studNbr < schools[schoolNbr].quota;
                            },
                            function (studentCallback) {
                                //console.log("student iteratee called for studNbr=" + studNbr);
                                var student = {
                                    fname: "Fname" + studNbr,
                                    lname: "Lname" + schoolNbr,
                                    gender: "G",
                                    grade: "1",
                                    school: schools[schoolNbr].name,
                                    day: null,
                                    slot: null
                                };
                                // save student
                                Student.create(student, function (err) {
                                    if (err) {
                                        console.log("Error, studNbr=" + studNbr + " student=" + student.lname + " ," + student.fname + ", " + err.message);
                                    }
                                    else {
                                        //console.log("created student=" + student.lname + " ," + student.fname);
                                    }
                                    studNbr++;
                                    //console.log("calling studentCallback with studNbr=" + studNbr);
                                    studentCallback(null); // don't stop for errors                
                                });
                            },
                            function (err) {
                                if (err) {
                                    console.log("error while creating students for school=" + schools[schoolNbr].name);
                                }
                                schoolNbr++;
                                //console.log("calling schoolCallback with schoolNbr=" + schoolNbr);
                                schoolCallback(err);
                            }
                        );
                    });
            },
            function (err) {
                if (err) {
                    console.log("error after creating students for school=" + schools[schoolNbr].name);
                }
                schoolNbr++;
            });
    });
    res.redirect("/events");
});

module.exports = router;
