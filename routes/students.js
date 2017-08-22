var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var School = require("../models/school");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var shared = require("../shared");
var async = require('async');
/* global logger */

// List Students (all or by school)
router.get("/", middleware.isLoggedIn,
    function (req, res, next) {
        if (res.locals.currentUser.role == 'role_sc') {
            logger.debug("skipping to next students handler");
            next();
        }
        else { // list all students
            logger.debug("after next");
            Student.find()
                .populate('day', 'date')
                .populate('slot', 'time')
                .sort({
                    fname: 1,
                    lname: 1
                })
                .exec(function (err, queryResponse) {
                    if (err) {
                        logger.error(err.errmsg);
                        req.flash("error", "System Error: " + err.message);
                        res.redirect("back");
                    }
                    else {
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
                    logger.error(err.errmsg);
                    req.flash("error", "System Error: " + err.message);
                    return res.redirect("back");
                }
                if (qrySchool == null) {
                    logger.info("School missing from database: " + res.locals.currentUser.school);
                    req.flash("error", "School missing from database: " + res.locals.currentUser.school);
                    return res.redirect("back");
                }
                logger.debug("in list students for a school");
                Student.find({
                        school: res.locals.currentUser.school
                    })
                    .populate('day', 'date')
                    .populate('slot', 'time')
                    .sort({
                        fname: 1,
                        lname: 1
                    })
                    .exec(function (err, queryResponse) {
                        if (err) {
                            logger.error(err);
                            req.flash("error", "System Error: " + err.message);
                            return res.redirect("back");
                        }
                        logger.debug("school=" + qrySchool);
                        var today = new Date();
                        var day = today.getDate();
                        var month = today.getMonth() + 1;
                        if (day < 10) {
                            day = '0' + day;
                        }
                        if (month < 10) {
                            month = '0' + month;
                        }
                        res.render("students/bySchool", {
                            todayMMDD: month + day,
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
    student.grade = student.grade.toString().trim().toUpperCase();
    if (student.fname == "" || student.lname == "" || student.grade == "") {
        return "first name, last name, and grade are required fields";
    }
    var len = student.grade.length;
    if ((len == 1 && (student.grade < "1" || student.grade > "9") && student.grade != "K") ||
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
        grade: req.body.grade,
        school: res.locals.currentUser.school,
        day: null,
        slot: null,
        served: false
    };

    var result = studentValid(studentData);
    if (result == "") {
        Student.create(studentData, function (err, newStudent) {
            if (err) {
                logger.error("create failed: " + err.message);
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
            logger.error(err);
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
        grade: req.body.grade
    };

    var result = studentValid(newData);
    if (result == "") {
        Student.findByIdAndUpdate(req.params.id, {
            $set: newData
        }, function (err) {
            if (err) {
                logger.error("edit database error");
                req.flash("error", err.message);
                res.redirect("back");
            }
            else {
                logger.debug("Updating student");
                req.flash("success", "Successfully Updated!");
                res.redirect("/students");
            }
        });
    }
    else {
        logger.error("edit validation error");
        req.flash("error", result);
        res.redirect("back");
    }
});

// Check In
router.put("/:id/checkIn/:served", function (req, res) {
    logger.debug("req.params.served=" + req.params.served);
    var newVal = req.params.served == "false";
    Student.findByIdAndUpdate(req.params.id, {
        $set: {
            served: newVal
        }
    }, function (err) {
        if (err) {
            logger.error("checkin failed: " + err.message);
            res.status(500).send(err.message);
        }
        else {
            res.json(newVal);
        }
    });
});


// Delete student
router.delete("/:studentId", middleware.isLoggedIn, function (req, res) {
    logger.debug("student to delete=" + req.params.studentId);
    Student.findOneAndRemove({
        _id: req.params.studentId
    }, function (err, student) {
        if (err) {
            logger.error("Error deleting student: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        if (student.slot != null) {
            Slot.findById(student.slot, function (err, slot) {
                if (err) {
                    logger.error("Error finding slot: " + err.message);
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                var delIndex = shared.getItemIndex(slot.students, req.params.studentId);
                logger.debug("delIndex=" + delIndex);
                if (delIndex == null) {
                    var err = "Error: student not found in slot";
                    logger.error(err);
                    req.flash("error", err);
                    return res.redirect("back");
                }
                logger.debug("slot.students before: " + slot.students);
                slot.students.splice(delIndex, 1);
                logger.debug("slot.students after: " + slot.students);
                slot.save(function (err) {
                    if (err) {
                        logger.error("Error saving updated slot: " + err.message);
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
            logger.error("error finding schools");
            req.flash("error", err.msg);
            return res.redirect("back");
        }

        var schoolNbr = 0;
        async.whilst(
            function () {
                return schoolNbr < schools.length;
            },
            function (schoolCallback) {
                //logger.info("school iteratee called for schoolNbr=" + schoolNbr);
                Student.find({
                        school: schools[schoolNbr].name
                    })
                    .count(function (err, nbrStuds) {
                        if (err) {
                            logger.error("Error finding students!");
                            nbrStuds = 0;
                        }

                        var studNbr = nbrStuds;
                        async.whilst(
                            function () {
                                return studNbr < schools[schoolNbr].quota;
                            },
                            function (studentCallback) {
                                //logger.info("student iteratee called for studNbr=" + studNbr);
                                var student = {
                                    fname: "Fname" + studNbr,
                                    lname: "Lname" + schoolNbr,
                                    grade: "1",
                                    school: schools[schoolNbr].name,
                                    day: null,
                                    slot: null,
                                    served: false
                                };
                                // save student
                                Student.create(student, function (err) {
                                    if (err) {
                                        logger.error("Error, studNbr=" + studNbr + " student=" + student.lname + " ," + student.fname + ", " + err.message);
                                    }
                                    else {
                                        //logger.info("created student=" + student.lname + " ," + student.fname);
                                    }
                                    studNbr++;
                                    //logger.info("calling studentCallback with studNbr=" + studNbr);
                                    studentCallback(null); // don't stop for errors
                                });
                            },
                            function (err) {
                                if (err) {
                                    logger.error("error while creating students for school=" + schools[schoolNbr].name);
                                }
                                schoolNbr++;
                                //logger.info("calling schoolCallback with schoolNbr=" + schoolNbr);
                                schoolCallback(err);
                            }
                        );
                    });
            },
            function (err) {
                if (err) {
                    logger.error("error after creating students for school=" + schools[schoolNbr].name);
                }
                schoolNbr++;
            });
    });
    res.redirect("/events");
});

module.exports = router;
