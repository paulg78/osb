/* global $ */
$('#newStudentForm').submit(function(e) {
    e.preventDefault();
    var studentStr = $(this).serialize();

    $.ajax({
        url: '/students',
        type: 'POST',
        data: studentStr,
        success: function(result) {
            // console.log('Ajax post returned success');
            $('#flashmsg').hide();
            if (result.student) {
                $('#studentList').append(
                    `
            <tr>
                <td>${result.student.fname}</td>
                <td>${result.student.lname}</td>
                <td>${result.student.grade}</td>
                <td>${$('#currUser')[0].innerText}</td>                
                <td></td>
                <td>no</td>
                <td>
                    <form style="display: inline">
                        <a href="/students/${result.student._id}/edit" class="btn btn-xs btn-primary">Edit</a>
                    </form>
                </td>
            </tr>
                `
                );
                $('#addMsg').removeClass('failMsg successMsg');
                $('#addMsg').addClass('successMsg');
                $('#addMsg').text(result.student.fname + " " + result.student.lname + " added.");
                $('#newStudentForm').find('.form-control').val("");
                $('#newStudentForm').find('.form-control').first().focus();
            }
            else {
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
        error: function(err) {
            // console.log('Ajax post returned error: ' + err.responseText);
            $('#addMsg').removeClass('failMsg successMsg');
            $('#addMsg').addClass('failMsg');
            $('#addMsg').text(err.message);
        }
    });
});

$(".delStudBtn").on('click', function(e) {
    var tds = $(this).parent().parent().siblings();
    if (confirm("Ready to delete " + tds[0].innerText + " " + tds[1].innerText + ".  Click Cancel or OK.") != true) {
        e.preventDefault();
    }
});
