var express = require("express");
var router = express.Router();
var Day = require("../models/day");
var Slot = require("../models/slot");
var Student = require("../models/student");
var User = require("../models/user");
var middleware = require("../middleware");

//INDEX - show all days
router.get("/", function(req, res) {
    // Get all days from DB
    Day.find({}, function(err, allDays) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("days/index", {
                days: allDays
            });
        }
    });
});

// CREATE - add new day to DB
router.post("/", function(req, res) {
    // get data from form and add to days array

    var newDay = {
        date: req.body.date
    };
    // Create a new day and save to DB
    Day.create(newDay, function(err, newlyCreated) {
        if (err) {
            console.log(err);
        }
        else {
            //redirect back to days page
            console.log(newlyCreated);
            res.redirect("/days");
        }
    });
});

// upload days and slots (schedule of fittings)
// router.get("/getFileName", middleware.isLoggedIn, function(req, res){
router.get("/getFileName", function(req, res) {

    res.render("days/getFileName");
});

// update database with days and slots (schedule of fittings)
router.post("/createSchedule", function(req, res) {
    var i, j;
    var scheduleArray = JSON.parse(req.body.scheduleString);
    console.log("scheduleArray.length=" + scheduleArray.length);
    for (i = 0; i < scheduleArray.length; i++) {
        console.log("i="+i);
        // var newDay = new Day({
        //     date: scheduleArray[i][0]
        // });
        for (j = 1; j < scheduleArray[i].length; j += 2) {
            console.log("j="+j);
            // var newSlot = {
            //     time: scheduleArray[i][j],
            //     max: scheduleArray[i][j + 1]
            // };
            // Slot.create(newSlot, function(err, slot) {
            //     if (err) {
            //         return console.log(err);
            //     }
            //     else {
            //         // slot.save();
            //         newDay.slots.push(slot);
                    console.log("created slot; time=" + scheduleArray[i][j] + ", max=" + scheduleArray[i][j + 1]);
                    }
                                    console.log("created day=" + scheduleArray[i][0]);
            // });
        }
        // newDay.save(function(err, newDay) {
        //     if (err) {
        //         return console.log(err);
        //     }
        //     else {
                // console.log("created day=" + scheduleArray[i][0]);
            // }
               res.redirect("/days");
        });



//NEW - show form to create new day
// router.get("/new", middleware.isLoggedIn, function(req, res){
router.get("/new", function(req, res) {
    res.render("days/new");
});

// SHOW - shows more info about one day
router.get("/:dayId", middleware.isLoggedIn, function(req, res) {
    //find the day with provided ID
    // Day.findById(req.params.dayId).populate("slots").exec(function(err, foundDay) {  // populates slots but not students
    Day.findById(req.params.dayId)
        .populate({
            path: 'slots',
            model: 'Slot',
            populate: {
                path: 'students',
                model: 'Student'
            }
        })
        .exec(function(err, foundDay) {
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
                                // console.log(foundDay);
                                res.render("days/show", {
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