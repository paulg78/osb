var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var async = require('async');
/* global logger */


// Add student to slot
router.put("/:slotId/students/:studentId", function (req, res) {
    logger.debug("adding student to slot");
    logger.debug("studentId=" + req.params.studentId);
    logger.debug("slotId=" + req.params.slotId);

    async.waterfall([
        updateSlot,
        updateStudent,
    ], function (err, avail, move) {
        if (err) {
            logger.error(err.message);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            logger.debug("add-sending json response");
            res.json({ "avail": avail, "move": move });
            logger.debug("add-json response sent");
        }
    });

    function updateSlot(callback) {
        Slot.findByIdAndUpdate(req.params.slotId, {
            $inc: { count: 1 }
        }, {
            projection: { _id: 0, count: 1, max: 1 },
            returnNewDocument: false // returns count before increment, true doesn't seem to work
        }, function (err, slot) {
            // logger.debug("slot before update=" + slot);
            if (err) {
                callback(err);
            }
            else {
                if (slot.count >= slot.max) // count is one less than actual
                {
                    // restore original since slot is full and student won't be added
                    Slot.findByIdAndUpdate(req.params.slotId, {
                            $inc: { count: -1 }
                        },
                        function (err) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                callback(null, 0, false);
                            }
                        });
                }
                else {
                    callback(null, slot.max - slot.count - 1, true);
                }
            }
        });
    }

    function updateStudent(avail, move, callback) {
        if (!move) { // slot already full so can't add student
            callback(null, 0, false);
        }
        else {
            Student.findByIdAndUpdate(req.params.studentId, {
                    day: req.params.dayId,
                    slot: req.params.slotId
                }, {
                    projection: { slot: 1 }
                },
                function (err, student) {
                    // logger.debug("student scheduled=" + student);
                    if (err) {
                        callback(err);
                    }
                    else {
                        if (student == null || (student != null && student.slot != null)) {
                            // restore original count since student wasn't found or was already scheduled
                            Slot.findByIdAndUpdate(req.params.slotId, {
                                    $inc: { count: -1 }
                                },
                                function (err) {
                                    if (err) {
                                        callback(err);
                                    }
                                    else {
                                        // logger.debug("schedule: student not found or already scheduled");
                                        callback(null, avail + 1, false);
                                    }
                                });
                        }
                        else {
                            callback(null, avail, true);
                        }
                    }
                });
        }
    }
});

// Remove student from slot
router.delete("/:slotId/students/:studentId", function (req, res) {
    logger.debug("deleting student from slot");
    logger.debug("studentId=" + req.params.studentId);
    logger.debug("slotId=" + req.params.slotId);

    async.waterfall([
        updateSlot,
        updateStudent,
    ], function (err, avail) {
        if (err) {
            logger.error(err.message);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            logger.debug("del-sending json response");
            res.json({ "avail": avail });
            logger.debug("del-json response sent");
        }
    });

    function updateSlot(callback) {
        // logger.debug("in updateSlot");
        Slot.findByIdAndUpdate(req.params.slotId, {
            $inc: { count: -1 }
        }, {
            projection: { _id: 0, count: 1, max: 1 },
            returnNewDocument: false // returns count before increment, true doesn't seem to work
        }, function (err, slot) {
            callback(err, slot.max - slot.count + 1);
        });
    }

    function updateStudent(avail, callback) {
        Student.findByIdAndUpdate(req.params.studentId, {
                day: null,
                slot: null
            }, {
                projection: { slot: 1 },
                returnNewDocument: false // returns student before update
            },
            function (err, student) {
                if (err) {
                    callback(err);
                }
                else {
                    if (student == null || (student != null && student.slot == null)) {
                        // restore original count since student wasn't found/unscheduled
                        Slot.findByIdAndUpdate(req.params.slotId, {
                                $inc: { count: 1 }
                            },
                            function (err) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    // logger.debug("unschedule: student not found or already unscheduled");
                                    callback(null, avail - 1);
                                }
                            });
                    }
                    else {
                        // logger.debug("student unscheduled=" + student);
                        callback(null, avail);
                    }
                }
            });
    }
});


// in slots, find and optionally fix counts that don't match actual number of students scheduled
router.get("/checkCounts/:fixflag", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }
    logger.info("Starting checkCounts with fixflag=" + req.params.fixflag);
    Student.aggregate([{
            $match: {
                slot: {
                    $ne: null
                }
            }
        }, {
            $group: {
                _id: '$slot',
                count: {
                    $sum: 1
                }
            }
        }, {
            $sort: {
                _id: 1
            }
        }])
        .exec(function (err, schedStudCounts) {
            if (err) {
                logger.error("checkCounts, student aggregate " + err.message);
            }
            else {
                // logger.debug("schedStudCounts=" + JSON.stringify(schedStudCounts));
                Slot.find({}, { count: 1 })
                    .sort({
                        _id: 1,
                    })
                    .exec(function (err, slots) {
                        if (err) {
                            logger.error("checkCounts, finding slots " + err.message);
                        }
                        else {
                            var nbrMismatch = 0;
                            // logger.debug("slots=" + slots);
                            var j = 0;
                            var jlim = schedStudCounts.length;
                            for (var i = 0, len = slots.length; i < len; i++) {

                                while (j < jlim && schedStudCounts[j]._id < slots[i]._id) {
                                    j++;
                                }
                                // logger.debug("i=" + i + ", j=" + j);
                                var studentCount = 0;
                                if (j < jlim && schedStudCounts[j]._id == slots[i]._id.toString()) {
                                    studentCount = schedStudCounts[j].count;
                                }
                                if (studentCount != slots[i].count) {
                                    logger.info("count mismatch id=" + slots[i]._id + ", student count=" + studentCount + ", slot count=" + slots[i].count);
                                    nbrMismatch++;
                                    if (req.params.fixflag == "y") { // fix count in Slot
                                        logger.info("setting slot count to " + studentCount);
                                        Slot.findByIdAndUpdate(slots[i]._id.toString(), {
                                                $set: { count: studentCount }
                                            },
                                            function (err) {
                                                if (err) {
                                                    logger.error("checkCounts, updating slot" + err.message);
                                                }
                                            });
                                    }
                                }
                            }
                            req.flash("success", "Ending checkCounts/" + req.params.fixflag + ". Nbr count mismatches=" + nbrMismatch);
                            logger.info("Ending checkCounts. Nbr count mismatches=" + nbrMismatch);
                            res.redirect("back");
                        }
                    });
            }
        });
});

module.exports = router;
