'use strict';

/* global $ */
$('#newStudentForm').submit(function (e) {
    e.preventDefault();
    var studentStr = $(this).serialize();
    $.post('/students', studentStr, function (student) {
        $('#studentList').append('\n            <tr>\n                <td>' + student.fname + '</td>\n                <td>' + student.lname + '</td>\n                <td>' + student.gender + '</td>\n                <td>' + student.grade + '</td>\n                <td></td>\n                <td></td>\n                <td>\n                 <form style="display: inline" action="/students/' + student._id + '?_method=DELETE" method="POST">\n                    <a href="/students/' + student._id + '/edit" class="btn btn-xs btn-info">EDIT</a>\n                    <button class="hidden" class="btn btn-xs btn-danger">DELETE</button>\n                </form>                \n                </td>\n            </tr>            \n                ');
        var remaining = $('#remaining').text() - 1;
        $('#remaining').text(remaining);
        // $('#remaining').text($('#remaining').text() - 1);
        if (remaining < 1) {
            $('#newStudentForm').hide();
        } else {
            $('#newStudentForm').find('.form-control').val("");
            $('#newStudentForm').find('.form-control').first().focus();
        }
    });
});