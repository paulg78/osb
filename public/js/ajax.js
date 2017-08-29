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
            // console.log('Ajax post returned success');
            $('#studentList').append('\n            <tr>\n                <td>' + student.fname + '</td>\n                <td>' + student.lname + '</td>\n                <td>' + student.grade + '</td>\n                <td></td>\n                <td></td>\n                <td></td>\n                <td>\n                 <form style="display: inline" action="/students/' + student._id + '?_method=DELETE" method="POST">\n                    <a href="/students/' + student._id + '/edit" class="btn btn-xs btn-primary">Edit</a>\n                    <button class="delStudBtn btn btn-xs btn-danger pull-right">Delete</button>\n                </form>\n                </td>\n            </tr>\n                ');
            $('#addMsg').removeClass('failMsg successMsg');
            $('#addMsg').addClass('successMsg');
            $('#addMsg').text(student.fname + " " + student.lname + " added.");
            var remaining = $('#remaining').text() - 1;
            $('#remaining').text(remaining);
            $('#newStudentForm').find('.form-control').val("");
            $('#newStudentForm').find('.form-control').first().focus();
        },
        error: function error(err) {
            console.log('Ajax post returned error: ' + err.responseText);
            $('#addMsg').removeClass('failMsg successMsg');
            $('#addMsg').addClass('failMsg');
            $('#addMsg').text(err.responseText);
        }
    });
});

$(".delStudBtn").on('click', function (e) {
    // if (confirm("Ready to delete " + student.fullName + ". Click cancel or OK.") == true
    var tds = $(this).parent().parent().siblings();
    if (confirm("Ready to delete " + tds[0].innerText + " " + tds[1].innerText + ".  Click Cancel or OK.") != true) {
        e.preventDefault();
    }
});