var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var Slot = require("../models/slot");
var middleware = require("../middleware");
/* global logger */


// Return list of available slots
router.get("/avail/:need", function(req, res) {
    // logger.debug("req.params.need=" + req.params.need);
    // subtract 6 hours to account for mountain time
    const future = Date.now() - 21600000;

    Slot.find({ $and: [{ sdate: { $gt: future } }, { avCnt: { $gt: req.params.need - 1 } }] }, { _id: 0, sdate: 1, avCnt: 1 })
        .exec(function(err, slots) {
            if (err) {
                logger.error("error finding avail slots: " + err.message);
                res.status(500).send(err.message);
            }
            else {
                // logger.debug("avail slots: " + slots);
                res.json(JSON.stringify(slots));
            }
        });
});


// in slots, find and optionally fix counts that don't match actual number of students scheduled
router.get("/checkCounts/:fixflag", middleware.isLoggedIn, function(req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }
    logger.debug("Starting checkCounts with fixflag=" + req.params.fixflag);
    Student.aggregate([{
            $match: {
                slot: {
                    $ne: null
                }
            }
        }, {
            $group: {
                _id: '$slot',
                count: {
                    $sum: 1
                }
            }
        }, {
            $sort: {
                _id: 1
            }
        }])
        .exec(function(err, schedStudCounts) {
            if (err) {
                logger.error("checkCounts, student aggregate " + err.message);
            }
            else {
                // logger.debug("schedStudCounts=" + JSON.stringify(schedStudCounts));
                Slot.find({}, { avCnt: 1, max: 1 })
                    .sort({
                        _id: 1,
                    })
                    .exec(function(err, slots) {
                        if (err) {
                            logger.error("checkCounts, finding slots " + err.message);
                        }
                        else {
                            var nbrMismatch = 0,
                                nbrOverbook = 0;

                            // logger.debug("slots=" + slots);
                            var j = 0;
                            var jlim = schedStudCounts.length;
                            for (var i = 0, len = slots.length; i < len; i++) {

                                while (j < jlim && schedStudCounts[j]._id < slots[i]._id) {
                                    j++;
                                }
                                // logger.debug("i=" + i + ", j=" + j);
                                var studentCount = 0;
                                if (j < jlim && schedStudCounts[j]._id == slots[i]._id.toString()) {
                                    studentCount = schedStudCounts[j].count;
                                }
                                if (studentCount != slots[i].max - slots[i].avCnt) {
                                    logger.info("count mismatch id=" + slots[i]._id + ", student count=" + studentCount + ", slot count=" + (slots[i].max - slots[i].avCnt));
                                    nbrMismatch++;
                                    if (req.params.fixflag == "y") { // fix avCnt in Slot
                                        logger.info("fixing avCnt to match number of students scheduled");
                                        Slot.findByIdAndUpdate(slots[i]._id.toString(), {
                                                $set: { avCnt: slots[i].max - studentCount }
                                            },
                                            function(err) {
                                                if (err) {
                                                    logger.error("checkCounts, updating slot" + err.message);
                                                }
                                            });
                                    }
                                }
                                if (studentCount > slots[i].max) {
                                    logger.info("overbooked id=" + slots[i]._id + ", student count=" + studentCount + ", slot max=" + slots[i].max);
                                    nbrOverbook++;
                                }
                            }
                            if (req.params.fixflag == "y") {
                                req.flash("success", "Ran Fixcounts (checkCounts/y). Nbr count mismatches fixed=" + nbrMismatch + ", no changes to overbooked.");
                                logger.info("Ran fixCounts. Nbr count mismatches fixed=" + nbrMismatch);
                            }
                            else {
                                req.flash("success", "Ran checkCounts/n. Nbr count mismatches=" + nbrMismatch + ", overbooked=" + nbrOverbook);
                                logger.info("Ran checkCounts. Nbr count mismatches found=" + nbrMismatch + ", overbooked=" + nbrOverbook);
                            }
                            res.redirect("/login");
                        }
                    });
            }
        });
});

module.exports = router;
