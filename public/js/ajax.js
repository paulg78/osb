'use strict';

/* global $ */
$(document).ready(function () {
    $('#newStudentForm').submit(function (e) {
        e.preventDefault();
        var studentStr = $(this).serialize();

        $.ajax({
            url: '/students',
            type: 'POST',
            data: studentStr,
            success: function success(result) {
                // console.log('Ajax post returned success');
                $('#flashmsg').hide();
                if (result.student) {
                    $('#studentList').append('\n            <tr>\n                <td>' + result.student.fname + '</td>\n                <td>' + result.student.lname + '</td>\n                <td>' + result.student.grade + '</td>\n                <td>' + $('#currUser')[0].innerText + '</td>                \n                <td></td>\n                <td>no</td>\n                <td>\n                    <form style="display: inline">\n                        <a href="/students/' + result.student._id + '/edit" class="btn btn-xs btn-primary">Edit</a>\n                    </form>\n                </td>\n            </tr>\n                ');
                    $('#addMsg').removeClass('failMsg successMsg');
                    $('#addMsg').addClass('successMsg');
                    $('#addMsg').text(result.student.fname + " " + result.student.lname + " added.");
                    $('#newStudentForm').find('.form-control').val("");
                    $('#newStudentForm').find('.form-control').first().focus();
                } else {
                    if (result.msg) {
                        $('#addMsg').removeClass('failMsg successMsg');
                        $('#addMsg').addClass('failMsg');
                        $('#addMsg').text(result.msg);
                    }
                }
                $('#remaining').text(result.remaining);
                if (result.remaining == '0') {
                    $('#newStudCtrl').hide();
                }
            },
            error: function error(err) {
                // console.log('Ajax post returned error: ' + err.responseText);
                $('#addMsg').removeClass('failMsg successMsg');
                $('#addMsg').addClass('failMsg');
                $('#addMsg').text(err.message);
            }
        });
    });
});