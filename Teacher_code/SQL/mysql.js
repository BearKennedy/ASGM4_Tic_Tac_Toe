/* By A. Ikeji
 * Sample node program emphasizing mysql connectivity
 
   NOTE: If you get mysql athentication error, type the following in mysql
  ALTER USER 'your-mysql-username'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your-mysql-password';
  flush privileges;
*/

var dbCon = require('./connectToDB.js').dbCon; // connect to DB

const express = require('express');	// express is basically a middleware ap to enhance for http requests
const app = express();
// Append middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Define a route for http GET request to port 8080
app.get('/{*any}', (request, response) => {
	setHeader(request, response);
	try {
		var parameters = decodeURIComponent(request.originalUrl).substr(1);
		if (parameters.endsWith("index.html") || parameters=="") { // file request?
			response.sendFile(__dirname + request.url);
		}
		else {
			parameters = JSON.parse(parameters);
			if (parameters.item && parameters.whichList) addToList(response, parameters); // must be command such as addToList
			else response.send('Request not accounted for'); //  unknown request
		}
	} catch (error) {
      		response.send("Get error: "+error);
	}
});

// Define a route for http GET request to port 8080
app.post('/{*any}', (request, response) => {
	try {
		setHeader(request, response);
		if (request.body.whichList=="animals" || request.body.whichList=="plants") showList(request, response);
		else response.send("Post request not accounted for");
	} catch (error) {
      		response.send(error);
	}
});


// Start the server and listen for connections/requests
const port = 8080;
app.listen(port, () => {
      console.log(`Express app listening at http://localhost:${port}`);
});

// Normally, the tables are created outside of the pgm, but I'll do it here
// for simplicity. Note that I am assuming it works (i.e. not catching the errors). Never make such assumptions in production mode. This is just for a test
dbCon.query("create table if not exists animals (name varchar(50));");
dbCon.query("create table if not exists plants (name varchar(50));");


// set header to allow fetch requests from all scripts from this domain
// without this, it will only work if the fetch (index.html) is loaded by calling the http server via port 8080
// If you load the index.html directly without :8080, fetch will fail unless you add this or similar setHeader
function setHeader (request, response) {
	response.setHeader('Access-Control-Allow-Credentials', 'true');
    	if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
}

// Adds item to list
function addToList(response, parameters) {
	if (parameters.whichList=="animals" || parameters.whichList=="plants") {
		var query="insert into "+parameters.whichList+" set name = ?";
		// dbCon.query saniting such as the ? below does not allow table name to be subbed with ?
		// otherwise I would have used dbCon.query("insert into ? set name = ?", [list, item] ...
		dbCon.query(query, [parameters.item], function (error, data, fields) {
			if (error) {
				console.log(error);
				response.send("DB access error");
				return;
			}
			// all okay
			response.send(parameters.item+" added to "+parameters.whichList);
		});
	}
	else response.send("Only animals and plants list allowed");
}

// Show current list of animals or plants
function showList(request, response) {
	dbCon.query("select name from "+request.body.whichList+" order by name", function (error, result) {
		if (error) {
			console.log(error);
			response.send("DB access error for show list");
			return;
		}
		var ret=`<center><h3>Current list of ${request.body.whichList} in the DB</h3>`;
		if (result.length==0) ret += "Nothing";
		else {
			// We have something. Format and present it
			ret += `<div style='overflow-y:scroll;height:200px;display:block;'><table style='border:1px solid blue; border-collapse:collapse'>`;
			for (var i=0; i < result.length; i++) {
				ret += `<tr style='border:1px solid blue;'><td style='border:1px solid blue;padding:1.0em'>${i+1}</td><td style='border:1px solid blue;padding:1.0em'>${result[i].name}</td></tr>`;
			}
			ret += "</table></div>";
			// result.forEach(row => { ... }); works too
		}
		response.send(ret+"</center>");
	});
}
