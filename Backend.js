const express = require('express');	// express is basically a middleware ap to enhance for http requests
const { stat } = require('fs');
const app = express();
const port = 8081

const cors = require('cors');
app.use(cors()); // Using the CORS middleware
var dbCon = require('./connectToDB.js').dbCon; // connect to DB

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

/*
// Get public ip address and use it to setup CORS
var myIp=false;
const { execSync } = require('child_process');
try {
  const result = execSync('curl ip-adresim.app');
  myIp=result.toString();
	console.log(myIp);
} catch (error) {
  console.error('Error executing command:', error);
	exit();
}

const io = new Server(httpServer, {
    cors: {
	    origin: [myIp], // array of allowed origins e.g. domain names (with optional ports) to connect. origin: "*" means allow all origins
        methods: ["GET", "POST"] // The allowed HTTP methods
    }
});
*/
/* Not using get calls, at least not yet
app.get ('/{*any}', (req, res) => {
      const { dynamic } = req.params
      const { key }= req.query
      console.log (dynamic,key)
      res.status(200).json({ info: 'preset text' });
})
*/

//post call that adds a screenname to the database if it is not already being used
app.post('/add_user/{*any}', (req, res) => {
    try {
        setHeader(req, res);
        addUserExistCheck(req, res);
        //returnIdlePlayers(req, res);
    } catch (error) {
      	res.send(error);
	}
})

//post call that returns all idle users
app.post('/idle_users/{*any}', (req, res) => {
    try {
        setHeader(req, res);
        //addUserExistCheck(req, res);
        returnIdlePlayers(req, res);
    } catch (error) {
      	res.send(error);
	}
})

app.listen(port, () => console.log(`we have a connection on port: ${port}`));

function setHeader(req, res) {
	res.setHeader('Access-Control-Allow-Credentials', 'true');
    	if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
}

function addUserExistCheck(req, res) {
    var query="SELECT screen_name FROM logged_in_screenname WHERE screen_name = ?";
    dbCon.query(query, [req.body.username], function (error, result) { 
        if (error) {
            console.log(error);
            res.send("DB access error");
            return;
        }

        if (result.length!=0) {
            res.send("name taken");
            return; //user screen name does exist
        }
        
        console.log("name not taken");
		addUserToDatabase(req, res); //user screen name does not exist
    });
}

function addUserToDatabase(req, res) {
    var query="INSERT INTO logged_in_screenname SET screen_name = ?";
    dbCon.query(query, [req.body.username], function (error, data, fields) {
        if (error) {
            console.log(error);
            res.send("DB access error");
            return;
        }
		res.send(req.body.username+" added to logged_in_screenname");
    });
}

function returnTableRows(req, res) {
    var query="SELECT screen_name FROM logged_in_screenname ";
    dbCon.query(query, function (error, result) { 
        var databasePrinted = "";

        if (error) {
            console.log(error);
            res.send("DB access error");
            return;
        }
        if (result.length==0) {
            databasePrinted += "Nothing";
        } else {
            for (var i = 0; i < result.length; i++) {
				databasePrinted += `<p> ${result[i].screen_name} </p>`;
			}
        }
		res.send(databasePrinted);
    });
}

function returnIdlePlayers(req, res) {
    var query="SELECT screen_name FROM logged_in_screenname ";
    dbCon.query(query, function (error, result) { 
        var players = [];

        if (error) {
            console.log(error);
            res.send("DB access error");
            return;
        }
        if (result.length==0) {
            return;
        } else {
            for(var i = 0; i < result.length; i++) {
                players.push(`${result[i].screen_name}`);
            }
        }
        console.log(players.toString());
        var idles = [];
// SELECT * FROM players WHERE x_player not in ('test', 'Taken', 'New Name', 'yes') OR  o_player not in ('test', 'Taken', 'New Name', 'yes');
        query="SELECT * FROM players WHERE x_player NOT IN ('" + players.join("', '") + "') OR o_player NOT IN ('" + players.join("', '") + "')";
        dbCon.query(query, function (error, result) { 
            if (error) {
                console.log(error);
                res.send("DB access error");
                return;
            }
            if (result.length!=0) {
                for(var i = 0; i < result.length; i++) { 
                    if(`${result[i].x_player}` != 'null') {
                        idles.push(`${result[i].x_player}`);
                    }
                    if(`${result[i].o_player}` != 'null') {
                       idles.push(`${result[i].o_player}`);
                    }
                    //console.log(idles.toString());
                }
            }

            console.log(idles.toString());
            res.send("<h1> Idle Players: </h1><h2>" + idles.join("<br>") + "</h2>");
        });
    });
    
    
}
//INSERT INTO players SET x_player = "player"; //(or o_player) when someone makes a game 
//UPDATE players SET o_player = "player2" WHERE x_player = "player"; //when someone joins the match (as o)
//DELETE FROM players WHERE x_player = "player"; //when the game is over