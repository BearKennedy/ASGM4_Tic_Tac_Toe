//provided by proof
//returns the database connection

// Module to establish DB connection on localhost
var mysql      = require('mysql');
// Create connection & verify credentials
var dbCon = mysql.createConnection(
    {       
        host     : 'localhost',
        user     : '436_mysql_user',
        password : '123pwd456',
        database : '436db'
    }
);
dbCon.connect(function(error){
	if (error) { // connection failed?
    		console.log('Error connecting to DB ', error);
    		return;
  	}
  	console.log('DBConnection established');
});

// export handle to the connection, for use in other models to access thd DB
exports.dbCon = dbCon;
