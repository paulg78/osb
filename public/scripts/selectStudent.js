/* global $ */

// alert("called selectStudent");
// console.log("called alertStudent");

// *** problem here -- can't find file because require is not defined on client/browser side*** 
// http://stackoverflow.com/questions/19059580/client-on-node-uncaught-referenceerror-require-is-not-defined
// var Slot = require("../../models/slot");
// var Student = require("../../models/student");

// // http://stackoverflow.com/questions/34590661/handle-bootstrap-list-group-click
$('.list-group-item').on('click', function() {
    var $this = $(this);
    $('.active').removeClass('active');
    $this.toggleClass('active');
    // enable add student buttons
    $("[name='addStudentBtn']").attr("disabled",false);
    console.log($("[name='addStudentBtn']"));
    // var studentId = $('.active')["0"].lastElementChild.innerText; // figured this out using console in browser tools
    // $("#selectedStudentId")["0"].innerText = studentId;
   console.log($this.text());  // logs to console in browser since this is client side code
});

// add slot id to student schema
// put slot id hidden in each add student button
// when button is clicked, get the slot id, find in db by id
// push the student id in
// save the slot
// find student by id
// update student with slot id
// save the student
// refresh page
$(":input").on('click', function() {
    console.log("clicked add student");
    var studentId = $('.active')["0"].lastElementChild.innerText; // figured this out using console in browser tools
    // console.log("studentId=" + studentId);
    // console.log($(this).parent().children("[name='selectedStudentId']").val());
    $(this).parent().children("[name='selectedStudentId']").val(studentId);
    // console.log($(this).parent().children("[name='selectedStudentId']").val());
});