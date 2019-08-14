const
    fixflag = 'y',
    log = "fixCountsLog.txt",
    fs = require('fs'),
    mongoose = require("mongoose"),
    Slot = require("./models/slot"),
    Student = require("./models/student");

// console.log("process.env.DATABASEURL='" + process.env.DATABASEURL + "'");

mongoose.connect(process.env.DATABASEURL, { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true });

console.log("Starting checkCounts with fixflag=" + fixflag);
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
            console.log("checkCounts, student aggregate " + err.message);
        }
        else {
            // console.log("schedStudCounts=" + JSON.stringify(schedStudCounts));
            Slot.find({}, { avCnt: 1, max: 1 })
                .sort({
                    _id: 1,
                })
                .exec(function(err, slots) {
                    if (err) {
                        console.log("error finding slots " + err.message);
                    }
                    else {
                        var nbrMismatch = 0,
                            nbrOverbook = 0;

                        // console.log("slots=" + slots);
                        var j = 0;
                        var jlim = schedStudCounts.length;
                        for (var i = 0, len = slots.length; i < len; i++) {

                            while (j < jlim && schedStudCounts[j]._id < slots[i]._id) {
                                j++;
                            }
                            // console.log("i=" + i + ", j=" + j);
                            var studentCount = 0;
                            if (j < jlim && schedStudCounts[j]._id == slots[i]._id.toString()) {
                                studentCount = schedStudCounts[j].count;
                            }
                            if (studentCount != slots[i].max - slots[i].avCnt) {
                                console.log("count mismatch id=" + slots[i]._id + ", student count=" + studentCount + ", slot count=" + (slots[i].max - slots[i].avCnt));
                                nbrMismatch++;
                                if (fixflag == "y") { // fix avCnt in Slot
                                    Slot.findByIdAndUpdate(slots[i]._id.toString(), {
                                            $set: { avCnt: slots[i].max - studentCount }
                                        },
                                        function(err) {
                                            if (err) {
                                                console.log("error updating slot-" + err.message);
                                            }
                                        });
                                }
                            }
                            if (studentCount > slots[i].max) {
                                console.log("overbooked id=" + slots[i]._id + ", student count=" + studentCount + ", slot max=" + slots[i].max);
                                nbrOverbook++;
                            }
                        }
                        console.log("Ending checkCounts. Nbr count mismatches found=" + nbrMismatch + ", overbooked=" + nbrOverbook);
                    }
                });
        }
        // give the slot updates some time to finish before disconnecting database
        setTimeout(function() {
            mongoose.disconnect();
        }, 5000);
    });
