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
	    origin: [myIp], // array of allowed origins e.g. domain names (with optional ports) to connect. origin: "*" means allow all origins
        methods: ["GET", "POST"] // The allowed HTTP methods
    }
});


// Http get requests are handled here
// To use the node http server, the url is myId:portNumber/file e.g. http://1.2.3.4:8080/index.html
app.get('/{*any}', function (request, response) {
	// If request is for a file ending in one of these, then send the file
	//if (request.url.endsWith(".css") || request.url.endsWith(".png") || request.url.endsWith(".ico") || request.url.endsWith(".js") || request.url.endsWith("index.html")) {
	if (request.url.endsWith("index.html")) {
                response.sendFile(__dirname + request.url);
        }
	else response.send("<h1>404 - Unknown request</h1>");
});


// Defie the handlers for socket-io connection relation events
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // if message type is general-msg, handle it here
    // Note that data sent between client & server does not have to be plain text, objects and binary data can be sent too. You just have to parse it the right way upon receipt.
    socket.on('general-msg', (data) => {
            console.log(`Received message: ${data.media} ${data.message}`);
	    switch (data.media) {
		// Broadcast the message to all clients (including sender client)
	    	case "broadcastAllPlusMe": io.emit("general-msg","all plus me "+data.message); break;

		// Broadcast the message to all clients (minus sender client)
	    	case "broadcastAllMinusMe": socket.broadcast.emit("general-msg","All minus me "+data.message); break;

		// Broadcast the message to ONLY the sender client
	    	case "ResendToMe": socket.emit("general-msg","Resend bk to me "+data.message); break;
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
});


// Listen on prot 8080. Make sure it is open in network security of AWS for this machine
const PORT = 8080;
httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
