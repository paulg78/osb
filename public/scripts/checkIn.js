/* global $ */

$(".checkIn").on('click', function () {
    var btn = $(this);
    // var studentId = btn.siblings("[name=studentId]").text();
    // console.log("studentId=" + studentId);  // logs in browser
    var srv = btn.siblings("[name=served]");

    // console.log("served=" + served);

    $.ajax({
        url: "/students/" + btn.parent().next().find("[name=studentId]").text() + "/checkIn/" + srv.text(),
        type: 'PUT',
        success: function (result) {
            // console.log("updated database and ajax callback executed, result=" + result);
            if (result == true) {
                btn.html('<span class="glyphicon glyphicon-ok"></span>');
                btn.removeClass("btn-default");
                btn.addClass("btn-success");
                srv.html("yes");
            }
            else {
                btn.html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
                btn.removeClass("btn-primary btn-success");
                btn.addClass("btn-default");
                srv.html("no");
            }
        }
    });
    // console.log("finished ajax call");
});
