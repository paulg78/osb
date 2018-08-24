var express = require("express");
var router = express.Router();
var Day = require("../models/day");
var Student = require("../models/student");
var School = require("../models/school");
var Slot = require("../models/slot");
var middleware = require("../middleware");
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
                .sort({ "lname": 1, "fname": 1 })
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
                            students: queryResponse,
                            hideFilter: false,
                            h1suffix: ""
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

router.get("/:dateSched", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    // logger.debug("req.params.dateSched=" + req.params.dateSched);
    Day.findOne({ date: new Date(req.params.dateSched) }, { _id: 0 })
        .populate('slots', { _id: 1 })
        .exec(function (err, foundDay) {
            if (err) {
                logger.error(err);
                req.flash("error", "System error:" + err.message);
                return res.redirect("back");
            }
            else {
                // logger.debug("foundDay=" + foundDay);
                // logger.debug("foundDay=" + JSON.stringify(foundDay));
                // logger.debug("foundDay.slots[2]=" + foundDay.slots[2]);
                // find the students scheduled for this day
                Student.find({ slot: { $in: foundDay.slots } })
                    .populate('slot', { sdate: 1, _id: 0 })
                    .exec(
                        function (err, queryResponse) {
                            if (err) {
                                logger.error(err);
                            }
                            else {
                                // logger.debug("queryResponse=" + queryResponse);
                                res.render("students/index", {
                                    students: queryResponse,
                                    hideFilter: true,
                                    h1suffix: "Scheduled for " + foundDay.date.toLocaleDateString("en-US", { weekday: 'long', year: '2-digit', month: '2-digit', day: 'numeric' })
                                });
                            }
                        });
            }
        });
});

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
    if (student.fname == "" || student.lname == "" || student.grade == undefined) {
        return "first name, last name, and grade are required fields";
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

// Find student and render edit form
router.get("/:id/edit", middleware.isLoggedIn, function (req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, slot: 1, served: 1 })
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

// Find student and render passport form
router.get("/:id/printPass", middleware.isLoggedIn, function (req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, slot: 1, served: 1, school: 1 })
        .populate('slot', { _id: 1, sdate: 1 })
        .exec(function (err, foundStudent) {
            if (err) {
                logger.error(err);
            }
            else {
                if (foundStudent == null) {
                    return res.redirect("/students");
                }
                // don't show passport for students already served or not scheduled
                if (foundStudent.served || foundStudent.slot == null) {
                    return res.redirect("/students");
                }
                res.render("students/printPass", {
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
    if (result == "") {
        async.waterfall([
            updateNewSlot,
            updateStudent,
            updateOldSlot,
        ], function (err) {
            if (err) {
                logger.error(err.message);
                req.flash("error", "Changes not saved: " + err.message);
                res.redirect("back");
            }
            else {
                req.flash("success", "Successfully Updated " + newData.fname + " " + newData.lname + ".");
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
                                        ") filled before you saved changes."
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

    function updateStudent(newSlotId, callback) {
        logger.debug("in updateStudent with newSlotId=" + newSlotId);
        newData.slot = newSlotId;
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
    var newVal = req.params.served == "no";
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
