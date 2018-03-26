'use strict';

/* global $ */
/* global Option */
$('#newStudentForm').submit(function (e) {
    e.preventDefault();
    var studentStr = $(this).serialize();

    $.ajax({
        url: '/students',
        type: 'POST',
        data: studentStr,
        success: function success(result) {
            // console.log('Ajax post returned success');
            if (result.student != null) {
                $('#studentList').append('\n            <tr>\n                <td>' + result.student.fname + '</td>\n                <td>' + result.student.lname + '</td>\n                <td>' + result.student.grade + '</td>\n                <td></td>\n                <td></td>\n                <td>\n                 <form style="display: inline" action="/students/' + result.student._id + '?_method=DELETE" method="POST">\n                    <a href="/students/' + result.student._id + '/edit" class="btn btn-xs btn-primary">Edit</a>\n                    <button class="delStudBtn btn btn-xs btn-danger pull-right">Delete</button>\n                </form>\n                </td>\n            </tr>\n                ');
                $('#addMsg').removeClass('failMsg successMsg');
                $('#addMsg').addClass('successMsg');
                $('#addMsg').text(result.student.fname + " " + result.student.lname + " added.");
                $('#newStudentForm').find('.form-control').val("");
                $('#newStudentForm').find('.form-control').first().focus();
            }
            else {
                if (result.msg != null) {
                    $('#addMsg').removeClass('failMsg successMsg');
                    $('#addMsg').addClass('failMsg');
                    $('#addMsg').text(result.msg);
                }
            }
            if (result.remaining != null) {
                $('#remaining').text(result.remaining);
            }
        },
        error: function error(err) {
            console.log('Ajax post returned error: ' + err.responseText);
            $('#addMsg').removeClass('failMsg successMsg');
            $('#addMsg').addClass('failMsg');
            $('#addMsg').text(err.message);
        }
    });
});

$(".delStudBtn").on('click', function (e) {
    var tds = $(this).parent().parent().siblings();
    if (confirm("Ready to delete " + tds[0].innerText + " " + tds[1].innerText + ".  Click Cancel or OK.") != true) {
        e.preventDefault();
    }
});

$(".schedStdnt").on('show.bs.select', function (e) {
    // e.preventDefault();
    this.oldValue = this.value;
    this.add(new Option('Text 1', 'Value1'));
    this.add(new Option('Text 2', 'Value2'));
    this.add(new Option('Text 3', 'Value3'));
    $(this).selectpicker('refresh');
    // console.log(this.options[2]);
    // console.log("old=" + this.oldValue);
});

$(".schedStdnt").on('hidden.bs.select', function (e) {
    $(this).children('option:not(:first)').remove();
});

$(".schedStdnt").on('changed.bs.select', function (e) {
    e.preventDefault();
    // console.log("changed schedule from " + this.oldValue + " to " + this.value);
});
