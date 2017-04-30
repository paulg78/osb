#OSB

TODOS
Allow student to be added only if there is space left in a slot
fix delete student
add roles: 
  al:     modify schedule (days and slots); view all students
  school: add/schedule/view their students

done:
add school to registration
show list of students for school associated with user
student create, read, update 
fill in school automatically as user's school
added days: list, create, edit
only show students owned by the user


RESTFUL ROUTES

name      url      verb    desc.
===============================================
INDEX   /campgrounds	get 	list campgrounds
NEW     /campgrounds/new	get	display create form
CREATE  /campgrounds	post	add new to db
SHOW    /campgrounds/:id	get	more info about a campground (with links to edit campground and add comment)
EDIT	/campgrounds/:id/edit	get	display edit form
UPDATE /campgrounds/:id	put	update db

NEW     campgrounds/:id/comments/new    GET	display comment create form
CREATE  campgrounds/:id/comments      POST	add new comment to db
EDIT	campgrounds/:id/comments/:id/edit	get	display comment edit form
Update	   campgrounds/:id/comments/:id 	put	update comment in db
Delete	   campgrounds/:id/comments/:id	delete	delete comment from db

INDEX   /days		get 	list days
NEW     /days/new	get	display create form
CREATE  /days	post	add new day to db
EDIT	/days/:id/edit	get	display edit form--with edit day, link to add slot
UPDATE /days/:id	put	update day in db
SHOW    /days/:id	get	show info about one a day--with add student (so show probably isn’t the right word)
Cannot PUT /slots/58fc0b3ebbe6421c18cc457f

NEW           days/:id/slots/new              GET	    display slot create form
CREATE        days/:id/slots                  POST	  add new slot to db
EDIT	        days/:id/slots/:id/edit	        get     display slot edit form
Update	      days/:id/slots/:id 	            put	    update slot in db
Delete	      days/:id/slots/:id	            delete  delete slot from db
Add student   days/:id/slots/:id/students/:id  	put	  add student to slot in db 

This way worked but changed this route to the above version.
Add student	days/:id/slots/:id/scheduleStudent  	put	add student to slot in db 
(not post since we aren’t creating something new, just updating (:id typically not sent with post because it 
doesn’t yet exist when creating. Makes sense because it is modifying a slot but can’t use days/:id/slots/:id put 
since that is used for editing other data about the slot.