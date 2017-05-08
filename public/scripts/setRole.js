/* global $ */

$(document).ready(function() {

    // set property for relevant css class
    $("<style type='text/css'> ."+ $("#userRole").text() + "{ display:block } </style>").appendTo("head");
    // console.log("role=" + $("#userRole").text());    
});