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
    // insert new user in db
    await pool.query("INSERT INTO users (userId, password) VALUES ($1, $2)", [
      username,
      password,
    ]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    // error inserting into db
    console.error(error.message);
  }
});

// login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // check if user and password exists
    const user = await pool.query("SELECT * FROM users WHERE userId = $1 AND password = $2", [
      username, password
    ]);

    // return fail if user and password don't exist
    if (user.rows.length === 0) {
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

  const portfolio = await pool.query(
    "SELECT portfolioId, cash FROM Portfolio WHERE userId = $1",
    [user]
  );

  res.status(201).json({ message: "success", portfolios: portfolio.rows });
});

// create portfolio
app.post("/createportfolio", async (req, res) => {
  const { user, portfolioName, cash } = req.body;

  try {
    await pool.query(
      "INSERT INTO portfolio (userId, portfolioId, cash) VALUES ($1, $2, $3)",
      [user, portfolioName, cash]
    );
  
    res.status(201).json({ message: "success" });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: "error" });
  }
  
});

// delete portfolio
app.post("/deleteportfolio", async (req, res) => {
  const { user, portfolioName } = req.body;

  await pool.query(
    "DELETE FROM portfolio WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioName]
  );

  res.status(201).json({ message: "success" });
});

// get cash account
app.post("/cashaccount", async (req, res) => {
  const { user, portfolioId } = req.body;

  // get cash
  const cash = await pool.query(
    "SELECT cash FROM portfolio WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  // get cash account history
  const cashHistory = await pool.query(
    "SELECT transact, amount FROM portfoliotransaction WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  res.status(201).json({ message: "success", cash: cash.rows, cashHistory: cashHistory.rows});
});

// get stock holdings
app.post("/stockholdings", async (req, res) => {
  const { user, portfolioId } = req.body;

  // get cash
  const cash = await pool.query(
    "SELECT cash FROM portfolio WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  // get stocks
  const stocks = await pool.query(
    "WITH RankedStock AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY code ORDER BY timestamp DESC) AS row_num FROM stock) \
    SELECT close, portfoliostock.code, noshares, close * noshares as totalvalue FROM portfoliostock INNER JOIN rankedstock ON portfoliostock.code = rankedstock.code \
    WHERE row_num = 1 AND userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  // get portfolio market value
  const portfolioValue = await pool.query(
    "WITH RankedStock AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY code ORDER BY timestamp DESC) AS row_num FROM stock), PortfolioValues AS \
    (SELECT close, portfoliostock.code, noshares, close * noshares as totalvalue FROM portfoliostock INNER JOIN rankedstock ON portfoliostock.code = rankedstock.code \
    WHERE row_num = 1 AND userid = $1 AND portfolioid = $2) \
    SELECT SUM(totalvalue) AS portfoliovalue FROM portfoliovalues;",
    [user, portfolioId]
  );

  // get stock transaction history
  const stockHistory = await pool.query(
    "SELECT code, transact, noshares FROM stocktransaction WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  res.status(201).json({ message: "success", cash: cash.rows, stocks: stocks.rows, stockHistory: stockHistory.rows, portfolioValue: portfolioValue.rows});
});

// deposit in portfolio
app.post("/portfoliodeposit", async (req, res) => {
  const { user, portfolioId, deposit } = req.body;

  if (deposit < 0){
    return res.status(400).json({ message: "Error" });
  }
  // deposit
  try {
    await pool.query(
      "UPDATE portfolio SET cash = cash + $3 WHERE userid = $1 AND portfolioid = $2;",
      [user, portfolioId, deposit]
    );
    
    await pool.query(
      "INSERT INTO portfoliotransaction (userid, portfolioid, transact, amount) VALUES ($1, $2, 'deposit', $3)",
      [user, portfolioId, deposit]
    );
    res.status(201).json({ message: "success"});
  } catch (error) {
    res.status(401).json({ message: "fail"});
  }
  
});

// withdraw from portfolio
app.post("/portfoliowithdraw", async (req, res) => {
  const { user, portfolioId, withdraw } = req.body;

  if (withdraw < 0){
    return res.status(400).json({ message: "Error" });
  }
  // withdraw
  try {
    await pool.query(
      "UPDATE portfolio SET cash = cash - $3 WHERE userid = $1 AND portfolioid = $2;",
      [user, portfolioId, withdraw]
    );

    await pool.query(
      "INSERT INTO portfoliotransaction (userid, portfolioid, transact, amount) VALUES ($1, $2, 'withdraw', $3)",
      [user, portfolioId, withdraw]
    );
  
    res.status(201).json({ message: "success"});
  } catch (error) {
    res.status(401).json({ message: "fail"});
  }
  
});

// transfer from portfolio
app.post("/portfoliotransfer", async (req, res) => {
  const { user, portfolioId, transferAmount, transferPortfolio, } = req.body;

  if (transferAmount < 0 || portfolioId == transferPortfolio){
    return res.status(400).json({ message: "Error" });
  }
  
  // check if transferportfolio exists under user's portfolios
  const exists = await pool.query("SELECT * FROM portfolio WHERE userId = $1 AND portfolioid = $2", [
    user, transferPortfolio
  ]);

  // return fail if user doesn't have transferportfolio
  if (exists.rows.length === 0) {
    return res.status(400).json({ message: "fail" });
  }

  // transfer
  try {  
    // remove funds from transferportfolio
    await pool.query(
      "UPDATE portfolio SET cash = cash - $3 WHERE userid = $1 AND portfolioid = $2;",
      [user, transferPortfolio, transferAmount]
    );

    // add funds to portfolioid
    await pool.query(
      "UPDATE portfolio SET cash = cash + $3 WHERE userid = $1 AND portfolioid = $2;",
      [user, portfolioId, transferAmount]
    );

    await pool.query(
      "INSERT INTO portfoliotransaction (userid, portfolioid, transact, amount) VALUES ($1, $2, $3, $4)",
      [user, transferPortfolio, `transfer to ${portfolioId}`, transferAmount]
    );

    await pool.query(
      "INSERT INTO portfoliotransaction (userid, portfolioid, transact, amount) VALUES ($1, $2, $3, $4)",
      [user, portfolioId, `transfer from ${transferPortfolio}`, transferAmount]
    );
  
    res.status(201).json({ message: "success"});
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail"});
  }
  
});

// buy stock
app.post("/buystock", async (req, res) => {
  const { user, portfolioId, buyCode, buyShares } = req.body;

  if (buyShares <= 0){
    return res.status(400).json({ message: "Error" });
  }
  try {
    // get stock price
    const price = await pool.query(
      "SELECT close FROM stock WHERE code = $1 ORDER BY timestamp DESC LIMIT 1;",
      [buyCode]
    ); 

    const { close } = price.rows[0];

    // remove total amount from cash
    await pool.query(
      "UPDATE portfolio SET cash = cash - ($3::numeric * $4::numeric) WHERE userid = $1 AND portfolioid = $2;",
      [user, portfolioId, close, buyShares]
    );

    // check if portfolio already contains stock
    const exists = await pool.query("SELECT * FROM portfoliostock WHERE userId = $1 AND portfolioid = $2 AND code = $3", [
      user, portfolioId, buyCode
    ]);
  
    // return fail if user doesn't have transferportfolio
    if (exists.rows.length === 0) {
      // insert code and noshares
      await pool.query(
        "INSERT INTO portfoliostock (userid, portfolioid, code, noshares) VALUES ($1, $2, $3, $4);",
        [user, portfolioId, buyCode, buyShares]
      );
    } else {
      // update code and no shares
      await pool.query(
        "UPDATE portfoliostock SET noshares = noshares + $4 WHERE userid = $1 AND portfolioid = $2 AND code = $3;",
        [user, portfolioId, buyCode, buyShares]
      );
    }
  
    // insert to stock transaction
    await pool.query(
      "INSERT INTO stocktransaction (userid, portfolioid, code, transact, noshares) VALUES ($1, $2, $3, 'buy', $4);",
      [user, portfolioId, buyCode, buyShares]
    );

    res.status(201).json({ message: "success"});
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail"});
  }
  
});

// sell stock
app.post("/sellstock", async (req, res) => {
  const { user, portfolioId, sellCode, sellShares } = req.body;

  if (sellShares <= 0){
    return res.status(400).json({ message: "Error" });
  }
  try {
    // get stock price
    const price = await pool.query(
      "SELECT close FROM stock WHERE code = $1 ORDER BY timestamp DESC LIMIT 1;",
      [sellCode]
    ); 

    const { close } = price.rows[0];

    // remove shares from portfolio
    await pool.query("UPDATE portfoliostock SET noshares = noshares - $4 WHERE userid = $1 AND portfolioid = $2 AND code = $3;",
      [user, portfolioId, sellCode, sellShares]
    );

    // get number of shares after removal
    const amount = await pool.query("SELECT noshares FROM portfoliostock WHERE userid = $1 AND portfolioid = $2 AND code = $3;",
      [user, portfolioId, sellCode]
    );

    // delete row if number of shares is 0
    if (amount.rows[0].noshares == 0){
      await pool.query("DELETE FROM portfoliostock WHERE userid = $1 AND portfolioid = $2 AND code = $3",
        [user, portfolioId, sellCode]
      );
    }

    // add total amount to cash
    await pool.query(
      "UPDATE portfolio SET cash = cash + ($3::numeric * $4::numeric) WHERE userid = $1 AND portfolioid = $2;",
      [user, portfolioId, close, sellShares]
    );

    // insert to stock transaction
    await pool.query(
      "INSERT INTO stocktransaction (userid, portfolioid, code, transact, noshares) VALUES ($1, $2, $3, 'sell', $4);",
      [user, portfolioId, sellCode, sellShares]
    );

    res.status(201).json({ message: "success"});
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail"});
  }
  
});

// add stock
app.post("/addstock", async (req, res) => {
  const { addCode, timestamp, open, high, low, close, volume } = req.body;

  try {
    await pool.query(
      "INSERT INTO stock (code, timestamp, open, high, low, close, volume) VALUES ($1, $2, $3, $4, $5, $6, $7);",
      [addCode, timestamp, open, high, low, close, volume]
    );

    res.status(201).json({ message: "success"});
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail"});
  }
  
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

// Send friend request
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
      const user1 = senderId < receiverId ? senderId : receiverId;
      const user2 = senderId < receiverId ? receiverId : senderId;
      
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
      const user1 = senderId < receiverId ? senderId : receiverId;
      const user2 = senderId < receiverId ? receiverId : senderId;
      
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