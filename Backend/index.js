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
    "SELECT code, noshares FROM portfoliostock WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  let portfolioValue = 0;
  for (const stock of stocks.rows){
    const close = await pool.query(
      "SELECT close FROM stock WHERE code = $1 ORDER BY timestamp DESC LIMIT 1",
      [stock.code]
    );

    stock.close = close.rows[0].close;
    stock.totalvalue = close.rows[0].close * stock.noshares;
    portfolioValue += stock.totalvalue;
  }

  // get stock transaction history
  const stockHistory = await pool.query(
    "SELECT code, transact, noshares FROM stocktransaction WHERE userid = $1 AND portfolioid = $2;",
    [user, portfolioId]
  );

  res.status(201).json({ message: "success", cash: cash.rows, stocks: stocks.rows, stockHistory: stockHistory.rows, portfolioValue: portfolioValue});
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

// Get all stocklists for a user
app.get("/stocklists", async (req, res) => {
  const { userId } = req.query;

  try {
    const result = await pool.query(
      "SELECT * FROM stocklist WHERE userId = $1",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new stocklist
app.post("/stocklists", async (req, res) => {
  const { userId, visibility } = req.body;

  try {
    // Get the next available stocklistid
    const maxIdResult = await pool.query(
      "SELECT COALESCE(MAX(stocklistid), 0) + 1 AS next_id FROM stocklist"
    );
    const nextId = maxIdResult.rows[0].next_id;

    await pool.query(
      "INSERT INTO stocklist (userId, stocklistid, visibility) VALUES ($1, $2, $3)",
      [userId, nextId, visibility]
    );

    res.status(201).json({ 
      message: "Stocklist created successfully",
      stocklistid: nextId  // Changed to lowercase
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a stocklist
app.delete("/stocklists", async (req, res) => {
  const { userId, stocklistid } = req.body;  // Changed to lowercase

  try {
    // Verify the stocklist belongs to the user
    const verifyResult = await pool.query(
      "SELECT * FROM stocklist WHERE userId = $1 AND stocklistid = $2",
      [userId, stocklistid]  // Changed to lowercase
    );

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: "Stocklist not found or not owned by user" });
    }

    // Delete the stocklist
    await pool.query(
      "DELETE FROM stocklist WHERE stocklistid = $1",
      [stocklistid]  
    );

    res.json({ message: "Stocklist deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/stockliststock", async (req, res) => {
  const { userId, stocklistid } = req.query;

  try {
    const result = await pool.query(
      "SELECT code, noShares FROM stockliststock WHERE userId = $1 AND stocklistid = $2",
      [userId, stocklistid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/stockliststock", async (req, res) => {
  const { userId, stocklistid, code, noShares } = req.body;

  try {
    // Check if stock exists in S&P 500 data
    const stockExists = await pool.query(
      "SELECT 1 FROM stock WHERE code = $1 LIMIT 1",
      [code]
    );
    if (stockExists.rows.length === 0) {
      return res.status(400).json({ error: "Invalid stock code" });
    }

    // Check if stock already exists in the stocklist
    const existingStock = await pool.query(
      "SELECT noShares FROM stockliststock WHERE userId = $1 AND stocklistid = $2 AND code = $3",
      [userId, stocklistid, code]
    );

    if (existingStock.rows.length > 0) {
      // Update existing shares
      await pool.query(
        "UPDATE stockliststock SET noShares = noShares + $1 WHERE userId = $2 AND stocklistid = $3 AND code = $4",
        [noShares, userId, stocklistid, code]
      );
    } else {
      // Add new stock
      await pool.query(
        "INSERT INTO stockliststock (userId, stocklistid, code, noShares) VALUES ($1, $2, $3, $4)",
        [userId, stocklistid, code, noShares]
      );
    }

    res.status(200).json({ message: "Stock added/updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/stockliststock", async (req, res) => {
  const { userId, stocklistid, code, sharesToSell } = req.body;

  try {
    // Check current shares
    const currentShares = await pool.query(
      "SELECT noShares FROM stockliststock WHERE userId = $1 AND stocklistid = $2 AND code = $3",
      [userId, stocklistid, code]
    );

    if (currentShares.rows.length === 0) {
      return res.status(404).json({ error: "Stock not found in this stocklist" });
    }

    const currentNoShares = currentShares.rows[0].noshares;
    if (sharesToSell > currentNoShares) {
      return res.status(400).json({ error: "Not enough shares to sell" });
    }

    if (sharesToSell === currentNoShares) {
      // Delete if selling all shares
      await pool.query(
        "DELETE FROM stockliststock WHERE userId = $1 AND stocklistid = $2 AND code = $3",
        [userId, stocklistid, code]
      );
    } else {
      // Update shares
      await pool.query(
        "UPDATE stockliststock SET noShares = noShares - $1 WHERE userId = $2 AND stocklistid = $3 AND code = $4",
        [sharesToSell, userId, stocklistid, code]
      );
    }

    res.json({ message: "Stock sold successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/stockliststock", async (req, res) => {
  const { userId, stocklistid, code } = req.body;

  try {
    await pool.query(
      "DELETE FROM stockliststock WHERE userId = $1 AND stocklistid = $2 AND code = $3",
      [userId, stocklistid, code]
    );
    res.json({ message: "Stock deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/stocklist-value", async (req, res) => {
  const { userId, stocklistid } = req.query;

  try {
    // Get all stocks in the stocklist with shares
    const stocklistStocks = await pool.query(
      "SELECT code, noShares FROM stockliststock WHERE userId = $1 AND stocklistid = $2",
      [userId, stocklistid]
    );

    if (stocklistStocks.rows.length === 0) {
      return res.json({ stocklistValue: 0 });
    }

    // Calculate value for each stock and sum
    let stocklistValue = 0;
    for (const stock of stocklistStocks.rows) {
      const latestPrice = await pool.query(
        `SELECT close FROM stock 
         WHERE code = $1 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [stock.code]
      );
      
      if (latestPrice.rows.length > 0) {
        stocklistValue += latestPrice.rows[0].close * stock.noshares;
      }
    }

    res.json({ stocklistValue: stocklistValue.toFixed(2) });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/stock-history", async (req, res) => {
  const { code, start, end } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT timestamp, close 
       FROM stock 
       WHERE code = $1 
       AND timestamp BETWEEN $2 AND $3 
       ORDER BY timestamp`,
      [code, start, end]
    );
    
    // Format dates to YYYY-MM-DD explicitly
    const formattedData = result.rows.map(row => ({
      ...row,
      timestamp: row.timestamp.toISOString().split('T')[0] 
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});