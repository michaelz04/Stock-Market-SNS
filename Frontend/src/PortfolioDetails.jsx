import { useState, useEffect } from "react";
import "./PortfolioDetails.css";
import axios from "axios";

function PortfolioDetails({ portfolioId, onBack }) {
  const user = localStorage.getItem("user");

  const [cash, setCash] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [withdraw, setWithdraw] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [code, setCode] = useState("");
  const [noshares, setNoshares] = useState(0);

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

  function handleDeposit(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/portfoliodeposit", {
        user,
        portfolioId,
        deposit,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function handleWithdraw(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/portfoliowithdraw", {
        user,
        portfolioId,
        withdraw,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function handleBuyStock(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/buystock", {
        user,
        portfolioId,
        noshares,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div className="portfolio-details">
      <h1>Portfolio: {portfolioId}</h1>
      <div className="body">
        <h2>Cash Account</h2>
        <div>Cash: {cash}</div>
        <div className="input-container">
          <div className="input">
            <input
              type="text"
              placeholder="Deposit"
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
          <div className="input-button" onClick={handleDeposit}>
            Deposit
          </div>
        </div>

        <div className="input-container">
          <div className="input">
            <input
              type="text"
              placeholder="Withdraw"
              onChange={(e) => setWithdraw(e.target.value)}
            />
          </div>
          <div className="input-button" onClick={handleWithdraw}>
            Withdraw
          </div>
        </div>
        <h2>Stock Holdings</h2>
        <div>Portfolio Market Value:</div>
        <ul>
          {stocks.length > 0 ? (
            stocks.map((stock) => (
              <div className="portfolio-container" key={stock.code}>
                <li
                  className="portfolios"
                  onClick={() => setSelectedPortfolio(portfolio.portfolioid)}
                >
                  <div className="portfolio-center">
                    <div>Portfolio: {portfolio.portfolioid}</div>
                    <div>Cash: {portfolio.cash}</div>
                  </div>
                </li>
                <div
                  className="delete-portfolio"
                  onClick={() => handleDeletePortfolio(portfolio.portfolioid)}
                >
                  Delete
                </div>
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
                onChange={(e) => setCode(e.target.value)}
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

        <div className="back" onClick={onBack}>
          Back to Portfolios
        </div>
      </div>
    </div>
  );
}

export default PortfolioDetails;
