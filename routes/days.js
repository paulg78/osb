var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var Day = require("../models/day");
var Slot = require("../models/slot");
var middleware = require("../middleware");
/* global logger */


function toStr2(x) {
    var s = x.toString();
    if (s.length < 2) {
        return "0" + s;
    }
    else {
        return s;
    }
}


//INDEX - List days in Event
router.get("/", middleware.isLoggedIn, function (req, res) {
    if (global.evnt == null) {
        res.redirect("/events");
    }
    else {
        var today = new Date();
        // logger.debug("today=" + today);
        var todayStr = today.getFullYear().toString() + "-" + toStr2(today.getMonth() + 1) + "-" + toStr2(today.getDate());
        // logger.debug("currEvent=" + currEvent);
        res.render("days/index", {
            todayStr: todayStr
        });
    }
});


// Middleware function to poupluate res.locals with previous and next day Ids
var getPrevNextIds = function (req, res, next) {
    // Find event to populate previous and next days
    res.locals.prevDayId = "";
    res.locals.nextDayId = "";
    // logger.debug("req.params.dayId=" + req.params.dayId);
    // logger.debug("global.evnt.days=" + global.evnt.days + ", global.evnt.days.length=", global.evnt.days.length);
    for (var i = 0, iLen = global.evnt.days.length; i < iLen; i++) {
        // logger.debug("i=" + i + ", iLen=" + iLen + ", global.evnt.days[i]._id=" + global.evnt.days[i]._id);
        if (global.evnt.days[i]._id == req.params.dayId) {
            // logger.debug("global.evnt.days[i]=" + global.evnt.days[i]);
            if (i > 0) {
                res.locals.prevDayId = global.evnt.days[i - 1]._id;
            }
            if (i < global.evnt.days.length - 1) {
                res.locals.nextDayId = global.evnt.days[i + 1]._id;
            }
            break;
        }
    }
    // logger.debug("getPrevNextIds, res.locals.prevDayId=" + res.locals.prevDayId);
    return next();
};


// SCHEDULE By School - shows schedule for one day of an event
router.get("/:dayId/school", middleware.isLoggedIn, getPrevNextIds, function (req, res) {
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
                                logger.debug("(students) queryResponse=" + queryResponse);
                                // logger.debug("before render, res.locals.prevDayId=" + res.locals.prevDayId);
                                // split students into scheduled vs. unscheduled
                                for (var j = 0, jLim = foundDay.slots.length; j < jLim; j++) {
                                    sched[j] = { students: [] };
                                }
                                for (var i = 0, iLim = queryResponse.length; i < iLim; i++) {
                                    logger.debug("stud=" + queryResponse[i].fullName);
                                    // find slot
                                    var foundj = -1;
                                    for (var j = 0, jLim = foundDay.slots.length; j < jLim; j++) {
                                        logger.debug("j=" + j + ", slot=" + foundDay.slots[j]._id);
                                        if (queryResponse[i].slot != null && queryResponse[i].slot.toString() == foundDay.slots[j]._id) {
                                            foundj = j;
                                            break;
                                        }
                                    }
                                    if (foundj > -1) {
                                        logger.debug("  foundj=" + foundj);
                                        sched[foundj].students.push(queryResponse[i]);
                                    }
                                    else {
                                        unsched.push(queryResponse[i]);
                                    }
                                }
                                // logger.debug("foundDay with students=" + JSON.stringify(foundDay));
                                // logger.debug("sched=" + JSON.stringify(sched));
                                // logger.debug("unsched=" + unsched);
                                res.render("days/schoolSchedule", {
                                    // eventId: req.params.eventId,
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
router.get("/:dayId", middleware.isLoggedIn, getPrevNextIds, function (req, res) {
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
                                res.render("days/schedule", {
                                    eventId: req.params.eventId,
                                    day: foundDay,
                                    sched: sched
                                });
                            }
                        });
            }
        });
});


// Show SCHEDULE for next available day of an event (one with open slots)
router.get("/nextAvail/:date", middleware.isLoggedIn, function (req, res) {
    var qry = "this.sdate > new Date('" + req.params.date + "') && this.count < this.max";
    // logger.debug("* qry=" + qry);
    Slot.find({ $where: qry }, { sdate: 1 }).limit(1).hint("sdate_1")
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
                                    res.redirect("/days/" + day._id + "/school");
                                }
                                else {
                                    res.redirect("/days/" + day._id);
                                }
                            }
                        });
                }
            }
        });
});


module.exports = router;
