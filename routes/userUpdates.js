var express = require("express");
var router = express.Router();
var UserUpdate = require("../models/userUpdate");
var middleware = require("../middleware");
/* global logger */

// All user update routes start here; blocks user actions by role_sc
router.use(middleware.isLoggedIn, function (req, res, next) {
    // logger.debug("went to all user routes");
    if (res.locals.currentUser.role == 'role_sc') {
        res.redirect("back");
    }
    else {
        // logger.debug("going to next user route");
        next('route');
    }
});

//INDEX - show all userUpdates
router.get("/", function (req, res) {

    UserUpdate.find({}, { updateDate: 1 }).sort({
        updateDate: 1
    }).exec(function (err, updates) {
        if (err) {
            logger.error(err);
        }
        else {
            // logger.debug("updates=" + updates);
            res.render("userUpdates/index", {
                updates: updates
            });
        }
    });
});


// Find user update and render download form
router.get("/:id/view", function (req, res) {
    UserUpdate.findById(req.params.id, function (err, foundUpdate) {
        if (err) {
            logger.error(err);
        }
        else {
            res.render("userUpdates/view", {
                update: foundUpdate
            });
        }
    });
});


module.exports = router;
