var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var School = require("../models/school");
var middleware = require("../middleware");
var request = require("request");

//INDEX - show students for school of logged in user
router.get("/", middleware.isLoggedIn, function (req, res) {

    School.findOne({
            name: res.locals.currentUser.school
        })
        .exec(function (err, qrySchool) {
            if (err) {
                console.log(err);
            }
            else {
                Student.find({
                        school: res.locals.currentUser.school
                    })
                    .populate('day', 'date')
                    .populate('slot', 'time')
                    // Alternate syntax that also works:
                    // .populate({
                    //     path: 'day',
                    //     select: 'date'
                    // }).populate({
                    //     path: 'slot',
                    //     select: 'time'
                    // })
                    .exec(function (err, queryResponse) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            // console.log("school=" + qrySchool);
                            res.render("students/index", {
                                students: queryResponse,
                                qrySchool: qrySchool
                            });
                        }
                    });
            }
        });
});

//CREATE - add new student to DB
router.post("/", middleware.isLoggedIn, function (req, res) {

    var studentData = {
        // fname: req.sanitize(req.body.firstName),
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade,
        school: res.locals.currentUser.school
    }

    // Create a new student and save to DB
    Student.create(studentData, function (err, newStudent) {
        if (err) {
            console.log(err);
        }
        else {
            res.json(newStudent);
        }
    });
});

// Find student and render form
router.get("/:id/edit", function (req, res) {
    Student.findById(req.params.id, function (err, foundStudent) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("students/edit", {
                student: foundStudent
            });
        }
    });
});

// Update student in database
router.put("/:id", function (req, res) {
    console.log("IN put (update student)!");
    var newData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade
    };

    Student.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function (err, student) {
        if (err) {
            console.log("edit error");
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            // console.log("Updating student");
            req.flash("success", "Successfully Updated!");
            res.redirect("/students");
        }
    });
});

module.exports = router;
