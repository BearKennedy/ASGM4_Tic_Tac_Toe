// file that tests if nodejs is set up right
/* YOU WILL NEED TO GO TO AWS AND SET UP 
NEW RULES FOR PORT 8081*/

var http = require('http');
http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Congratulations! node.JS has successfully been installed !\n');
      }).listen(8081);
console.log('Server running at port 8081');