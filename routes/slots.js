var express = require("express");
var router  = express.Router({mergeParams: true});
var Day = require("../models/day");
var Slot = require("../models/slot");
var Student = require("../models/student");
var middleware = require("../middleware");

//Slots New
router.get("/new", middleware.isLoggedIn, function(req, res){
    // find day by id
    console.log(req.params.id);
    Day.findById(req.params.id, function(err, day){
        if(err){
            console.log(err);
        } else {
             res.render("slots/new", {day: day});
        }
    })
});

//Slots Create
router.post("/",middleware.isLoggedIn,function(req, res){
  //lookup day using ID
  Day.findById(req.params.id, function(err, day){
      if(err){
          console.log(err);
          res.redirect("/days");
      } else {
          var newSlot = { time: req.body.time, max: req.body.max };
          Slot.create(newSlot, function(err, slot){
          if(err){
              console.log(err);
          } else {
              slot.save();
              day.slots.push(slot);
              day.save();
              console.log(slot);
              req.flash('success', 'Created a slot!');
              res.redirect('/days/' + day._id);
          }
        });
      }
  });
});

// router.get("/:slotId/edit", middleware.isLoggedIn, function(req, res){
//     // find day by id
//     Comment.findById(req.params.slotId, function(err, slot){
//         if(err){
//             console.log(err);
//         } else {
//              res.render("slots/edit", {day_id: req.params.id, slot: slot});
//         }
//     })
// });

//put student into a slot
router.put("/:id", function(req, res){
    var slotId = req.params.id;
    console.log("****** start req  *****");
    console.log(req.body);
        console.log("****** end req  *****");
    var studentId = req.body.selectedStudentId;
    console.log("in slot put; adding student to slot");
    console.log("studentId=" + studentId);
    console.log("slotId=" + slotId);
    Slot.findById(slotId, function(err, slotFound){
      if(err){
          console.log("slot not found");
        //   res.render("edit");
      } else {
        // push the student id into array of students in slot
        slotFound.students.push(studentId);
        slotFound.save();
        Student.findById(studentId).exec(function(err, foundStudent) {
            if (err) {
                console.log(err);
            } else {
                foundStudent.slot = slotId;
                foundStudent.save();
            }
        });
        //   console.log("slot=" + slotFound);
        console.log("slot found");
          res.redirect("/days/");
      }
  }); 
});

// router.delete("/:slotId",middleware.checkUserComment, function(req, res){
//     Comment.findByIdAndRemove(req.params.slotId, function(err){
//         if(err){
//             console.log("PROBLEM!");
//         } else {
//             res.redirect("/days/" + req.params.id);
//         }
//     })
// });

module.exports = router;