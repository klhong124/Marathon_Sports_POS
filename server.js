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
// oracledb.autoCommit = true;


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
     async function oracledbconn(){
            conn = await oracledb.getConnection(dum);
            var userslist = await conn.execute(
             `select username from users`
            );
            var emailslist = await conn.execute(
             `select email from users`
            );
            var products = await conn.execute(
             `SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images left join products on products.p_id = images.p_id WHERE rownum <= 1) FROM products WHERE rownum <= 7`
             // 'select * from images'
            );
            if (conn) {await conn.close();};
            // check if the user exists
            if (userslist.rows) {

                if(req.cookies['username']) {
                    res.render('pages/index', {
                        username: req.cookies['username'],
                        error_message:false,
                        userslist:userslist.rows,
                        emailslist:emailslist.rows,
                        data:products.rows
                    });
                }else {
                    res.render('pages/index', {
                       username:undefined,
                       error_message:false,
                       userslist:userslist.rows,
                       emailslist:emailslist.rows,
                       data:products.rows
                    });
                }
            }

    };
     oracledbconn(); // call the function run

     // req.query.errormessage ? res.render('pages/index', {error_message: req.query.errormessage}) : res.render('pages/index');
     // if (req.query.errormessage){
     //     res.render('pages/index', {
     //         username: false,
     //         error_message: req.query.errormessage
     //     });
     // } else if (typeof req.cookies['username'] != 'undefined') {
    //     res.render('pages/index', {username: req.cookies['username'], error_message: false});
    // } else if (req.query.errormessage) {
    //     res.render('pages/index', {username: false, error_message: req.query.errormessage});
    // } else {
    //     res.render('pages/index', {username: false, error_message: false});
    // }

});

// signup page
app.post('/join',urlencodedParser,(req, res) => {
  console.log(req.body.email);
    res.render('pages/signup',{username:req.body.username,
                               email:req.body.email,
                               password:req.body.password
                             });
});
app.post('/register',urlencodedParser,(req, res) => {
  async function oracledbconn(){
      conn = await oracledb.getConnection(dum);
      conn.execute(
      `INSERT INTO users VALUES (user_id.nextval, :username, :email, :password, :lastname, :firstname)`,
      [req.body.username, req.body.email, req.body.password, req.body.lastname, req.body.firstname],  // Bind values
      { autoCommit: true},  // Override the default non-autocommit behavior
      function(err, result) {
        if (err) {
          // return cb(err, conn);
          console.log(err);
        } else {
          console.log("Rows inserted: " + result.rowsAffected);  // 1
          // return cb(null, conn);
        }
      });
      // if (conn) {await conn.close();};
  };
  oracledbconn();
  res.redirect('/');
});

// support page
app.get('/help',(req, res) => {
    if (typeof req.cookies['username'] != 'undefined') {
        console.log(req.cookies['username']);
        res.render('pages/help', {username: req.cookies['username'], error_message: false});
    } else {
        res.render('pages/help', {username: false, error_message: false});
    }
});

// stock page
app.get('/stock',(req, res) => {
    async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        const result = await conn.execute(
            'select products.p_name, sizes.p_size, stores.*, sps.qty from stores inner join stores_products_sizes sps on sps.store_id = stores.store_id inner join sizes on sizes.size_id = sps.size_id inner join products on products.p_id=sps.product_id'
        );

        if (conn) {await conn.close();};

        // var data = JSON.stringify(result.rows);
        var data = result.rows;

        console.log(data);

        if (req.cookies['username']) {
          res.render('pages/stock', {username: req.cookies['username'], data: data});
        } else {
          res.redirect('/');
        }
        // res.render('pages/dashboard');
    };
    oracledbconn(); // call the function run

    // res.render('pages/stock');
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
            res.render('pages/store', {username: req.cookies['username'], data:data});
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


        if (conn) {await conn.close();};
        console.log(req.cookies['username']); // get username from cookie

        // check if the user exists
        if (result.rows[0] !== undefined) {
            res.cookie('username', result.rows[0], { maxAge: 900000}); // put username to cookie and set expire time for cookie

            res.render('pages/dashboard', {username: req.cookies['username']});
        } else {
            res.redirect('/?errormessage=' + encodeURIComponent('Incorrect username or password'));
        }
    };
});

// get product if from ajax
app.post('/add-to-cart', urlencodedParser, (req, res) => {
    console.log(req.body.p_id); // print params
    var product_id = req.body.p_id;

    if (req.cookies['username']) {
        oracledbconn(); // call the function run
        async function oracledbconn(){
            conn = await oracledb.getConnection(dum);

            const result = await conn.execute(
                'select user_id from users where username = :username',
                [req.cookies['username'][0]]);

            var user_id = result.rows[0][0];
            console.log(user_id);

            const check = await conn.execute(
                'select order_id from orders where p_id = :p_id and user_id = :user_id and status = 0', [product_id, user_id]
            );
            // if (check.rows && check.rows != "undefined"){
            //     console.log(check.rows[0][0]);
            // } else{
            //     console.log('check');
            // }

            await conn.execute(
                'insert into orders(order_id, p_id, user_id) values (orders_seq.nextval, :p_id, :user_id)',[product_id, user_id], {autoCommit: true}
            );

            if (conn) {
                await conn.close();
                // .catch((error) => {})
            };
            res.send({"success" : "Updated Successfully", "status" : 200});
        };
    } else {
        res.send({"error" : "Update error"});
    }

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
            res.render('pages/product', {username: req.cookies['username'], data:data});
            // res.send('pages/product/'+req.params.p_id, {data:data});
        }
        // res.render('pages/dashboard');
    };
    oracledbconn(); // call the function run
});

// dashboard page
app.get('/dashboard',(req, res) => {
    if (req.cookies['username']) {
      res.render('pages/dashboard', {username: req.cookies['username']});
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
    if (req.cookies['username']) {
      res.render('pages/shopping-cart', {username: req.cookies['username']});
    } else {
      res.redirect('/');
    }
});

// change password page
app.get('/changepassword',(req, res) => {
    if (req.cookies['username']) {
      res.render('pages/change-password', {username: req.cookies['username']});
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
          res.render('pages/products', {username: req.cookies['username'], data:data});
        }
        // res.render('pages/dashboard');
    };
    oracledbconn(); // call the function run
    // res.render('pages/products');
});

// contact page
app.get('/contact',(req, res) => {
    res.render('pages/contact', {username: req.cookies['username']});
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
var port = 3100; //change here
app.listen(port);
console.log(`Server Running on port ${port}`);
// require("openurl").open(`http://localhost:${port}`);
