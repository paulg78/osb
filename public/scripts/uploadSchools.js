/* global $ */

// Method that checks that the browser supports the HTML5 File API
function browserSupportFileUpload() {
    var isCompatible = false;
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        isCompatible = true;
    }
    return isCompatible;
}

function addSubmitForm(event) {
    upload(event, function (data) {
        // code below displays school data on screen
        // var schoolsTable = document.getElementById("schools");
        // data.forEach(function (school) {
        //     var rowNode = document.createElement("tr");
        //     school.forEach(function (element) {
        //         var colNode = document.createElement("td");
        //         colNode.textContent = element;
        //         rowNode.appendChild(colNode);
        //     });
        //     schoolsTable.appendChild(rowNode);
        // });
        $("#schoolsId").val(JSON.stringify(data));
    });
}

// Method that reads and parses the .csv file into a 2D array
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
                alert('Imported -' + data.length + '- rows successfully!');
                callbackfunction(data);
                // document.getElementById('testp').textContent="added something";
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
