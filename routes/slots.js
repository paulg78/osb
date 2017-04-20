var express = require("express");
var router  = express.Router({mergeParams: true});
var Day = require("../models/day");
var Slot = require("../models/slot");
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

//Comments Create
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

// router.put("/:slotId", function(req, res){
//   Comment.findByIdAndUpdate(req.params.slotId, req.body.slot, function(err, slot){
//       if(err){
//           res.render("edit");
//       } else {
//           res.redirect("/days/" + req.params.id);
//       }
//   }); 
// });

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