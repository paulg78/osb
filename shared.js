module.exports = {

    myTrim: function (x) {
        if (x != undefined) {
            return x.replace(/^[\s\uFFFD]+|\s+$/gm, '');
        }
        else {
            return undefined;
        }
    },

};
