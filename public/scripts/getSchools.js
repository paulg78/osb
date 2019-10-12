'use strict';
/* global $ */

function getSchools() {
    $.ajax({
        url: "/schools/list",
        type: 'GET',
        success: function(schoolsJson) {
            // console.log("schools returned=" + schoolsJson + ".");
            var schoolOptions = document.getElementById('schoolList');
            var schools = JSON.parse(schoolsJson);
            var i;
            for (i = 0; i < schools.length; i++) {
                schoolOptions.add(new Option(schools[i].name, schools[i].schoolCode));
            }
        }
    });
    // console.log("finished getSchools");
}
