/* global $ */
$('#newStudentForm').submit(function (e) {
    e.preventDefault();
    var studentStr = $(this).serialize();

    $.ajax({
        url: '/students',
        type: 'POST',
        data: studentStr,
        success: function (student) {
            console.log('Ajax post returned success');
            $('#studentList').append(
                `
            <tr>
                <td>${student.fname}</td>
                <td>${student.lname}</td>
                <td>${student.gender}</td>
                <td>${student.grade}</td>
                <td></td>
                <td></td>
                <td>
                 <form style="display: inline" action="/students/${student._id}?_method=DELETE" method="POST">
                    <a href="/students/${student._id}/edit" class="btn btn-xs btn-info">EDIT</a>
                    <button class="hidden" class="btn btn-xs btn-danger">DELETE</button>
                </form>                
                </td>
            </tr>            
                `
            )
            var remaining = $('#remaining').text() - 1;
            $('#remaining').text(remaining);
            // $('#remaining').text($('#remaining').text() - 1);
            if (remaining < 1) {
                $('#newStudentForm').hide();
            }
            else {
                $('#newStudentForm').find('.form-control').val("");
                $('#newStudentForm').find('.form-control').first().focus();
            }
        },
        error: function (err) { // how can I get it to take this path on error?
            console.log('Ajax post returned error: ' + err);
        }
    })
})
