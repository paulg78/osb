var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var User = require("../models/user");
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
// router.get("/new", middleware.isLoggedIn, function(req, res){
router.get("/new", function (req, res) {
    res.render("events/new");
});

// CREATE - add new event to DB
router.post("/", function (req, res) {
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
            console.log(newlyCreated);
            res.redirect("/events");
        }
    });
});

// upload days and slots (schedule of fittings)
// router.get("/uploadCsv", middleware.isLoggedIn, function(req, res){
router.get("/:eventId/uploadCsv", function (req, res) {
    Event.findById(req.params.eventId).exec(function (err, foundEvent) {
        if (err) {
            console.log(err);
        }
        else {
            //render show template with that day
            res.render("events/uploadCsv", {
                event: foundEvent
            });
        }
    });
});

// update database with days and slots (schedule of fittings)
router.post("/:eventId/createSchedule", function (req, res) {
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
        res.redirect("/events");
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

// SHOW - days in an  event
// router.get("/:eventId/days", middleware.isLoggedIn, function(req, res) {
router.get("/:eventId/days", function (req, res) {
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

// Show form to add day to event
router.get("/:eventId/days/new", function (req, res) {
    res.render("events/newDay", {
        eventId: req.params.eventId
    });
});

// CREATE - add new day to DB
router.post("/:eventId/days", function (req, res) {
    async.waterfall([
        createDay,
        updateEvent,
    ], function (err) {
        if (err) {
            req.flash("error", "Error adding message; see error in console.");
            console.log("Error adding message: " + err);
            res.redirect("back");
        }
        else {
            res.redirect("days");
        }
    });

    function createDay(callback) {
        Day.create({
            date: req.body.date,
            slots: []
        }, function (err, day) {
            callback(err, day);
        });
    }

    function updateEvent(day, callback) {
        Event.findByIdAndUpdate(req.params.eventId, {
            $push: {
                days: day._id
            }
        }, function (err) {
            callback(err);
        });
    }
});

function getById(arr, id) {

    for (var i = 0, iLen = arr.length; i < iLen; i++) {
        if (arr[i]._id == id) return arr[i];
    }
}

function getItemIndex(arr, item) {

    for (var i = 0, iLen = arr.length; i < iLen; i++) {
        if (arr[i] == item) return i;
    }
}

// SCHEDULE - shows info about one day of one event
router.get("/:eventId/days/:dayId", middleware.isLoggedIn, function (req, res) {
    Day.findById(req.params.dayId)
        .populate({
            path: 'slots',
            populate: {
                path: 'students'
                    // select: '_id fname lname grade' // doesn't populate anything                
            }
        })

    // .populate('slots')
    // .populate('slots.students')
    .exec(function (err, foundDay) {
        if (err) {
            console.log(err);
        }
        else {
            // console.log("user id=" + req.user._id);
            User.findById(req.user._id, function (err, userFound) {
                if (err) {
                    console.log(err);
                }
                else {
                    // console.log("school=" + userFound.school);
                    // find the unassigned students
                    Student.find({
                            school: userFound.school,
                            slot: undefined
                        }, 'fname lname grade',
                        function (err, queryResponse) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                // console.log("students=" + queryResponse);
                                // console.log(foundEvent);
                                // console.log("req.params.dayId=" + req.params.dayId);
                                // console.log("foundEvent.days=" + foundEvent.days);
                                // console.log("day=" + getById(foundEvent.days, req.params.dayId));
                                // console.log("queryResponse=" + queryResponse);
                                res.render("events/daySchedule", {
                                    eventId: req.params.eventId,
                                    day: foundDay,
                                    students: queryResponse,
                                    school: userFound.school
                                });
                            }
                        });
                }
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
        }
        console.log("sending json response");
        res.json();
        // res.redirect("back");
        // res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
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
        }
        res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
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
            day: undefined,
            slot: undefined
        }, function (err) {
            callback(err);
        });
    }
});


router.get("/:dayId/edit", middleware.isLoggedIn, function (req, res) {
    console.log("IN EDIT!");
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
    console.log("IN day put! looking for id=" + req.params.dayId);
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

module.exports = router
