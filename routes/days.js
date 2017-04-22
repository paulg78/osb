var express = require("express");
var router  = express.Router();
var Day = require("../models/day");
var Student = require("../models/student");
var User = require("../models/user");
var middleware = require("../middleware");

//INDEX - show all days
router.get("/", function(req, res){
    // Get all days from DB
    Day.find({}, function(err, allDays){
       if(err){
           console.log(err);
       } else {
        //   request('https://maps.googleapis.com/maps/api/geocode/json?address=sardine%20lake%20ca&key=AIzaSyBtHyZ049G_pjzIXDKsJJB5zMohfN67llM', function (error, response, body) {
        //     if (!error && response.statusCode == 200) {
        //         console.log(body); // Show the HTML for the Modulus homepage.
                res.render("days/index",{days:allDays});

        }
    });
// });
});
    // });

// CREATE - add new day to DB
// router.post("/", middleware.isLoggedIn, function(req, res){
router.post("/", function(req, res){
    // get data from form and add to days array

    var newDay = {date: req.body.date};
    // Create a new day and save to DB
    Day.create(newDay, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to days page
            console.log(newlyCreated);
            res.redirect("/days");
        }
    });
});

//NEW - show form to create new day
// router.get("/new", middleware.isLoggedIn, function(req, res){
router.get("/new", function(req, res){
  res.render("days/new"); 
});

// SHOW - shows more info about one day
router.get("/:id", function(req, res){
    //find the day with provided ID
    // Day.findById(req.params.id).populate("slots").exec(function(err, foundDay) {  // populates slots but not students
    Day.findById(req.params.id)
        .populate({
            path: 'slots',
            model: 'Slot',
            populate: {
                path: 'students',
                model: 'Student'
            }
            })
        .exec(function(err, foundDay) {
        if(err){
            console.log(err);
        } else {
            // console.log("user id=" + req.user._id);
            User.findById(req.user._id, function(err, userFound) {
            if (err) {
                console.log(err);
            } else {
                // console.log("school=" + userFound.school);
                Student.find({school: userFound.school, slot: undefined}, function(err, queryResponse){
                if(err){
                   console.log(err);
                } else {
                    // console.log("students=" + queryResponse);
                    // console.log(foundDay);
                    res.render("days/show", {day: foundDay, students: queryResponse});
                }
        });
        }
    });
        }
    });
});

router.get("/:id/edit", middleware.isLoggedIn, function(req, res){
    console.log("IN EDIT!");
    //find the day with provided ID
    Day.findById(req.params.id).populate("slots").exec(function(err, foundDay){
        if(err){
            console.log(err);
        } else {
            //render show template with that day
            res.render("days/edit", {day: foundDay});
        }
    });
});

router.put("/:id", function(req, res){
    console.log("IN day put! looking for id=" + req.params.id);
    Day.findByIdAndUpdate(req.params.id, {date: req.body.date}, function(err, day){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/days");
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

