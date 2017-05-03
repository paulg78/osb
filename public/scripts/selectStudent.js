/* global $ */

// Activate selected student
$('.list-group-item').on('click', function() {
    $('.active').removeClass('active');
    $(this).toggleClass('active');
    // enable add student buttons
    $("[name='addStudentBtn']").attr("disabled",false);
});

// Set form action (URL)
$(":input").on('click', function() {
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