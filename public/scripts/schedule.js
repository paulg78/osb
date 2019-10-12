'use strict';
/* global $ */

function dateString(d) {
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return dayNames[d.getUTCDay()] + " " + (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + (d.getFullYear() - 2000);
}

function timeString(d) {
    var h = d.getUTCHours();
    var ap;
    if (h > 12) {
        h = h - 12;
        ap = "PM";
    }
    else {
        ap = "AM";
    }
    var m = d.getUTCMinutes();
    if (m == 0) {
        m = "00";
    }
    return h + ":" + m + " " + ap;
}

function getAvailDates(need) {
    $.ajax({
        url: "/slots/avail/" + need,
        type: 'GET',
        success: function(slotsJson) {
            // console.log("slots returned=" + slotsJson + ".");
            var dateSel = document.getElementById('dateSched');
            var slots = JSON.parse(slotsJson);
            var i, d, md;
            var prevmd = "";
            for (i = 0; i < slots.length; i++) {
                d = new Date(slots[i].sdate);
                md = d.getUTCMonth() + "-" + d.getUTCDate();
                if (md != prevmd) {
                    dateSel.add(new Option(dateString(d), slots[i].sdate));
                    prevmd = md;
                    // console.log("dateString(d)=" + dateString(d));
                }
            }
            $("#slotsAvail").text(slotsJson);
        }
    });
    // console.log("finished getAvailDates");
}

$("#dateSched").on('change', function() {
    var timeSel = document.getElementById('timeSched');
    if (this.selectedIndex > 0) { // selected a real date
        // console.log("changed date to " + this.value);
        var slots = JSON.parse($("#slotsAvail").text());
        var i, d, md;
        var sel = new Date(this.value);
        var selmd = sel.getUTCMonth() + "-" + sel.getUTCDate();
        // remove any previous options
        $("#timeSched").children('option:not(:first)').remove();
        for (i = 0; i < slots.length; i++) {
            d = new Date(slots[i].sdate);
            md = d.getUTCMonth() + "-" + d.getUTCDate();
            if (md == selmd) {
                timeSel.add(new Option(timeString(new Date(slots[i].sdate)) + ' (' + slots[i].avCnt + ')', slots[i].sdate));
            }
        }
        timeSel.disabled = false;
    }
    else {
        timeSel.disabled = true;
    }
    timeSel.selectedIndex = 0;
});

$("#unschedCB").on('change', function() {
    // console.log("unsched CB changed to " + this.checked);
    if (this.checked) {
        $("#schedForm").hide();
    }
    else {
        $("#schedForm").show();
    }
});
