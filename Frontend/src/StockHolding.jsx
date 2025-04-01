import "./StockHolding.css";
import { useState, useEffect } from "react";
import axios from "axios";

function StockHolding({ portfolioId }) {
  const user = localStorage.getItem("user");

  const [cash, setCash] = useState(0);
  const [buyCode, setBuyCode] = useState("");
  const [sellCode, setSellCode] = useState("");
  const [addCode, setAddCode] = useState("");
  const [stocks, setStocks] = useState([]);
  const [buyShares, setBuyShares] = useState(0);
  const [sellShares, setSellShares] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [sellError, setSellError] = useState("");
  const [addError, setAddError] = useState("");
  const [stockHistory, setStockHistory] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [open, setOpen] = useState(0);
  const [high, setHigh] = useState(0);
  const [low, setLow] = useState(0);
  const [close, setClose] = useState(0);
  const [volume, setVolume] = useState(0);


  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.post(
          "http://localhost:3001/stockholdings",
          {
            user,
            portfolioId,
          }
        );
        const { cash } = response.data.cash[0];
        const { stocks } = response.data;
        const { stockHistory } = response.data;
        const { portfolioValue } = response.data;
        setStocks(stocks);
        setCash(cash);
        setStockHistory(stockHistory);
        if (portfolioValue[0].portfoliovalue == null){
          setPortfolioValue(0);
        } else {
          setPortfolioValue(portfolioValue[0].portfoliovalue);
        }
        
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    };

    fetchPortfolios();
  }, [user, refresh]);

  function handleBuyStock(event) {
    event.preventDefault();
    axios
      .post("http://localhost:3001/buystock", {
        user,
        portfolioId,
        buyCode,
        buyShares,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
          setBuyError("");
        }
      })
      .catch((err) => {
        console.log(err);
        setBuyError("Error Buying");
      });
  }

  function handleSellStock(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/sellstock", {
        user,
        portfolioId,
        sellCode,
        sellShares,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
          setSellError("");
        }
      })
      .catch((err) => {
        console.log(err);
        setSellError("Error Selling");
      });
  }

  function handleAddStock(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/addstock", {
        addCode,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
          setAddError("");
        }
      })
      .catch((err) => {
        console.log(err);
        setAddError("Error Adding");
      });
  }

  return (
    <div className="body">
      <h2>Stock Holdings</h2>
      <h3>Portfolio Market Value: {portfolioValue}</h3>
      <h3>Total Cash: {cash}</h3>
      <ul>
        {stocks.length > 0 ? (
          stocks.map((stock) => (
            <div className="stock-container" key={stock.code}>
              <li
                className="stock"
                onClick={() => setSelectedPortfolio(stock.portfolioid)}
              >
                <div className="stock-center">
                  <div>Stock: {stock.code.toUpperCase()}</div>
                  <div>Number of Shares: {stock.noshares}</div>
                  <div>Current Stock Value: {stock.close}</div>
                  <div>Current Total Value: {stock.totalvalue}</div>
                </div>
              </li>
            </div>
          ))
        ) : (
          <p>No stocks found</p>
        )}
      </ul>
      <h3>Buy Stock</h3>
      <div className="input-container">
        <div className="shares-container">
          <div className="input">
            <input
              type="text"
              placeholder="Code"
              onChange={(e) => setBuyCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Number of Shares"
              onChange={(e) => setBuyShares(e.target.value)}
            />
          </div>
        </div>
        <div className="input-button" onClick={handleBuyStock}>
          Buy
        </div>
      </div>
      {buyError && <p className="error">{buyError}</p>}
      <h3>Sell Stock</h3>
      <div className="input-container">
        <div className="shares-container">
          <div className="input">
            <input
              type="text"
              placeholder="Code"
              onChange={(e) => setSellCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Number of Shares"
              onChange={(e) => setSellShares(e.target.value)}
            />
          </div>
        </div>
        <div className="input-button" onClick={handleSellStock}>
          Sell
        </div>
      </div>
      {sellError && <p className="error">{sellError}</p>}
      <h3>Enter Stock Information</h3>
      <div className="input-container">
        <div className="shares-container">
          <div className="input">
            <input
              type="text"
              placeholder="Code"
              onChange={(e) => setAddCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Timestamp (yyyy-mm-dd)"
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Open"
              onChange={(e) => setOpen(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="High"
              onChange={(e) => setHigh(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Low"
              onChange={(e) => setLow(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Close"
              onChange={(e) => setClose(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Volume"
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
        </div>
        <div className="input-button" onClick={handleAddStock}>
          Add
        </div>
      </div>
      {addError && <p className="error">{addError}</p>}
      <h3>Transaction History</h3>
      <ul>
        {stockHistory.length > 0 ? (
          stockHistory.map((transaction) => (
            <div>
              <li className="transactions">
                <div>
                  <div>Code: {transaction.code}</div>
                  <div>Transaction: {transaction.transact}</div>
                  <div>Number of Shares: {transaction.noshares}</div>
                </div>
              </li>
            </div>
          ))
        ) : (
          <p>No Transactions</p>
        )}
      </ul>
    </div>
  );
}

export default StockHolding;
