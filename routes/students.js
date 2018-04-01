var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var School = require("../models/school");
var Slot = require("../models/slot");
var Day = require("../models/day");
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
            Student.find()
                .hint("fname_1_lname_1")
                .populate('slot', { sdate: 1, _id: 0 })
                .exec(function (err, queryResponse) {
                    if (err) {
                        logger.error(err.message);
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
                    .populate('slot', { sdate: 1, _id: 0 })
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
                        var mm = (today.getMonth() + 1).toString();
                        if (mm.length == 1) {
                            mm = "0" + mm;
                        }
                        var dd = today.getDate().toString();
                        if (dd.length == 1) {
                            dd = "0" + dd;
                        }
                        res.render("students/bySchool", {
                            todayMMDD: mm + dd,
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

    var errMsg = studentValid(studentData);

    if (errMsg == "") {
        getRemaining(studentData.school, function (remain) {
            // logger.debug("remain=" + remain);
            if (remain > 0) {
                Student.create(studentData, function (err, newStudent) {
                    if (err) {
                        logger.error("create failed: " + err.message);
                        res.json({ "msg": err.message });
                    }
                    else {
                        res.json({ "student": newStudent, "remaining": remain - 1 });
                    }
                });
            }
            else {
                res.json({ "remaining": 0, "msg": "Allotment used; student not added." });
            }
        });
    }
    else {
        res.json({ "msg": errMsg });
    }
});

// Find student and render form
// router.get("/:id/edit", middleware.isLoggedIn, function (req, res) {
router.get("/:id/edit", function (req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, day: 1, slot: 1 })
        // .populate('day', { _id: 0, date: 1 })
        .populate('slot', { _id: 1, sdate: 1 })
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


// Update student/slots in database
router.put("/:id", function (req, res) {
    var newData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        grade: req.body.grade
    };
    logger.debug("req.body=" + JSON.stringify(req.body, null, 2));

    var result = studentValid(newData);
    // verify that time is present if date is present
    if (req.body.dateSched && !req.body.timeSched) {
        result = "Date and Time are required to schedule a student.";
    }
    if (result == "") {
        async.waterfall([
            updateNewSlot,
            findNewDay,
            updateStudent,
            updateOldSlot,
        ], function (err, avail) {
            if (err) {
                logger.error(err.message);
                req.flash("error", "Changes not saved: " + err.message);
                res.redirect("back");
            }
            else {
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

    function updateNewSlot(callback) {
        logger.debug("in updateNewSlot");
        if (req.body.timeSched) { // there is a new slot
            Slot.findOneAndUpdate({ sdate: new Date(req.body.timeSched) }, {
                $inc: { count: 1 }
            }, {
                projection: { _id: 1, count: 1, max: 1 },
                returnNewDocument: false // returns count before increment, true doesn't seem to work
            }, function (err, slot) {
                logger.debug("slot before update=" + slot);
                if (err) {
                    callback(err, null);
                }
                else {
                    if (slot.count >= slot.max) { // slot is over-filled (count is one less than actual)
                        // restore original since slot is full and student won't be added
                        Slot.findByIdAndUpdate(slot._id, {
                                $inc: { count: -1 }
                            },
                            function (err) {
                                if (err) {
                                    callback(err, null);
                                }
                                else {
                                    callback({
                                        message: "Selected slot (" +
                                            new Date(req.body.timeSched).
                                        toLocaleDateString("en-US", { year: '2-digit', month: '2-digit', day: 'numeric', hour: '2-digit', minute: '2-digit' }) +
                                        ") is already full."
                                    }, null);
                                }
                            });
                    }
                    else {
                        callback(null, slot._id);
                    }
                }
            });
        }
        else {
            callback(null, null);
        }
    }

    function findNewDay(newSlotId, callback) {
        logger.debug("in findNewDay with newSlotId=" + newSlotId);
        if (newSlotId) { // student has new slot so find corresponding day Id
            Day.findOne({ slots: newSlotId }, { _id: 1 }, function (err, day) {
                if (err) {
                    callback(err, newSlotId, null);
                }
                else {
                    logger.debug("day=" + day);
                    callback(null, newSlotId, day._id);
                }
            });
        }
        else {
            callback(null, newSlotId, null);
        }
    }

    function updateStudent(newSlotId, newDayId, callback) {
        logger.debug("in updateStudent with newDayId=" + newDayId);
        newData.slot = newSlotId;
        newData.day = newDayId;
        Student.findByIdAndUpdate(req.params.id, newData, {
                projection: { slot: 1 },
                returnNewDocument: false // returns student before update
            },
            function (err, student) {
                if (err) {
                    callback(err);
                }
                else {
                    logger.debug("student=" + student);
                    callback(null, student.slot);
                }
            });
    }

    function updateOldSlot(oldSlotId, callback) {
        logger.debug("in updateOldSlot with oldSlotId=" + oldSlotId);
        if (oldSlotId) { // student was scheduled
            Slot.findByIdAndUpdate(oldSlotId, {
                $inc: { count: -1 }
            }, {
                projection: { _id: 1, count: 1, max: 1 },
                returnNewDocument: false // returns count before increment, true doesn't seem to work
            }, function (err, slot) {
                logger.debug("slot before update=" + slot);
                // can't handle error at this point
                callback(null);
            });
        }
        else {
            callback(null);
        }
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
                Slot.findByIdAndUpdate(student.slot, {
                        $inc: { count: -1 }
                    },
                    function (err) {
                        if (err) {
                            logger.error("delete student, decrementing count" + err.message);
                        }
                    });
            }
            // req.flash("success", "Deleted " + student.fullName);
            req.flash("success", "Deleted " + student.fullName);
            res.redirect("/students");
        }
        else {
            req.flash("success", "Student deleted ");
            res.redirect("/students");
        }
    });
});

module.exports = router;
