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

app.get ('/{*any}', (req, res) => {
      const { dynamic } = req.params
      const { key }= req.query
      console.log (dynamic,key)
      res.status(200).json({ info: 'preset text' });
})

app.post('/{*any}', (req, res) => {
    try {
        console.log("WORK")
        setHeader(req, res);
        console.log(req.body.username)
        if (req.body.username=="test") {
            res.send("TEST WORKED");
        } else {
            res.send("Post request not accounted for");
        }
        
    } catch (error) {
      	res.send(error);
	}
})

app.listen(port, () => console.log(`we have a connection on port: ${port}`));

function setHeader (request, response) {
	response.setHeader('Access-Control-Allow-Credentials', 'true');
    	if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
}