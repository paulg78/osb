var express = require("express");
var router = express.Router();
var Student = require("../models/student");
//var User = require("../models/user");
var Event = require("../models/event");
var Day = require("../models/day");
var Slot = require("../models/slot");
var middleware = require("../middleware");
var async = require('async');

//INDEX - show all events
router.get("/", function (req, res) {
    // Get all events from DB
    Event.find({}, 'name', function (err, allEvents) {
        if (err) {
            console.log(err);
        }
        else { // If there is only one event, go right to days for that event
            if (allEvents.length == 1) {
                res.redirect("events/" + allEvents[0]._id + "/days");
            }

            else {
                // console.log("allEvents=" + allEvents);
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
            console.log(err);
        }
        else {
            //redirect back to events page
            // console.log(newlyCreated);
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
            console.log(err);
        }
        else {
            res.render("events/uploadSchedule", {
                event: foundEvent
            });
        }
    });
});

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
                console.log("async slot iteratee called");

                console.log("col=" + col);
                var slot = {
                    time: scheduleArray[row][col],
                    max: scheduleArray[row + 1][col],
                    students: []
                };
                // save slot and get slot ID
                Slot.create(slot, function (err, newSlot) {
                    if (!err) {
                        console.log("created slot=" + newSlot.time);
                        // add slot id to day
                        day.slots.push(newSlot._id);
                    }
                    col++;
                    console.log("calling slotCallback with col=" + col);
                    slotCallback(err);
                    // console.log("created slot; time=" + scheduleArray[row][col] + ", max=" + scheduleArray[row + 1][col]);
                });
            },
            function (err) {
                callbackfunction(err);
            }
        );
    }

    console.log("Going over the waterfall !");
    async.waterfall([
        findEvent,
        saveDays,
        saveEvent,
    ], function (err, result) {
        if (err) {
            console.log("Error creating schedule");
            req.flash("error", "Schedule upload failed: " + err.message);
        }
        res.render("/events");
    });

    function findEvent(callback) {
        console.log("starting findEvent");
        Event.findById(req.params.eventId).exec(function (err, ev) {
            callback(err, ev); // calls 2nd function
        });
    }

    function saveDays(ev, callback) {
        console.log("starting saveDays");
        console.log("numRows=" + numRows);
        var row = 0;
        var col;
        async.whilst(
            function () {
                return row < numRows;
            },
            function (dayCallback) {
                console.log("async day iteratee called");
                console.log("row=" + row);
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
                                console.log("created day=" + newDay.date);
                                // add day id to event
                                ev.days.push(newDay._id);
                            }
                        }
                        row += 2;
                        console.log("calling dayCallback with row=" + row);
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
        console.log("starting saveEvent");
        ev.save(function (err) {
            if (!err) {
                console.log("Uploaded days for event=" + ev.name);
                req.flash("success", "Uploaded days for event=" + ev.name);
            }
            callback(err, ev);
        });
    }

});

// SHOW - days in an event
router.get("/:eventId/days", middleware.isLoggedIn, function (req, res) {
    //find the event with provided ID
    // Event.findById(req.params.eventId).populate("slots").exec(function(err, foundEvent) {  // populates slots but not students
    Event.findById(req.params.eventId)
        .populate({
            path: 'days',
            model: 'Day',
            select: 'date'
        })
        .exec(function (err, foundEvent) {
            if (err) {
                console.log(err);
            }
            else {
                // console.log("foundEvent=" + foundEvent);
                res.render("events/days", {
                    event: foundEvent
                });
            }
        });
});


// Returns index of item in array arr if present; otherwise returns null
function getItemIndex(arr, item) {
    for (var i = 0, iLen = arr.length; i < iLen; i++) {
        if (arr[i] == item) return i;
    }
    return null;
}

// Middleware function to poupluate res.locals with previous and next day Ids
var getPrevNextIds = function (req, res, next) {
    // Find event to populate previous and next days
    var i;
    res.locals.prevDayId = "";
    res.locals.nextDayId = "";
    Event.findById(req.params.eventId).exec(function (err, foundEvent) {
        if (!err) {
            // console.log("foundEvent.days=" + foundEvent.days);
            i = getItemIndex(foundEvent.days, req.params.dayId);
            if (i != null) {
                // console.log("foundEvent.days[i]=" + foundEvent.days[i]);
                if (i > 0) {
                    res.locals.prevDayId = foundEvent.days[i - 1];
                }
                if (i < foundEvent.days.length - 1) {
                    res.locals.nextDayId = foundEvent.days[i + 1];
                }
            }
        }
        // console.log("before next, res.locals.prevDayId=" + res.locals.prevDayId);
        return next();
    });
};


// SCHEDULE By School - shows schedule for one day of an event
router.get("/:eventId/days/:dayId/school", middleware.isLoggedIn, getPrevNextIds, function (req, res) {
    // console.log("starting res.locals.prevDayId=" + res.locals.prevDayId);
    Day.findById(req.params.dayId)
        .populate({
            path: 'slots',
            populate: {
                path: 'students'
                    // select: '_id fname lname grade' // doesn't populate anything                
            }
        })
        .exec(function (err, foundDay) {
            if (err) {
                console.log(err);
            }
            else {
                // find the unassigned students
                Student.find({
                        school: res.locals.currentUser.school,
                        slot: undefined
                    }, 'fname lname grade',
                    function (err, queryResponse) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            // console.log("queryResponse=" + queryResponse);
                            // console.log("before render, res.locals.prevDayId=" + res.locals.prevDayId);
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
                path: 'students'
                    // select: '_id fname lname grade' // doesn't populate anything                
            }
        })
        .exec(function (err, foundDay) {
            if (err) {
                console.log(err);
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


// Add student to slot
router.put("/:eventId/days/:dayId/slots/:slotId/students/:studentId", function (req, res) {
    // console.log("adding student to slot");
    // console.log("studentId=" + req.params.studentId);
    // console.log("slotId=" + req.params.slotId);

    async.waterfall([
        updateSlot,
        updateStudent,
    ], function (err) {
        if (err) {
            console.log(err);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            // console.log("add-sending json response");
            res.json(""); // doesn't go to success function unless data is sent
            // console.log("add-json response sent");
        }
    });

    function updateSlot(callback) {
        Slot.findByIdAndUpdate(req.params.slotId, {
            $push: {
                students: req.params.studentId
            }
        }, function (err) {
            callback(err);
        });
    }

    function updateStudent(callback) {
        Student.findByIdAndUpdate(req.params.studentId, {
            day: req.params.dayId,
            slot: req.params.slotId
        }, function (err) {
            callback(err);
        });
    }
});

// Remove student from slot
router.delete("/:eventId/days/:dayId/slots/:slotId/students/:studentId", function (req, res) {
    // console.log("deleting student from slot");
    // console.log("studentId=" + req.params.studentId);
    // console.log("slotId=" + req.params.slotId);

    async.waterfall([
        findSlot,
        updateSlot,
        updateStudent,
    ], function (err) {
        if (err) {
            console.log(err);
            res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
        }
        else {
            // console.log("del-sending json response");
            res.json(""); // doesn't go to success function unless data is sent
            // console.log("del-json response sent");
        }
    });

    function findSlot(callback) {
        Slot.findById(req.params.slotId, function (err, slot) {
            callback(err, slot);
        });
    }

    function updateSlot(slot, callback) {
        // console.log("before=" + slot.students);

        // "clever" use of splice to remove elements
        // The first parameter defines the (0 relative) position where elements will be deleted.
        // The second parameter defines how many elements will be removed. 
        slot.students.splice(getItemIndex(slot.students, req.params.studentId), 1);
        // console.log("after=" + slot.students);
        slot.save(function (err) {
            callback(err);
        });
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


router.get("/:dayId/edit", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    //find the day with provided ID
    Day.findById(req.params.dayId).populate("slots").exec(function (err, foundDay) {
        if (err) {
            console.log(err);
        }
        else {
            //render show template with that day
            res.render("days/edit", {
                day: foundDay
            });
        }
    });
});

router.put("/:dayId", function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    // console.log("IN day put! looking for id=" + req.params.dayId);
    Day.findByIdAndUpdate(req.params.dayId, {
        date: req.body.date
    }, function (err, day) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            req.flash("success", "Successfully Updated!");
            res.redirect("/days");
        }
    });
});

router.get("/genSched", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }

    // find all students who aren't scheduled
    // find all slots
    // for each student
    //   find an empty slot (one where nbr scheduled < max)
    //      schedule a student
    // until all students are scheduled or out of slots
    async.waterfall([
        findUnschedStuds,
        findSlots,
        scheduleStudents,
    ], function (err) {
        if (err) {
            console.log(err);
        }
        res.redirect("back");
    });

    function findUnschedStuds(callback) {
        Student.find({
                slot: null
            })
            .exec(function (err, students) {
                callback(err, students);
            });
    }

    function findSlots(students, callback) {
        Slot.find()
            .exec(function (err, slots) {
                callback(err, students, slots);
            });
    }

    function scheduleStudents(students, slots, callback) {
        var studNbr = 0;
        var slotNbr = 0;

        async.whilst(
            function () {
                return studNbr < students.length && slotNbr < slots.length;
            },
            function (callback) {
                // console.log("iteratee called for studNbr=" + studNbr + ", slotNbr=" + slotNbr);
                // find next available slot
                while (slots[slotNbr].students.length >= slots[slotNbr].max &&
                    slotNbr < slots.length) {
                    slotNbr++;
                }
                // assign student to slot
                slots[slotNbr].students.push(students[studNbr]._id);
                Slot.findByIdAndUpdate(slots[slotNbr]._id, {
                    students: slots[slotNbr].students
                }, function (err) {
                    if (!err) {
                        // console.log("updated slot=" + slots[slotNbr]._id);
                        // find day containing slot
                        Day.findOne({
                                slots: {
                                    $elemMatch: {
                                        $eq: slots[slotNbr]._id
                                    }
                                }
                            },
                            function (err, day) {
                                if (!err) {
                                    // console.log("found day=" + day.date + ", id=" + day._id);
                                    // update student
                                    Student.findByIdAndUpdate(students[studNbr]._id, {
                                        day: day._id,
                                        slot: slots[slotNbr]._id
                                    }, function (err) {
                                        studNbr++;
                                        // console.log("Callback with studNbr=" + studNbr + ", slotNbr=" + slotNbr);
                                        callback(err);
                                    });
                                }
                            }
                        );
                    }
                });
            },
            function (err) {
                callback(err);
            }
        );
    }

});

module.exports = router
