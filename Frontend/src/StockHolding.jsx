import "./StockHolding.css";
import { useState, useEffect } from "react";
import axios from "axios";

function StockHolding({ portfolioId }) {
  const user = localStorage.getItem("user");

  const [cash, setCash] = useState(0);
  const [code, setCode] = useState("");
  const [stocks, setStocks] = useState([]);
  const [noshares, setNoshares] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [buyError, setBuyError] = useState("");

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.post(
          "http://localhost:3001/portfoliodetails",
          {
            user,
            portfolioId,
          }
        );
        const { cash } = response.data.cash[0];
        const { stocks } = response.data;
        setStocks(stocks);
        setCash(cash);
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
        code,
        noshares,
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

  return (
    <div className="body">
      <h2>Stock Holdings</h2>
      <h3>Portfolio Market Value:</h3>
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
                  <div>Current Stock Value: </div>
                  <div>Current Total Value: </div>
                </div>
              </li>
            </div>
          ))
        ) : (
          <p>No stocks found</p>
        )}
      </ul>
      <div className="input-container">
        <div className="shares-container">
          <div className="input">
            <input
              type="text"
              placeholder="Code"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="Number of Shares"
              onChange={(e) => setNoshares(e.target.value)}
            />
          </div>
        </div>
        <div className="input-button" onClick={handleBuyStock}>
          Buy
        </div>
      </div>
      {buyError && <p className="error">{buyError}</p>}
      <h3>Transaction History</h3>
    </div>
  );
}

export default StockHolding;
