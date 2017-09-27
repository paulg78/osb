var express = require("express");
var router = express.Router();
var Event = require("../models/event");
var Day = require("../models/day");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var async = require('async');
/* global logger */


//INDEX - This app works with only one event so this redirects to day list if there is only 1 event
router.get("/", middleware.isLoggedIn, function (req, res) {
    if (global.evnt == null) {
        Event.findOne({})
            .populate({
                path: 'days',
                model: 'Day',
                select: 'date'
            })
            .exec(function (err, ev) {
                if (err) {
                    logger.error(err);
                }
                else {
                    if (ev == null) {
                        res.render("events/new");
                    }
                    else {
                        global.evnt = ev;
                        res.redirect("/days");
                    }
                }
            });
    }
    else {
        res.redirect("/days");
    }
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
    Event.create(newEvent, function (err) {
        if (err) {
            logger.error(err);
        }
        else {
            res.redirect("/events");
        }
    });
});


// upload days and slots (schedule of fittings)
router.get("/uploadSchedule", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    Event.findOne().exec(function (err, foundEvent) {
        if (err) {
            logger.error(err);
        }
        else {
            res.render("events/uploadSchedule", {
                event: foundEvent
            });
        }
    });
});

// !!! This needs to be modified and tested; needs to populate the sdate field in slot
// called from uploadSchedule; updates database with days and slots (schedule of fittings)
router.post("/:eventId/createSchedule", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    var scheduleArray = JSON.parse(req.body.scheduleString);
    var numRows = scheduleArray.length;

    function saveSlots(row, day, callbackfunction) {
        var col = 1;
        async.whilst(
            function () {
                return col < scheduleArray[row].length;
            },
            function (slotCallback) {
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
                        var d = new Date(day.date);
                        d.setHours(hm[0]);
                        d.setMinutes(hm[1]);
                        var slot = {
                            sdate: d,
                            max: scheduleArray[row + 1][col],
                            count: 0
                        };
                        // save slot and add it to day
                        Slot.create(slot, function (err, newSlot) {
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
            function (err) {
                callbackfunction(err);
            }
        );
    }

    logger.info("Going over the waterfall !");
    async.waterfall([
        findEvent,
        saveDays,
        saveEvent,
    ], function (err, result) {
        if (err) {
            logger.error("Error creating schedule: " + err.message);
            req.flash("error", "Schedule upload failed: " + err.message);
        }
        res.redirect("/events");
    });

    function findEvent(callback) {
        logger.info("starting findEvent");
        Event.findById(req.params.eventId).exec(function (err, ev) {
            callback(err, ev); // calls 2nd function
        });
    }

    function saveDays(ev, callback) {
        logger.info("starting saveDays");
        logger.info("numRows=" + numRows);
        var row = 0;
        var col;
        async.whilst(
            function () {
                return row < numRows;
            },
            function (dayCallback) {
                logger.info("async day iteratee called");
                logger.info("row=" + row);
                var day = {
                    date: scheduleArray[row][0],
                    slots: []
                };
                saveSlots(row, day, function (err1) {
                    var err = null;
                    // save day and get day ID
                    Day.create(day, function (err2, newDay) {
                        if (err1) {
                            err = err1;
                        }
                        else {
                            if (err2) {
                                err = err2;
                            }
                            else {
                                logger.info("created day=" + newDay.date);
                                // add day id to event
                                ev.days.push(newDay._id);
                            }
                        }
                        row += 2;
                        logger.info("calling dayCallback with row=" + row);
                        dayCallback(err);
                    });
                });
            },
            function (err) {
                callback(err, ev);
            }
        );
    }

    function saveEvent(ev, callback) {
        logger.info("starting saveEvent");
        ev.save(function (err) {
            if (!err) {
                logger.info("Uploaded days for event=" + ev.name);
                req.flash("success", "Uploaded days for event=" + ev.name);
            }
            callback(err, ev);
        });
    }
});

module.exports = router;
