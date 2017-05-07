/* global $ */

// Activate unscheduled student and enable add buttons
$("[name='unschedStud']").on('click', function() {
    // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
    $('.active').removeClass('active');    
    // $('.active').filter("[name='unschedStud']").removeClass('active');
    $(this).toggleClass('active');
    $("[name='addStudentBtn']").attr("disabled",false);
});

// Add student to schedule
$("[name='addStudentBtn']").on('click', function() {
    console.log("clicked add student");
    var dayId = $("#dayId").text(); 
    var slotId= $(this).parent().parent().parent().find("[name='slotId']").text()
    var studentId= $('.active').filter("[name='unschedStud']").children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    // $(this)[0].form.action ="/days/" + dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
    $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=PUT";
});

// Activate scheduled student and show remove button
$("[name='schedStud']").on('click', function() {
    // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
    $('.active').removeClass('active');   
    // $('.active').filter("[name='schedStud']").removeClass('active');
    $(this).toggleClass('active');
    $(this).parent().parent().find("[name='remStudentBtn']").removeClass('hidden');
    //fix problem of item being clicked more than once (check if button already exists)
    // $(this).parent().children().append('<button type="button" id="removeStudentbtn">remove</button>');
    // // enable add student buttons
    // $("[name='addStudentBtn']").attr("disabled",false);
});

// Remove student from schedule
$("[name='remStudentBtn']").on('click', function() {
    console.log("clicked remove student");
    var dayId = $("#dayId").text(); 
    var slotId= $(this).parent().parent().parent().find("[name='slotId']").text()
    var studentId= $('.active').filter("[name='schedStud']").children("[name=studentId]").text();
    console.log("dayId=" + dayId);
    console.log("slotId=" + slotId);
    console.log("studentId=" + studentId);
    $(this)[0].form.action = dayId + "/slots/" + slotId + "/students/" + studentId + "?_method=DELETE";
});