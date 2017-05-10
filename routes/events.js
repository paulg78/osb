var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var User = require("../models/user");
var Event = require("../models/event");
var Day = require("../models/day");
var middleware = require("../middleware");
var async = require('async');

//INDEX - show all events
router.get("/", function (req, res) {
    // Get all events from DB
    Event.find({}, 'name', function (err, allEvents) {
        if (err) {
            console.log(err);
        }
        else {
            // console.log("allEvents=" + allEvents);
            res.render("events/index", {
                events: allEvents
            });
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
        var scheduleArray = JSON.parse(req.body.scheduleString);
        var numRows = scheduleArray.length;
        console.log("numRows=" + numRows);
        var i = 0;
        var j;
        async.whilst(
            function () {
                return i < numRows;
            },
            function (whilstCallback) {
                console.log("async iteratee called");
                console.log("i=" + i);
                var day = {
                    date: scheduleArray[i][0],
                    slots: []
                };
                for (j = 1; j < scheduleArray[i].length; j++) {
                    console.log("j=" + j);
                    var slot = {
                        time: scheduleArray[i][j],
                        max: scheduleArray[i + 1][j],
                        students: []
                    };
                    console.log("created slot; time=" + scheduleArray[i][j] + ", max=" + scheduleArray[i + 1][j]);
                    day.slots.push(slot);
                }

                // save day and get day ID
                Day.create(day, function (err, newDay) {
                    if (!err) {
                        console.log("created day=" + newDay.date);
                        // add day id to event
                        ev.days.push(newDay._id);
                    }
                    i += 2;
                    console.log("calling callback with i=" + i);
                    whilstCallback(err);
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
        .select('name days.date days._id')
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

// CREATE - add new event to DB
router.post("/:eventId/days", function (req, res) {
    // var newEvent = {
    //     name: req.body.name
    // };
    // // Create a new event and save to DB
    // Event.create(newEvent, function(err, newlyCreated) {
    //     if (err) {
    //         console.log(err);
    //     }
    //     else {
    //         //redirect back to events page
    //         console.log(newlyCreated);
    //         res.redirect("/events");
    //     }
    // });
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
    //find the event with provided ID
    // Event.findById(req.params.eventId).populate("slots").exec(function(err, foundEvent) {  // populates slots but not students
    // Event.findById(req.params.eventId)
    //     .populate({ path: 'days', model: 'Day',
    //         populate { path: 'slots',  model: 'Slot',
    //             populate { path: 'students' model: 'Student'
    Event.findById(req.params.eventId)
        // .populate({ path: 'days',
        //     populate: { path: 'slots',
        //         populate: { path: 'students', model: 'Student'
        //         }
        //     }
        // })
        .populate({
            path: 'days.slots.students',
            model: 'Student'
        })
        .exec(function (err, foundEvent) {
            if (err) {
                console.log(err);
            }
            else {
                // foundEvent.days.forEach(function(day) {
                //     console.log("day.slots=" + day.slots);
                // });
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
                                        event: foundEvent,
                                        day: getById(foundEvent.days, req.params.dayId),
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
    Event.findById(req.params.eventId).exec(function (err, foundEvent) {
        if (err) {
            console.log(err);
        }
        else {
            var day = getById(foundEvent.days, req.params.dayId);
            var slot = getById(day.slots, req.params.slotId);
            slot.students.push(req.params.studentId);
            // console.log("slot.students=" + slot.students);
            foundEvent.save(function (err) {
                if (err) {
                    console.log(err);
                }
                else {
                    Student.findById(req.params.studentId).exec(function (err, foundStudent) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            foundStudent.slot = req.params.slotId;
                            foundStudent.save();
                        }
                    });
                }
            });
        }
    });
    res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
});

// Add student to slot
router.delete("/:eventId/days/:dayId/slots/:slotId/students/:studentId", function (req, res) {
    console.log("deleting student from slot");
    console.log("studentId=" + req.params.studentId);
    console.log("slotId=" + req.params.slotId);
    Event.findById(req.params.eventId).exec(function (err, foundEvent) {
        if (err) {
            console.log(err);
        }
        else {
            var day = getById(foundEvent.days, req.params.dayId);
            var slot = getById(day.slots, req.params.slotId);
            console.log("before=" + slot.students);

            // "clever" use of splice to remove elements
            // The first parameter defines the (0 relative) position where elements will be deleted.
            // The second parameter defines how many elements will be removed. 
            slot.students.splice(getItemIndex(slot.students, req.params.studentId), 1);
            console.log("after=" + slot.students);

            foundEvent.save(function (err) {
                if (err) {
                    console.log(err);
                }
                else {
                    Student.findById(req.params.studentId).exec(function (err, foundStudent) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            foundStudent.slot = undefined;
                            foundStudent.save();
                        }
                    });
                }
            });
        }
    });
    res.redirect("/events/" + req.params.eventId + "/days/" + req.params.dayId);
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
