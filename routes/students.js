var express = require("express");
var router  = express.Router();
var Student = require("../models/student");
var middleware = require("../middleware");
var request = require("request");

//INDEX - show students for school of logged in user
router.get("/", function(req, res){
    // Get all students from DB
    // console.log("req.user.school=" + req.user.school);
    // console.log("currentUser.school=" + currentUser.school);
    // console.log("res:");
    // console.log(res);
    console.log("*** current user=" + res.locals.currentUser.school);
    Student.find({school: res.locals.currentUser.school}, function(err, allStudents){
       if(err){
           console.log(err);
       } else {
          res.render("students/index",{students:allStudents});
         }
    });
});

//CREATE - add new student to DB
router.post("/", middleware.isLoggedIn, function(req, res){
    // get data from form and add to students collection
    var newStudent = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade,
        school: req.body.school}

    // Create a new student and save to DB
    Student.create(newStudent, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to students page
            console.log(newlyCreated);
            res.redirect("/students");
        }
    });
});

//NEW - show form to create new student
router.get("/new", middleware.isLoggedIn, function(req, res){
  res.render("students/new"); 
});

// // SHOW - shows more info about one student
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

// router.get("/:id/edit", middleware.checkUserStudent, function(req, res){
//     console.log("IN EDIT!");
//     //find the student with provided ID
//     Student.findById(req.params.id, function(err, foundStudent){
//         if(err){
//             console.log(err);
//         } else {
//             //render show template with that student
//             res.render("students/edit", {student: foundStudent});
//         }
//     });
// });

// router.put("/:id", function(req, res){
//     var newData = {name: req.body.name, image: req.body.image, description: req.body.desc};
//     Student.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, student){
//         if(err){
//             req.flash("error", err.message);
//             res.redirect("back");
//         } else {
//             req.flash("success","Successfully Updated!");
//             res.redirect("/students/" + student._id);
//         }
//     });
// });


//middleware
// function isLoggedIn(req, res, next){
//     if(req.isAuthenticated()){
//         return next();
//     }
//     req.flash("error", "You must be signed in to do that!");
//     res.redirect("/login");
// }

module.exports = router;

