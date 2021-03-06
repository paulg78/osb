var express = require("express");
var router = express.Router();
var Day = require("../models/day");
var Student = require("../models/student");
var School = require("../models/school");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var async = require('async');
var dateFunc = require('../dateFunc');
/* global logger */


// show find/list students form
// List Students (all or by school)
router.get("/showFind", middleware.isLoggedIn,
    function(req, res) {
        if (res.locals.currentUser.role == 'role_sc') {
            res.redirect("back");
        }
        else {
            res.render("students/find");
        }
    });

// Return list of students per find criteria
router.get("/find", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }

    function studentRay(students) {
        var studRay = [];
        // had to brute force this because school name wouldn't populate
        students.forEach(function(student) {
            studRay.push({
                fname: student.fname,
                lname: student.lname,
                schoolName: student.school ? student.school.name : '',
                grade: student.grade,
                scName: student.addedBy ? student.addedBy.name : '',
                dateStr: student.slot ? dateFunc.DTstring(student.slot.sdate) : '',
                served: student.served,
                _id: student._id
            });
        });
        return studRay;
    }

    // search on schoolCode or last name
    if (req.query.schoolCode) {
        // logger.debug('schoolCode=' + req.query.schoolCode);

        Student.find({ schoolCode: req.query.schoolCode })
            .sort({ "lname": 1, "fname": 1 })
            .populate('slot', { _id: 0, sdate: 1 })
            .populate('school', { name: 1 })
            .populate('addedBy', { _id: 0, name: 1 })
            .exec(function(err, students) {
                if (err) {
                    logger.error("error finding students: " + err.message);
                    res.status(500).send(err.message);
                }
                else {
                    res.json(studentRay(students));
                }
            });
    }
    else {
        // logger.debug('lname=' + req.query.lastName);
        // could return a lot of matches so limit to 20
        Student.find({ lname: { $regex: new RegExp('.*' + req.query.lastName + '.*'), $options: 'i' } })
            .limit(20)
            .sort({ "lname": 1, "fname": 1 })
            .populate('slot', { _id: 0, sdate: 1 })
            .populate('school', { name: 1 })
            .populate('addedBy', { _id: 0, name: 1 })
            .exec(function(err, students) {
                if (err) {
                    logger.error("error finding students: " + err.message);
                    res.status(500).send(err.message);
                }
                else {
                    res.json(studentRay(students));
                }
            });
    }
});

// List Students (all or by school)
router.get("/", middleware.isLoggedIn,
    function(req, res, next) {
        if (res.locals.currentUser.role == 'role_sc') {
            // logger.debug("skipping to next students handler");
            next();
        }
        else { // list all students (only used by web admin)
            // logger.debug("after next");
            Student.find()
                .sort({ "lname": 1, "fname": 1 })
                .populate('slot', { _id: 0, sdate: 1 })
                .populate('school', { _id: 0, name: 1 })
                .populate('addedBy', { _id: 0, name: 1 })
                .exec(function(err, queryResponse) {
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
    function(req, res) { //  List students for school
        School.findOne({
                schoolCode: res.locals.currentUser.schoolCode
            }, { _id: 0, name: 1, quota: 1, schoolCode: 1 })
            .populate({ path: 'students', populate: { path: 'slot', select: 'sdate' } })
            .populate({ path: 'students', populate: { path: 'addedBy', select: 'name' } })
            .exec(function(err, qrySchool) {
                if (err) {
                    logger.error(err.errmsg);
                    req.flash("error", "System Error: " + err.message);
                    return res.redirect("back");
                }
                if (qrySchool == null) {
                    logger.error("School missing from database: " + res.locals.currentUser.schoolCode);
                    req.flash("error", "School missing from database: " + res.locals.currentUser.schoolCode);
                    return res.redirect("back");
                }

                // logger.debug("qrySchool=" + qrySchool);
                // logger.debug("qrySchool.students=" + qrySchool.students);
                var today = new Date();
                var mm = (today.getUTCMonth() + 1).toString();
                if (mm.length == 1) {
                    mm = "0" + mm;
                }
                var dd = today.getUTCDate().toString();
                if (dd.length == 1) {
                    dd = "0" + dd;
                }
                res.render("students/bySchool", {
                    todayMMDD: mm + dd,
                    qrySchool: qrySchool
                });
            });
    }
);

router.get("/schedGrp", middleware.isLoggedIn, function(req, res) {
    // logger.debug('req.query.group=' + req.query.group);
    res.render("students/schedGrp", { groupStr: req.query.group });
});

router.get("/stats", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    var stats = {};
    async.waterfall([
        getCountUnsched,
        getCountSched,
        getCountServed,
        getFutureSlotsAvail,
        getQuotaTotal
    ], function(err, stats) {
        if (err) {
            logger.error(err);
        }
        res.render("students/stats", {
            stats: stats
        });
    });

    function getCountUnsched(callback) {
        Student.countDocuments({
                slot: null
            })
            .exec(function(err, cnt) {
                if (!err) {
                    stats.unsched = cnt;
                }
                callback(err, stats);
            });
    }

    function getCountSched(stats, callback) {
        Student.countDocuments({
                slot: { $ne: null }
            })
            .exec(function(err, cnt) {
                if (!err) {
                    stats.sched = cnt;
                }
                callback(err, stats);
            });
    }

    function getCountServed(stats, callback) {
        Student.countDocuments({
                served: true
            })
            .exec(function(err, cnt) {
                if (!err) {
                    stats.served = cnt;
                }
                callback(err, stats);
            });
    }

    function getFutureSlotsAvail(stats, callback) {
        var d = new Date(Date.now() - 5 * 3600000); // one hour from now in mountain time
        // logger.debug("one hour from now=" + d);
        Slot.aggregate([{
                $match: {
                    $expr: { $gt: ["$sdate", d] }
                }
            }, {
                $group: {
                    _id: null,
                    fsa: {
                        $sum: "$avCnt"
                    }
                }
            }])
            .exec(function(err, slotsAvail) {
                if (!err) {
                    // logger.debug("slotsAvail=" + JSON.stringify(slotsAvail));
                    if (slotsAvail[0]) {
                        stats.futureSlotsAvail = slotsAvail[0].fsa;
                    }
                    else {
                        stats.futureSlotsAvail = 0;
                    }
                    stats.futureDate = dateFunc.DTstring(d);
                }
                callback(err, stats);
            });
    }

    function getQuotaTotal(stats, callback) {
        School.aggregate([{
                $group: {
                    _id: null,
                    qt: {
                        $sum: "$quota"
                    }
                }
            }])
            .exec(function(err, quotaTotal) {
                if (!err) {
                    // logger.debug("quotaTotal=" + JSON.stringify(quotaTotal));
                    stats.totalQuota = quotaTotal[0].qt;
                }
                callback(err, stats);
            });
    }

});


router.get("/:dayId", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    // logger.debug("req.params.dayId=" + req.params.dayId);
    Day.findById(req.params.dayId)
        .populate('slots', { _id: 1 })
        .exec(function(err, foundDay) {
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
                    .populate('slot', { _id: 0, sdate: 1 })
                    .populate('school', { _id: 0, name: 1 })
                    .populate('addedBy', { _id: 0, name: 1 })
                    .exec(
                        function(err, queryResponse) {
                            if (err) {
                                logger.error(err);
                            }
                            else {
                                // logger.debug("queryResponse=" + queryResponse);
                                res.render("students/index", {
                                    students: queryResponse,
                                    hideFilter: true,
                                    h1suffix: "Scheduled for " + dateFunc.dayString(foundDay.date)
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

function getRemaining(schoolCode, callbackfunction) {
    School.findOne({
            schoolCode: schoolCode
        }, { _id: 0, quota: 1, schoolCode: 1 })
        .populate('nbrStudents')
        .exec(function(err, qrySchool) {
            if (err) {
                logger.error("getRemaining, finding school, " + err.errmsg);
                callbackfunction(0);
            }
            else {
                if (qrySchool == null) {
                    logger.error("getRemaining, School missing: " + schoolCode);
                    callbackfunction(0);
                }
                else {
                    // logger.debug("getRemaining: qrySchool=" + qrySchool);
                    // logger.debug("qrySchool.nbrStudents=" + qrySchool.nbrStudents);
                    callbackfunction(qrySchool.quota - qrySchool.nbrStudents);
                }
            }
        });
}

//CREATE - add new student to DB
router.post("/", function(req, res) {
    var studentData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        grade: req.body.grade,
        slot: null,
        served: false
    };
    // Can't use middleware.isLoggedIn with ajax since need to return json
    if (req.isAuthenticated()) {
        studentData.schoolCode = res.locals.currentUser.schoolCode; // can assign school only when logged in
        studentData.addedBy = res.locals.currentUser._id;
    }
    else {
        return res.json({ "msg": "You must be logged in to add a student; student not added." });
    }

    var errMsg = studentValid(studentData);

    if (errMsg == "") {
        getRemaining(studentData.schoolCode, function(remain) {
            // logger.debug("remain=" + remain);
            if (remain > 0) {
                Student.create(studentData, function(err, newStudent) {
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
router.get("/:id/edit", middleware.isLoggedIn, function(req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, slot: 1, served: 1 })
        .populate('slot', { _id: 1, sdate: 1 })
        .exec(function(err, foundStudent) {
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

// Find student and render fix form
router.get("/:id/fix", middleware.isLoggedIn, function(req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, slot: 1, served: 1 })
        .populate('slot', { _id: 1, sdate: 1 })
        .exec(function(err, foundStudent) {
            if (err) {
                logger.error(err);
            }
            else {
                if (foundStudent == null) {
                    return res.redirect("back");
                }
                res.render("students/fix", {
                    student: foundStudent
                });
            }
        });
});

// Find student and render passport form
router.get("/:id/printPass", middleware.isLoggedIn, function(req, res) {
    Student.findById(req.params.id, { fname: 1, lname: 1, grade: 1, slot: 1, served: 1, schoolCode: 1 })
        .populate('slot', { _id: 1, sdate: 1 })
        .populate('school', { _id: 0, name: 1 })
        .exec(function(err, foundStudent) {
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


function fixNewSlot(newTime) {
    return new Promise((resolve, reject) => {
        // logger.debug("in fixNewSlot");
        if (newTime) { // there is a new slot {
            Slot.findOneAndUpdate({ sdate: new Date(newTime) }, {
                $inc: { avCnt: -1 }
            }, {
                projection: { _id: 1 },
            }, function(err, slot) {
                // logger.debug("slot before update=" + slot);
                if (err) {
                    reject(err);
                }
                else {
                    resolve(slot._id);
                }
            });
        }
        else {
            resolve(null);
        }
    });
}


function updateNewSlot(nbrSlots, newTime) {
    return new Promise((resolve, reject) => {
        // logger.debug("in updateNewSlot");
        if (newTime) { // there is a new slot
            Slot.findOneAndUpdate({ sdate: new Date(newTime) }, {
                $inc: { avCnt: -nbrSlots }
            }, {
                projection: { _id: 1, avCnt: 1 },
                returnNewDocument: false // returns avCnt before decrement, true doesn't seem to work
            }, function(err, slot) {
                // logger.debug("slot before update=" + slot);
                if (err) {
                    reject(err);
                }
                else {
                    if (slot.avCnt < nbrSlots - 1) { // slot is over-filled by more than 1 (avCnt is one more than actual)
                        // restore original since slot is full and student won't be added
                        Slot.findByIdAndUpdate(slot._id, {
                                $inc: { avCnt: nbrSlots }
                            },
                            function(err) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    // logger.debug("overfilled slot._id=" + slot._id + "; avCnt=" + slot.avCnt);
                                    reject({
                                        message: "Selected slot (" +
                                            dateFunc.DTstring(new Date(newTime)) +
                                        ") filled before you saved changes."
                                    });
                                }
                            });
                    }
                    else {
                        resolve(slot._id);
                    }
                }
            });
        }
        else {
            resolve(null);
        }
    });
}


function fillSlot(newSlotId, slotRequest) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            updateStudent,
            updateOldSlot
        ], function(err) {
            // logger.debug("ending update waterfall");
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });

        function updateStudent(callback) {
            // logger.debug("in updateStudent with newSlotId=" + newSlotId + ", student id=" + slotRequest._id);
            if (slotRequest.unSched == "y") {
                slotRequest.newData.slot = null;
            }
            else if (newSlotId) {
                slotRequest.newData.slot = newSlotId;
            }
            Student.findByIdAndUpdate(slotRequest._id, slotRequest.newData, {
                    projection: { slot: 1 },
                    returnNewDocument: false // returns student before update
                },
                function(err, student) {
                    // logger.debug("in updateStudent, student=" + student);
                    if (err) {
                        callback(err);
                    }
                    else {
                        if (!student) { // student not found; may have been deleted in another window
                            logger.error("fillslot failed; student _id not found; slotRequest=" + JSON.stringify(slotRequest) + ", Check counts--will be wrong if student was being rescheduled.");
                            callback({
                                studNotFound: true,
                                message: "Student not found; may have been deleted."
                            });
                        }
                        else {
                            callback(null, student.slot, newSlotId);
                        }
                    }
                });
        }

        function updateOldSlot(oldSlotId, newSlotId, callback) {
            // logger.debug("in updateOldSlot with oldSlotId=" + oldSlotId);
            // logger.debug("in updateOldSlot with newSlotId=" + newSlotId);
            if (oldSlotId && (newSlotId || slotRequest.unSched == "y")) { // student was scheduled and is either being unscheduled or rescheduled
                Slot.findByIdAndUpdate(oldSlotId, {
                    $inc: { avCnt: 1 }
                }, {
                    projection: { _id: 1, avCnt: 1 },
                    returnNewDocument: false // returns avCnt before increment, true doesn't seem to work
                }, function(err, slot) {
                    // logger.debug("slot before update=" + slot);
                    // can't handle error at this point
                    callback(null);
                });
            }
            else {
                callback(null);
            }
        }

    });
}


// Update group of student/slots (group schedule)
router.put("/group/:groupStr", function(req, res) {
    // logger.debug("req.body=" + JSON.stringify(req.body, null, 2));
    // logger.debug('req.params.groupStr=' + req.params.groupStr);
    const unsched = req.body.unschedule;
    const group = JSON.parse(req.params.groupStr);

    function filled() {
        var nameStr = "";
        for (const name of group.names) {
            nameStr += ", " + name;
        }
        req.flash("success", "Successfully updated" + nameStr.substr(1) + ".");
        res.redirect("/students");
    }

    function failed(err) {
        logger.error(err.message);
        req.flash("error", "Some changes not saved: " + err.message);
        res.redirect("/students");
    }

    async function fillSlots(newSlotId) {
        for (const id of group.ids) {
            await fillSlot(newSlotId, {
                newData: {},
                unSched: unsched,
                _id: id
            });
        }
    }

    updateNewSlot(group.ids.length, req.body.timeSched)
        .then(newSlotId => fillSlots(newSlotId))
        .then(filled)
        .catch(failed);
});


// Update student/slots
router.put("/:id", function(req, res) {
    var newData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        grade: req.body.grade
    };
    // logger.debug("req.body=" + JSON.stringify(req.body, null, 2));

    function filled() {
        req.flash("success", "Successfully updated " + newData.fname + " " + newData.lname + ".");
        res.redirect("/students");
    }

    function failed(err) {
        logger.error(err.message);
        req.flash("error", "Changes not saved: " + err.message);
        res.redirect("/students");
    }

    var result = studentValid(newData);
    if (result == "") {
        updateNewSlot(1, req.body.timeSched)
            .then(newSlotId => fillSlot(newSlotId, {
                newData: newData,
                unSched: req.body.unschedule,
                _id: req.params.id
            })).then(filled)
            .catch(failed);
    }
    else {
        // logger.debug("edit validation error");
        req.flash("error", result);
        res.redirect("back");
    }
});

// fix student/slots for AL; can't unschedule
router.put("/fix/:id", function(req, res) {
    // logger.debug("req.body=" + JSON.stringify(req.body, null, 2));
    var newData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        grade: req.body.grade,
        served: req.body.served == 'y' ? true : false
    };

    function filled() {
        req.flash("success", "Successfully updated " + newData.fname + " " + newData.lname + ".");
        res.redirect("/students/showFind");
    }

    function failed(err) {
        logger.error(err.message);
        req.flash("error", "Changes not saved: " + err.message);
        res.redirect("/students");
    }

    var result = studentValid(newData);
    if (result == "") {
        fixNewSlot(req.body.timeSched)
            .then(newSlotId => fillSlot(newSlotId, {
                newData: newData,
                unSched: 'n',
                _id: req.params.id
            })).then(filled)
            .catch(failed);
    }
    else {
        // logger.debug("edit validation error");
        req.flash("error", result);
        res.redirect("back");
    }
});

// Check In
router.put("/:id/checkIn/:served", function(req, res) {
    // logger.debug("req.params.served=" + req.params.served);
    var newVal = req.params.served == "no";
    Student.findByIdAndUpdate(req.params.id, {
        $set: {
            served: newVal
        }
    }, function(err) {
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
router.delete("/:studentId", middleware.isLoggedIn, function(req, res) {
    // logger.debug("student to delete=" + req.params.studentId);
    Student.findOneAndDelete({
        _id: req.params.studentId
    }, function(err, student) {
        if (err) {
            logger.error("Error deleting student: " + err.message);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        if (student != null) { // need null check in case student has been deleted in another window
            if (student.slot != null) {
                Slot.findByIdAndUpdate(student.slot, {
                        $inc: { avCnt: 1 }
                    },
                    function(err) {
                        if (err) {
                            logger.error("delete student, incrementing avCnt" + err.message);
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
