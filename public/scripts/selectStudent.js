/* global $ */

// Activate unscheduled student and enable add buttons
// listener is on the list instead of items on the list; otherwise moved items don't have listener
$(".unschedList").on('click', ".unschedStud", function () {
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
    $(".addStudBtn").attr("disabled", true);
    // console.log("clicked add student");

    var eventId = $("#eventId").text();
    var dayId = $("#dayId").text();
    var slotId = $(this).parent().siblings("[name='slotId']").text();
    var studentId = $('.active.unschedStud').children("[name=studentId]").text();
    // console.log("dayId=" + dayId);
    // console.log("slotId=" + slotId);
    // console.log("studentId=" + studentId);
    var fromListItem = $('.active.unschedStud');
    var toList = $(this).parent().siblings(".list-group");

    $.ajax({
        url: "/events/" + eventId + "/days/" + dayId + "/slots/" + slotId + "/students/" + studentId,
        type: 'PUT',
        success: function (result) {
            // move student text and id to schedule
            // console.log("updated database and ajax callback executed");
            // console.log("result=" + result);
            fromListItem.removeClass('unschedStud active');
            fromListItem.addClass('schedStud');
            toList.append(fromListItem); // no need to remove from fromList since this moves the element
            // decrement slots remaining
            var availElem = toList.siblings().children(".availSlots");
            var avail = Number(availElem.text());
            availElem.text(--avail);
            if (avail < 1) {
                availElem.siblings(".addStudBtn").addClass('hidden');
            }
        }
    });
    // console.log("finished ajax call");
});

// Activate scheduled student and show remove button
// listener is on the list instead of items on the list; otherwise moved items don't have listener
$(".schedList").on('click', ".schedStud", function () {
    var school = $("#school").text();
    if (school != "") { // only school counselors can remove students from schedule
        // hide all unschedule buttons
        $(".remStudBtn").hide();
        // too confusing and not useful to allow both a sheduled and unscheduled student to be active at same time
        $('.active').removeClass('active');
        $(this).toggleClass('active');
        $(this).parent().parent().find(".remStudBtn").show(); // show unschedule button for student selected
        // disable add student buttons
        $(".addStudBtn").attr("disabled", true);
    }
});

// Remove student from schedule
$(".remStudBtn").on('click', function (e) {
    e.preventDefault();
    // console.log("clicked remove student");
    // hide all unschedule buttons
    $(".remStudBtn").hide();
    var eventId = $("#eventId").text();
    var dayId = $("#dayId").text();
    var slotId = $(this).parent().siblings("[name='slotId']").text();
    var studentId = $('.active.schedStud').children("[name=studentId]").text();
    // console.log("dayId=" + dayId);
    // console.log("slotId=" + slotId);
    // console.log("studentId=" + studentId);

    var fromListItem = $('.active.schedStud');
    var toList = $('.unschedList');

    $.ajax({
        url: "/events/" + eventId + "/days/" + dayId + "/slots/" + slotId + "/students/" + studentId,
        type: 'DELETE',
        success: function (result) {
            // console.log("updated database and ajax callback executed");

            // increment slots remaining
            var availElem = fromListItem.parent().siblings().children(".availSlots");
            var avail = Number(availElem.text());
            availElem.text(++avail);
            if (avail == 1) {
                availElem.siblings(".addStudBtn").removeClass('hidden');
            }
            fromListItem.removeClass('schedStud active');
            fromListItem.addClass('unschedStud');
            toList.append(fromListItem); // no need to remove from fromList since this moves the element
        }
    });
    // console.log("finished ajax call");
});
