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
    // var $alias = $this.data('alias

    $('.active').removeClass('active');
    $this.toggleClass('active');
    var studentId = $('.active')["0"].lastElementChild.innerText; // figured this out using console in browser tools

    // Can pass clicked link element to another function
    myfunction($this, studentId);
    // myfunction($this);
});

function myfunction($this, studentId) {
    console.log($this.text());  // logs to console in browser since this is client side code
    console.log("student id=" + studentId);
}

// add slot id to student schema
// put slot id hidden in each add student button
// when button is clicked, get the slot id, find in db by id
// push the student id in
// save the slot
// find student by id
// update student with slot id
// save the student
// refresh page
$(".btn").on('click', function() {
    console.log("clicked add student");
    console.log($(this));
    var studentId = $('.active')["0"].lastElementChild.innerText;
    var slotId = $("[name='slotId']")["1"].outerText;
    console.log("studentId=" + studentId);
    console.log("slotId=" + slotId);

    // find slot by id
    // Slot.findById(slotId).exec(function(err, foundSlot){
    //     if(err){
    //         console.log(err);
    //     } else {
    //         // push the student id into slots
    //         foundSlot.slots.push(studentId);
    //         foundSlot.save();
    //         Student.findById(studentId).exec(function(err, foundStudent) {
    //             if (err) {
    //                 console.log(err);
    //             } else {
    //                 foundStudent.slot = slotId;
    //                 foundStudent.save();
    //             }
    //         })
    //     }
    // });
});