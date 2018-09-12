// server.js
// load the things we need
var express = require('express');
// const MongoClient = require('mongodb').MongoClient;
var app = express();


// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file
// index page
app.get('/', function(req, res) {
    res.render('pages/index');
});

// about page
app.get('/about', function(req, res) {
    res.render('pages/about', {text: "test"});
});

// signin page
app.get('/login', function(req, res) {
  //Datafetching
//MongoClient.connect("mongodb://localhost:27017/",{ useNewUrlParser: true }, (err, db) => {
  //Create Collection
    //db.db("___").createCollection("___", function(err, res) {
    //    db.close();
  //});
  //Collection Find
  //db.db("____").collection("____").find().toArray((err, database) => {
    //console.log(database);
        res.render('pages/signin');
    //});
  //});
});

// signup page
app.get('/register', function(req, res) {
    res.render('pages/signup');
});

// dashboard page
app.get('/dashboard', function(req, res) {
    res.render('pages/dashboard');
});

// signout
app.get('/signout', function(req, res) {
    res.redirect('/');
});

app.use('/static', express.static('public'))
app.listen(3000);
console.log("The port is 3000");
