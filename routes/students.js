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

function firstLetterUpCase(val) {
    if (val == null) {
        return "";
    }
    var str = val.toString().trim();
    if (str.length > 0) {
        var s = str[0].toUpperCase() + str.substring(1, str.length);
        return s;
    }
    return str;
}

// formats student attributes; returns error message or empty string if no errors
function studentValid(student) {
    student.fname = firstLetterUpCase(student.fname);
    student.lname = firstLetterUpCase(student.lname);
    student.gender = firstLetterUpCase(student.gender);
    student.grade = student.grade.toString().trim();
    if (student.fname == "" || student.lname == "" || student.grade == "") {
        return "first name, last name, and grade are required fields";
    }
    var len = student.grade.length;
    if ((len == 1 && (student.grade < "1" || student.grade > "9")) ||
        (len == 2 && (student.grade < "10" || student.grade > "12")) ||
        (len < 1) || (len > 2)
    ) {
        return "grade must be a number from 1 to 12";
    }
    return "";
}

//CREATE - add new student to DB
router.post("/", middleware.isLoggedIn, function (req, res) {

    var studentData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade,
        school: res.locals.currentUser.school
    };

    var result = studentValid(studentData);
    if (result == "") {
        Student.create(studentData, function (err, newStudent) {
            if (err) {
                console.log("create failed: " + err.message);
                res.status(500).send(err.message);
            }
            else {
                res.json(newStudent);
            }
        });
    }
    else {
        res.status(500).send(result);
    }
});

// Find student and render form
router.get("/:id/edit", middleware.isLoggedIn, function (req, res) {
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

    var result = studentValid(newData);
    if (result == "") {
        Student.findByIdAndUpdate(req.params.id, {
            $set: newData
        }, function (err, student) {
            if (err) {
                console.log("edit database error");
                req.flash("error", err.message);
                res.redirect("back");
            }
            else {
                // console.log("Updating student");
                req.flash("success", "Successfully Updated!");
                res.redirect("/students");
            }
        });
    }
    else {
        console.log("edit validation error");
        req.flash("error", result);
        res.redirect("back");
    }
});

module.exports = router;
