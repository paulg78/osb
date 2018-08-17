/* global $ */

// Method that checks that the browser supports the HTML5 File API
function browserSupportFileUpload() {
    var isCompatible = false;
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        isCompatible = true;
    }
    return isCompatible;
}

// This function populates a table with Id=csvTable with data from
//      a 2D array imported from a .csv file (for display on the form)
//  The function also populates an element with Id=csvString with a string
//      representation of that same data
function getData(event) {
    upload(event, function (data) {
        var csvTable = document.getElementById("csvTable");
        data.forEach(function (row) {
            var rowNode = document.createElement("tr");
            row.forEach(function (col) {
                var colNode = document.createElement("td");
                colNode.textContent = col;
                rowNode.appendChild(colNode);
            });
            csvTable.appendChild(rowNode);
        });
        $("#csvString").val(JSON.stringify(data));
        $("button").removeClass("hidden");
    });
}

// Method that reads and parses a .csv file into a 2D array
function upload(evt, callbackfunction) {
    console.log("uploading file");
    if (!browserSupportFileUpload()) {
        alert('The File APIs are not fully supported in this browser!');
    }
    else {
        var data = null;
        var file = evt.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function (event) {
            var csvData = event.target.result;
            data = $.csv.toArrays(csvData);
            if (data && data.length > 0) {
                // alert('Imported -' + data.length + '- rows successfully!');
                callbackfunction(data);
            }
            else {
                alert('No data to import!');
            }
        };
        reader.onerror = function () {
            alert('Unable to read ' + file.fileName);
        };
    }
}
