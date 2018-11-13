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
           `SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images left join products on products.p_id = images.p_id WHERE rownum <= 1)AS product_image, products.discount FROM products WHERE rownum <= 9`
          );
          var sizes = await conn.execute(
            `SELECT products.p_id, sizes.cm, sizes.size_id FROM stores_products_sizes INNER JOIN products ON stores_products_sizes.product_id = products.p_id INNER JOIN sizes ON stores_products_sizes.size_id = sizes.size_id WHERE rownum <= 500 GROUP BY p_id, sizes.cm, sizes.size_id ORDER BY p_id`
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

// search page
app.post('/search', urlencodedParser, (req, res) => {
    var keyword = (req.body.keyword).toUpperCase();

    async function oracledbconn(){
        try {
            conn = await oracledb.getConnection(dum);
            var result = await conn.execute(
                `SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images LEFT JOIN products on products.p_id = images.p_id WHERE rownum <= 1) AS product_image, products.discount FROM products WHERE products.p_name LIKE '%${keyword}%'`);

            var sizes = await conn.execute(
                `SELECT products.p_id, sizes.cm, sizes.size_id FROM stores_products_sizes INNER JOIN products ON stores_products_sizes.product_id = products.p_id INNER JOIN sizes ON stores_products_sizes.size_id = sizes.size_id WHERE rownum <= 500 GROUP BY p_id, sizes.cm, sizes.size_id ORDER BY p_id`
            );
        } catch (err) {
            console.log('Ouch!', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
                await conn.close();
                // check if the user exists
                if (result && sizes) {
                    res.render('pages/products', {username: req.cookies['username'], data:result.rows, size:sizes.rows,keyword:`RESULT OF "${keyword}"`});
                } else {
                    res.redirect('/');
                }
            }
        }
    }
    oracledbconn();
});

// signup page
app.post('/join',urlencodedParser,(req, res) => {
    res.render('pages/signup',{username:req.body.username,
                               email:req.body.email,
                               password:req.body.password
                             });
});

app.post('/register',urlencodedParser,(req, res) => {
    async function oracledbconn(){
        try {
          conn = await oracledb.getConnection(dum);
          await conn.execute(
            'INSERT INTO users VALUES(users_seq.nextval, :name, :email, :pw, :lname, :fname, :phone)', [req.body.username, req.body.email, req.body.password, req.body.lastname, req.body.firstname, req.body.phone]
          );
          res.redirect('/');
        } catch (err) {
            console.log('Ouch! ', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
               await conn.close();
            }
        }
    }
    oracledbconn();
});

// support page
app.get('/help',(req, res) => {
    if (typeof req.cookies['username'] != 'undefined') {
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
            'SELECT (SELECT p_name FROM products WHERE products.p_id = stores_products_sizes.product_id) AS product_name, stores.store_name, stores.tel, stores.open, stores.address, (SELECT cm FROM sizes WHERE sizes.size_id =stores_products_sizes.size_id) AS CM, qty FROM stores_products_sizes INNER JOIN stores ON stores_products_sizes.store_id = stores.store_id WHERE rownum<1000'
            // 'SELECT * FROM products'
          );
        } catch (err) {
            console.log('Ouch!', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
                await conn.close();
            }
        }

        var data = result.rows;


        if (req.cookies['username']) {
          res.render('pages/stock', {username: req.cookies['username'], data: data});
        } else {
          res.redirect('/');
        }
    }
    oracledbconn();

});

// history page
app.get('/history',(req, res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
            try {
              conn = await oracledb.getConnection(dum);

              var result = await conn.execute(
                'SELECT order_id, status, create_at FROM user_orders WHERE user_id = :user_id', [
                    req.cookies['user_id']
                ]
              );
            } catch (err) {
                console.log('Ouch!', err);
            } finally {
                if (conn) { // conn assignment worked, need to close
                    await conn.close();
                }
            }

            var data = result.rows;


            if (req.cookies['username']) {
              res.render('pages/history', {username: req.cookies['username'], data: data});
            } else {
              res.redirect('/');
            }
        }
        oracledbconn();
    } else {
        res.send({"error" : "Update error"});
    }
});


// payment
app.post('/payment',urlencodedParser,(req, res) => {
    async function oracledbconn(){
      try {
        conn = await oracledb.getConnection(dum);
        await conn.execute(
            `UPDATE "G1_TEAM001"."USER_ORDERS" SET ADDRESS = :address, DISTRICT = :district,COUNTRY = :country,STATE = :state, CONFIRM_EMAIL = :email, STATUS = :status WHERE order_id = :order_id`,
            [req.body.address,req.body.district,req.body.country,req.body.state, req.body.email,req.body.paymentMethod,req.body.orderid]
        );
        res.redirect(`/order/${req.body.orderid}`)
      } catch (err) {
          console.log('Ouch! ', err);
      } finally {
          if (conn) { // conn assignment worked, need to close
             await conn.close();
          }
      }
    };
    oracledbconn(); // call the function run
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
    res.render('pages/about');
});
// how to shop page
app.get('/howtoshop',(req, res) => {
    res.render('pages/howtoshop');
});
// terms of use page
app.get('/termsofuse',(req, res) => {
    res.render('pages/termsofuse');
});
// privacy policy page
app.get('/privacypolicy',(req, res) => {
    res.render('pages/privacypolicy');
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
            res.redirect('/');
        } else {
            res.redirect('/?errormessage=' + encodeURIComponent('Incorrect username or password'));
        }
    };
    oracledbconn();
});

// get product if from ajax
app.post('/add-to-cart', urlencodedParser, (req, res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
            let conn;
            try{
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                    `INSERT INTO "G1_TEAM001"."CART" (USER_ID, P_ID, SIZE_ID, QTY, cart_id) VALUES (${req.cookies['user_id']}, ${req.body.p_id}, ${req.body.p_size}, '1', id.nextval)`,[]);
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
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                  `UPDATE "G1_TEAM001"."CART" SET qty = :size_id WHERE cart_id = :cart_zid`,[req.body.qty,req.body.id]);
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
                conn = await oracledb.getConnection(dum);
                await conn.execute(
                  `UPDATE "G1_TEAM001"."CART" SET SIZE_ID = :size_id WHERE cart_id = :cart_id`,[req.body.size,req.body.id]);
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
                    `DELETE FROM "G1_TEAM001"."CART" WHERE cart_id = ${req.body.id}`,[]);
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

//create bill function
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
                var orderid = await conn.execute(
                 `select MAX(ORDER_ID) from USER_ORDERS where user_ID = ${req.cookies['user_id']}`
                );
                  res.redirect(`../checkout/${orderid.rows[0]}`)
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
    if (req.cookies['user_id']){
        async function oracledbconn(){
            try{
                var user_id = req.cookies['user_id'];
                conn = await oracledb.getConnection(dum);
                var result = await conn.execute(
                    `INSERT INTO "G1_TEAM001"."CART" (USER_ID, P_ID, SIZE_ID, QTY, cart_id) VALUES (:user_id, :p_id, :p_size, :p_qty, id.nextval)`,[
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
            var brand = await conn.execute(
                `select brand_name from brand where brand_id = (select brand from products where p_id = :p_id)`, [req.params.p_id]
            );
            var category = await conn.execute(
                `select category,name from category where category_id = (select category from products where p_id = :p_id)`, [req.params.p_id]
            );
            var product = await conn.execute(
                'SELECT sps.size_id, sum(qty) AS inventory, (select cm from sizes where sizes.size_id = sps.size_id) AS CM FROM stores_products_sizes sps WHERE sps.product_id = :p_id GROUP BY sps.size_id',
                [req.params.p_id]
            );
            var item = await conn.execute(
             `SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images left join products on products.p_id = images.p_id WHERE rownum <= 1) AS product_image, products.discount FROM products WHERE rownum <= 9`
            );

            var data = result.rows[0];
            data = [...data,brand.rows[0][0],category.rows[0][0],category.rows[0][1]]
            item = item.rows;
            product = product.rows;

            // check if the user exists
            if (result.rows) {
                res.render('pages/product', {username: req.cookies['username'], data:data, item: item, product: product});
            }

        } catch (err) {
            console.log('Ouch!', err);
        } finally {
            if (conn) { // conn assignment worked, need to close
               await conn.close();
            }
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
         `select p_id,size_id,qty,cart_id from cart where user_id = ${req.cookies['user_id']}`
        );
        var cartlist = cart.rows;
        for(var i=0;i<cartlist.length;i++){
          var p_name = await conn.execute(
           `select p_name,price,discount from products where p_id = ${cartlist[i][0]}`
          );
          cartlist[i] = [...cartlist[i],p_name.rows[0][0],p_name.rows[0][1],p_name.rows[0][2]]
        }
        var sizes = await conn.execute(
          `SELECT products.p_id, sizes.cm, sizes.size_id FROM stores_products_sizes INNER JOIN products ON stores_products_sizes.product_id = products.p_id INNER JOIN sizes ON stores_products_sizes.size_id = sizes.size_id WHERE rownum <= 500 GROUP BY p_id, sizes.cm, sizes.size_id ORDER BY p_id`
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
app.get('/changepassword',(req,res) => {
    if (req.cookies['username']) {
        async function oracledbconn(){
            try {
                  conn = await oracledb.getConnection(dum);

                  var get_password = await conn.execute(
                      `SELECT password FROM users WHERE user_id = ${req.cookies['user_id']}`
                  );

                  var old_password = get_password.rows[0][0];

                  var update_success = 0;

                  res.render('pages/change-password', {username: req.cookies['username'], password: old_password, update_success: update_success});
              } catch (err) {
                  console.log('Ouch! ', err);
              } finally {
                  if (conn) { // conn assignment worked, need to close
                     await conn.close();
                  }
              }
          }
          oracledbconn();
    } else {
        res.redirect('/');
    }
});

app.post('/passwordchanging',urlencodedParser,(req, res) => {
        async function oracledbconn(){
            try {
              conn = await oracledb.getConnection(dum);

              var get_password = await conn.execute(
                  `SELECT password FROM users WHERE user_id = ${req.cookies['user_id']}`
              );

              var old_password = get_password.rows[0][0];

              if (old_password == req.body.old_password) {
                  if (req.body.old_password == req.body.new_password) {
                  } else {
                      await conn.execute(
                          `UPDATE users SET password = :new_password WHERE user_id = ${req.cookies['user_id']}`, [req.body.new_password]
                      );

                      var update_success = 1; // update success

                      res.render('pages/change-password', {username: req.cookies['username'], update_success: update_success});
                  }
              } else {
                  update_success = 2; // wrong password

                  res.render('pages/change-password', {username: req.cookies['username'], update_success: update_success});
              }
            } catch (err) {
                console.log('Ouch! ', err);
            } finally {
                if (conn) { // conn assignment worked, need to close
                   await conn.close();
                }
            }
        }
        oracledbconn();

});

// all products page
app.get('/products',(req, res) => {
    async function oracledbconn(){
        conn = await oracledb.getConnection(dum);
        const result = await conn.execute(
            'SELECT products.p_name, products.price, products.origin, products.p_id, (SELECT images.image_name FROM images LEFT JOIN products on products.p_id = images.p_id WHERE rownum <= 1), products.discount FROM products'
            // 'select * from images'
        );
        var sizes = await conn.execute(
            `SELECT products.p_id, sizes.cm, sizes.size_id FROM stores_products_sizes INNER JOIN products ON stores_products_sizes.product_id = products.p_id INNER JOIN sizes ON stores_products_sizes.size_id = sizes.size_id WHERE rownum <= 500 GROUP BY p_id, sizes.cm, sizes.size_id ORDER BY p_id`
        );

        if (conn) {await conn.close();};

        // var data = JSON.stringify(result.rows);
        var data = result.rows;

        // check if the user exists
        if (result.rows) {
          res.render('pages/products', {username: req.cookies['username'], data:data, size:sizes.rows, keyword:"ALL PRODUCTS"});
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
app.get('/checkout/:order_id',(req, res) => {
  if (req.cookies['username']) {
      async function oracledbconn(){
        let conn;
          try{
            conn = await oracledb.getConnection(dum);
            var user_order = await conn.execute(
             `select * from USER_ORDERS where ORDER_ID = ${req.params.order_id} and user_id = ${req.cookies['user_id']}`
            );
            var order = await conn.execute(
              `SELECT Products.P_name, Sizes.Cm, Orders.Qty, Orders.Price, Orders.Discount FROM ((Orders INNER JOIN Sizes ON Orders.Size_ID = Sizes.Size_ID) INNER JOIN Products ON Orders.P_id = Products.P_id) INNER JOIN User_orders ON Orders.Order_id = User_orders.Order_id where orders.order_id = ${req.params.order_id}`

            );
            var userinfo = await conn.execute(
             `select * from users where user_id = ${req.cookies['user_id']}`
            );
            var countries = require('country-state-city');
            var countrieslist = [];
            for(var c = 0;c<countries.getAllCountries().length;c++){
              statelist = []
              for (var s = 0;s<countries.getStatesOfCountry((countries.getAllCountries())[c]['id']).length;s++){
                statelist = [...statelist,countries.getStatesOfCountry((countries.getAllCountries())[c]['id'])[s]['name']]
              }
              countrieslist = [...countrieslist,[(countries.getAllCountries())[c]['name'],statelist]]
            }
            var netPurchaseAmount = 0;
            for (var t=0;t<order.rows.length;t++){
              netPurchaseAmount = netPurchaseAmount + Math.round(order.rows[t][2]*order.rows[t][3]*(1-order.rows[t][4]/100)*10)/10
            }
            var deliveryfee = 300;
            if (netPurchaseAmount>500){
              deliveryfee = 0;
            }
            var totalHKD = netPurchaseAmount + deliveryfee;
            res.render('pages/checkout', {order: user_order.rows[0],
                                       order_detail:order.rows,
                                       userinfo: userinfo.rows[0],
                                       netPurchaseAmount:netPurchaseAmount,
                                       deliveryfee:deliveryfee,
                                       totalHKD:totalHKD,
                                       country:countrieslist
                                     });
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
//order page
app.get('/order/:order_id',(req, res) => {
  if (req.cookies['username']) {
      async function oracledbconn(){
        let conn;
          try{
            conn = await oracledb.getConnection(dum);
            var user_order = await conn.execute(
             `select * from USER_ORDERS where ORDER_ID = ${req.params.order_id} and user_id = ${req.cookies['user_id']}`
            );
            var order = await conn.execute(
             `SELECT Products.P_name, Sizes.Cm, Orders.Qty, Orders.Price, Orders.Discount FROM ((Orders INNER JOIN Sizes ON Orders.Size_ID = Sizes.Size_ID) INNER JOIN Products ON Orders.P_id = Products.P_id) INNER JOIN User_orders ON Orders.Order_id = User_orders.Order_id where orders.order_id = ${req.params.order_id}`
            );
            var userinfo = await conn.execute(
             `select * from users where user_id = ${req.cookies['user_id']}`
            );
            var netPurchaseAmount = 0;
            for (var t=0;t<order.rows.length;t++){
              netPurchaseAmount = netPurchaseAmount + Math.round(order.rows[t][2]*order.rows[t][3]*(1-order.rows[t][4]/100)*10)/10
            }
            var deliveryfee = 300;
            if (netPurchaseAmount>500){
              deliveryfee = 0;
            }
            var totalHKD = netPurchaseAmount + deliveryfee;
            res.render('pages/order', {order: user_order.rows[0],
                                       order_detail:order.rows,
                                       userinfo: userinfo.rows[0],
                                       netPurchaseAmount:netPurchaseAmount,
                                       deliveryfee:deliveryfee,
                                       totalHKD:totalHKD
                                     });
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
app.get('/order/:order_id/download',(req, res) => {
  if (req.cookies['username']) {
      async function oracledbconn(){
        let conn;
          try{
            conn = await oracledb.getConnection(dum);
            var user_order = await conn.execute(
             `select * from USER_ORDERS where ORDER_ID = ${req.params.order_id} and user_id = ${req.cookies['user_id']}`
            );
            var order = await conn.execute(
             `SELECT Products.P_name, Sizes.Cm, Orders.Qty, Orders.Price, Orders.Discount FROM ((Orders INNER JOIN Sizes ON Orders.Size_ID = Sizes.Size_ID) INNER JOIN Products ON Orders.P_id = Products.P_id) INNER JOIN User_orders ON Orders.Order_id = User_orders.Order_id where orders.order_id = ${req.params.order_id}`
            );
            var userinfo = await conn.execute(
             `select * from users where user_id = ${req.cookies['user_id']}`
            );
            var netPurchaseAmount = 0;
            for (var t=0;t<order.rows.length;t++){
              netPurchaseAmount = netPurchaseAmount + Math.round(order.rows[t][2]*order.rows[t][3]*(1-order.rows[t][4]/100)*10)/10
            }
            var deliveryfee = 300;
            if (netPurchaseAmount>500){
              deliveryfee = 0;
            }
            var totalHKD = netPurchaseAmount + deliveryfee;
            //===============================================================
            const fs = require('fs');
            var pdfMaker = require('pdf-maker');
            var template = "views/pages/order.ejs";
            var data = { order: user_order.rows[0],
                         order_detail:order.rows,
                         userinfo: userinfo.rows[0],
                         netPurchaseAmount:netPurchaseAmount,
                         deliveryfee:deliveryfee,
                         totalHKD:totalHKD
                       };
            var pdfPath = `pdf_orders/${req.params.order_id}.pdf`;
            var option = {
                    paperSize: {
                        format: 'A4',
                        orientation: 'portrait',
                        border: '1.8cm'
                    }
            };
            pdfMaker(template, data, pdfPath, option);
            pdfcheck();
            function pdfcheck(){
                if (fs.existsSync(pdfPath)) {
                    res.download(`C:\\Users\\Hong\\GitHub\\Marathon_Sports_POS\\pdf_orders\\${req.params.order_id}.pdf`, `MSPOS_bill_no_${req.params.order_id}_${req.cookies['username']}.pdf`)
                }else{
                    setTimeout(function(){ pdfcheck(); }, 1000);
                }
            }
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

app.get('/cart-count',(req,res) =>{
    if (req.cookies['username']) {
        async function oracledbconn(){
            try{
                conn = await oracledb.getConnection(dum);
                var num_of_cart = await conn.execute(
                    `select count(user_id) from cart where user_id = :user_id`,[req.cookies['user_id']]
                );

                res.send({count:num_of_cart.rows[0]});
            } catch (err) {
                console.log('Ouch!', err);
            } finally {
                if (conn) {await conn.close();}
            }
        };
        oracledbconn(); // call the function run
    }
})

// forget password page
app.get('/forgetpassword', (req, res) => {
    res.render('pages/forget-password');
});

app.get('/copyright',(req, res) => {
    res.render('pages/copyright');
});
app.get('/refund',(req, res) => {
    res.render('pages/refund');
});
app.get('/delivery',(req, res) => {
    res.render('pages/delivery');
});

app.use('/public', express.static('public'));
var port = 3000; //change here
app.listen(port);
console.log(`Server Running on port ${port}`);
// require("openurl").open(`http://localhost:${port}`);
