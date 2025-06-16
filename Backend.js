// SocketIO with node.js example
// By. A. Ikeji
//
// Note: All the require('...') used may need to be installed if not already installed 
// on your server. To install, use something like   npm install cors  or npm install -g cors  on the command line

// We will also use node as our http server (like our apache), hence we need the http library. We also bring in the express library although not necessary but it provides middleware functionalities for the node http-server.
// Note that you can still use the socket-io from javascripts loaded via apache. In other words, you can use apache as your webserver and node.js with socket-io for the socket communication part much like how we used PHp web sockets and apache.

const cors = require('cors'); // Cross Origin Resource Sharing (CORS) is necessary to configure the socket connection and explicitly grant our socket-io clients (on the the webpage side) proper access to the server (on the AWS side).
// One of the issues is that we don't want javaScript loaded from one origin e.g. www.example.com to connect to another origin e.g. www.example2.com unless the CORS configuration explicitly allows it.

/*
CORS is generally necessary for Socket.IO, especially in versions 3 and above, if your client and server are not on the same origin (domain, port, and protocol).
Same-Origin Policy (SOP): Newer browsers may enforce security measure called the Same-Origin Policy (SOP) that prevents scripts from making requests to a different origin than the one they originated (were loaded) from.
Socket.IO and CORS: Socket.IO connections from the browser to a server is subject to CORS restrictions. For example, the script on the browser may have originated from www.client.com and the server socket.io is on www.server.com, this will require CORS setup. Even when the browser JS is loaded from www.example.com and the server socket.io is running on www.example.com:8080, it still may require CORS setup because of the different in ports.
*/

const app = require('express')(); // express is the middleware for handling the http requests such as get/post among other things.
app.use(cors()); // Using the CORS middleware
const httpServer = require('http').createServer(app);
const  {Server}  = require('socket.io'); // deconstruct Server i.e. get the "Server" part of the socket.io object

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
	    origin: "*", // array of allowed origins e.g. domain names (with optional ports) to connect. origin: "*" means allow all origins
        methods: ["GET", "POST"] // The allowed HTTP methods
    }
});


// Http get requests are handled here
// To use the node http server, the url is myId:portNumber/file e.g. http://1.2.3.4:8080/index.html
app.get('/{*any}', function (request, response) {
	// If request is for a file ending in one of these, then send the file
	//if (request.url.endsWith(".css") || request.url.endsWith(".png") || request.url.endsWith(".ico") || request.url.endsWith(".js") || request.url.endsWith("index.html")) {
	if (request.url.endsWith("index.html")||request.url.endsWith(".css")||request.url.endsWith(".js")||request.url.endsWith(".png")||request.url.endsWith(".webp")) {
                response.sendFile(__dirname + request.url);
        }
	else response.send("<h1>404 - Unknown SAD  request</h1>");
});


// Defie the handlers for socket-io connection relation events
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // if message type is general-msg, handle it here
    // Note that data sent between client & server does not have to be plain text, objects and binary data can be sent too. You just have to parse it the right way upon receipt.

    // THIS IS HOW WE CATCH OR RECICIVE 
    socket.on('general-msg', (data) => {
            console.log(`Received message: ${data.media} ${data.message}`);
	    switch (data.media) {
		// Broadcast the message to all clients (including sender client)

        // AND THIS IS HOW WE SEND
	    	case "broadcastAllPlusMe": io.emit("general-msg","all plus me "+data.message); break;

		// Broadcast the message to all clients (minus sender client)
	    	case "broadcastAllMinusMe": socket.broadcast.emit("general-msg","All minus me "+data.message); break;

		// Broadcast the message to ONLY the sender client
	    	case "ResendToMe": socket.emit("general-msg","Resend bk to me bAHAHAHAHAHHAHHAHA"+data.message); break;

            
	    }
    });

    // if message type is PrivateRoom1-msg, handle it here
    socket.on('PrivateRoom1-msg', (data) => {
       	    console.log(`Received message: ${data}`);
	    switch (data) {
		    case "JOIN": socket.join("PrivateRoom1"); socket.emit("alert","Joined"); break; // join room
		    case "EXIT": socket.leave("PrivateRoom1"); socket.emit("alert","Exited"); break; // exit room
		    default: io.to("PrivateRoom1").emit("PrivateRoom1-msg", data); // send to room1 only
	    }

    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on('TO-SERVER LOGIN screen-name', (screenName) => 
    { console.log('Server received login request for:', screenName); });  

});
    

// Listen on prot 8080. Make sure it is open in network security of AWS for this machine
const PORT = 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// SO

/* we need to add the functions create port and then set it up so we can use it BUT it works
issue is that css is not loaded with page when you go through the port, which is strange....*/




/////////////////////// SQL STUFF //////////////////////////////



const express = require('express');	// express is basically a middleware ap to enhance for http requests
const { stat } = require('fs');

const port = 8081


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

// changed from // app.post('/add_user/{*any}', (req, res) => {
app.post('/notme/', (req, res) => {
    try {
        setHeader(req, res);
        addUserExistCheck(req, res);
        //returnIdlePlayers(req, res);
    } catch (error) {
        res.send(error);
    }
})

//post call that returns all idle users
app.post('/test/{*any}', (req, res) => {
    try {
        setHeader(req, res);
        //addUserExistCheck(req, res);
        //returnIdlePlayers(req, res);
        returnActiveGames(req, res);
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
            ////  HERE IS THE EMMIT
            return false; //user screen name does exist
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

function returnActiveGames(req, res) {
    var query="SELECT * FROM players ";
    dbCon.query(query, function (error, result) { 
        var whatImReturning = "";

        if (error) {
            console.log(error);
            res.send("DB access error");
            return;
        }
        if (result.length==0) {
            whatImReturning += "No Games";
        } else {
            for (var i = 0; i < result.length; i++) {
                if(result[i].x_player == null) { 
                    whatImReturning +=
                    `<tr>
                            <th style = "padding: 10px">
                                <button id = "join_${result[i].o_player}">JOIN</button>
                            </th style = "padding: 10px">
                            <th>
                                ${result[i].o_player}
                            </th>
                    </tr>`;
                } else if (result[i].o_player == null) {
                    whatImReturning +=
                    `<tr>
                            <th style = "padding: 10px">
                                ${result[i].x_player}
                            </th>
                            <th style = "padding: 10px">
                                <button id = "join_${result[i].x_player}">JOIN</button>
                            </th>
                    </tr>`; 
                }
			}
        }
        //console.log(whatImReturning);
		res.send(whatImReturning);
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


