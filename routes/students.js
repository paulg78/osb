var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var School = require("../models/school");
var middleware = require("../middleware");
var request = require("request");

// List Students (all or by school)
router.get("/", middleware.isLoggedIn,
    function (req, res, next) {
        if (res.locals.currentUser.role == 'role_sc') {
            // console.log("skipping to next students handler");
            next();
        }
        else { // list all students
            // console.log("after next");
            Student.find()
                .populate('day', 'date')
                .populate('slot', 'time')
                .sort({
                    fname: 1,
                    lname: 1
                })
                .exec(function (err, queryResponse) {
                    if (err) {
                        console.log(err.errmsg);
                        req.flash("error", "System Error: " + err.message);
                        res.redirect("back");
                    }
                    else {
                        // console.log("school=" + qrySchool);
                        res.render("students/index", {
                            students: queryResponse
                        });
                    }
                });
        }
    },
    function (req, res) { //  List students for school counselor
        School.findOne({
                name: res.locals.currentUser.school
            })
            .exec(function (err, qrySchool) {
                if (err) {
                    console.log(err.errmsg);
                    req.flash("error", "System Error: " + err.message);
                    res.redirect("back");
                }
                else {
                    // console.log("in list students for a school");
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
                                res.render("students/bySchool", {
                                    students: queryResponse,
                                    qrySchool: qrySchool
                                });
                            }
                        });
                }
            });
    }
);

//CREATE - add new student to DB
router.post("/", middleware.isLoggedIn, function (req, res) {

    function firstLetterUpCase(str) {
        if (str) {
            return str[0].toUpperCase() + str.substring(1, str.length);
        }
        return "";
    }

    var studentData = {
        // fname: req.sanitize(req.body.firstName),
        fname: firstLetterUpCase(req.body.firstName),
        lname: firstLetterUpCase(req.body.lastName),
        gender: firstLetterUpCase(req.body.gender),
        grade: req.body.grade,
        school: res.locals.currentUser.school
    }

    // Create a new student and save to DB
    Student.create(studentData, function (err, newStudent) {
        if (err) {
            if (err.name == 'ValidationError') {
                req.flash("error", "first name, last name, and grade are required fields");
            }
            else {
                req.flash("error", "System error--student not saved");
            }
            console.log("create failed: " + err.message);
            // res.json(err); // need an ajax error response here to get on ajax error path
            res.status(500).send('Bad Request');
        }
        else {
            console.log("create succeeded");
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
