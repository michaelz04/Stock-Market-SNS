const express = require("express");

const app = express();
const port = 3001;
const pool = require("./Database");
const cors = require("cors");

app.use(cors());
app.use(express.json());

// Routes

// register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // check if user exists in db

    const userExists = await pool.query(
      "SELECT * FROM users WHERE userId = $1",
      [username]
    );

    // user exists
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // insert new user in db

    await pool.query("INSERT INTO users (userId, password) VALUES ($1, $2)", [
      username,
      password,
    ]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error.message);
  }
});

// login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // check if user exists
    const user = await pool.query("SELECT * FROM users WHERE userId = $1", [
      username,
    ]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // check valid password
    const validPassword = password == user.rows[0].password;

    if (!validPassword) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    return res.status(201).json({ message: "Login success" });
  } catch (error) {
    console.error(error.message);
  }
});

// get portfolio
app.post("/portfolio", async (req, res) => {
  const { user } = req.body;

  try {
    const portfolio = await pool.query(
      "SELECT portfolioId, cash FROM Portfolio WHERE userId = $1",
      [user]
    );

    res.status(201).json({ message: "success", portfolios: portfolio.rows });
  } catch (error) {
    console.log(error.message);
  }
});

// create portfolio
app.post("/createportfolio", async (req, res) => {
  const { user, portfolioName, cash } = req.body;

  // check if userId and portfolioId is not in db
  const exists = await pool.query(
    "SELECT * FROM portfolio WHERE userId = $1 AND portfolioId = $2",
    [user, portfolioName]
  );

  if (exists.rows.length > 0) {
    return res.status(400).json({ message: "Invalid username or password" });
  }

  await pool.query(
    "INSERT INTO Portfolio (userId, portfolioId, cash) VALUES ($1, $2, $3)",
    [user, portfolioName, cash]
  );

  res.status(201).json({ message: "success" });
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});








/*
Returns 4 possible statuses to the front-end on handleSendRequest
A) already_friends
B) outgoing_request_exists
C) incoming_request_exists
D) no relationship
This function is primarily for front-end display.
*/
app.get("/friendship-status", async (req, res) => {
  const { user1, user2 } = req.query;
  
  try {
    // Check if already friends
    const friends = await pool.query(
      "SELECT * FROM FriendsWith WHERE (user1 = $1 AND user2 = $2) OR (user1 = $2 AND user2 = $1)",
      [user1, user2]
    );
    
    if (friends.rows.length > 0) {
      return res.json({ status: 'already_friends' });
    }
    
    // Check for pending requests in either direction
    const outgoingRequest = await pool.query(
      "SELECT * FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [user1, user2]
    );
    
    const incomingRequest = await pool.query(
      "SELECT * FROM FriendRequest WHERE senderId = $2 AND receiverId = $1",
      [user1, user2]
    );
    
    if (outgoingRequest.rows.length > 0) {
      return res.json({ status: 'outgoing_request_exists' });
    }
    
    if (incomingRequest.rows.length > 0) {
      return res.json({ status: 'incoming_request_exists' });
    }
    
    res.json({ status: 'no_relationship' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Send friend request, actually does the work in backend
app.post("/send-friend-request", async (req, res) => {
  const { senderId, receiverId } = req.body;
  
  try {
    // Check if trying to add self
    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }
    
    // Check if receiver exists
    const receiverExists = await pool.query(
      "SELECT * FROM users WHERE userId = $1",
      [receiverId]
    );
    
    if (receiverExists.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if already friends
    const alreadyFriends = await pool.query(
      "SELECT * FROM FriendsWith WHERE (user1 = $1 AND user2 = $2) OR (user1 = $2 AND user2 = $1)",
      [senderId, receiverId]
    );
    
    if (alreadyFriends.rows.length > 0) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }
    
    // Check if outgoing request already exists
    const outgoingRequestExists = await pool.query(
      "SELECT * FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [senderId, receiverId]
    );
    
    if (outgoingRequestExists.rows.length > 0) {
      return res.status(400).json({ message: "Friend request already sent" });
    }
    
    // Check if incoming request exists (auto-accept if it does)
    const incomingRequestExists = await pool.query(
      "SELECT * FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [receiverId, senderId]
    );
    
    if (incomingRequestExists.rows.length > 0) {
      // Delete the existing request
      await pool.query(
        "DELETE FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
        [receiverId, senderId]
      );
      
      // Create friendship (ensuring user1 < user2)
      // Somehow needs localeCompare to ensure user1 < user2
      const user1 = senderId.localeCompare(receiverId) < 0 ? senderId : receiverId;
      const user2 = senderId.localeCompare(receiverId) < 0 ? receiverId : senderId;
      
      await pool.query(
        "INSERT INTO FriendsWith (user1, user2) VALUES ($1, $2)",
        [user1, user2]
      );
      
      return res.json({ message: "Friend request accepted! You are now friends." });
    }
    
    // Create new friend request
    await pool.query(
      "INSERT INTO FriendRequest (senderId, receiverId) VALUES ($1, $2)",
      [senderId, receiverId]
    );
    
    res.json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// User sees pending requests
app.get("/pending-requests", async (req, res) => {
  const { userId } = req.query;
  
  try {
    const requests = await pool.query(
      `SELECT senderId FROM FriendRequest WHERE receiverId = $1`,
      [userId]
    );
    
    res.json({ requests: requests.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get outgoing friend requests, simply returns a list so when user clicks on "Outgoing Requests"
app.get("/outgoing-requests", async (req, res) => {
  const { userId } = req.query;
  
  try {
    const requests = await pool.query(
      `SELECT receiverId FROM FriendRequest WHERE senderId = $1`,
      [userId]
    );
    
    res.json({ requests: requests.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Respond to friend request (accept/decline)
app.post("/respond-to-request", async (req, res) => {
  const { senderId, receiverId, action } = req.body; // action: 'accept' or 'decline'
  
  try {
    // Verify the request exists
    const requestExists = await pool.query(
      "SELECT * FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [senderId, receiverId]
    );
    
    if (requestExists.rows.length === 0) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    
    if (action === 'accept') {
      // Create friendship (ensuring user1 < user2)
      const user1 = senderId.localeCompare(receiverId) < 0 ? senderId : receiverId;
      const user2 = senderId.localeCompare(receiverId) < 0 ? receiverId : senderId;

      await pool.query(
        "INSERT INTO FriendsWith (user1, user2) VALUES ($1, $2)",
        [user1, user2]
      );
    }
    
    // Delete the request in either case
    await pool.query(
      "DELETE FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [senderId, receiverId]
    );
    
    res.json({ 
      message: action === 'accept' 
        ? "Friend request accepted" 
        : "Friend request declined" 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Cancel outgoing friend request
app.post("/cancel-request", async (req, res) => {
  const { senderId, receiverId } = req.body;
  
  try {
    const result = await pool.query(
      "DELETE FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [senderId, receiverId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    
    res.json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

//Returns friends of current user
app.get("/friends-list", async (req, res) => {
  const { userId } = req.query;

  try {
    const friends = await pool.query(
      `SELECT user2 AS friendId 
       FROM FriendsWith 
       WHERE user1 = $1

       UNION

       SELECT user1 
       AS friendId FROM FriendsWith 
       WHERE user2 = $1`,
      [userId]
    );
    
    res.json({ friends: friends.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});


app.post("/remove-friend", async (req, res) => {
  const { userId, friendId } = req.body;

  try {
    await pool.query(
      `DELETE FROM FriendsWith 
       WHERE (user1 = $1 AND user2 = $2) OR (user1 = $2 AND user2 = $1)`,
      [userId, friendId]
    );

    res.json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});
//So a user can see all potential people to add.
app.get("/all-users", async (req, res) => {
  const { currentUser } = req.query;

  try {
    const users = await pool.query(
      "SELECT userId FROM Users WHERE userId != $1",
      [currentUser]
    );
    res.json({ users: users.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});