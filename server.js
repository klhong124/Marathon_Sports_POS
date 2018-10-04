// requirement
const express = require('express');
const oracledb = require('oracledb');
const bodyParser = require('body-parser');
const passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
// db configuration
var dum = require('./dbconfig.js');
// gobal vars
let conn;


const jsonParser = bodyParser.json(); // create application/json parser

const urlencodedParser = bodyParser.urlencoded({ extended: false }); // create application/x-www-form-urlencoded parser

// passport.use(new LocalStrategy({
//     emailField: 'email',
//     passwordField: 'password'
//   },
//   (email, password, done) => {}
// ));
//
// passport.use(new LocalStrategy(
//   function(email, password, done) {
//       User.findOne({ email: email }, function(err, user) {
//           if (err) { return done(err); }
//           if (!user) {
//               return done(null, false, { message: 'Incorrect email.' });
//           }
//           if (!user.validPassword(password)) {
//               return done(null, false, { message: 'Incorrect password.' });
//           }
//           return done(null, user);
//       });
//   }
// ));

const app = express();

app.use(cookieParser());

app.set('view engine', 'ejs'); // set the view engine to ejs

// use res.render to load up an ejs view file
// index page
app.get('/',(req, res, next) => {

    // call the function run

    req.query.errormessage ? res.render('pages/index', {error_message: req.query.errormessage}) : res.render('pages/index');
    if ((req.query.errormessage) || (req.query.errormessage != 'undefined') ){
        console.log(req.query.errormessage);
        res.render('pages/index', {
            error_message: req.query.errormessage
        });
    } else {
        res.render('pages/index', {error_message: false});
    };

});

// support page
app.get('/help',(req, res) => {
    res.render('pages/help');
});

// stock page
app.get('/stock',(req, res) => {
    res.render('pages/stock');
});

// store page
app.get('/store',(req, res) => {
    async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        const result = await conn.execute(
            'select * from stores'
        );

        if (conn) {await conn.close();};

        // var data = JSON.stringify(result.rows);
        var data = result.rows;

        console.log(data);

        // check if the user exists
        if (result.rows) {
          res.render('pages/store', {data:data});
        }
        // res.render('pages/dashboard');
    };
    oracledbconn(); // call the function run
});

// about page
app.get('/about',(req, res) => {
    res.render('pages/about', {output: req.params.id});
});

// POST '/login' gets urlencoded bodies
app.post('/login', urlencodedParser, (req, res) => {
    oracledbconn(req.body.email,req.body.password);
    async function oracledbconn(email,password){
        conn = await oracledb.getConnection(dum);
        const result = await conn.execute(
            'select username from users where email = :email and username = :username',
            [email,password] // 'select * from users'
        );

        res.cookie('username', result.rows[0], { maxAge: 900000, httpOnly: true }); // put username to cookie and set expire time for cookie
        console.log(req.cookies['username']); // get username from cookie
        if (conn) {await conn.close();};


        // check if the user exists
        if (result.rows[0] !== undefined) {
          res.render('pages/dashboard');
        } else {
          res.redirect('/?errormessage=' + encodeURIComponent('Incorrect username or password'));
        }
        // res.render('pages/dashboard');
    };
});

// signup page
app.get('/register',(req, res) => {
    res.render('pages/signup');
});
// product page
app.get('/product/:p_id',(req, res) => {
    async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        const result = await conn.execute(
            'select * from products where p_id = :p_id', [req.params.p_id]
        );

        if (conn) {await conn.close();};

        // var data = JSON.stringify(result.rows[0]);
        var data = result.rows[0];

        console.log( result.rows);

        // check if the user exists
        if (result.rows) {
            res.render('pages/product', {data:data});
            // res.send('pages/product/'+req.params.p_id, {data:data});
        }
        // res.render('pages/dashboard');
    };
    oracledbconn(); // call the function run
});

// dashboard page
app.get('/dashboard',(req, res) => {
    if (req.cookies['username']) {
      res.render('pages/dashboard');
    } else {
      res.redirect('/');
    }
});

// signout
app.get('/logout',(req, res) => {
    res.clearCookie('username');
    res.redirect('/');
});

// shopping cart
app.get('/cart',(req, res) => {
    res.render('pages/shopping-cart');
});

// change password page
app.get('/changepassword',(req, res) => {
    if (req.cookies['username']) {
      res.render('pages/change-password');
    } else {
      res.redirect('/');
    }
});

// all products page
app.get('/products',(req, res) => {
    async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        const result = await conn.execute(
            'SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images left join products on products.p_id = images.p_id WHERE rownum <= 1) FROM products'
            // 'select * from images'
        );

        if (conn) {await conn.close();};

        // var data = JSON.stringify(result.rows);
        var data = result.rows;

        console.log(result);

        // check if the user exists
        if (result.rows) {
          res.render('pages/products', {data:data});
        }
        // res.render('pages/dashboard');
    };
    oracledbconn(); // call the function run
    // res.render('pages/products');
});

// contact page
app.get('/contact',(req, res) => {
    res.render('pages/contact');
});

// checkout page
app.get('/checkout',(req, res) => {
    res.render('pages/checkout');
});

// forget password page
app.get('/forgetpassword',(req, res) => {
    if (req.cookies['username']) {
        res.render('pages/forget-password');
    } else {
        res.redirect('/');
    }
});


app.use('/public', express.static('public'));
app.listen(4000);
console.log("Server Running on port 4000");
//require("openurl").open("http://localhost:4000");
