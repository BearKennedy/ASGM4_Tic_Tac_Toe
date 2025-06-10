// must run command npm -i mysql2
import mysql from 'mysql2' // resulting in commonJS, import was not working 
// this will need a json file if we want to use ES Modules:

const pool = mysql.createPool({
      host: 'localhost',
      user: '436_mysql_user',
      password:'123pwd456',
      database: '436db',
}).promise() // lets us asyce await and not callback 

// the await waits until the code within the promise is finished before it fires 
const result =  await pool.query("SELECT * FROM employees") 

console.log(result)