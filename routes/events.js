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

// upload days and slots (schedule of fittings)
router.get("/:eventId/uploadSchedule", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    Event.findById(req.params.eventId).exec(function (err, foundEvent) {
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
// update database with days and slots (schedule of fittings)
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
                var slot = {
                    time: scheduleArray[row][col],
                    max: scheduleArray[row + 1][col],
                    students: [],
                    count: 0
                };
                // since scheduleArray is 2D, some columns will be blank if slots per day varies
                if (slot.time == "") {
                    col++;
                    slotCallback(null);
                }
                else {
                    // save slot and get slot ID
                    Slot.create(slot, function (err, newSlot) {
                        if (!err) {
                            logger.info("created slot=" + newSlot.time);
                            // add slot id to day
                            day.slots.push(newSlot._id);
                        }
                        col++;
                        // logger.debug("calling slotCallback with col=" + col);
                        slotCallback(err);
                    });
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
            logger.error("Error creating schedule");
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
        .populate({
            path: 'slots',
            populate: {
                path: 'students',
                model: Student,
                match: { school: { $eq: res.locals.currentUser.school } },
                select: 'fname lname grade'
            }
        })
        .exec(function (err, foundDay) {
            if (err) {
                logger.error(err);
            }
            else {
                // logger.debug("foundDay=" + foundDay);
                // logger.debug("foundDay.slots[2]=" + foundDay.slots[2]);
                // find the unscheduled students
                Student.find({
                        school: res.locals.currentUser.school,
                        slot: null
                    }, 'fname lname grade',
                    function (err, queryResponse) {
                        if (err) {
                            logger.error(err);
                        }
                        else {
                            // logger.debug("(unscheduled students) queryResponse=" + queryResponse);
                            // logger.debug("before render, res.locals.prevDayId=" + res.locals.prevDayId);
                            res.render("events/daySchoolSchedule", {
                                eventId: req.params.eventId,
                                day: foundDay,
                                students: queryResponse
                            });
                        }
                    });
            }
        });
});


// SCHEDULE All Students - shows schedule for one day of an event
router.get("/:eventId/days/:dayId", middleware.isLoggedIn, getPrevNextIds, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    Day.findById(req.params.dayId)
        .populate({
            path: 'slots',
            populate: {
                path: 'students',
                model: Student,
                select: 'fname lname grade'
            }
        })
        .exec(function (err, foundDay) {
            if (err) {
                logger.error(err);
                req.flash("System error:", err.message);
                return res.redirect("back");
            }
            else {
                res.render("events/daySchedule", {
                    eventId: req.params.eventId,
                    day: foundDay
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


// Set slot dates
router.get("/:eventId/setslotdates", middleware.isLoggedIn, function (req, res) {
    Event.findById(req.params.eventId)
        .populate({
            path: 'days',
            populate: {
                path: 'slots'
            }
        })
        .exec(function (err, event) {
            if (err) {
                logger.error(err);
            }
            else {
                var dayNbr = 0;
                // loop thru days
                async.whilst(
                    function () {
                        return dayNbr < event.days.length;
                    },
                    function (callback) {
                        logger.debug("day iteratee executed for day " + event.days[dayNbr].date);
                        var n = event.days[dayNbr].date.indexOf("/");
                        var month = Number(event.days[dayNbr].date.substring(n - 2, n)) - 1;
                        var day = event.days[dayNbr].date.substring(n + 1, n + 3);
                        if (day[1] == "/") {
                            day = day[0];
                        }
                        logger.debug("month=" + month);
                        logger.debug("day=" + day);
                        // loop thru slots and set sdate
                        var slotNbr = 0;
                        async.whilst(
                            function () {
                                return slotNbr < event.days[dayNbr].slots.length;
                            },
                            function (slotcallback) {
                                logger.debug("slot iteratee executed for " + event.days[dayNbr].slots[slotNbr].time);

                                n = event.days[dayNbr].slots[slotNbr].time.indexOf(":");
                                var amPm = event.days[dayNbr].slots[slotNbr].time[n + 4, n + 4];
                                // logger.debug("am/pm=" + amPm);
                                var hour = Number(event.days[dayNbr].slots[slotNbr].time.substring(0, n));
                                if (amPm == "P") {
                                    hour = hour + 12;
                                }
                                var min = Number(event.days[dayNbr].slots[slotNbr].time.substring(n + 1, n + 3));

                                logger.debug("hour=" + hour);
                                logger.debug("min=" + min);
                                var d = new Date(2017, month, day, hour, min);
                                logger.debug("d=" + d);
                                Slot.findByIdAndUpdate(event.days[dayNbr].slots[slotNbr]._id, {
                                    $set: {
                                        sdate: d
                                    },
                                }, function (err) {
                                    slotNbr++;
                                    slotcallback(err);
                                });
                            },
                            function (err) {
                                if (err) {
                                    logger.error("error in slot loop");
                                    res.redirect("/events/" + req.params.eventId + "/days");
                                }
                                else {
                                    dayNbr++;
                                    callback(err);
                                }
                            }
                        );
                    },
                    function (err) {
                        if (err) {
                            logger.error("setslotdates, error in day loop;" + err);
                            req.flash("error", "system error: " + err);
                            res.redirect("/events/" + req.params.eventId + "/days");
                        }
                        else {
                            logger.debug("ending setslotdates");
                            req.flash("success", "Updated slots");
                            res.redirect("/events/" + req.params.eventId + "/days");
                        }
                    }
                );
            }
        });
});


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
    ], function (err) {
        if (err) {
            logger.error(err);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            // logger.debug("add-sending json response");
            res.json(""); // doesn't go to success function unless data is sent
            // logger.debug("add-json response sent");
        }
    });

    function updateSlot(callback) {
        Slot.findByIdAndUpdate(req.params.slotId, {
            $push: {
                students: req.params.studentId
            },
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
                    // remove student since slot is full
                    // logger.debug("removing student from slot");
                    Slot.findByIdAndUpdate(req.params.slotId, {
                            $pop: {
                                students: req.params.studentId
                            },
                            $inc: { count: -1 }
                        },
                        function (err) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                callback("Slot is full");
                            }
                        });
                }
                else {
                    callback(null);
                }
            }
        });
    }

    function updateStudent(callback) {
        Student.findByIdAndUpdate(req.params.studentId, {
                day: req.params.dayId,
                slot: req.params.slotId // todo add projection
            }, {
                projection: { fname: 0, lname: 0, grade: 0, school: 0, day: 0, slot: 0, served: 0 }
            },
            function (err, student) {
                // logger.debug("student scheduled=" + student);
                if (err) {
                    callback(err);
                }
                else {
                    if (student == null) {
                        // logger.debug("removing non-existent student from slot");
                        Slot.findByIdAndUpdate(req.params.slotId, {
                                $pop: {
                                    students: req.params.studentId
                                },
                                $inc: { count: -1 }
                            },
                            function (err) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    callback("scheduled student not found");
                                }
                            });
                    }
                    else {
                        callback(null);
                    }
                }
            });
    }
});

// Remove student from slot
router.delete("/:eventId/days/:dayId/slots/:slotId/students/:studentId", function (req, res) {
    // logger.debug("deleting student from slot");
    // logger.debug("studentId=" + req.params.studentId);
    // logger.debug("slotId=" + req.params.slotId);

    async.waterfall([
        findSlot,
        updateSlot,
        updateStudent,
    ], function (err) {
        if (err) {
            logger.error(err);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            // logger.debug("del-sending json response");
            res.json(""); // doesn't go to success function unless data is sent
            // logger.debug("del-json response sent");
        }
    });

    function findSlot(callback) {
        Slot.findById(req.params.slotId, function (err, slot) {
            callback(err, slot);
        });
    }

    function updateSlot(slot, callback) {
        if (slot == null) {
            callback("In unschedule: slot not found");
        }
        // logger.debug("before=" + slot.students);

        var delIndex = shared.getItemIndex(slot.students, req.params.studentId);
        // logger.debug("delIndex=" + delIndex);
        if (delIndex == null) {
            callback("In unschedule: student not found in slot");
        }
        else {
            // "clever" use of splice to remove elements
            // The first parameter defines the (0 relative) position where elements will be deleted.
            // The second parameter defines how many elements will be removed.
            slot.students.splice(delIndex, 1);
            // logger.debug("after=" + slot.students);
            slot.count--;
            slot.save(function (err) {
                callback(err);
            });
        }
    }

    function updateStudent(callback) {
        Student.findByIdAndUpdate(req.params.studentId, {
            day: null,
            slot: null
        }, function (err) {
            callback(err);
        });
    }
});


// in slots, find and delete student IDs that don't point to any student
router.get("/fixSlots", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }
    logger.info("Starting fixslots.");
    var nbrMissing = 0;
    Slot.find(function (err, slots) {
        if (err) {
            logger.error("error finding slots: " + err.msg);
            return res.redirect("back");
        }
        var slotNbr = 0;
        // loop thru slots
        async.whilst(
            function () {
                return slotNbr < slots.length;
            },
            function (slotCallback) {
                // logger.debug("Slot iteratee executed for slot=" + slots[slotNbr]._id);
                // loop thru students
                var studNbr = 0;
                async.whilst(
                    function () {
                        return studNbr < slots[slotNbr].students.length;
                    },
                    function (studentCallback) {
                        // logger.debug("iteratee called for studNbr=" + studNbr + ", slotNbr=" + slotNbr);
                        Student.findById(slots[slotNbr].students[studNbr], function (err, student) {
                            if (err) {
                                studentCallback(err);
                            }
                            else {
                                if (student == undefined || student.slot != slots[slotNbr]._id.toString()) {
                                    nbrMissing++;
                                    logger.info("For slot Id=" + slots[slotNbr]._id + ", unscheduled student Id=" + slots[slotNbr].students[studNbr] + " found");
                                    if (student != undefined) {
                                        logger.info(student.fullName + " found with scheduled slot=" + student.slot);
                                    }
                                    Slot.findById(slots[slotNbr]._id, function (err, slot) {
                                        if (err) {
                                            studentCallback(err);
                                        }
                                        else {
                                            // logger.debug("students before=" + slot.students);
                                            var delIndex = shared.getItemIndex(slot.students, slots[slotNbr].students[studNbr].toString());
                                            if (delIndex == null) {
                                                err = " in fixSlots, student ID to delete not found in slot";
                                                logger.error(err);
                                                studentCallback(err);
                                            }
                                            else {
                                                // logger.debug("deleting student at array index=" + delIndex);
                                                slot.students.splice(delIndex, 1);
                                                // logger.debug("students after=" + slot.students);
                                                slot.count--;
                                                slot.save(function (err) {
                                                    if (!err) {
                                                        logger.info("unscheduled student deleted from slot")
                                                        studNbr++;
                                                    }
                                                    studentCallback(err);
                                                });
                                            }
                                        }
                                    })
                                }
                                else {
                                    // logger.debug("found student=" + student.fullName + " with slot Id=" + slots[slotNbr]._id);
                                    studNbr++;
                                    studentCallback(err);
                                }
                            }
                        })
                    },
                    function (err) {
                        if (err) {
                            logger.error("error in student loop: " + err.msg);
                        }
                        slotNbr++;
                        slotCallback(err);
                    }
                );
            },
            function (err) {
                if (err) {
                    logger.error("error in slot loop: " + err.msg);
                    req.flash("error", "fixSlots: error in slot loop: " + err.msg);
                }
                else {
                    req.flash("success", nbrMissing + " slots containing 'unscheduled' students were fixed.");
                }
                logger.info("Ending fixslots. Nbr missing students in slots=" + nbrMissing);
                res.redirect("back");
            }
        );
    });
});

// Find students who have a slot id but the slot doesn't point to the student
// i.e. looks like they are on the schedule but they aren't
router.get("/fixStudents", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }
    logger.info("Starting fixStudents.")
    var nbrMissing = 0;

    Student.find({
            slot: {
                $ne: null
            }
        })
        .exec(function (err, students) {
            if (err) {
                logger.error("error finding students: " + err.msg);
                return res.redirect("back");
            }
            var studNbr = 0;
            // loop thru students
            async.whilst(
                function () {
                    return studNbr < students.length;
                },
                function (callback) {
                    // logger.debug("student iteratee executed for student id=" + students[studNbr]._id);
                    Slot.findById(students[studNbr].slot, function (err, slot) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            var studIndex = null;
                            if (slot != null) {
                                studIndex = shared.getItemIndex(slot.students, students[studNbr]._id.toString());
                            }
                            // doesn't work to look up object id (_id) without toString
                            // logger.debug("slot.students=" + slot.students);
                            // logger.debug("studIndex=" + studIndex);
                            if (studIndex == null) {
                                logger.info("student=" + students[studNbr]._id + " not found in slot=" + students[studNbr].slot);
                                nbrMissing++;
                                // delete schedule data from student
                                Student.findByIdAndUpdate(students[studNbr]._id, {
                                    day: null,
                                    slot: null
                                }, function (err) {
                                    studNbr++;
                                    callback(err);
                                })
                            }
                            else {
                                studNbr++;
                                callback(err);
                            }
                        }
                    });
                },
                function (err) {
                    if (err) {
                        logger.error("fixStudents: error in student loop: " + err.msg);
                        req.flash("error", "fixStudents: error in student loop: " + err.msg);
                    }
                    req.flash("success", nbrMissing + " 'scheduled' students missing from slots were fixed.");
                    logger.info("Ending fixStudents. Nbr 'scheduled' students missing from slots=" + nbrMissing);
                    res.redirect("back");
                }
            );
        });
});

module.exports = router;
