const day3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

module.exports = {

    dayNames: day3,

    dayString: function(d) {
        return day3[d.getUTCDay()] + " " + (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + (d.getFullYear() - 2000);
    },

    timeString: function(d) {
        var h=d.getUTCHours();
        var ap;

        if (h>12) {
            h=h-12;
            ap="PM";
        }
        else {
            ap= h==12 ? "PM": "AM";
        }       
        var m = d.getUTCMinutes();
        if (m==0) {
            m="00";
        }
        return h + ":" + m + " " + ap;
    },

    DTstring: function(d) {
        // return day3[d.getUTCDay()] + " " + (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + (d.getFullYear() - 2000) + " " + this.timeString(d)
        return this.dayString(d) + " " + this.timeString(d)        
    }

};