// The app should meet the following requirements:
//
// URL /todos should list all your ToDos
// URL /todos/add should have a form which lets you add a ToDo
// URL /todo/done/:id should mark a ToDo as done.

// this is for oauth
var authConfig = require('./config/auth');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var passport = require('passport');

var express = require('express');
// var pgp = require('pg-promise')({});
var app = express();
// local db
// var db = pgp({database: 'todolist'});
// for production
var db = require('./models');
// This is for logging
var logger = require('morgan');
var session = require('express-session');

var authorizationURL = "https://accounts.google.com/o/oauth2/auth";
var clientID = authConfig.web.client_id;
// console.log(authConfig.web.client_id);


//
// Passport session setup.
//
//   For persistent logins with sessions, Passport needs to serialize users into
//   and deserialize users out of the session. Typically, this is as simple as
//   storing the user ID when serializing, and finding the user by ID when
//   deserializing.


// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
//   See http://passportjs.org/docs/configure#verify-callback

// returns info from the profile
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

// Checks authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}


// Noth sure what the serializeUser and deserializer do, something about the session
passport.serializeUser(function(user, done) {
  // done(null, user.id);
  done(null, user);
});
// see above
passport.deserializeUser(function(obj, done) {
  // Users.findById(obj, done);
  done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID: clientID,
    clientSecret: authConfig.web.client_secret,
    // callbackURL: "http://localhost:8080/auth/google/callback"
    callbackURL: "https://todolist.logancodes.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb){
    // console.log(profile);
    // console.log(accessToken)
    var token = accessToken
    var user = extractProfile(profile);
    // store profile in db, or fetch it if a record exists
    db.users.findOrCreate(
      {where: {name:profile.name.givenName, user_id: profile.id}, attributes: {name: profile.name.givenName, user_id: profile.id}})
      .then(function(results){
        return cb(null, user)
      })
  }))

app.use(logger('dev'));
//app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: false,
  cookie: {maxAge: 3600000},
}));
// middleware for authentication verification
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('public'));
const body_parser = require('body-parser');
app.use(body_parser.urlencoded({extended: false}));
app.set('view engine', 'hbs');

// Simple route middleware to ensure user is authenticated.
app.get('/', function(req, res) {
  res.render('login', {
    user: req.user
  });
});

// Use passport.authenticate()  to authenticate the. The user is redirected to google.com.
// After authorization, Google redirects the user back to this application at /auth/google/callback
app.get('/auth',
  passport.authenticate('google', { scope: ['openid email profile'] }));

// Use passport.authenticate() to authenticate. If authentication fails, the user will be
// redirected back to thelogin page.  Otherwise, user is redirected to their todos page
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Authenticated successfully
    res.redirect('/todos');
  });

app.get('/todos', ensureAuthenticated, function(request, response){
  var user_id = request.user.id
  var user_name = request.user.name

  // console.log('cookies, get your cookies', request.sessionStore.sessions);
  db.todo.findAll({where: {user_id: user_id, done: 'false'}})
  .then(function (results) {
    var uncomplete_todos = [];
    results.forEach(function(r){
      uncomplete_todos.push(r);
    })
    var context = {title: 'Hello ' , username: user_name, todos: uncomplete_todos};
    response.render('todos.hbs', context);
  });
});

app.post('/todos/add', ensureAuthenticated, function(request, response){
  var new_task = request.body.name
  var user_id = request.user.id
  db.todo.create({
    description: new_task, done: 'false', user_id: user_id})
  .then(function (result) {
    todos.push(request.body.name);
    response.redirect('/todos');
  });
})

app.post('/todos/done/:id', ensureAuthenticated, function(request, response){
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
