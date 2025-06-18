// SocketIO with node.js example
// By. A. Ikeji + us
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
//var activeList = "";
//var idleList = "";
var nameToID = [];
//var nameTaken = true;

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
	    	case "broadcastAllPlusMe": io.emit("general-msg",data.message); break;

        //  custom addition that is for updates
            case "UPDATED-USER-LIST-AND-STATUS": io.emit("UPDATED-USER-LIST-AND-STATUS", data.message); break;

        //  custom return for when screen name is taken
            case "LOGIN-FAIL": socket.emit("LOGIN-FAIL",data.message); break;

        //  when login is okay
            case "LOGIN-OK": socket.emit("LOGIN-OK",data.message); break;

		// Broadcast the message to all clients (minus sender client)
	    	case "broadcastAllMinusMe": socket.broadcast.emit("general-msg","All minus me "+data.message); break;

		// Broadcast the message to ONLY the sender client
	    	case "ResendToMe": socket.emit("general-msg","Resend bk to me "+data.message); break;
	    }
    });

    socket.on('TO-SERVER LOGOUT', (screenName) => {
        console.log(`Client disconnected: ${socket.id}`);

        for(let i = 0; i < nameToID.length; i++) {
            if(nameToID[i][0] == screenName) {
                nameToID.splice(i, 1);
            }
        }

        removeUserFromDatabase("players", "x_player", screenName);
        removeUserFromDatabase("players", "o_player", screenName);
        removeUserFromDatabase("logged_in_screenname", "screen_name", screenName);

        //remove from the array
    });

    socket.on('TO-SERVER LOGIN', async (screenName) => { 
        console.log('Server received login request for:', screenName); 

        let nameTaken = await addUserExistCheck(screenName); // adds the name if it is not taken
        
        if(nameTaken){ 
            socket.emit("LOGIN-FAIL", {'media': "LOGIN-FAIL", 'message': "Screen name already taken!"}); 
        } else {
            nameToID.push([screenName, socket.id]);
            console.log(nameToID);
            let activeList = await returnActiveGames();
            let idleList = await returnIdlePlayers();
            socket.emit("LOGIN-OK", {'media': "LOGIN-OK", 'message': "LOGIN-OK", 'activeList': activeList, 'idleList': idleList}); 
            //console.log("found? : " + returnSocketID("test"));
        }
    });  

    socket.on('NEW-GAME', async (data) => { //data holds .screen_name and .choice
        console.log('Server received new game request for:', data.screen_name); 

        //removes the users game in case they already had one
        removeUserFromDatabase("players", "x_player", data.screen_name);
        removeUserFromDatabase("players", "o_player", data.screen_name);

        //makes the new game
        newGame(data.screen_name, data.choice_of_X_or_O);

        //updates everyone else
        let activeList = await returnActiveGames();
        let idleList = await returnIdlePlayers();
        socket.emit("general-msg", {'media': "UPDATED-USER-LIST-AND-STATUS", 'message': "UPDATED-USER-LIST-AND-STATUS", 'activeList': activeList, 'idleList': idleList}); 
    });  
    
    socket.on('JOIN', async (data) => { //data holds .screen_name and .opponent
        console.log('User '+  data.screen_name + ' wants to join user ' + data.opponent); 

        //Doesnt let someone join themself
        if(data.screen_name == data.opponent) {
            console.log("Join unsuccessful");
            socket.emit("general-msg", {'media': "ResendToMe", 'message': "CANNOT-PLAY-YOURSELF"}); 
        } else {
            //removes the client from the players table before adding them to the opponents name
            removeUserFromDatabase("players", "x_player", data.screen_name);
            removeUserFromDatabase("players", "o_player", data.screen_name);
            
            //figures out which letter the opponent is
            let opletter = await whichLetterIsOp(data.opponent);

            removeUserFromDatabase("players", "x_player", data.opponent);
            removeUserFromDatabase("players", "o_player", data.opponent);

            console.log(data.opponent + " is " + opletter);

            //the join game function has the o player at the front
            if(opletter == 'x') {
                joinGame(data.screen_name, data.opponent, "x");
            } else{
                joinGame(data.opponent, data.screen_name, "o");
            }

            let opponentID = returnSocketID(data.opponent);
            console.log("The user is requesting to join socketID: " + opponentID);
            console.log("From ID: " + socket.id);

            let activeList = await returnActiveGames();
            let idleList = await returnIdlePlayers();
            socket.emit("general-msg", {'media': "UPDATED-USER-LIST-AND-STATUS", 'message': "UPDATED-USER-LIST-AND-STATUS", 'activeList': activeList, 'idleList': idleList}); 
            
            if(opletter == 'x') {
                io.to(opponentID).emit("PLAY", {'x_player' : data.opponent, 'o_player' : data.screen_name});
                socket.emit("PLAY", {'x_player' : data.opponent, 'o_player' : data.screen_name});
            } else {
                io.to(opponentID).emit("PLAY", {'x_player' : data.screen_name, 'o_player' : data.opponent});
                socket.emit("PLAY", {'x_player' : data.screen_name, 'o_player' : data.opponent});
            }
            
        }
    });

    socket.on('MOVE', async (data) => { //data holds .screen_name and .move_placement (1-9)
        console.log(data.screen_name + " is moving to " + data.move_placement); 
        //socket.emit("MOVE", {'move_placement' : data.move_placement});

        //get opponent name
        let opponent = await returnOpponent(data.screen_name);

        io.to(returnSocketID(opponent)).emit("MOVE", {'screen_name' : data.screen_name, 'move_placement' : data.move_placement});
        //socket.emit("MOVE", {'move_placement' : data.opponent, 'o_player' : data.screen_name});
            
    });  

    //maybe will be removed? Used for constantly refreshing the page
    socket.on('UPDATE', async () => {
        let activeList = await returnActiveGames();
        let idleList = await returnIdlePlayers();
        socket.emit("general-msg", {'media': "ResendToMe", 'message': "LOGIN-OK", 'activeList': activeList, 'idleList': idleList}); 
    });  
});
    

// Listen on prot 8080. Make sure it is open in network security of AWS for this machine
const PORT = 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

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


//app.listen(port, () => console.log(`we have a connection on port: ${port}`));

async function addUserExistCheck(screenName) {
    var query="SELECT screen_name FROM logged_in_screenname WHERE screen_name = ?";
    return new Promise((resolve, reject) => {
        dbCon.query(query, [screenName], function (error, result) { 
            if (error) {
                console.log(error);
                console.log("DB access error");
                return;
            }

            if (result.length!=0) {
                console.log("name taken");
                ////  HERE IS THE EMMIT
                resolve(true);
                return; //user screen name does exist
            }
            console.log("name not taken");
            addUserToDatabase(screenName); //user screen name does not exist
            resolve(false);
        });
    });
}

async function addUserToDatabase(screenName) {
    var query="INSERT INTO logged_in_screenname SET screen_name = ?";
    await dbCon.query(query, [screenName], function (error, data, fields) {
        if (error) {
            console.log(error);
            //res.send("DB access error");
            return;
        }
        //res.send(req.body.username+" added to logged_in_screenname");
    });
}

async function removeUserFromDatabase(table, column, screenName) {
    var query="DELETE FROM " + table + " WHERE " + column + " = ?";
    await dbCon.query(query, [screenName], function (error, data, fields) {
        if (error) {
            console.log(error);
            //res.send("DB access error");
            return;
        }
    });
}

async function newGame(screenName, letterChoice) {
    var query="INSERT INTO players SET " + letterChoice + "_player = ?";
    await dbCon.query(query, [screenName], function (error, data, fields) {
        if (error) {
            console.log(error);
            console.log("DB access error");
            return;
        }
        //res.send(req.body.username+" added to logged_in_screenname");
    });
}


async function returnActiveGames() {
    var query="SELECT * FROM players ";
    return new Promise((resolve, reject) => {
        dbCon.query(query, function (error, result) { 
            let activeList = "<tr> <th style = 'padding: 10px; border-bottom: 4px solid black; margin = -4px'> X-Player </th> <th style = 'padding: 10px; border-bottom: 4px solid black; margin = -4px'> O-Player </th> </tr>";

            if (error) {
                console.log(error);
                //res.send("DB access error");
                return;
            }
            if (result.length==0) {
                activeList += "No Games";
            } else {
                for (var i = 0; i < result.length; i++) {
                    if(result[i].x_player == null) { 
                        activeList +=
                        `<tr>
                                <th style = "padding: 10px">
                                    <button id = "join_${result[i].o_player}" onclick = "join_game(this)">JOIN</button>
                                </th style = "padding: 10px">
                                <th>
                                    ${result[i].o_player}
                                </th>
                        </tr>`;
                    } else if (result[i].o_player == null) {
                        activeList +=
                        `<tr>
                                <th style = "padding: 10px">
                                    ${result[i].x_player}
                                </th>
                                <th style = "padding: 10px">
                                    <button id = "join_${result[i].x_player}" onclick = "join_game(this)">JOIN</button>
                                </th>
                        </tr>`; 
                    } else {
                        activeList +=
                        `<tr>
                                <th style = "padding: 10px">
                                    ${result[i].x_player}
                                </th>
                                <th style = "padding: 10px">
                                    ${result[i].o_player}
                                </th>
                        </tr>`; 
                    }
                }
            }
            resolve(activeList);
        });
    });
}


               
async function returnIdlePlayers() {
    query="SELECT screen_name FROM logged_in_screenname WHERE NOT EXISTS (SELECT *  FROM players WHERE players.x_player = logged_in_screenname.screen_name OR players.o_player = logged_in_screenname.screen_name);";
    return new Promise((resolve, reject) => {
        let idles = []
        dbCon.query(query, function (error, result) { 
            if (error) {
                console.log(error);
                console.log("DB access error");
                return;
            }
            if (result.length!=0) {
                for(var i = 0; i < result.length; i++) { 
                    idles.push(`${result[i].screen_name}`);
                }
            }

            let idleList = "<h1> Idle Players: </h1><h2>" + idles.join("<br>") + "</h2>";
            resolve(idleList);
        });
    });
}

async function joinGame(o, x, opponent) {
    console.log("o is " + o + "\nx is " + x + "\nYour joining someone who is " + opponent);
    if(opponent == "x") {
        var query="INSERT players SET o_player = ?, x_player = ?";
    } else {
        var query="INSERT players SET x_player = ?, o_player = ?";
    }
    return new Promise((resolve, reject) => {
        dbCon.query(query, [o, x], function (error, result) {
            if (error) {
                console.log(error);
                console.log("DB access error");
                return;
            }
            console.log("PLAYERS TABLE UPDATED X");
            resolve();
        });
    })
}

async function whichLetterIsOp(opsName) {
    return new Promise((resolve, reject) => {
        var query="SELECT * FROM players WHERE o_player = ?";
        dbCon.query(query, [opsName], function (error, result) {
            if (error) {
                return reject(error);
            }
            if (result.length!=0) {
                resolve('o');
            } else {
                resolve('x');
            }
        });
    });
}

async function returnOpponent(you) {
    return new Promise((resolve, reject) => {
        var query="SELECT * FROM players WHERE ? IN (x_player, o_player)";
        dbCon.query(query, [you], function (error, result) {
            if (error) {
                return reject(error);
            }
            if (result[0].x_player == you) {
                resolve(`${result[0].o_player}`);
            } else {
                resolve(`${result[0].x_player}`);
            }
        });
    });

}

function returnSocketID(name) {
    for(let i = 0; i < nameToID.length; i++) {
        if(nameToID[i][0] == name) {
            return nameToID[i][1];
        }
    }
    return false;
}

//INSERT INTO players SET x_player = "player"; //(or o_player) when someone makes a game 
//UPDATE players SET o_player = "player2" WHERE x_player = "player"; //when someone joins the match (as o)
//DELETE FROM players WHERE x_player = "player"; //when the game is over


