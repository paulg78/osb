/* global $ */

// Remove student from schedule
$(".checkIn").on('change', function (e) {
    // console.log("clicked check in");  // logs in browser
    var studentId = $(this).siblings("[name=studentId]").text();
    // console.log("studentId=" + studentId);
    var checkedIn = $(this)[0].checked;
    console.log("checkedIn=" + checkedIn);

    $.ajax({
        url: "/students/" + studentId + "/checkIn/" + checkedIn,
        type: 'PUT',
        success: function (result) {
            console.log("updated database and ajax callback executed");

        }
    });
    console.log("finished ajax call");
});
