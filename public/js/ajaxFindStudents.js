"use strict";

/* global $ */

function dateString(d) {
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var h = d.getHours();
    var ap;
    if (h > 12) {
        h = h - 12;
        ap = "PM";
    } else {
        ap = "AM";
    }
    var m = d.getMinutes();
    if (m == 0) {
        m = "00";
    }
    return dayNames[d.getDay()] + " " + (d.getMonth() + 1) + "/" + d.getDate() + "/" + (d.getFullYear() - 2000) + " " + h + ":" + m + " " + ap;
}

function listStudents(findStr) {
    // console.log('findStr=' + findStr);
    $.ajax({
        url: '/students/find',
        type: 'GET',
        data: findStr,
        success: function success(students) {
            // console.log('Ajax post returned success');
            if (students) {
                students.forEach(function (student) {
                    $('#studentList').append("\n                        <tr>\n                            <td>" + student.fname + "</td>\n                            <td>" + student.lname + "</td>\n                            <td>" + student.schoolName + "</td>\n                            <td>" + student.grade + "</td>\n                            <td>" + student.scName + "</td>\n                            <td>" + (student.sdate ? dateString(new Date(student.sdate)) : '') + "</td>\n                            <td>" + (student.served ? 'Y' : 'N') + "</td>\n                        </tr>\n                        ");
                });
            }
        },
        error: function error(err) {
            // console.log('Ajax GET returned error: ' + err.responseText);
            $('#studentList').append("\n                <p>" + ('Error geting data: ' + err.responseText) + "</p>\n                ");
        }
    });
}

$('#findStudentForm').submit(function (e) {
    e.preventDefault();
    // console.log('find by name event');
    $("#schoolList").val('');
    $('#studentList').empty();
    listStudents($(this).serialize());
});

$("#schoolList").on('change', function (e) {
    if (this.selectedIndex > 0) {
        // selected a school
        // console.log("changed school to " + this.value);
        $("#lname").val('');
        $('#studentList').empty();
        listStudents("schoolCode=" + this.value);
    }
});