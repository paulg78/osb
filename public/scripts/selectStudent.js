/* global $ */

// alert("called selectStudent");

// console.log("called alertStudent");

// $(document).ready(function() {
//   $(".list-group-item").live('click', function(){ 
//     $('.active').removeClass('active');
//     $(this).addClass('active');
//     console.log($(this).html());
//     console.lot("clicked");
//     // Code here whatever you want or you can call other function here
//     alert("click");
//   });
// });

// http://stackoverflow.com/questions/34590661/handle-bootstrap-list-group-click
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

$( ".btn" ).on('click', function() {
    console.log("clicked add student");
    console.log($(this));
    console.log("put this id in the slot:" + $('.active')["0"].lastElementChild.innerText);
});

