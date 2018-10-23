const oracledb = require('oracledb');
const config = {
  user: 'std022',                // Update me
  password: 'cestd0702',        // Update me
  connectString: '144.214.177.102/xe'   // Update me
  // user: 'G1_team001',                // Update me
  // password: 'ceG1_team001',        // Update me
  // connectString: '144.214.177.102/xe'   // Update me
};

async function auth() {
  let conn;

  try {
    conn = await oracledb.getConnection(config);

    const result = await conn.execute(
        'select * from staff'
        // 'select * from users'
      // 'insert into staff values(:id, :name, :title, :salary, :hr, :ext)', ['F008', 'test', 'test', 123, 213, 11], {autoCommit: true}
    );
    console.log(result.rows);
  } catch (err) {
    console.log('Ouch!', err);
  } finally {
    if (conn) { // conn assignment worked, need to close
       await conn.close();
    }
  }
}
// call function run
auth();

exports.printDate = function(){
    console.log(Date());
}
// https://github.com/oracle/node-oracledb/blob/master/examples/select1.js#L35
