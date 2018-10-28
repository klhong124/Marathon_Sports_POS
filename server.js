// requirement
const express = require('express');
const oracledb = require('oracledb');
oracledb.autoCommit = true;
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
        try {
          conn = await oracledb.getConnection(dum);

          var userslist = await conn.execute(
           `select username from users`
          );
          var emailslist = await conn.execute(
           `select email from users`
          );
          var products = await conn.execute(
           `SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images left join products on products.p_id = images.p_id WHERE rownum <= 1) FROM products WHERE rownum <= 9`
          );
          var sizes = await conn.execute(
            `SELECT * from sizes order by EU ASC`
          );
        } catch (err) {
            console.log('Ouch!', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
               await conn.close();
               // check if the user exists
               if (userslist.rows) {
                   if(req.cookies['username']) {
                     res.render('pages/index', {
                         username: req.cookies['username'],
                         error_message:false,
                         userslist:userslist.rows,
                         emailslist:emailslist.rows,
                         data:products.rows,
                         size:sizes.rows
                       });
                   }else {
                       res.render('pages/index', {
                          username:undefined,
                          error_message:false,
                          userslist:userslist.rows,
                          emailslist:emailslist.rows,
                          data:products.rows,
                          size:sizes.rows
                       });
                   }
               }
            }
        }


    }
    oracledbconn();
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
        try {
          conn = await oracledb.getConnection(dum);

          const result = await conn.execute(
            'INSERT INTO users VALUES(users_seq.nextval, :name, :email, :pw, :lname, :fname, :phone)', [req.body.username, req.body.email, req.body.password, req.body.lastname, req.body.firstname, req.body.phone], {autoCommit: true}
          );
        } catch (err) {
            console.log('Ouch! ', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
               await conn.close();
            }
        }
    }
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
        try {
          conn = await oracledb.getConnection(dum);

          var result = await conn.execute(
            'SELECT stores.*, sizes.*, products.p_name FROM stores LEFT JOIN stores_products_sizes sps ON sps.store_id = stores.store_id LEFT JOIN sizes ON sizes.size_id = sps.size_id LEFT JOIN products ON products.p_id = sps.product_id'
            // 'SELECT * FROM products'
          );
        } catch (err) {
            console.log('Ouch!', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
                await conn.close();
            }
        }
        console.log(result);

        var data = result.rows;


        if (req.cookies['username']) {
          res.render('pages/stock', {username: req.cookies['username'], data: data});
        } else {
          res.redirect('/');
        }
    }
    oracledbconn();

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
    async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        var result = await conn.execute(
            `select username,user_id from users where email = '${req.body.email}' and password = '${req.body.password}'`,
        );
        if (conn) {await conn.close();};
        // check if the user exists
        if (result.rows[0] !== undefined) {
            res.cookie('username', result.rows[0][0], { maxAge: 900000}); // put username to cookie and set expire time for cookie
            res.cookie('user_id', result.rows[0][1], { maxAge: 900000});
            res.render('pages/dashboard', {username: req.cookies['username']});
        } else {
            res.redirect('/?errormessage=' + encodeURIComponent('Incorrect username or password'));
        }
    };
    oracledbconn();
});

// get product if from ajax
app.post('/add-to-cart', urlencodedParser, (req, res) => {
  console.log(`${req.body.p_size}`);
    if (req.cookies['username']) {
        async function oracledbconn(){
            let conn;
            try{
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                    `INSERT INTO "G1_TEAM001"."CART" (USER_ID, P_ID, SIZE_ID, QTY, ID) VALUES (${req.cookies['user_id']}, ${req.body.p_id}, ${req.body.p_size}, '1', id.nextval)`,[]);
              } catch (err) {
            console.log('Ouch!', err);
            } finally {
                if (conn) { // conn assignment worked, need to close
                    await conn.close();
                }
            }
        }
        oracledbconn();
    } else {
        res.send({"error" : "Update error"});
    }
});
app.post('/edit-qty-cart', urlencodedParser, (req, res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
          let conn;
            try{
              console.log(`data was passed here: qty${req.body.qty}, id${req.body.id}`);
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                  `UPDATE "G1_TEAM001"."CART" SET qty = :size WHERE id = :id`,[req.body.qty,req.body.id]);
                  console.log("nothing run here");
            } catch (err) {
            console.log('Ouch!', err);
          } finally {
            if (conn) {await conn.close();}
          }
        }
        oracledbconn();
    } else {
        res.send({"error" : "Update error"});
    }
});
app.post('/edit-size-cart', urlencodedParser, (req, res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
          let conn;
            try{
              console.log(`data was passed here: size${req.body.size}, id${req.body.id}`);
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                  `UPDATE "G1_TEAM001"."CART" SET SIZE_ID = :size WHERE id = :id`,[req.body.size,req.body.id]);
                  console.log("nothing run here");
            } catch (err) {
            console.log('Ouch!', err);
          } finally {
            if (conn) {await conn.close();}
          }
        }
        oracledbconn();
    } else {
        res.send({"error" : "Update error"});
    }
});
app.post('/del-from-cart', urlencodedParser, (req, res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
          let conn;
            try{
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                    `DELETE FROM "G1_TEAM001"."CART" WHERE id = ${req.body.id}`,[]);
            } catch (err) {
            console.log('Ouch!', err);
          } finally {
            if (conn) { // conn assignment worked, need to close
               await conn.close();
            }
          }
        }
        oracledbconn();
    } else {
        res.send({"error" : "Update error"});
    }
});
app.get('/createbill', urlencodedParser, (req, res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
            let conn;
            try{
                conn = await oracledb.getConnection(dum);
                var data = await conn.execute(
                    `select P_id, size_id, QTY from cart where user_id = ${req.cookies['user_id']}`,[]
                  );
                  await conn.execute(
                    `DELETE FROM "G1_TEAM001"."CART" WHERE user_id = ${req.cookies['user_id']}`,[]
                  );
                  var cartlist = data.rows;
                  for(var i=0;i<cartlist.length;i++){
                    var products = await conn.execute(
                     `select price,discount from products where p_id = ${cartlist[i][0]}`
                   );
                   // P_id, size_id, QTY ,price,discount
                    cartlist[i] = [...cartlist[i],products.rows[0][0],products.rows[0][1]]
                  }
                await conn.execute(
                    `INSERT INTO "G1_TEAM001"."USER_ORDERS" (ORDER_ID, USER_ID, CREATE_AT, STATUS) VALUES (ID.nextval, '${req.cookies['user_id']}', CURRENT_TIMESTAMP, '0')`,[]
                  );
                await conn.executeMany(
                    `INSERT INTO "G1_TEAM001"."ORDERS" (ORDER_ID, P_ID, SIZE_ID, QTY, PRICE, DISCOUNT) VALUES (ID.currval, :p_id, :p_size, :qty, :price, :discount)`,
                    cartlist
                  );
                  var order = await conn.execute(
                 `select * from USER_ORDERS where ORDER_ID = (select MAX(ORDER_ID) from USER_ORDERS where user_ID = ${req.cookies['user_id']})`
               );
                  res.render('pages/checkout', {order: order.rows[0], items:cartlist});
              } catch (err) {
            console.log('Ouch!', err);
            } finally {
                if (conn) { // conn assignment worked, need to close
                    await conn.close();
                }
            }
        }
        oracledbconn();
    } else {
        res.send({"error" : "Update error"});
    }
});
app.post('/to-cart', urlencodedParser, (req, res) => {
    console.log(req.body.p_id);
    console.log(req.body.p_price);
    console.log(req.body.p_qty);
    console.log(req.body.p_size);
    if (req.cookies['user_id']){
        async function oracledbconn(){
            try{
                var user_id = req.cookies['user_id'];
                conn = await oracledb.getConnection(dum);
                var result = await conn.execute(
                    `INSERT INTO "G1_TEAM001"."CART" (USER_ID, P_ID, SIZE_ID, QTY, ID) VALUES (:user_id, :p_id, :p_size, :p_qty, id.nextval)`,[
                        user_id,
                        req.body.p_id,
                        req.body.p_size,
                        req.body.p_qty
                    ]
                );
            } catch (err) {
                console.log('Ouch!', err);
            } finally {
                if (conn) { // conn assignment worked, need to close
                   await conn.close();
                   res.redirect('/cart');
                }
            }
        };
        oracledbconn(); // call the function run
    } else {
        res.send({"error" : "Please login your account first"});
    }
});


// product page
app.get('/product/:p_id',(req, res) => {
    async function oracledbconn(){
        try {
            conn = await oracledb.getConnection(dum);
            // should group by this sql
            var result = await conn.execute(
                'select * from products left join images on images.p_id = products.p_id where products.p_id = :p_id', [req.params.p_id]
            );
            //
            // var product = await conn.execute(
            //     'SELECT store_id, sps.store_qty, (select p_size from sizes where sps.size_id = sizes.size_id ) AS p_size FROM products p LEFT JOIN stores_products_sizes sps ON sps.product_id = p.p_id WHERE p.p_id = :p_id', [req.params.p_id]
            // );

            var product = await conn.execute(
                'SELECT count(S_30) AS S30, count(S_31) AS S31, count(S_32) AS S32, count(S_33) AS S33 FROM stores_products_sizes sps LEFT JOIN sizes ON sizes.size_id = sps.size_id WHERE product_id = :p_id', [
                    req.params.p_id
                ]
            );

            var test = await conn.execute(
                'SELECT * FROM orders'
            );

            var item = await conn.execute(
             `SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images left join products on products.p_id = images.p_id WHERE rownum <= 1) FROM products WHERE rownum <= 7`
             // 'select * from products'
            );
        } catch (err) {
            console.log('Ouch!', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
               await conn.close();
            }
        }

        var data = result.rows[0];
        item = item.rows;
        product = product.rows[0];
        console.log(test);



        // check if the user exists
        if (result.rows) {
            res.render('pages/product', {username: req.cookies['username'], data:data, item: item, product: product});
        }
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
      async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        var cart = await conn.execute(
         `select p_id,size_id,qty,id from cart where user_id = ${req.cookies['user_id']}`
        );
        var cartlist = cart.rows;
        for(var i=0;i<cartlist.length;i++){
          var p_name = await conn.execute(
           `select p_name,price,discount from products where p_id = ${cartlist[i][0]}`
          );
          cartlist[i] = [...cartlist[i],p_name.rows[0][0],p_name.rows[0][1],p_name.rows[0][2]]
        }
        var sizes = await conn.execute(
          `SELECT * from sizes order by EU ASC`
        );
      if (conn) {await conn.close();};
      res.render('pages/cart',{username: req.cookies['username'],cartlist:cartlist,size:sizes.rows})
      };
      oracledbconn();
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
            'SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images LEFT JOIN products on products.p_id = images.p_id WHERE rownum <= 1) FROM products'
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
var port = 4000; //change here bitch!!!
app.listen(port);
console.log(`Server Running on port ${port}`);
// require("openurl").open(`http://localhost:${port}`);
