// this is server.js
var express = require('express');
var app = express();
// set the view engine to ejs
app.set('view engine', 'ejs');
// oracle db config
const oracledb = require('oracledb');
const config = {
  user: 'G1_team001',                // Update me
  password: 'ceG1_team001',        // Update me
  connectString: '144.214.177.102/xe'   // Update me
};


async function auth(email, username,res) {
    let conn;

    conn = await oracledb.getConnection(config);

    const result = await conn.execute(
      'select * from users where email = :email and username = :username',
      [email, username]
      // 'select * from users'
    );
    if (result.rows.length > 0){
        console.log("ok");
    }else{
        console.log("err");
    }
    // console.log(result.rows)
    // conn assignment worked, need to close
    await conn.close();
}
// call function run
// auth();


// auth
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
// var router = express.Router();

var bodyParser = require('body-parser');
// create application/json parser
var jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

passport.use(new LocalStrategy(
  function(email, password, done) {
      User.findOne({ email: email }, function(err, user) {
          if (err) { return done(err); }
          if (!user) {
              return done(null, false, { message: 'Incorrect email.' });
          }
          if (!user.validPassword(password)) {
              return done(null, false, { message: 'Incorrect password.' });
          }
          return done(null, user);
      });
  }
));

passport.use(new LocalStrategy({
    emailField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {

  }
));


// use res.render to load up an ejs view file
// index page
app.get('/', function(req, res) {
    res.render('pages/index');
});

// about page
app.get('/about', function(req, res) {
    res.render('pages/about', {output: req.params.id});
});

// // signin page
// app.post('/login',
//   passport.authenticate('local', { failureRedirect: '/dashboard' }),
//   function(req, res) {
//     res.redirect('/');
//   });
// POST /login gets urlencoded bodies
app.post('/login', urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400)
  auth(req.body.email, req.body.password);
  console.log("------");
  console.log(req.body);

  console.log("++++++");

})


// signup page
app.get('/register', function(req, res) {
    res.render('pages/signup');
});

// dashboard page
app.get('/dashboard', function(req, res) {
    res.render('pages/dashboard');
});

// signout
app.get('/logout', function(req, res) {
    res.redirect('/');
});

// change password page
app.get('/changepassword', function(req, res) {
    res.render('pages/change-password');
});

// all categories page
app.get('/products', function(req, res) {
    res.render('pages/products');
});

// checkout form page
app.get('/checkout', function(req, res) {
    res.render('pages/checkout');
});

// forget password page
app.get('/forgetpassword', function(req, res) {
    res.render('pages/forget-password');
});


app.use('/public', express.static('public'))
app.listen(3000);
console.log("The port is 3000");
