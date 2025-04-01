import { useState, useEffect } from "react";
import "./Portfolio.css";
import axios from "axios";
import PortfolioDetails from "./PortfolioDetails";

function Portfolio() {
  const user = localStorage.getItem("user");

  const [cash, setCash] = useState(0);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolios, setPortfolios] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [error, setError] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.post("http://localhost:3001/portfolio", {
          user,
        });
        setPortfolios(response.data.portfolios);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    };

    fetchPortfolios();
  }, [user, refresh]);

  function handleCreatePortfolio(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/createportfolio", {
        user,
        portfolioName,
        cash,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setError("");
          setRefresh((prev) => !prev);
        }
      })
      .catch((err) => {
        console.log(err);
        setError("Error");
      });
  }

  function handleDeletePortfolio(portfolioName) {
    axios
      .post("http://localhost:3001/deleteportfolio", {
        user,
        portfolioName,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setError("");
          setRefresh((prev) => !prev);
        }
      })
      .catch((err) => {
        console.log(err);
        setError("Error");
      });
  }

  return (
    <div>
      <div className="body">
        {!selectedPortfolio ? (
          <>
            <h1>My Portfolios</h1>
            <ul>
              {portfolios.length > 0 ? (
                portfolios.map((portfolio) => (
                  <div
                    className="portfolio-container"
                    key={portfolio.portfolioid}
                  >
                    <li
                      className="portfolios"
                      onClick={() =>
                        setSelectedPortfolio(portfolio.portfolioid)
                      }
                    >
                      <div className="portfolio-center">
                        <div>Portfolio: {portfolio.portfolioid}</div>
                        <div>Cash: {portfolio.cash}</div>
                      </div>
                    </li>
                    <div
                      className="delete-portfolio"
                      onClick={() =>
                        handleDeletePortfolio(portfolio.portfolioid)
                      }
                    >
                      Delete
                    </div>
                  </div>
                ))
              ) : (
                <p>No portfolios found. Create one to get started!</p>
              )}
            </ul>

            <div className="input">
              <input
                type="text"
                placeholder="Portfolio Name"
                onChange={(e) => setPortfolioName(e.target.value)}
              />
            </div>
            <div className="input">
              <input
                type="text"
                placeholder="Cash"
                onChange={(e) => setCash(e.target.value)}
              />
            </div>
            <div className="create-portfolio" onClick={handleCreatePortfolio}>
              Create New Portfolio
            </div>
            {error && <p className="error">{error}</p>}
          </>
        ) : (
          <PortfolioDetails
            portfolioId={selectedPortfolio}
            onBack={() => {setSelectedPortfolio(null); setRefresh((prev) => !prev);}}
            cash={cash}
            setCash={setCash}
          />
        )}
      </div>
    </div>
  );
}

export default Portfolio;
