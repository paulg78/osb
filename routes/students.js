var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var School = require("../models/school");
var middleware = require("../middleware");
var request = require("request");

//INDEX - show students for school of logged in user
router.get("/", middleware.isLoggedIn, function (req, res) {

    School.find({
            name: res.locals.currentUser.school
        })
        .exec(function (err, qrySchool) {
            if (err) {
                console.log(err);
            }
            else {
                console.log("school=" + qrySchool);
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
                            console.log("school=" + qrySchool);
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
    // get data from form and add to students collection

    var userSchool;
    if (res.locals.currentUser == undefined) {
        userSchool = "";
        console.log("*** current user is undefined");
    }
    else {
        userSchool = res.locals.currentUser.school;
    }

    var newStudent = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade,
        school: userSchool
    }

    // Create a new student and save to DB
    Student.create(newStudent, function (err, newlyCreated) {
        if (err) {
            console.log(err);
        }
        else {
            //redirect back to students page
            // console.log(newlyCreated);
            res.redirect("/students");
        }
    });
});

//NEW - show form to create new student
router.get("/new", middleware.isLoggedIn, function (req, res) {
    res.render("students/new");
});

// SHOW - shows more info about one student
// router.get("/:id", function(req, res){
//     //find the student with provided ID
//     Student.findById(req.params.id).populate("comments").exec(function(err, foundStudent){
//         if(err){
//             console.log(err);
//         } else {
//             console.log(foundStudent)
//             //render show template with that student
//             res.render("students/show", {student: foundStudent});
//         }
//     });
// });

router.get("/:id/edit", function (req, res) {
    console.log("IN EDIT!");
    //find the student with provided ID
    Student.findById(req.params.id, function (err, foundStudent) {
        if (err) {
            console.log(err);
        }
        else {
            //render show template with that student
            res.render("students/edit", {
                student: foundStudent
            });
        }
    });
});

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
            console.log("Updating student");
            req.flash("success", "Successfully Updated!");
            // res.redirect("/students/" + student._id);
            res.redirect("/students");
        }
    });
});


//middleware
// function isLoggedIn(req, res, next){
//     if(req.isAuthenticated()){
//         return next();
//     }
//     req.flash("error", "You must be signed in to do that!");
//     res.redirect("/login");
// }

module.exports = router;
