/* global $ */

// Activate selected student on unscheduled list
// $('.list-group-item').on('click', function() {
$("[name='unschedStud']").on('click', function() {
    $('.active').filter("[name='unschedStud']").removeClass('active');
    $(this).toggleClass('active');
    // enable add student buttons
    $("[name='addStudentBtn']").attr("disabled",false);
});

// Add student to schedule
// Set form action (URL)
// $(":input").on('click', function() {
$("[name='addStudentBtn']").on('click', function() {
    console.log("clicked add student");
    var dayId = $("#dayId").text(); 
    var slotId= $(this).parent().children("[name='slotId']").val();
    var studentId= $('.active').children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    // $(this)[0].form.action ="/days/" + dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
    $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
});

// Show remove button for scheduled student selected
$("[name='schedStud']").on('click', function() {
    // $('.active').filter("[name='schedStud']").removeClass('active');
    // $(this).toggleClass('active
    //fix problem of item being clicked more than once (check if button already exists)
    $(this).parent().children().append('<button type="button" id="removeStudentbtn">remove</button>');
    // // enable add student buttons
    // $("[name='addStudentBtn']").attr("disabled",false);
});

// Remove student from schedule
$("#removeStudentbtn").on('click', function() {
    console.log("clicked remove student");
    // var dayId = $("#dayId").text(); 
    // var slotId= $(this).parent().children("[name='slotId']").val();
    // var studentId= $('.active').children("[name=studentId]").text();
    // console.log("dayId=" + dayId);
    // console.log("slotId=" + slotId);
    // console.log("studentId=" + studentId);
    // $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
});