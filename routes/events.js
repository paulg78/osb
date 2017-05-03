var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var User = require("../models/user");
var Event = require("../models/event");
var middleware = require("../middleware");

//INDEX - show all days
router.get("/", function(req, res) {
    // Get all days from DB
    Event.find({}, function(err, allEvents) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("events/index", {
                events: allEvents
            });
        }
    });
});

//NEW - show form to create new day
// router.get("/new", middleware.isLoggedIn, function(req, res){
router.get("/new", function(req, res) {
    res.render("events/new");
});

// CREATE - add new event to DB
router.post("/", function(req, res) {
    var newEvent = {
        name: req.body.name
    };
    // Create a new event and save to DB
    Event.create(newEvent, function(err, newlyCreated) {
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
router.get("/:eventId/uploadCsv", function(req, res) {
    Event.findById(req.params.eventId).exec(function(err, foundEvent) {
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
router.post("/:eventId/createSchedule", function(req, res) {
    var i, j;
    var scheduleArray = JSON.parse(req.body.scheduleString);
    console.log("scheduleArray.length=" + scheduleArray.length);
    Event.findById(req.params.eventId).exec(function(err, ev) {
        if (err) {
            console.log(err);
        }
        else {
            for (i = 0; i < scheduleArray.length; i++) {
                console.log("i=" + i);
                var day = {};
                day["date"] = scheduleArray[i][0];
                day["slots"] = [];
                var slot = {};
                for (j = 1; j < scheduleArray[i].length; j += 2) {
                    console.log("j=" + j);
                    slot["time"] = scheduleArray[i][j];
                    slot["max"] = scheduleArray[i][j + 1];
                    console.log("created slot; time=" + scheduleArray[i][j] + ", max=" + scheduleArray[i][j + 1]);
                    slot["students"] = [];
                    day.slots.push(slot);
                }
                ev.days.push(day);
                console.log("created day=" + scheduleArray[i][0]);
            }
            ev.save(function(err, day) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("created schedule for event=" + ev.name);
                }
            });
        }
    });
    res.redirect("/events");
});

// SHOW - days in an  event
router.get("/:eventId", middleware.isLoggedIn, function(req, res) {
    //find the event with provided ID
    // Event.findById(req.params.eventId).populate("slots").exec(function(err, foundEvent) {  // populates slots but not students
    Event.findById(req.params.eventId).exec(function(err, foundEvent) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("events/show", {
                days: foundEvent.days
            });
        }
    });
});


// SHOW - shows more info about one day of one event
router.get("/:eventId/days/:dayId", middleware.isLoggedIn, function(req, res) {
    //find the event with provided ID
    // Event.findById(req.params.eventId).populate("slots").exec(function(err, foundEvent) {  // populates slots but not students
    Event.findById(req.params.eventId)
        .populate({
            path: 'students',
            model: 'Student'
        })
        .exec(function(err, foundEvent) {
            if (err) {
                console.log(err);
            }
            else {
                // console.log("user id=" + req.user._id);
                User.findById(req.user._id, function(err, userFound) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        // console.log("school=" + userFound.school);
                        // find the unassigned students
                        Student.find({
                            school: userFound.school,
                            slot: undefined
                        }, function(err, queryResponse) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                // console.log("students=" + queryResponse);
                                // console.log(foundEvent);
                                res.render("events/show", {
                                    event: foundEvent,
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

router.get("/:dayId/edit", middleware.isLoggedIn, function(req, res) {
    console.log("IN EDIT!");
    //find the day with provided ID
    Day.findById(req.params.dayId).populate("slots").exec(function(err, foundDay) {
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

router.put("/:dayId", function(req, res) {
    console.log("IN day put! looking for id=" + req.params.dayId);
    Day.findByIdAndUpdate(req.params.dayId, {
        date: req.body.date
    }, function(err, day) {
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