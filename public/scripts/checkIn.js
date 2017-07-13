/* global $ */

// Remove student from schedule
$(".checkIn").on('click', function (e) {
    var btn = $(this);
    var studentId = btn.siblings("[name=studentId]").text();
    // console.log("studentId=" + studentId);  // logs in browser
    var checkedIn = btn.siblings("[name=checkedIn]");
    var served = checkedIn.text();
    if (served == "") {
        served = "false";
    }
    // console.log("served=" + served);

    $.ajax({
        url: "/students/" + studentId + "/checkIn/" + served,
        type: 'PUT',
        success: function (result) {
            // console.log("updated database and ajax callback executed, result=" + result);
            if (result == true) {
                btn.html('<span class="glyphicon glyphicon-ok"></span>');
                btn.removeClass("btn-default");
                btn.addClass("btn-success");
                checkedIn.html("true");
            }
            else {
                btn.html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
                btn.removeClass("btn-primary btn-success");
                btn.addClass("btn-default");
                checkedIn.html("false");
            }
        }
    });
    // console.log("finished ajax call");
});
