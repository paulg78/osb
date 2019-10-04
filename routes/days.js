var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var Day = require("../models/day");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var async = require('async');
/* global logger */

// upload days and slots (schedule of fittings)
router.get("/uploadSchedule", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    res.render("days/uploadSchedule");
});

// called from uploadSchedule; updates database with days and slots (schedule of fittings)
router.post("/createSchedule", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    var scheduleArray = JSON.parse(req.body.scheduleString);
    var numRows = scheduleArray.length;

    function saveSlots(row, day, callbackfunction) {
        var col = 1;
        async.whilst(
            function() {
                return col < scheduleArray[row].length;
            },
            function(slotCallback) {
                // logger.debug("async slot iteratee called");
                logger.info("col=" + col);

                // since scheduleArray is 2D, some columns will be blank if slots per day varies
                var time = scheduleArray[row][col];
                if (time == "") {
                    col++;
                    slotCallback(null);
                }
                else {
                    var hm = time.split(":");
                    if (hm.length != 2) {
                        slotCallback({ message: "Time invalid; format must be hh:mm" });
                    }
                    else {
                        // add leading zero to time if missing, e.g. 8:15 -> 08:15
                        if (time.length < 5) {
                            time = "0" + time;
                        }
                        // logger.debug('date string=' + scheduleArray[row][0] + 'T' + time + 'Z');
                        var d = new Date(scheduleArray[row][0] + 'T' + time + 'Z');
                        var slot = {
                            sdate: d,
                            max: scheduleArray[row + 1][col],
                            avCnt: scheduleArray[row + 1][col]
                        };
                        // save slot and add it to day
                        Slot.create(slot, function(err, newSlot) {
                            if (!err) {
                                logger.info("created slot=" + newSlot.sdate);
                                // add slot id to day
                                day.slots.push(newSlot._id);
                            }
                            col++;
                            // logger.debug("calling slotCallback with col=" + col);
                            slotCallback(err);
                        });
                    }
                }
            },
            function(err) {
                callbackfunction(err);
            }
        );
    }

    logger.info("starting saveDays loop");
    logger.info("numRows=" + numRows);
    var row = 0;
    async.whilst(
        function() {
            return row < numRows;
        },
        function(dayCallback) {
            logger.info("async day iteratee called");
            logger.info("row=" + row);
            var day = {
                date: new Date(scheduleArray[row][0] + 'T00:00Z'),
                slots: []
            };
            saveSlots(row, day, function(slotErr) {
                if (slotErr) {
                    dayCallback(slotErr);
                }
                else {

                    // save day
                    Day.create(day, function(dayErr, newDay) {
                        if (dayErr) {
                            dayCallback(dayErr);
                        }
                        else {
                            logger.info("created day=" + newDay.date);
                            row += 2;
                            logger.info("calling dayCallback with row=" + row);
                            dayCallback(null);
                        }
                    });
                }
            });
        },
        function(err) {
            if (err) {
                logger.error("Error creating schedule: " + err.message);
                req.flash("error", "Schedule upload failed: " + err.message);
            }
            // clear global days to trigger new database lookup
            global.days = null;
            // logger.debug("Finished schedule upload");
            res.redirect("/days");
        }
    );
});


function toStr2(x) {
    var s = x.toString();
    if (s.length < 2) {
        return "0" + s;
    }
    else {
        return s;
    }
}


//INDEX - List days
router.get("/", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    if (global.days == null) {
        Day.find({ $query: {}, $orderby: { date: 1 } }, { date: 1 })
            .exec(function(err, days) {
                if (err) {
                    logger.error(err);
                    return res.redirect("back");
                }
                else {
                    global.days = days;
                    res.render("days/index");
                }
            });
    }
    else {
        res.render("days/index");
    }
});


// Middleware function to popluate res.locals with previous and next day Ids
var getPrevNextIds = function(req, res, next) {
    res.locals.prevDayId = "";
    res.locals.nextDayId = "";
    // logger.debug("req.params.dayId=" + req.params.dayId);
    // logger.debug("global.days=" + global.days + ", global.days.length=", global.days.length);
    if (global && global.days) {
        for (var i = 0, iLen = global.days.length; i < iLen; i++) {
            // logger.debug("i=" + i + ", iLen=" + iLen + ", global.days[i]._id=" + global.days[i]._id);
            if (global.days[i]._id == req.params.dayId) {
                // logger.debug("global.days[i]=" + global.days[i]);
                if (i > 0) {
                    res.locals.prevDayId = global.days[i - 1]._id;
                }
                if (i < global.days.length - 1) {
                    res.locals.nextDayId = global.days[i + 1]._id;
                }
                break;
            }
        }
    }
    // logger.debug("getPrevNextIds, res.locals.prevDayId=" + res.locals.prevDayId);
    return next();
};


// Show SCHEDULE for next available day (one with open slots)
router.get("/nextAvail", middleware.isLoggedIn, function(req, res) {
    function mmdd(d) {
        return toStr2(d.getUTCMonth()) + toStr2(d.getUTCDate());
    }
    // var qry = "this.sdate > Date.now() && this.avCnt > 0";
    // logger.debug("* qry=" + qry);
    // Slot.find({ $where: qry }, { sdate: 1 }).limit(1).hint("sdate_1")
    Slot.find({ $and: [{ sdate: { $gt: Date.now() } }, { avCnt: { $gt: 0 } }] }, { sdate: 1 }).limit(1)
        .exec(function(err, slots) {
            if (err) {
                logger.error("error finding next avail: " + err.message);
                req.flash("error", "Next available day not found.");
                res.redirect("back");
            }
            else {
                if (slots.length < 1) {
                    logger.info("No available slot found");
                    req.flash("error", "Next available day not found.");
                    res.redirect("back");
                }
                else {
                    // logger.debug("slots[0]=" + slots[0]);
                    // get day Id for slot found

                    // var slotMMDD = toStr2(slots[0].sdate.getUTCMonth()) + toStr2(slots[0].sdate.getUTCDate());
                    var slotMMDD = mmdd(slots[0].sdate);
                    // logger.debug("slotMMDD=" + slotMMDD);
                    for (var i = 0, iLen = global.days.length; i < iLen; i++) {
                        // logger.debug("i=" + i + ", global.days[i].date=" + global.days[i].date + ", mmdd=" + mmdd(global.days[i].date));
                        // if (slotMMDD == toStr2(global.days[i].date.getUTCMonth()) + toStr2(global.days[i].date.getUTCDate())) {
                        if (slotMMDD == mmdd(global.days[i].date)) {
                            // logger.debug("global.days[i]=" + global.days[i]);
                            break;
                        }
                    }
                    if (i < iLen) {
                        // logger.debug("day=" + day);
                        res.redirect("/days/" + global.days[i]._id);
                    }
                    else {
                        logger.error("nextavail; day not found");
                        req.flash("error", "Next available day not found.");
                        res.redirect("back");
                    }
                }
            }
        });
});


// SHOW SCHEDULE All Students - shows schedule for one day
router.get("/:dayId", middleware.isLoggedIn, getPrevNextIds, function(req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    Day.findById(req.params.dayId)
        .populate('slots', { sdate: 1, avCnt: 1 })
        .exec(function(err, foundDay) {
            if (err) {
                logger.error(err);
                req.flash("error", "System error:" + err.message);
                return res.redirect("back");
            }
            else {
                // logger.debug("foundDay=" + JSON.stringify(foundDay));
                // logger.debug("foundDay.slots[2]=" + foundDay.slots[2]);
                // find the students scheduled for this day
                Student.find({ slot: { $in: foundDay.slots } }, { _id: 0, fname: 1, lname: 1, grade: 1, slot: 1 })
                    .sort({
                        fname: 1,
                        lname: 1
                    })
                    .exec(
                        function(err, queryResponse) {
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
                                res.render("days/schedule", {
                                    day: foundDay,
                                    sched: sched
                                });
                            }
                        });
            }
        });
});

module.exports = router;
