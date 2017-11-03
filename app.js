// The app should meet the following requirements:
//
// URL /todos should list all your ToDos
// URL /todos/add should have a form which lets you add a ToDo
// URL /todo/done/:id should mark a ToDo as done.


var express = require('express');
var pgp = require('pg-promise')({});
var app = express();
var db = pgp({database: 'todolist'})

app.use(express.static('public'));
const body_parser = require('body-parser');
app.use(body_parser.urlencoded({extended: false}));
app.set('view engine', 'hbs');

var todos = []

app.get('/todos', function(request, response){
  var uncomplete_todos = [];
  db.query('SELECT * FROM task WHERE done = false')
  .then(function (results) {
    results.forEach(function (r) {
      // console.log(r.description)
      uncomplete_todos.push(r);
    });
    var context = {title: 'Here are your todos ' , username: '', todos: uncomplete_todos};
    response.render('todos.hbs', context);
  });
});

app.post('/todos/add', function(request, response){
  var new_task = request.body.name
  db.result("INSERT INTO task VALUES (default, $1, false)", new_task)
  .then(function (result) {
    // console.log(result);
    todos.push(request.body.name);
    response.redirect('/todos');
  });
})

app.post('/todos/done/:id', function(request, response){
  var mark_complete = request.params.id;
  var p = db.result("UPDATE task SET done = true WHERE id = $1", mark_complete)
  .then(function (result) {
    console.log(result)
    response.redirect('/todos')
  })
})


app.listen(8000, function(){
  console.log('Your app is up on port 8000.');
});
