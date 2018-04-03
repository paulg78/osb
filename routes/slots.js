var express = require("express");
var router = express.Router();
var Student = require("../models/student");
var Slot = require("../models/slot");
var middleware = require("../middleware");
/* global logger */


// Return list of available slots
router.get("/avail", function (req, res) {
    var today = new Date();
    var todayStr = today.getFullYear().toString() + "-" + (today.getMonth() + 1).toString() + "-" + today.getDate().toString();
    var qry = "this.sdate > new Date('" + todayStr + "') && this.count < this.max";
    // var qry = "this.count < this.max";
    logger.debug("avail slots qry=" + qry);
    // Slot.find({ $where: qry }, { _id: 0, sdate: 1 }).hint("sdate_1").sort({ sdate: 1 })
    Slot.find({ $where: qry }, { _id: 0, sdate: 1 }).hint("sdate_1")
        .exec(function (err, slots) {
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
router.get("/checkCounts/:fixflag", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role != 'role_wa') {
        return res.redirect("back");
    }
    logger.info("Starting checkCounts with fixflag=" + req.params.fixflag);
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
        .exec(function (err, schedStudCounts) {
            if (err) {
                logger.error("checkCounts, student aggregate " + err.message);
            }
            else {
                // logger.debug("schedStudCounts=" + JSON.stringify(schedStudCounts));
                Slot.find({}, { count: 1 })
                    .sort({
                        _id: 1,
                    })
                    .exec(function (err, slots) {
                        if (err) {
                            logger.error("checkCounts, finding slots " + err.message);
                        }
                        else {
                            var nbrMismatch = 0;
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
                                if (studentCount != slots[i].count) {
                                    logger.info("count mismatch id=" + slots[i]._id + ", student count=" + studentCount + ", slot count=" + slots[i].count);
                                    nbrMismatch++;
                                    if (req.params.fixflag == "y") { // fix count in Slot
                                        logger.info("setting slot count to " + studentCount);
                                        Slot.findByIdAndUpdate(slots[i]._id.toString(), {
                                                $set: { count: studentCount }
                                            },
                                            function (err) {
                                                if (err) {
                                                    logger.error("checkCounts, updating slot" + err.message);
                                                }
                                            });
                                    }
                                }
                            }
                            req.flash("success", "Ending checkCounts/" + req.params.fixflag + ". Nbr count mismatches=" + nbrMismatch);
                            logger.info("Ending checkCounts. Nbr count mismatches=" + nbrMismatch);
                            res.redirect("back");
                        }
                    });
            }
        });
});

module.exports = router;
