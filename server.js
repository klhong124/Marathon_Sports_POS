// server.js
// load the things we need
var express = require('express');
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
app.get('/signin', function(req, res) {
    res.render('pages/sign-in');
});

app.use('/static', express.static('public'))
app.listen(3000);
console.log("The port is 3000");
