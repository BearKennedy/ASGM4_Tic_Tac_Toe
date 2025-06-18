// By Ryan Retan and Bear Kennedy
// Due Jun. 18, 2025
// Node.js file for assignment 4

// With some provided code from A. Ikeji

// Uses socket.io to send and recieve messages from clients


const cors = require('cors'); // Cross Origin Resource Sharing (CORS) is necessary to configure the socket connection and explicitly grant our socket-io clients (on the the webpage side) proper access to the server (on the AWS side).
const app = require('express')(); // express is the middleware for handling the http requests such as get/post among other things.
app.use(cors()); // Using the CORS middleware
const httpServer = require('http').createServer(app);
const  {Server}  = require('socket.io'); // deconstruct Server i.e. get the "Server" part of the socket.io object
var nameToID = [];

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
	    	case "ResendToMe": socket.emit("general-msg","Resend to me "+data.message); break;
	    }
    });

    //When the client wants to log out
    socket.on('TO-SERVER LOGOUT', (screenName) => {
        console.log(`Client disconnected: ${socket.id}`);

        //removes the screen name and socket id entry from the array
        for(let i = 0; i < nameToID.length; i++) {
            if(nameToID[i][0] == screenName) {
                nameToID.splice(i, 1);
            }
        }

        //removes the screenname from all databases
        removeUserFromDatabase("players", "x_player", screenName);
        removeUserFromDatabase("players", "o_player", screenName);
        removeUserFromDatabase("logged_in_screenname", "screen_name", screenName);
    });

    //When the client wants to login
    socket.on('TO-SERVER LOGIN', async (screenName) => { 
        console.log('Server received login request for:', screenName); 

        let nameTaken = await addUserExistCheck(screenName); // adds the name if it is not taken
        
        if(nameTaken){ 
            //if the name is taken, it is returned to the user
            socket.emit("LOGIN-FAIL", {'media': "LOGIN-FAIL", 'message': "Screen name already taken!"}); 
        } else {
            //else, the name and socket id are added to the array
            nameToID.push([screenName, socket.id]);

            //message is sent back to the client with the lists of players
            let activeList = await returnActiveGames();
            let idleList = await returnIdlePlayers();
            socket.emit("LOGIN-OK", {'media': "LOGIN-OK", 'message': "LOGIN-OK", 'activeList': activeList, 'idleList': idleList}); 
        }
    });  

    //When the client wants to make a new game
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
    
    //When the client wants to join another game
    socket.on('JOIN', async (data) => { //data holds .screen_name and .opponent
        console.log('User '+  data.screen_name + ' wants to join user ' + data.opponent); 

        //Doesnt let someone join themself
        if(data.screen_name == data.opponent) {
            console.log("Join unsuccessful");
            socket.emit("general-msg", {'media': "ResendToMe", 'message': "CANNOT-PLAY-YOURSELF"}); 
        } else {
            //removes the client from the players table
            removeUserFromDatabase("players", "x_player", data.screen_name);
            removeUserFromDatabase("players", "o_player", data.screen_name);
            
            //figures out which letter the opponent is
            let opletter = await whichLetterIsOp(data.opponent);

            //removes the opponent from the players table
            removeUserFromDatabase("players", "x_player", data.opponent);
            removeUserFromDatabase("players", "o_player", data.opponent);

            //console.log(data.opponent + " is " + opletter);

            //the join game function has the o player at the front
            //this function creates a new database entry in players with both players
            if(opletter == 'x') {
                joinGame(data.screen_name, data.opponent);
            } else{
                joinGame(data.opponent, data.screen_name);
            }

            //gets oppoents socket ID from the users name
            let opponentID = returnSocketID(data.opponent);

            //updates all other users
            let activeList = await returnActiveGames();
            let idleList = await returnIdlePlayers();
            socket.emit("general-msg", {'media': "UPDATED-USER-LIST-AND-STATUS", 'message': "UPDATED-USER-LIST-AND-STATUS", 'activeList': activeList, 'idleList': idleList}); 
            
            //sends the private PLAY socket message to both players
            if(opletter == 'x') {
                io.to(opponentID).emit("PLAY", {'x_player' : data.opponent, 'o_player' : data.screen_name});
                socket.emit("PLAY", {'x_player' : data.opponent, 'o_player' : data.screen_name});
            } else {
                io.to(opponentID).emit("PLAY", {'x_player' : data.screen_name, 'o_player' : data.opponent});
                socket.emit("PLAY", {'x_player' : data.screen_name, 'o_player' : data.opponent});
            }
            
        }
    });

    //When the client sends move
    socket.on('MOVE', async (data) => { //data holds .screen_name and .move_placement (1-9)
        //console.log(data.screen_name + " is moving to " + data.move_placement); 

        //get opponent name
        let opponent = await returnOpponent(data.screen_name);

        //sends the move to the opponent
        io.to(returnSocketID(opponent)).emit("MOVE", {'screen_name' : data.screen_name, 'move_placement' : data.move_placement});    
    });  

    //maybe will be removed? Used for constantly refreshing the page
    socket.on('UPDATE', async () => {
        let activeList = await returnActiveGames();
        let idleList = await returnIdlePlayers();
        socket.emit("general-msg", {'media': "ResendToMe", 'message': "LOGIN-OK", 'activeList': activeList, 'idleList': idleList}); 
    });  

    //When the client sees the end game and sends it to the server
    socket.on('END-GAME', async (data) => { //data holds .screen_name and .move_placement (1-9)
        console.log(data.winner + " won!"); 

        //get opponent name
        let opponent = await returnOpponent(data.screen_name);

        //sends the end game to the opponent
        io.to(returnSocketID(opponent)).emit("END-GAME", {'winner' : data.winner});     
    });  
});
    

// Listen on port 8081. 
const PORT = 8081;
httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

/////////////////////// SQL STUFF //////////////////////////////
const express = require('express');	// express is basically a middleware ap to enhance for http requests
const { stat } = require('fs');

var dbCon = require('./connectToDB.js').dbCon; // connect to DB

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// Checks if the user exists in the database. If it doesnt, the screen name is added to the database
// returns true or false depending on if the user exists
async function addUserExistCheck(screenName) {
    var query="SELECT screen_name FROM logged_in_screenname WHERE screen_name = ?";
    return new Promise((resolve, reject) => {
        dbCon.query(query, [screenName], function (error, result) { 
            if (error) {
                console.log(error);
                console.log("DB access error");
                return;
            }

            //if there are results, the name exists
            if (result.length!=0) {
                console.log("name taken");
                resolve(true);
                return; //user screen name does exist
            }
            console.log("name not taken");
            addUserToDatabase(screenName); //user screen name does not exist
            resolve(false);
        });
    });
}

// helper function that adds a screenName to the logged_in_screenname table
async function addUserToDatabase(screenName) {
    var query="INSERT INTO logged_in_screenname SET screen_name = ?";
    await dbCon.query(query, [screenName], function (error, data, fields) {
        if (error) {
            console.log(error);
            return;
        }
    });
}

// function that removes a given screen name from a passed table and column
// the table and column are strings given in this file, the screen name is from the user
async function removeUserFromDatabase(table, column, screenName) {
    var query="DELETE FROM " + table + " WHERE " + column + " = ?";
    await dbCon.query(query, [screenName], function (error, data, fields) {
        if (error) {
            console.log(error);
            return;
        }
    });
}

// Used to create a new game by creating a new row in the players database
async function newGame(screenName, letterChoice) {
    var query="INSERT INTO players SET " + letterChoice + "_player = ?";
    await dbCon.query(query, [screenName], function (error, data, fields) {
        if (error) {
            console.log(error);
            console.log("DB access error");
            return;
        }
    });
}

// funciton used to return active games as a table in html
async function returnActiveGames() {
    var query="SELECT * FROM players ";
    return new Promise((resolve, reject) => {
        dbCon.query(query, function (error, result) { 
            let activeList = "<tr> <th style = 'padding: 10px; border-bottom: 4px solid black; margin = -4px'> X-Player </th> <th style = 'padding: 10px; border-bottom: 4px solid black; margin = -4px'> O-Player </th> </tr>";

            if (error) {
                console.log(error);
                return;
            }
            if (result.length==0) {
                activeList += "No Games";
            } else {
                for (var i = 0; i < result.length; i++) {
                    // if a player is null, a JOIN button is put in place of a name
                    // if not, both names are displayed
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
            //html is returned
            resolve(activeList);
        });
    });
}


// Function that returns a list of idle players names in html 
async function returnIdlePlayers() {
    //a player is idle if he/she is loggin in(inside the logged_in_screenname table), but is not in the players table
    query="SELECT screen_name FROM logged_in_screenname WHERE NOT EXISTS (SELECT *  FROM players WHERE players.x_player = logged_in_screenname.screen_name OR players.o_player = logged_in_screenname.screen_name);";
    return new Promise((resolve, reject) => {
        let idles = [];
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

            //formatted as html then returned
            let idleList = "<h1> Idle Players: </h1><h2>" + idles.join("<br>") + "</h2>";
            resolve(idleList);
        });
    });
}

// Puts 2 players (strings) into the players table
async function joinGame(o, x) {
    //console.log("o is " + o + "\nx is " + x + "\nYour joining someone who is " + opponent);

    var query="INSERT players SET o_player = ?, x_player = ?";
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

// Returns which letter the opponent is
async function whichLetterIsOp(opsName) {
    return new Promise((resolve, reject) => {
        //checks the o_player col
        var query="SELECT * FROM players WHERE o_player = ?";
        dbCon.query(query, [opsName], function (error, result) {
            if (error) {
                return reject(error);
            }
            //if the o_player col is not empty, your oppoent is o
            if (result.length!=0) {
                resolve('o');
            } else {
                //else you opp is x
                resolve('x');
            }
        });
    });
}

// Returns the opponent of the given screen name
async function returnOpponent(you) {
    return new Promise((resolve, reject) => {
        //returns any results from the screen name in the table 
        var query="SELECT * FROM players WHERE ? IN (x_player, o_player)";
        dbCon.query(query, [you], function (error, result) {
            if (error) {
                return reject(error);
            }
            //if the given name is in the x_col, your opponent is o, and vise versa
            if (result[0].x_player == you) {
                resolve(`${result[0].o_player}`);
            } else {
                resolve(`${result[0].x_player}`);
            }
        });
    });

}

// Returns the socket ID of a given screen name
function returnSocketID(name) {
    //list of names and ids is checked for the given name
    for(let i = 0; i < nameToID.length; i++) {
        if(nameToID[i][0] == name) {
            // the ID col of the row with the name given is returned
            return nameToID[i][1];
        }
    }
    return false;
}