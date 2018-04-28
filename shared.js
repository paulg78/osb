module.exports = {

    // This trims white space and the unicode FFFD char from the beginning of a string and
    // white space from end of string ... I think I used it when some FFFD chars were
    // somehow coming from excel file import; don't know if it is really needed
    myTrim: function (x) {
        if (x != undefined) {
            return x.replace(/^[\s\uFFFD]+|\s+$/gm, '');
        }
        else {
            return undefined;
        }
    },

};
