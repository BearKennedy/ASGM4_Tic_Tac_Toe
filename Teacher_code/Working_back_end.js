const express = require('express');	// express is basically a middleware ap to enhance for http requests
const { stat } = require('fs');
const app = express();
const port = 8081

app.use(express.static('public'))
app.use(express.json())

app.get ('/info/:dynamic', (req, res) => {
      const { dynamic } = req.params
      const { key }= req.query
      console.log (dynamic,key)
      res.status(200).json({ info: 'preset text' });
})

app.post('/', (req, res) => {
      const {parcel} = req.body
      console.log(parcel)
      if (!parcel) {
           return res.status(400).send({status: 'failed'})
      }
      res.status(200).send({status: 'recived'})
})
app.listen(port, () => console.log(`we have a connection on port: ${port}`));