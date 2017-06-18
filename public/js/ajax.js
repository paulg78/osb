'use strict';

/* global $ */
$('#newStudentForm').submit(function (e) {
    e.preventDefault();
    var studentStr = $(this).serialize();

    $.ajax({
        url: '/students',
        type: 'POST',
        data: studentStr,
        success: function success(student) {
            console.log('Ajax post returned success');
            $('#studentList').append('\n            <tr>\n                <td>' + student.fname + '</td>\n                <td>' + student.lname + '</td>\n                <td>' + student.gender + '</td>\n                <td>' + student.grade + '</td>\n                <td></td>\n                <td></td>\n                <td>\n                 <form style="display: inline" action="/students/' + student._id + '?_method=DELETE" method="POST">\n                    <a href="/students/' + student._id + '/edit" class="btn btn-xs btn-info">EDIT</a>\n                    <button class="btn btn-xs btn-danger">DELETE</button>\n                </form>                \n                </td>\n            </tr>            \n                ');
            $('#addMsg').removeClass('failMsg successMsg');
            $('#addMsg').addClass('successMsg');
            $('#addMsg').text(student.fname + " " + student.lname + " added.");
            var remaining = $('#remaining').text() - 1;
            $('#remaining').text(remaining);
            if (remaining < 1) {
                $('#newStudentForm').hide();
            } else {
                $('#newStudentForm').find('.form-control').val("");
                $('#newStudentForm').find('.form-control').first().focus();
            }
        },
        error: function error(err) {
            console.log('Ajax post returned error: ' + err.responseText);
            $('#addMsg').removeClass('failMsg successMsg');
            $('#addMsg').addClass('failMsg');
            $('#addMsg').text(err.responseText);
        }
    });
});