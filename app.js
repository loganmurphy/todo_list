// The app should meet the following requirements:
//
// URL /todos should list all your ToDos
// URL /todos/add should have a form which lets you add a ToDo
// URL /todo/done/:id should mark a ToDo as done.

// this is for oauth
var authConfig = require('./config/auth');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var passport = require('passport');
//

var express = require('express');
// var pgp = require('pg-promise')({});
var app = express();
// local db
// var db = pgp({database: 'todolist'});
// for production
var db = require('./models');


var authorizationURL = "https://accounts.google.com/o/oauth2/auth";
var clientID = authConfig.web.client_id;
console.log(authConfig.web.client_id);


//
// Passport session setup.
//
//   For persistent logins with sessions, Passport needs to serialize users into
//   and deserialize users out of the session. Typically, this is as simple as
//   storing the user ID when serializing, and finding the user by ID when
//   deserializing.
passport.serializeUser(function(user, done) {
  // done(null, user.id);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  // Users.findById(obj, done);
  done(null, obj);
});

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
//   See http://passportjs.org/docs/configure#verify-callback

function extractProfile (profile) {
  let imageUrl = '';
  if (profile.photos && profile.photos.length) {
    imageUrl = profile.photos[0].value;
  }
  return {
    id: profile.id,
    displayName: profile.displayName,
    image: imageUrl
  };
}

passport.use(new GoogleStrategy({
    clientID: clientID,
    clientSecret: authConfig.web.client_secret,
    // callbackURL: "http://localhost:8080/auth/google/callback"
    callbackURL: "https://todolist.logancodes.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb){
    // Typically you would query the database to find the user record
    // associated with this Google profile, then pass that object to the `done`
    // callback.
    console.log(profile);
    var user = extractProfile(profile);
    // store profile in db
    db.users.create({
      name: profile.name['givenName'], user_id: profile.id})
    return cb(null, user);
  }))

var logger = require('morgan');
var session = require('express-session');

app.use(logger('dev'));
//app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
// middleware for authentication verification
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));
const body_parser = require('body-parser');
app.use(body_parser.urlencoded({extended: false}));
app.set('view engine', 'hbs');

// app.use(ensureAuthenticated (request, response, next) {
//   if (request.session.user) {
//     next();
//   } else if (request.path == '/login') {
//     next();
//   } else {
//     response.redirect('/login');
//   }
// });
// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}


var todos = []

app.get('/', function(req, res) {
  res.render('login', {
    user: req.user
  });
});

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
app.get('/auth',
  passport.authenticate('google', { scope: ['openid email profile'] }));

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Authenticated successfully
    res.redirect('/todos');
  });

// my stuff
app.get('/todos', function(request, response){
  db.todo.findAll({where: {done: 'false'}})
  .then(function (results) {
    var uncomplete_todos = [];
    results.forEach(function(r){
      uncomplete_todos.push(r);
    })
    var context = {title: 'Here are your todos ' , username: '', todos: uncomplete_todos};
    response.render('todos.hbs', context);
  });
});

app.post('/todos/add', function(request, response){
  var new_task = request.body.name
  db.todo.create({
    description: new_task, done: 'false', user_id: 106558481740185611544})
  .then(function (result) {
    todos.push(request.body.name);
    response.redirect('/todos');
  });
})

app.post('/todos/done/:id', function(request, response){
  var mark_complete = request.params.id;
  db.todo.update({done: 'true'}, {where: {id: mark_complete}})
  .then(function (result) {
    console.log(result)
    result.done = 'true';
    response.redirect('/todos')
  })
})


var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log('Your app is up on port 8080.');
});
