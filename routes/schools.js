var express = require("express");
var router = express.Router();
var School = require("../models/school");
var Student = require("../models/student");
var middleware = require("../middleware");
var request = require("request");

//INDEX - show schools for school of logged in user
router.get("/", middleware.isLoggedIn, function (req, res) {

    function count(school, schoolData) {
        for (var i = 0; i < schoolData.length; i++) {
            console.log("schoolData[i]._id=" + schoolData[i]._id);
            if (schoolData[i]._id == school) {
                return schoolData[i].count;
            }
        }
        return "0";
    }

    // problem here -- no page render on error --- may be problem elsewhere too !!!
    School.find().sort({
            name: 1
        })
        .exec(function (err, schools) {
            if (err) {
                console.log(err);
            }
            else {
                Student.aggregate({
                        $group: {
                            _id: '$school',
                            count: {
                                $sum: 1
                            }
                        }
                    })
                    .exec(function (err, schoolCounts) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            schools.forEach(function (school) {
                                console.log("school.name=" + school.name);
                                school.count = count(school.name, schoolCounts);
                                console.log("count=" + school.count);
                            });
                        }
                        return res.render("schools/index", {
                            schools: schools
                        });
                    });
            }
        });
});

//CREATE - add new school to DB
// router.post("/", middleware.isLoggedIn, function (req, res) {
router.post("/", function (req, res) {

    School.create({
        name: req.body.name,
        quota: req.body.quota
    }, function (err, newlyCreated) {
        if (err) {
            console.log(err);
        }
        else {
            //redirect back to schools page
            // console.log(newlyCreated);
            res.redirect("/schools");
        }
    });
});

//NEW - show form to create new school
router.get("/new", middleware.isLoggedIn, function (req, res) {
    res.render("schools/new");
});

// SHOW - shows more info about one school
// router.get("/:id", function(req, res){
//     //find the school with provided ID
//     School.findById(req.params.id).populate("comments").exec(function(err, foundSchool){
//         if(err){
//             console.log(err);
//         } else {
//             console.log(foundSchool)
//             //render show template with that school
//             res.render("schools/show", {school: foundSchool});
//         }
//     });
// });

router.get("/:id/edit", function (req, res) {
    console.log("IN EDIT!");
    //find the school with provided ID
    School.findById(req.params.id, function (err, foundSchool) {
        if (err) {
            console.log(err);
        }
        else {
            //render show template with that school
            res.render("schools/edit", {
                school: foundSchool
            });
        }
    });
});

router.put("/:id", function (req, res) {
    console.log("IN put (update school)!");
    var newData = {
        fname: req.body.firstName,
        lname: req.body.lastName,
        gender: req.body.gender,
        grade: req.body.grade
    };

    School.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function (err, school) {
        if (err) {
            console.log("edit error");
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            console.log("Updating school");
            req.flash("success", "Successfully Updated!");
            // res.redirect("/schools/" + school._id);
            res.redirect("/schools");
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
