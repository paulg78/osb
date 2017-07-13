/* global $ */

// Remove student from schedule
$(".checkIn").on('change', function (e) {
    // console.log("clicked check in");  // logs in browser
    var studentId = $(this).siblings("[name=studentId]").text();
    // console.log("studentId=" + studentId);

    $.ajax({
        url: "/students/" + studentId + "/checkIn",
        type: 'PUT',
        success: function (result) {
            console.log("updated database and ajax callback executed");

        }
    });
    console.log("finished ajax call");
});
