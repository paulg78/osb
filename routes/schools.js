var express = require("express");
var router = express.Router();
var School = require("../models/school");
var Student = require("../models/student");
var middleware = require("../middleware");
// var request = require("request");
var async = require('async');
/* global logger */

// All school routes start here; blocks school actions by role_sc
router.use(middleware.isLoggedIn, function (req, res, next) {
    logger.debug("went to all user routes");
    if (res.locals.currentUser.role == 'role_sc') {
        res.redirect("back");
    }
    else {
        logger.debug("going to next user route");
        next('route');
    }
});

//INDEX - list schools
router.get("/", function (req, res) {

    async.waterfall([
        getSchools,
        getStudentCountBySchool,
        getSchedStudentCountBySchool,
        getServedCountBySchool,
    ], function (err, schools) {
        if (err) {
            logger.error(err);
        }
        res.render("schools/index", {
            schools: schools
        });
    });

    function getSchools(callback) {
        School.find().sort({
                name: 1
            })
            .exec(function (err, schools) {
                callback(err, schools);
            });
    }

    function getStudentCountBySchool(schools, callback) {
        logger.debug("Getting student count by school");
        Student.aggregate([{
                $group: {
                    _id: '$school',
                    count: {
                        $sum: 1
                    }
                }
            }, {
                $sort: {
                    _id: 1
                }
            }])
            .exec(function (err, schoolCounts) {
                var i = 0;
                var len = schoolCounts.length;
                schools.forEach(function (school) {
                    while (i < len && schoolCounts[i]._id < school.name) {
                        i++;
                        logger.debug("i=" + i);
                    }
                    if (i < len && school.name == schoolCounts[i]._id) {
                        school.count = schoolCounts[i].count;
                        logger.debug("school.name=" + school.name + ", student count=" + school.count);
                    }
                    else {
                        school.count = 0;
                    }
                });
                callback(err, schools);
            });
    }

    function getSchedStudentCountBySchool(schools, callback) {
        logger.debug("Getting scheduled student count by school");
        Student.aggregate([{
                $match: {
                    slot: {
                        $ne: null
                    }
                }
            }, {
                $group: {
                    _id: '$school',
                    count: {
                        $sum: 1
                    }
                }
            }, {
                $sort: {
                    _id: 1
                }
            }])
            .exec(function (err, schoolCounts) {
                var i = 0;
                var len = schoolCounts.length;
                schools.forEach(function (school) {
                    while (i < len && schoolCounts[i]._id < school.name) {
                        i++;
                        logger.debug("i=" + i);
                    }
                    if (i < len && school.name == schoolCounts[i]._id) {
                        school.schedCount = schoolCounts[i].count;
                        logger.debug("school.name=" + school.name + ", student schedCount=" + school.schedCount);
                    }
                    else {
                        school.schedCount = 0;
                    }
                });
                callback(err, schools);
            });
    }

    function getServedCountBySchool(schools, callback) {
        logger.debug("Getting served student count by school");
        Student.aggregate([{
                $match: {
                    served: {
                        $eq: true
                    }
                }
            }, {
                $group: {
                    _id: '$school',
                    count: {
                        $sum: 1
                    }
                }
            }, {
                $sort: {
                    _id: 1
                }
            }])
            .exec(function (err, schoolCounts) {
                var i = 0;
                var len = schoolCounts.length;
                schools.forEach(function (school) {
                    while (i < len && schoolCounts[i]._id < school.name) {
                        i++;
                        logger.debug("i=" + i);
                    }
                    if (i < len && school.name == schoolCounts[i]._id) {
                        school.servedCount = schoolCounts[i].count;
                        logger.debug("school.name=" + school.name + ", student servedCount=" + school.servedCount);
                    }
                    else {
                        school.servedCount = 0;
                    }
                });
                callback(err, schools);
            });
    }
});

//CREATE - add new school to DB
// router.post("/", middleware.isLoggedIn, function (req, res) {
router.post("/", function (req, res) {

    School.create({
        name: req.body.name,
        quota: req.body.quota
    }, function (err, newlyCreated) {
        if (err) {
            logger.error(err.errmsg);
            if (err.code == 11000) {
                req.flash("error", req.body.name + " has already been created.");
            }
            else {
                req.flash("error", "Schedule upload failed: " + err.message);
            }
            res.redirect("back");
            // res.redirect("/schools/new");
        }
        else {
            //redirect back to schools page
            logger.debug(newlyCreated);
            res.redirect("/schools");
        }
    });
});

//NEW - show form to create new school
router.get("/new", function (req, res) {
    res.render("schools/new");
});

router.get("/:id/edit", function (req, res) {
    //find the school with provided ID
    School.findById(req.params.id, function (err, foundSchool) {
        if (err) {
            logger.error(err);
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
    var newData = {
        quota: req.body.quota
    };

    School.findByIdAndUpdate(req.params.id, {
        $set: newData
    }, function (err, school) {
        if (err) {
            logger.error("edit error");
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            req.flash("success", "Successfully Updated!");
            // res.redirect("/schools/" + school._id);
            res.redirect("/schools");
        }
    });
});

// upload schools from CSV file
router.get("/uploadSchools", function (req, res) {
    res.render("schools/uploadSchools");
});

// update database schools
router.post("/createSchools", function (req, res) {
    var schools = JSON.parse(req.body.schoolsString);
    var numSchools = schools.length;
    var row = 1; // skip column heading
    logger.info("starting school upload");
    async.whilst(
        function () {
            return row < numSchools;
        },
        function (schoolCallback) {
            logger.debug("iteratee called, row=" + row);
            var school = {
                name: schools[row][0],
                district: schools[row][1],
                quota: schools[row][2]
            };
            School.findOne({
                name: school.name
            }, function (err, schoolFound) {
                if (err) {
                    logger.error("Error finding school=" + school.name + ", " + err.message);
                    schoolCallback(err);
                }
                else {
                    if (schoolFound == undefined) {
                        School.create(school, function (err) {
                            if (err) {
                                logger.error("Error creating school, row=" + (row + 1) + " school=" + school.name + ", " + err.message);
                            }
                            else {
                                logger.info("created school=" + school.name);
                            }
                            row++;
                            schoolCallback(err);
                        });
                    }
                    else { // update quota/district if changed
                        if (school.district != schoolFound.district || school.quota != schoolFound.quota) {
                            schoolFound.district = school.district;
                            schoolFound.quota = school.quota;
                            schoolFound.save(function (err) {
                                if (err) {
                                    logger.error("Error updating school, row=" + (row + 1) + " school=" + school.name + ", " + err.message);
                                }
                                else {
                                    logger.info("Updated school=" + school.name);
                                }
                                row++;
                                schoolCallback(err);
                            });
                        }
                        else {
                            row++;
                            schoolCallback(null); // no error
                        }
                    }
                }
            });
        },
        function (err) {
            if (err) {
                logger.error("error while uploading schools");
                req.flash("error", "error while uploading schools");
            }
            else {
                req.flash("success", "Schools updated!");
            }
            logger.info("school upload complete");
            res.redirect("/schools");
        }
    );
});

module.exports = router;
