var express = require("express");
var router = express.Router();
var Event = require("../models/event");
var middleware = require("../middleware");
var async = require('async');
/* global logger */


//INDEX - This app works with only one event so this redirects to day list if there is only 1 event
router.get("/", middleware.isLoggedIn, function (req, res) {
    if (global.evnt == null) {
        Event.findOne({})
            .populate({
                path: 'days',
                model: 'Day',
                select: 'date'
            })
            .exec(function (err, ev) {
                if (err) {
                    logger.error(err);
                }
                else {
                    if (ev == null) {
                        res.render("events/new");
                    }
                    else {
                        global.evnt = ev;
                        res.redirect("/days");
                    }
                }
            });
    }
    else {
        res.redirect("/days");
    }
});

//NEW - show form to create new event
router.get("/new", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    res.render("events/new");
});

// CREATE - add new event to DB
router.post("/", middleware.isLoggedIn, function (req, res) {
    if (res.locals.currentUser.role == 'role_sc') {
        return res.redirect("back");
    }
    var newEvent = {
        name: req.body.name
    };
    // Create a new event and save to DB
    Event.create(newEvent, function (err) {
        if (err) {
            logger.error(err);
        }
        else {
            res.redirect("/events");
        }
    });
});


module.exports = router;
