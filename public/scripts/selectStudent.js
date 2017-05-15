/* global $ */

// Activate unscheduled student and enable add buttons
$("[name='unschedStud']").on('click', function () {
    // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
    $('.active').removeClass('active');
    // $('.active').filter("[name='unschedStud']").removeClass('active');
    // hide all the unschedule buttons
    $("[name='remStudentBtn']").hide();
    $(this).toggleClass('active');
    $("[name='addStudentBtn']").attr("disabled", false);
});

// Add student to schedule
$("[name='addStudentBtn']").on('click', function (e) {
    e.preventDefault();
    console.log("clicked add student");

    var dayId = $("#dayId").text();
    var slotId = $(this).parent().parent().children("[name='slotId']").text();
    var studentId = $('.active').filter("[name='unschedStud']").children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    // $(this)[0].form.action ="/days/" + dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
    // ajax version should add someone to slot; remove them from unscheduled list
    // $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
    $.ajax({
        url: dayId + "/slots/" + slotId + "/students/" + studentId,
        type: 'PUT',
        success: function () {
            // move student text to schedule
            // $('.active').filter("[name='unschedStud']").children("[name=studentText]").text();
        }
    });
});

// Activate scheduled student and show remove button
$("[name='schedStud']").on('click', function () {
    var school = $("#school").text();
    if (school != "") { // only school counselors can remove students from schedule
        // hide all the unschedule buttons
        $("[name='remStudentBtn']").hide();
        // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
        $('.active').removeClass('active');
        // $('.active').filter("[name='schedStud']").removeClass('active');
        $(this).toggleClass('active');
        $(this).parent().parent().find("[name='remStudentBtn']").show();
        // disable add student buttons
        $("[name='addStudentBtn']").attr("disabled", true);
    }
});

// Remove student from schedule
$("[name='remStudentBtn']").on('click', function () {
    console.log("clicked remove student");
    var dayId = $("#dayId").text();
    var slotId = $(this).parent().parent().children("[name='slotId']").text();
    var studentId = $('.active').filter("[name='schedStud']").children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=DELETE";
});
