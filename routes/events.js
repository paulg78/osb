var express = require("express");
var router = express.Router();
var Student = require("../models/student");
//var User = require("../models/user");
var Event = require("../models/event");
var Day = require("../models/day");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var shared = require("../shared");
var async = require('async');
/* global logger */

//INDEX - show all events
router.get("/", function (req, res) {
    // Get all events from DB
    Event.find({}, 'name', function (err, allEvents) {
        if (err) {
            logger.error(err);
        }
        else { // If there is only one event, go right to days for that event
            if (allEvents.length == 1) {
                res.redirect("events/" + allEvents[0]._id + "/days");
            }
            else {
                // logger.debug("allEvents=" + allEvents);
                res.render("events/index", {
                    events: allEvents
                });
            }
        }
    });
});

//NEW - show form to create new event
router.get("/new", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    res.render("events/new");
});

// CREATE - add new event to DB
router.post("/", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    var newEvent = {
        name: req.body.name
    };
    // Create a new event and save to DB
    Event.create(newEvent, function (err, newlyCreated) {
        if (err) {
            logger.error(err);
        }
        else {
            //redirect back to events page
            // logger.debug(newlyCreated);
            res.redirect("/events");
        }
    });
});


// SHOW - days in an event
router.get("/:eventId/days", middleware.isLoggedIn, function (req, res) {
    Event.findById(req.params.eventId)
        .populate({
            path: 'days',
            model: 'Day',
            select: 'date'
        })
        .exec(function (err, foundEvent) {
            if (err) {
                logger.error(err);
            }
            else {
                // logger.debug("foundEvent=" + foundEvent);
                res.render("events/days", {
                    event: foundEvent
                });
            }
        });
});


// Middleware function to poupluate res.locals with previous and next day Ids
var getPrevNextIds = function (req, res, next) {
    // Find event to populate previous and next days
    var i;
    res.locals.prevDayId = "";
    res.locals.nextDayId = "";
    Event.findById(req.params.eventId).exec(function (err, foundEvent) {
        if (!err) {
            // logger.debug("foundEvent.days=" + foundEvent.days);
            i = shared.getItemIndex(foundEvent.days, req.params.dayId);
            if (i != null) {
                // logger.debug("foundEvent.days[i]=" + foundEvent.days[i]);
                if (i > 0) {
                    res.locals.prevDayId = foundEvent.days[i - 1];
                }
                if (i < foundEvent.days.length - 1) {
                    res.locals.nextDayId = foundEvent.days[i + 1];
                }
            }
        }
        // logger.debug("getPrevNextIds, res.locals.prevDayId=" + res.locals.prevDayId);
        return next();
    });
};


// SCHEDULE By School - shows schedule for one day of an event
router.get("/:eventId/days/:dayId/school", middleware.isLoggedIn, getPrevNextIds, function (req, res) {
    // logger.debug("starting show schedule by school; res.locals.prevDayId=" + res.locals.prevDayId);
    Day.findById(req.params.dayId)
        .populate('slots', { sdate: 1, max: 1, count: 1 })
        .exec(function (err, foundDay) {
            if (err) {
                logger.error(err);
            }
            else {
                // logger.debug("foundDay=" + JSON.stringify(foundDay));
                // logger.debug("foundDay.slots[2]=" + foundDay.slots[2]);
                // find the students in the school who are scheduled for this day or are unscheduled
                Student.find({
                        school: res.locals.currentUser.school,
                        $or: [{ day: req.params.dayId }, { day: null }]
                        // day: req.params.dayId
                    }, 'fname lname grade slot')
                    .sort({ // sort by lname to highlight sibling groups
                        lname: 1,
                        fname: 1
                    })
                    .exec(
                        function (err, queryResponse) {
                            if (err) {
                                logger.error(err);
                            }
                            else {
                                var unsched = [];
                                var sched = [];
                                // logger.debug("(students) queryResponse=" + queryResponse);
                                // logger.debug("before render, res.locals.prevDayId=" + res.locals.prevDayId);
                                // split students into scheduled vs. unscheduled
                                for (var j = 0, jLim = foundDay.slots.length; j < jLim; j++) {
                                    sched[j] = { students: [] };
                                }
                                for (var i = 0, iLim = queryResponse.length; i < iLim; i++) {
                                    // logger.debug("stud=" + queryResponse[i].fullName);
                                    // find slot
                                    var foundj = -1;
                                    for (var j = 0, jLim = foundDay.slots.length; j < jLim; j++) {
                                        // logger.debug("j=" + j + ", slot=" + foundDay.slots[j]._id);
                                        if (queryResponse[i].slot != null && queryResponse[i].slot.toString() == foundDay.slots[j]._id) {
                                            foundj = j;
                                            break;
                                        }
                                    }
                                    if (foundj > -1) {
                                        // logger.debug("  foundj=" + foundj);
                                        sched[foundj].students.push(queryResponse[i]);
                                    }
                                    else {
                                        unsched.push(queryResponse[i]);
                                    }
                                }
                                // logger.debug("foundDay with students=" + JSON.stringify(foundDay));
                                // logger.debug("sched=" + JSON.stringify(sched));
                                // logger.debug("unsched=" + unsched);
                                res.render("events/daySchoolSchedule", {
                                    eventId: req.params.eventId,
                                    day: foundDay,
                                    sched: sched,
                                    unsched: unsched
                                });
                            }
                        });
            }
        });
});


// SHOW SCHEDULE All Students - shows schedule for one day of an event
router.get("/:eventId/days/:dayId", middleware.isLoggedIn, getPrevNextIds, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    Day.findById(req.params.dayId)
        .populate('slots', { sdate: 1, max: 1, count: 1 })
        .exec(function (err, foundDay) {
            if (err) {
                logger.error(err);
                req.flash("System error:", err.message);
                return res.redirect("back");
            }
            else {
                // logger.debug("foundDay=" + JSON.stringify(foundDay));
                // logger.debug("foundDay.slots[2]=" + foundDay.slots[2]);
                // find the students scheduled for this day
                Student.find({ day: req.params.dayId }, 'fname lname grade slot')
                    .sort({
                        fname: 1,
                        lname: 1
                    })
                    .exec(
                        function (err, queryResponse) {
                            if (err) {
                                logger.error(err);
                            }
                            else {
                                var sched = [];
                                // logger.debug("(students) queryResponse=" + queryResponse);
                                // logger.debug("before render, res.locals.prevDayId=" + res.locals.prevDayId);
                                // populate scheduled students into slots
                                for (var j = 0, jLim = foundDay.slots.length; j < jLim; j++) {
                                    sched[j] = { students: [] };
                                }
                                for (var i = 0, iLim = queryResponse.length; i < iLim; i++) {
                                    // logger.debug("stud=" + queryResponse[i].fullName);
                                    // find slot
                                    var foundj = -1;
                                    for (var j = 0, jLim = foundDay.slots.length; j < jLim; j++) {
                                        if (queryResponse[i].slot != null && queryResponse[i].slot.toString() == foundDay.slots[j]._id) {
                                            foundj = j;
                                            break;
                                        }
                                    }
                                    if (foundj > -1) {
                                        // logger.debug("  foundj=" + foundj);
                                        sched[foundj].students.push(queryResponse[i]);
                                    }
                                }
                                // logger.debug("foundDay with students=" + JSON.stringify(foundDay));
                                // logger.debug("sched=" + JSON.stringify(sched));
                                // res.redirect("/events/" + req.params.eventId + "/days");
                                res.render("events/daySchedule", {
                                    eventId: req.params.eventId,
                                    day: foundDay,
                                    sched: sched
                                });
                            }
                        });
            }
        });
});


function mmdd(date) {
    var n = date.indexOf("/");
    var mm = date.substring(n - 2, n);
    if (mm < 10) {
        mm = '0' + mm[1];
    }
    var dd = date.substring(n + 1, n + 3);
    if (dd[1] == "/") {
        dd = '0' + dd[0];
    }
    return mm + dd;
}


// Show SCHEDULE for next available day of an event (one with open slots)
router.get("/:eventId/nextAvail", middleware.isLoggedIn, function (req, res) {

    Slot.find({ $where: "this.sdate > new Date() && this.count < this.max" }, { sdate: 1 }).limit(1).hint("sdate_1")
        .exec(function (err, slots) {
            if (err) {
                logger.error(err);
                res.redirect("/events/" + req.params.eventId + "/days");
            }
            else {
                if (slots == null || slots[0] == null) {
                    logger.error("No available slot found");
                    res.redirect("/events/" + req.params.eventId + "/days");
                }
                else {
                    // logger.debug("slots[0]=" + slots[0]);
                    var s = (slots[0].sdate.getMonth() + 1) + "/" + slots[0].sdate.getDate();
                    // logger.debug("s=" + s);
                    Day.findOne({ date: { $regex: ".*" + s + ".*" } }, { _id: 1 })
                        .exec(function (err, day) {
                            if (err) {
                                logger.error(err);
                                res.redirect("/events/" + req.params.eventId + "/days");
                            }
                            if (day == null) {
                                logger.error("nextavail; day not found");
                                res.redirect("/events/" + req.params.eventId + "/days");
                            }
                            else {
                                // logger.debug("day=" + day);
                                if (res.locals.currentUser.role == 'role_sc') {
                                    res.redirect("/events/" + req.params.eventId + "/days/" + day._id + "/school");
                                }
                                else {
                                    res.redirect("/events/" + req.params.eventId + "/days/" + day._id);
                                }
                            }
                        });
                }
            }
        });
});


// Add student to slot
router.put("/:eventId/days/:dayId/slots/:slotId/students/:studentId", function (req, res) {
    // logger.debug("adding student to slot");
    // logger.debug("studentId=" + req.params.studentId);
    // logger.debug("slotId=" + req.params.slotId);

    async.waterfall([
        updateSlot,
        updateStudent,
    ], function (err, avail, move) {
        if (err) {
            logger.error(err.message);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            // logger.debug("add-sending json response");
            res.json({ "avail": avail, "move": move });
            // logger.debug("add-json response sent");
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
                                        logger.debug("schedule: student not found or already scheduled");
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
router.delete("/:eventId/days/:dayId/slots/:slotId/students/:studentId", function (req, res) {
    // logger.debug("deleting student from slot");
    // logger.debug("studentId=" + req.params.studentId);
    // logger.debug("slotId=" + req.params.slotId);

    async.waterfall([
        updateSlot,
        updateStudent,
    ], function (err, avail) {
        if (err) {
            logger.error(err.message);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            // logger.debug("del-sending json response");
            res.json({ "avail": avail });
            // logger.debug("del-json response sent");
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
                                    logger.debug("unschedule: student not found or already unscheduled")
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


// in slots, find and delete student IDs that don't point to any student
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
