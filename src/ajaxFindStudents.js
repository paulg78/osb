/* global $ */

function listStudents(findStr) {
    // console.log('findStr=' + findStr);
    $.ajax({
        url: '/students/find',
        type: 'GET',
        data: findStr,
        success: function(students) {
            // console.log('Ajax post returned success');
            if (students) {
                students.forEach(function(student) {
                    $('#studentList').append(
                        `
                        <tr>
                            <td>${student.fname}</td>
                            <td>${student.lname}</td>
                            <td>${student.schoolName}</td>
                            <td>${student.grade}</td>
                            <td>${student.scName}</td>
                            <td>${student.dateStr}</td>
                            <td>${student.served ? 'Y' : 'N'}</td>
                            <td><a href="/students/${student._id}/fix" class="btn btn-xs btn-primary">Fix</a></td>
                        </tr>
                        `
                    );
                });
            }
        },
        error: function(err) {
            // console.log('Ajax GET returned error: ' + err.responseText);
            $('#studentList').append(
                `
                <p>${'Error geting data: ' + err.responseText}</p>
                `
            );
        }
    });
}


$('#findStudentForm').submit(function(e) {
    e.preventDefault();
    // console.log('find by name event');
    $("#schoolList").val('');
    $('#studentList').empty();
    listStudents($(this).serialize());
});

$("#schoolList").on('change', function() {
    if (this.selectedIndex > 0) { // selected a school
        // console.log("changed school to " + this.value);
        $("#lname").val('');
        $('#studentList').empty();
        listStudents("schoolCode=" + this.value);
    }
});
