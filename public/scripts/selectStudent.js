/* global $ */

// Activate unscheduled student and enable add buttons
$(".unschedStud").on('click', function () {
    // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
    $('.active').removeClass('active');
    // hide all the unschedule buttons
    $(".remStudBtn").hide();
    $(this).toggleClass('active');
    $(".addStudBtn").attr("disabled", false);
});

// Add student to schedule
$(".addStudBtn").on('click', function (e) {
    e.preventDefault();
    console.log("clicked add student");

    var dayId = $("#dayId").text();
    var slotId = $(this).parent().siblings("[name='slotId']").text();
    var studentId = $('.active.unschedStud').children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    // ajax version should add someone to slot; remove them from unscheduled list
    // $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";

    $(this).parent().siblings(".list-group").append(
        `
        <li class="list-group-item schedStud">
            <span name="studentText">${$('.active.unschedStud').children("[name=studentText]").text()}</span>
            <span name="studentId" class="hidden">${$('.active.unschedStud').children("[name=studentId]").text()}<span>
        </li>
        `
    );
    $('.active.unschedStud').remove();

    $.ajax({
        url: dayId + "/slots/" + slotId + "/students/" + studentId,
        type: 'PUT',
        success: function () {
            // move student text and id to schedule
            // $('.active.unschedStud').children("[name=studentText]").text();
 
        }
    });
});

// Activate scheduled student and show remove button
$(".schedStud").on('click', function () {
    var school = $("#school").text();
    if (school != "") { // only school counselors can remove students from schedule
        // hide all the unschedule buttons
        $(".remStudBtn").hide();
        // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
        $('.active').removeClass('active');
        $(this).toggleClass('active');
        $(this).parent().parent().find(".remStudBtn").show();
        // disable add student buttons
        $(".addStudBtn").attr("disabled", true);
    }
});

// Remove student from schedule
$(".remStudBtn").on('click', function () {
    console.log("clicked remove student");
    var dayId = $("#dayId").text();
    var slotId = $(this).parent().siblings("[name='slotId']").text();
    var studentId = $('.active.schedStud').children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=DELETE";
});
