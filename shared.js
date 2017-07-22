module.exports = {

    myTrim: function (x) {
        if (x != undefined) {
            return x.replace(/^[\s\uFFFD]+|\s+$/gm, '');
        }
        else {
            return undefined;
        }
    },

    // Returns index of item in array arr if present; otherwise returns null
    getItemIndex: function (arr, item) {
        for (var i = 0, iLen = arr.length; i < iLen; i++) {
            if (arr[i] == item) return i;
        }
        return null;
    }

};
