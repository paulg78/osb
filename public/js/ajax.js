'use strict';

/* global $ */
/* global Option */

function dateString(d) {
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var h = d.getHours();
    var ap;
    if (h > 12) {
        h = h - 12;
        ap = "PM";
    }
    else {
        ap = "AM";
    }
    var m = d.getMinutes();
    if (m == 0) {
        m = "00";
    }
    return dayNames[d.getDay()] + " " + (d.getMonth() + 1) + "/" + d.getDate() + "/" + (d.getFullYear() - 2000) + " " + h + ":" + m + " " + ap;
}

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

// $("body").on('load', function (e) {
//     // e.preventDefault();
//     //  var sp = this;
//     $.ajax({
//         url: "/slots/avail",
//         type: 'GET',
//         success: function (slots) {
//             if (slots) {
//                 console.log("ajax callback executed; slots[0].sdate=" + slots[0].sdate);
//                 // slots.forEach(function (slot) {
//                 //     // sp.add(new Option(dateString(slot.sdate), slot.sdate.toISOString()));
//                 //     sp.add(new Option(slot.sdate, slot.sdate));
//                 // });
//                 // sp.add(new Option('from server', 'val from server'));
//                 // $(this).selectpicker('refresh');
//             }
//             else {
//                 console.log("returned false");
//             }
//         }
//     });
//     console.log("finished ajax call");
// });

function getAvailSlots() {
    // e.preventDefault();
    //  var sp = this;
    $.ajax({
        url: "/slots/avail",
        type: 'GET',
        success: function (slots) {
            console.log("slots returned=" + slots + ".");
            // console.log("ajax callback executed; slots[0].sdate=" + slots[0].sdate);
            $("#slotsAvail").text(slots);
            // slots.forEach(function (slot) {
            //     // sp.add(new Option(dateString(slot.sdate), slot.sdate.toISOString()));
            //     sp.add(new Option(slot.sdate, slot.sdate));
            // });
            // sp.add(new Option('from server', 'val from server'));
            // $(this).selectpicker('refresh');
        }
    });
    // console.log("finished getAvailSlots");
}

$(".dateSched").on('show.bs.select', function (e) {
    // var slots = JSON.parse($("#slotsAvail").text());
    // slots.forEach(function (slot) {
    //     $(this).add(new Option(slot.sdate));
    // });
    console.log("adding option");
    $(this).add(new Option("another"));
    $(this).selectpicker('refresh');
    // console.log(this.options[2]);
});

$(".schedStdnt").on('hidden.bs.select', function (e) {
    // $(this).children('option:not(:first)').remove();
});

$(".schedStdnt").on('changed.bs.select', function (e) {
    e.preventDefault();
    console.log("changed schedule from " + this.oldValue + " to " + this.value);
});
