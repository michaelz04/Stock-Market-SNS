const express = require('express');

const app = express();
const port = 3001;
const pool = require('./Database');
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Routes

// register
app.post("/register", async(req, res) => {
  const { username, password } = req.body;

  try {
    
    // check if user exists in db


    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    // user exists
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // insert new user in db

    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error.message);
  }
})

// login
app.post("/login", async(req, res) => {
  const { username, password } = req.body;

  try {
    // check if user exists
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // check valid password
    const validPassword = password == user.rows[0].password;


    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    return res.status(201).json({ message: 'Login success' });

  } catch (error) {
    console.error(error.message);
  }
});

// get portfolio
app.get("/portfolio", async(req, res) => {

});

app.get('/', (req, res) => {
  res.status(200).send('Hello World!');
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});