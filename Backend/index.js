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

    await pool.query("INSERT INTO portfolio (userId, portfolioId, cash) VALUES ($1, 'Default', 0)", [
      username
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
    const user = await pool.query(
      "SELECT * FROM users WHERE userId = $1 AND password = $2",
      [username, password]
    );

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

  res.status(201).json({
    message: "success",
    cash: cash.rows,
    cashHistory: cashHistory.rows,
  });
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
  for (const stock of stocks.rows) {
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

  res.status(201).json({
    message: "success",
    cash: cash.rows,
    stocks: stocks.rows,
    stockHistory: stockHistory.rows,
    portfolioValue: portfolioValue,
  });
});

// get portfolio statistics
app.post("/portfoliostatistics", async (req, res) => {
  const { user, portfolioId, startDate, endDate } = req.body;

  function generateCovarianceSelect(codes) {
    const selects = [];
    for (let i = 0; i < codes.length; i++) {
      for (let j = i; j < codes.length; j++) {
        const code1 = codes[i];
        const code2 = codes[j];
        selects.push(`COVAR_SAMP("${code1}", "${code2}") AS "${code1}__${code2}"`);
      }
    }
    return selects.join(",\n");
  }

  function generateCorrelationSelect(codes) {
    const selects = [];
    for (let i = 0; i < codes.length; i++) {
      for (let j = i; j < codes.length; j++) {
        const code1 = codes[i];
        const code2 = codes[j];
        selects.push(`CORR("${code1}", "${code2}") AS "${code1}__${code2}"`);
      }
    }
    return selects.join(",\n");
  }
  
  try {
    // get stocks
    const stocks = await pool.query(
      "SELECT code, noshares FROM portfoliostock WHERE userid = $1 AND portfolioid = $2;",
      [user, portfolioId]
    );

    for (const stock of stocks.rows) {
      const cov = await pool.query(
        "SELECT STDDEV_SAMP (close)/AVG(close) as cov FROM stock WHERE code = $1 AND timestamp BETWEEN $2  AND $3;",
        [stock.code, startDate, endDate]
      );

      const beta = await pool.query(
        "SELECT CORR(close, totalclose) AS beta FROM marketperformance JOIN stock ON marketperformance.timestamp = stock.timestamp WHERE code = $1 AND stock.timestamp BETWEEN $2 AND $3;",
        [stock.code, startDate, endDate]
      );

      stock.cov = cov.rows[0].cov;
      stock.beta = beta.rows[0].beta;
    }

    const codes = stocks.rows.map((row) => row.code);


    const covResult = await pool.query(`
      WITH pivoted AS (
        SELECT
          timestamp,
          ${codes
            .map(
              (code) =>
                `MAX(CASE WHEN code = '${code}' THEN close END) AS "${code}"`
            )
            .join(",\n")}
        FROM stock
        WHERE code = ANY($1) AND timestamp BETWEEN $2 AND $3
        GROUP BY timestamp
      )
      SELECT ${generateCovarianceSelect(codes)} FROM pivoted;
    `, [codes, startDate, endDate]);

    const covMatrix = {};
    for (let row of covResult.rows) {
      for (let key in row) {
        const [code1, code2] = key.split("__");
        if (!covMatrix[code1]) covMatrix[code1] = {};
        covMatrix[code1][code2] = row[key];
      }
    }

    const corResult = await pool.query(`
      WITH pivoted AS (
        SELECT
          timestamp,
          ${codes
            .map(
              (code) =>
                `MAX(CASE WHEN code = '${code}' THEN close END) AS "${code}"`
            )
            .join(",\n")}
        FROM stock
        WHERE code = ANY($1) AND timestamp BETWEEN $2 AND $3
        GROUP BY timestamp
      )
      SELECT ${generateCorrelationSelect(codes)} FROM pivoted;
    `, [codes, startDate, endDate]);

    const corMatrix = {};
    for (let row of corResult.rows) {
      for (let key in row) {
        const [code1, code2] = key.split("__");
        if (!corMatrix[code1]) corMatrix[code1] = {};
        corMatrix[code1][code2] = row[key];
      }
    }

    res.status(201).json({ message: "success", stocks: stocks.rows, covMatrix, corMatrix });
    
  } catch (error) {
    console.log(error.message);
    res.status(401).json({ message: "fail" });
  }
});

// deposit in portfolio
app.post("/portfoliodeposit", async (req, res) => {
  const { user, portfolioId, deposit } = req.body;

  if (deposit < 0) {
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
    res.status(201).json({ message: "success" });
  } catch (error) {
    res.status(401).json({ message: "fail" });
  }
});

// withdraw from portfolio
app.post("/portfoliowithdraw", async (req, res) => {
  const { user, portfolioId, withdraw } = req.body;

  if (withdraw < 0) {
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

    res.status(201).json({ message: "success" });
  } catch (error) {
    res.status(401).json({ message: "fail" });
  }
});

// transfer from portfolio
app.post("/portfoliotransfer", async (req, res) => {
  const { user, portfolioId, transferAmount, transferPortfolio } = req.body;

  if (transferAmount < 0 || portfolioId == transferPortfolio) {
    return res.status(400).json({ message: "Error" });
  }

  // check if transferportfolio exists under user's portfolios
  const exists = await pool.query(
    "SELECT * FROM portfolio WHERE userId = $1 AND portfolioid = $2",
    [user, transferPortfolio]
  );

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

    res.status(201).json({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail" });
  }
});

// buy stock
app.post("/buystock", async (req, res) => {
  const { user, portfolioId, buyCode, buyShares } = req.body;

  if (buyShares <= 0) {
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
    const exists = await pool.query(
      "SELECT * FROM portfoliostock WHERE userId = $1 AND portfolioid = $2 AND code = $3",
      [user, portfolioId, buyCode]
    );

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

    res.status(201).json({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail" });
  }
});

// sell stock
app.post("/sellstock", async (req, res) => {
  const { user, portfolioId, sellCode, sellShares } = req.body;

  if (sellShares <= 0) {
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
    await pool.query(
      "UPDATE portfoliostock SET noshares = noshares - $4 WHERE userid = $1 AND portfolioid = $2 AND code = $3;",
      [user, portfolioId, sellCode, sellShares]
    );

    // get number of shares after removal
    const amount = await pool.query(
      "SELECT noshares FROM portfoliostock WHERE userid = $1 AND portfolioid = $2 AND code = $3;",
      [user, portfolioId, sellCode]
    );

    // delete row if number of shares is 0
    if (amount.rows[0].noshares == 0) {
      await pool.query(
        "DELETE FROM portfoliostock WHERE userid = $1 AND portfolioid = $2 AND code = $3",
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

    res.status(201).json({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail" });
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

    await pool.query("REFRESH MATERIALIZED VIEW marketperformance;")

    res.status(201).json({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "fail" });
  }
});

//To remove FriendCooldown
setInterval(async () => {
  try {
    await pool.query(
      "DELETE FROM FriendCooldown WHERE created_at < NOW() - INTERVAL '5 minutes'"
    );
    console.log(`Cleaned expired cooldowns`);
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}, 300000); // 4min 59sec

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
      return res.json({ status: "already_friends" });
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
      return res.json({ status: "outgoing_request_exists" });
    }

    if (incomingRequest.rows.length > 0) {
      return res.json({ status: "incoming_request_exists" });
    }

    res.json({ status: "no_relationship" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/send-friend-request", async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    // Check if trying to add self
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself" });
    }

    // Check if receiver exists
    const receiverExists = await pool.query(
      "SELECT * FROM users WHERE userId = $1",
      [receiverId]
    );

    if (receiverExists.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for active cooldown (must be placed before other checks)
    const cooldown = await pool.query(
      `SELECT created_at FROM FriendCooldown 
       WHERE userA = $1 AND userB = $2
       AND created_at > NOW() - INTERVAL '30 seconds'`,
      [senderId, receiverId]
    );

    if (cooldown.rows.length > 0) {
      return res.status(400).json({
        message:
          "You must wait 5 minutes after rejection/removal before sending another request",
      });
    }
    //Remove if exists
    await pool.query(
      "DELETE FROM FriendCooldown WHERE userA = $1 AND userB = $2",
      [senderId, receiverId]
    );

    // Check if already friends
    const alreadyFriends = await pool.query(
      "SELECT * FROM FriendsWith WHERE (user1 = $1 AND user2 = $2) OR (user1 = $2 AND user2 = $1)",
      [senderId, receiverId]
    );

    if (alreadyFriends.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
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
      const user1 =
        senderId.localeCompare(receiverId) < 0 ? senderId : receiverId;
      const user2 =
        senderId.localeCompare(receiverId) < 0 ? receiverId : senderId;

      await pool.query(
        "INSERT INTO FriendsWith (user1, user2) VALUES ($1, $2)",
        [user1, user2]
      );

      return res.json({
        message: "Friend request accepted! You are now friends.",
      });
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

    if (action === "accept") {
      // Create friendship (ensuring user1 < user2)
      const user1 =
        senderId.localeCompare(receiverId) < 0 ? senderId : receiverId;
      const user2 =
        senderId.localeCompare(receiverId) < 0 ? receiverId : senderId;

      await pool.query(
        "INSERT INTO FriendsWith (user1, user2) VALUES ($1, $2)",
        [user1, user2]
      );
    }

    if (action === "decline") {
      // Rule is UserA can never send friend request to userB
      await pool.query(
        "INSERT INTO FriendCooldown (userA, userB) VALUES ($1, $2)",
        [senderId, receiverId]
      );
    }

    // Delete the request in either case
    await pool.query(
      "DELETE FROM FriendRequest WHERE senderId = $1 AND receiverId = $2",
      [senderId, receiverId]
    );

    res.json({
      message:
        action === "accept"
          ? "Friend request accepted"
          : "Friend request declined",
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
    //Make sure to keep the rule UserA cannot send friendrequest to userB
    await pool.query(
      "INSERT INTO FriendCooldown (userA, userB) VALUES ($1, $2)",
      [friendId, userId]
    );

    // 3. Remove all stocklist shares between these users in both directions
    await pool.query(
      `DELETE FROM StockListShare
       WHERE (userId = $1 AND stocklistid IN (
         SELECT stocklistid FROM StockList WHERE userId = $2 AND visibility = 'friend'
       ))
       OR (userId = $2 AND stocklistid IN (
         SELECT stocklistid FROM StockList WHERE userId = $1 AND visibility = 'friend'
       ))`,
      [userId, friendId]
    );

    res.json({
      message: "Friend removed successfully, stocklist sharing removed as well",
    });
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

app.post("/cleanup-cooldowns", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM FriendCooldown WHERE created_at < NOW() - INTERVAL '5 minutes'"
    );
    res.json({ message: "Old cooldowns cleaned up" });
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
      stocklistid: nextId, // Changed to lowercase
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a stocklist
app.delete("/stocklists", async (req, res) => {
  const { userId, stocklistid } = req.body; // Changed to lowercase

  try {
    // Verify the stocklist belongs to the user
    const verifyResult = await pool.query(
      "SELECT * FROM stocklist WHERE userId = $1 AND stocklistid = $2",
      [userId, stocklistid] // Changed to lowercase
    );

    if (verifyResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Stocklist not found or not owned by user" });
    }

    // Delete the stocklist
    await pool.query("DELETE FROM stocklist WHERE stocklistid = $1", [
      stocklistid,
    ]);

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

app.get("/portfoliostock", async (req, res) => {
  const { userid, portfolioid } = req.query;

  try {
    const result = await pool.query(
      "SELECT code, noShares FROM portfoliostock WHERE userId = $1 AND portfolioid = $2",
      [userid, portfolioid]
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
      return res
        .status(404)
        .json({ error: "Stock not found in this stocklist" });
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
    const formattedData = result.rows.map((row) => ({
      ...row,
      timestamp: row.timestamp.toISOString().split("T")[0],
    }));

    res.json(formattedData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/predict-stock", async (req, res) => {
  const { code, start, days } = req.query;

  try {
    const result = await pool.query(
      `SELECT timestamp, close 
       FROM stock 
       WHERE code = $1 
       ORDER BY timestamp`,
      [code]
    );

    const rows = result.rows;

    if (!rows.length) {
      return res.status(404).json({ error: "No data found for stock." });
    }

    // Validate prediction date is after the latest known date
    const latestAvailableDate = new Date(rows[rows.length - 1].timestamp);
    const startDate = new Date(start);

    if (startDate < latestAvailableDate) {
      return res.status(400).json({
        error: `Prediction date must be after ${
          latestAvailableDate.toISOString().split("T")[0]
        }`,
      });
    }

    // Convert timestamp to a numerical value for regression
    const x = rows.map((row) => new Date(row.timestamp).getTime());
    const y = rows.map((row) => parseFloat(row.close));

    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    // Calculate slope using: B1= SSXY/SSXX, B0 = ybar -B1x_bar
    const SSXY = x.reduce(
      (sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean),
      0
    );
    const SSXX = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    const B1 = SSXY / SSXX;
    const B0 = yMean - B1 * xMean;

    // Generate predictions
    const predictions = [];

    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const time = date.getTime(); // x-value
      const predicted = B1 * time + B0; // y = B1x + B0

      predictions.push({
        timestamp: date.toISOString().split("T")[0],
        predictedClose: predicted,
      });
    }

    res.json(predictions);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Prediction server error" });
  }
});

// Review Stuff

// Check if two users are friends
app.get("/check-friendship", async (req, res) => {
  const { user1, user2 } = req.query;

  try {
    const result = await pool.query(
      `SELECT 1 FROM FriendsWith 
           WHERE (user1 = $1 AND user2 = $2) OR (user1 = $2 AND user2 = $1)`,
      [user1, user2]
    );

    res.json({ isFriend: result.rows.length > 0 });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Share a stocklist with a user
app.post("/share-stocklist", async (req, res) => {
  const { stocklistId, userId } = req.body;

  try {
    // Check if the stocklist exists and is shareable
    const stocklist = await pool.query(
      "SELECT userId, visibility FROM stocklist WHERE stocklistid = $1",
      [stocklistId]
    );

    if (stocklist.rows.length === 0) {
      return res.status(404).json({ error: "Stocklist not found" });
    }

    if (stocklist.rows[0].visibility !== "friend") {
      return res.status(400).json({
        error: "Only stocklists with 'friend' visibility can be shared",
      });
    }

    // Check if already shared
    const alreadyShared = await pool.query(
      "SELECT 1 FROM stocklistshare WHERE stocklistid = $1 AND userId = $2",
      [stocklistId, userId]
    );

    if (alreadyShared.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Stocklist already shared with this user" });
    }

    // Share the stocklist
    await pool.query(
      "INSERT INTO stocklistshare (stocklistid, userId) VALUES ($1, $2)",
      [stocklistId, userId]
    );

    res.json({ message: "Stocklist shared successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Unshare a stocklist with a user
app.post("/unshare-stocklist", async (req, res) => {
  const { stocklistId, userId } = req.body;

  try {
    const result = await pool.query(
      "DELETE FROM stocklistshare WHERE stocklistid = $1 AND userId = $2",
      [stocklistId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Share relationship not found" });
    }

    res.json({ message: "Stocklist unshared successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Fetches stocklists owned by the user that have 'friend' visibility (can be shared).
app.get("/stocklists-shareable", async (req, res) => {
  const { userId } = req.query;

  try {
    const result = await pool.query(
      "SELECT * FROM stocklist WHERE userId = $1 AND visibility = 'friend'",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get users a stocklist is shared with
app.get("/stocklist-shared-users", async (req, res) => {
  const { stocklistId } = req.query;

  try {
    const result = await pool.query(
      "SELECT userId FROM stocklistshare WHERE stocklistid = $1",
      [stocklistId]
    );
    res.json(result.rows.map((row) => row.userid));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//For Public Stocklist Stuff

//Fetches the user's own public stocklists with embedded review data.
// Get user's public stocklists with reviews
app.get("/stocklists-public", async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      `SELECT s.stocklistid, s.userid, 
       (SELECT json_agg(r) FROM reviews r WHERE r.stocklist_id = s.stocklistid) as reviews
       FROM stocklist s
       WHERE s.userid = $1 AND s.visibility = 'public'`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all other public stocklists
app.get("/stocklists-public-others", async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      `SELECT s.stocklistid, s.userid
       FROM stocklist s
       WHERE s.userid != $1 AND s.visibility = 'public'`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Gets all reviews written by the current user.
// Get user's existing reviews
app.get("/user-reviews", async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      `SELECT stocklist_id, review_text, review_id 
       FROM reviews 
       WHERE reviewer_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Create/Update Review - Updated to allow friend-visibility stocklists
app.post("/reviews", async (req, res) => {
  const { stocklistId, userId, reviewText, reviewId } = req.body;

  try {
    // Verify stocklist exists and user has permission
    //is_shared_with_user returns true iff the user the stocklist is shared to the user.
    const stocklist = await pool.query(
      `SELECT s.userid, s.visibility, 
       EXISTS (
         SELECT 1 FROM stocklistshare 
         WHERE stocklistid = $1 AND userid = $2
       ) as is_shared_with_user
       FROM stocklist s
       WHERE s.stocklistid = $1`,
      [stocklistId, userId]
    );

    if (stocklist.rows.length === 0) {
      return res.status(404).json({ error: "Stocklist not found" });
    }

    const stocklistData = stocklist.rows[0];

    // Allow review if:
    // 1. Stocklist is public, OR
    // 2. Stocklist is friend-visibility AND shared with user
    if (
      stocklistData.visibility !== "public" &&
      !(
        stocklistData.visibility === "friend" &&
        stocklistData.is_shared_with_user
      )
    ) {
      return res.status(403).json({
        error:
          "You can only review public stocklists or stocklists shared with you",
      });
    }

    if (stocklistData.userid === userId) {
      return res
        .status(403)
        .json({ error: "Cannot review your own stocklist" });
    }

    if (reviewId) {
      // Update existing review
      await pool.query(
        "UPDATE reviews SET review_text = $1 WHERE review_id = $2 AND reviewer_id = $3",
        [reviewText, reviewId, userId]
      );
    } else {
      // Create new review
      await pool.query(
        `INSERT INTO reviews (stocklist_id, reviewer_id, creator_id, review_text)
         VALUES ($1, $2, $3, $4)`,
        [stocklistId, userId, stocklistData.userid, reviewText]
      );
    }

    res.json({ message: "Review saved successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete Review - Updated to work with shared stocklists
app.delete("/reviews", async (req, res) => {
  const { reviewId, currentUserId } = req.body;

  try {
    // Verify review exists and user has permission
    const review = await pool.query(
      `SELECT r.reviewer_id, s.userid as creator_id
       FROM reviews r
       JOIN stocklist s ON r.stocklist_id = s.stocklistid
       WHERE r.review_id = $1`,
      [reviewId]
    );

    if (review.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Allow delete if:
    // 1. User is the reviewer, OR
    // 2. User is the creator of the stocklist
    if (
      review.rows[0].reviewer_id !== currentUserId &&
      review.rows[0].creator_id !== currentUserId
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this review" });
    }

    await pool.query("DELETE FROM reviews WHERE review_id = $1", [reviewId]);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all reviews for a public stocklist (visible to everyone)
app.get("/public-stocklist-reviews", async (req, res) => {
  const { stocklistId } = req.query;

  try {
    // First verify the stocklist is public
    const stocklist = await pool.query(
      "SELECT visibility FROM stocklist WHERE stocklistid = $1",
      [stocklistId]
    );

    if (stocklist.rows.length === 0) {
      return res.status(404).json({ error: "Stocklist not found" });
    }

    if (stocklist.rows[0].visibility !== "public") {
      return res
        .status(403)
        .json({ error: "Only public stocklist reviews are visible" });
    }

    // Get all reviews for this public stocklist
    const result = await pool.query(
      `SELECT r.review_id, r.reviewer_id, r.review_text, u.userId as reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.userId
       WHERE r.stocklist_id = $1`,
      [stocklistId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all reviews for a specific stocklist
// Gets all reviews for a specific stocklist (must be of type friend) after verifying access.
app.get("/stocklist-reviews", async (req, res) => {
  const { stocklistId, userId } = req.query;

  try {
    // Verify stocklist exists and user has permission
    const stocklist = await pool.query(
      `SELECT s.visibility, s.userid as owner_id,
       EXISTS (
         SELECT 1 FROM stocklistshare 
         WHERE stocklistid = $1 AND userid = $2
       ) as is_shared_with_user
       FROM stocklist s
       WHERE s.stocklistid = $1`,
      [stocklistId, userId]
    );

    if (stocklist.rows.length === 0) {
      return res.status(404).json({ error: "Stocklist not found" });
    }

    const stocklistData = stocklist.rows[0];

    // Allow access if:
    // 1. Stocklist is public, OR
    // 2. Stocklist is shared with user (friend visibility), OR
    // 3. User is the owner of the stocklist
    if (
      stocklistData.visibility !== "public" &&
      !(
        stocklistData.visibility === "friend" &&
        stocklistData.is_shared_with_user
      ) &&
      stocklistData.owner_id !== userId
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to view these reviews" });
    }

    const result = await pool.query(
      `SELECT r.review_id, r.reviewer_id, r.review_text, u.userId as reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.userId
       WHERE r.stocklist_id = $1
       ORDER BY r.review_id DESC`,
      [stocklistId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// For sharing stuff

//Fetches unique (DISTINCT) stocklists the user has shared with others.
app.get("/stocklists-shared-by-user", async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      `SELECT DISTINCT s.stocklistid, s.userid as owner_id, s.visibility
       FROM stocklist s
       JOIN stocklistshare sh ON s.stocklistid = sh.stocklistid
       WHERE s.userid = $1 AND s.visibility = 'friend'`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Fetches stocklists shared  to the current user
app.get("/stocklists-shared-with-user", async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query(
      `SELECT s.stocklistid, s.userid as owner_id
       FROM stocklist s
       JOIN stocklistshare sh ON s.stocklistid = sh.stocklistid
       WHERE sh.userid = $1 AND s.visibility = 'friend'`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get stocklist stock by id (NOT DEPENDENT BY USER like stockliststock)
app.get("/stockliststock-by-id", async (req, res) => {
  const { stocklistid } = req.query;

  try {
    const result = await pool.query(
      "SELECT code, noShares FROM stockliststock WHERE stocklistid = $1",
      [stocklistid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/stock-latest-price", async (req, res) => {
  const { code } = req.query;

  try {
    const result = await pool.query(
      `SELECT close FROM stock 
           WHERE code = $1 
           ORDER BY timestamp DESC 
           LIMIT 1`,
      [code]
    );
    res.json(result.rows[0] || { close: 0 });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});


app.post("/stockstatistics", async (req, res) => {
  const { stocklistId, startDate, endDate } = req.body;

  function generateCovarianceSelect(codes) {
    const selects = [];
    for (let i = 0; i < codes.length; i++) {
      for (let j = i; j < codes.length; j++) {
        const code1 = codes[i];
        const code2 = codes[j];
        selects.push(`COVAR_SAMP("${code1}", "${code2}") AS "${code1}__${code2}"`);
      }
    }
    return selects.join(",\n");
  }

  function generateCorrelationSelect(codes) {
    const selects = [];
    for (let i = 0; i < codes.length; i++) {
      for (let j = i; j < codes.length; j++) {
        const code1 = codes[i];
        const code2 = codes[j];
        selects.push(`CORR("${code1}", "${code2}") AS "${code1}__${code2}"`);
      }
    }
    return selects.join(",\n");
  }
  
  try {
    // get stocks from stocklist
    const stocks = await pool.query(
      "SELECT code, noshares FROM stockliststock WHERE stocklistid = $1;",
      [stocklistId]
    );

    for (const stock of stocks.rows) {
      const cov = await pool.query(
        "SELECT STDDEV_SAMP (close)/AVG(close) as cov FROM stock WHERE code = $1 AND timestamp BETWEEN $2 AND $3;",
        [stock.code, startDate, endDate]
      );

      const beta = await pool.query(
        "SELECT CORR(close, totalclose) AS beta FROM marketperformance JOIN stock ON marketperformance.timestamp = stock.timestamp WHERE code = $1 AND stock.timestamp BETWEEN $2 AND $3;",
        [stock.code, startDate, endDate]
      );

      stock.cov = cov.rows[0].cov;
      stock.beta = beta.rows[0].beta;
    }

    const codes = stocks.rows.map((row) => row.code);

    if (codes.length < 1) {
      return res.status(201).json({ 
        message: "success", 
        stocks: stocks.rows, 
        covMatrix: {}, 
        corMatrix: {} 
      });
    }

    const covResult = await pool.query(`
      WITH pivoted AS (
        SELECT
          timestamp,
          ${codes.map(code => `MAX(CASE WHEN code = '${code}' THEN close END) AS "${code}"`).join(",\n")}
        FROM stock
        WHERE code = ANY($1) AND timestamp BETWEEN $2 AND $3
        GROUP BY timestamp
      )
      SELECT ${generateCovarianceSelect(codes)} FROM pivoted;
    `, [codes, startDate, endDate]);

    const covMatrix = {};
    for (let row of covResult.rows) {
      for (let key in row) {
        const [code1, code2] = key.split("__");
        if (!covMatrix[code1]) covMatrix[code1] = {};
        covMatrix[code1][code2] = row[key];
      }
    }

    const corResult = await pool.query(`
      WITH pivoted AS (
        SELECT
          timestamp,
          ${codes.map(code => `MAX(CASE WHEN code = '${code}' THEN close END) AS "${code}"`).join(",\n")}
        FROM stock
        WHERE code = ANY($1) AND timestamp BETWEEN $2 AND $3
        GROUP BY timestamp
      )
      SELECT ${generateCorrelationSelect(codes)} FROM pivoted;
    `, [codes, startDate, endDate]);

    const corMatrix = {};
    for (let row of corResult.rows) {
      for (let key in row) {
        const [code1, code2] = key.split("__");
        if (!corMatrix[code1]) corMatrix[code1] = {};
        corMatrix[code1][code2] = row[key];
      }
    }

    res.status(201).json({ message: "success", stocks: stocks.rows, covMatrix, corMatrix });
    
  } catch (error) {
    console.log(error.message);
    res.status(401).json({ message: "fail" });
  }
});