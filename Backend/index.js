const express = require('express');
const app = express();
const port = 3001;
const pool = require('./Database');

app.use(express.json());

// Routes

// register
app.post("/register", async(req, res) => {
  try {
    // req.body should have username and password
    const { username } = req.body;
    const { password } = req.body;
    
    // add user if username is not in db TODO
    let not_in_db = new Boolean(true);
    if(not_in_db){
      // add user info to db TODO
    };
    
    res.json("success");
  } catch (error) {
    console.error(error.message);
  }
})

// login
app.get("/login", async(req, res) => {
  try {
    // get username and password from db
    
  } catch (error) {
    console.error(error.message);
  }
});


app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});