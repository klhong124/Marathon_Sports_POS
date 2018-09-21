const oracledb = require('oracledb');
const config = {
  user: 'std022',                // Update me
  password: 'cestd0702',        // Update me
  connectString: '144.214.177.102/xe'   // Update me
};

async function getEmployee(empId) {
  let conn;

  try {
    conn = await oracledb.getConnection(config);

    const result = await conn.execute(
      'select * from users'
      // [empId]
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

getEmployee(101);


// https://github.com/oracle/node-oracledb/blob/master/examples/select1.js#L35
