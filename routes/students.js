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
            // logger.debug("skipping to next students handler");
            next();
        }
        else { // list all students
            // logger.debug("after next");
            Student.find({}, { _id: 0 })
                .populate('day', { date: 1, _id: 0 })
                .populate('slot', { time: 1, _id: 0 })
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
                        // logger.debug("queryResponse=" + queryResponse);
                        res.render("students/index", {
                            students: queryResponse
                        });
                    }
                });
        }
    },
    function (req, res) { //  List students for school
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
                // logger.debug("in list students for a school");
                Student.find({
                        school: res.locals.currentUser.school
                    }, { school: 0 })
                    .populate('day', { date: 1, _id: 0 })
                    .populate('slot', { time: 1, _id: 0 })
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
                        // logger.debug("qrySchool=" + qrySchool);
                        // logger.debug("queryResponse=" + queryResponse);
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
        return "grade must be K or a number from 1 to 12";
    }
    return "";
}

function getRemaining(school, callbackfunction) {
    School.findOne({
            name: school
        }, { _id: 0, quota: 1 })
        .exec(function (err, qrySchool) {
            if (err) {
                logger.error("getRemaining, finding school, " + err.errmsg);
                callbackfunction(0);
            }
            else {
                if (qrySchool == null) {
                    logger.error("getRemaining, School missing: " + school);
                    callbackfunction(0);
                }
                else {
                    // logger.debug("qrySchool=" + qrySchool);
                    Student.count({
                            school: school
                        })
                        .exec(function (err, cnt) {
                            if (err) {
                                logger.error("getRemaining, getting student count, " + err.errmsg);
                                callbackfunction(0);
                            }
                            else {
                                callbackfunction(qrySchool.quota - cnt);
                            }
                        });
                }
            }
        });
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
        getRemaining(studentData.school, function (remain) {
            // logger.debug("remain=" + remain);
            if (remain > 0) {
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
                res.status(500).send("Allotment used; student not added.");
            }
        });
    }
    else {
        res.status(500).send(result);
    }
});

// Find student and render form
router.get("/:id/edit", middleware.isLoggedIn, function (req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, day: 1, slot: 1 })
        .populate('day', { _id: 0, date: 1 })
        .populate('slot', { _id: 1, time: 1 })
        .exec(function (err, foundStudent) {
            if (err) {
                logger.error(err);
            }
            else {
                if (foundStudent == null) {
                    return res.redirect("back");
                }
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
    // logger.debug("req.body=" + JSON.stringify(req.body, null, 2));

    var result = studentValid(newData);
    if (result == "") {
        if (req.body.unschedule == "y") { // remove appointment from student
            newData.day = null;
            newData.slot = null;
        }
        Student.findByIdAndUpdate(req.params.id, {
                $set: newData
            }, {
                projection: { _id: 1, slot: 1 },
            },
            function (err, student) {
                if (err) {
                    logger.error("edit student" + err.message);
                    req.flash("error", err.message);
                    res.redirect("back");
                }
                else {
                    // logger.debug("student=" + student);
                    if (req.body.unschedule == "y") { // remove student from slot
                        Slot.findById(student.slot, function (err, slot) {
                            if (err) {
                                logger.error("edit student, find slot" + err.message);
                            }
                            else {
                                if (slot == null) {
                                    logger.error("edit student, slot not found");
                                }
                                else {
                                    // logger.debug("slot before=" + slot);

                                    var delIndex = shared.getItemIndex(slot.students, student._id.toString());
                                    // logger.debug("delIndex=" + delIndex);
                                    if (delIndex == null) {
                                        logger.error("edit student: student not found in slot");
                                    }
                                    else {
                                        // "clever" use of splice to remove elements
                                        // The first parameter defines the (0 relative) position where elements will be deleted.
                                        // The second parameter defines how many elements will be removed.
                                        slot.students.splice(delIndex, 1);
                                        // logger.debug("slot after=" + slot);
                                        slot.count--;
                                        slot.save(function (err) {
                                            if (err) {
                                                logger.error("edit student, save slot" + err.message);
                                            }
                                        });
                                    }
                                }

                            }
                        });
                    }
                    // logger.debug("Updating student");
                    req.flash("success", "Successfully Updated!");
                    res.redirect("/students");
                }
            });
    }
    else {
        // logger.debug("edit validation error");
        req.flash("error", result);
        res.redirect("back");
    }
});

// Check In
router.put("/:id/checkIn/:served", function (req, res) {
    // logger.debug("req.params.served=" + req.params.served);
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
    // logger.debug("student to delete=" + req.params.studentId);
    Student.findOneAndRemove({
        _id: req.params.studentId
    }, function (err, student) {
        if (err) {
            logger.error("Error deleting student: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        if (student != null) { // need null check in case student has been deleted in another window
            if (student.slot != null) {
                Slot.findById(student.slot, function (err, slot) {
                    if (err) {
                        logger.error("DelStud: Error finding slot: " + err.message);
                        return;
                    }
                    if (slot == null) {
                        logger.error("DelStud: slot not found");
                        return;
                    }
                    var delIndex = shared.getItemIndex(slot.students, req.params.studentId);
                    // logger.debug("delIndex=" + delIndex);
                    if (delIndex == null) {
                        logger.error("DelStud: student not found in slot");
                        return;
                    }
                    // logger.debug("slot.students before: " + slot.students);
                    slot.students.splice(delIndex, 1);
                    // logger.debug("slot.students after: " + slot.students);
                    slot.count--;
                    slot.save(function (err) {
                        if (err) {
                            logger.error("DelStud: Error saving updated slot: " + err.message);
                            return;
                        }
                    });
                });
            }
            req.flash("success", "Deleted " + student.fullName);
        }
        else {
            req.flash("success", "Student deleted ");
        }
        res.redirect("back");
    });
});

module.exports = router;
