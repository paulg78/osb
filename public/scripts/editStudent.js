'use strict';
/* global $ Option */

$("#delStudBtn").on('click', function(e) {
    if (confirm("Ready to delete " + $("#fname").val() + " " + $("#lname").val() + ".  Click Cancel or OK.") != true) {
        e.preventDefault();
    }
});

$("#saveStudBtn").on('click', function(e) {
    this.disabled = true;
    console.log('$("#unschedCB").is(":not(:checked)")=' + $("#unschedCB").is(":not(:checked)"));
    if ($("#fname").val().trim() == "" || $("#lname").val().trim() == "") {
        alert("First and last name are required fields");
        e.preventDefault();
        this.disabled = false;
    }
    else if ($("#unschedCB").is(":not(:checked)") && $("#dateSched").val() != "" && $("#timeSched").val() == "") {
        alert("Date and Time are required to schedule a student.");
        e.preventDefault();
        this.disabled = false;
    }
    else {
        this.form.submit();
    }
});
