import { useState, useContext, useEffect } from "react";
import "./Portfolio.css";
import axios from "axios";

function Portfolio() {
  const user = localStorage.getItem("user");

  const [cash, setCash] = useState(0);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolios, setPortfolios] = useState([]);
  const [refresh, setRefresh] = useState(false);

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
          setRefresh((prev) => !prev);
        } else {
          // error
          console.log("error");
        }
      })
      .catch((err) => console.log(err));
  }
  return (
    <div>
      <h1>My Portfolios</h1>
      <div className="body">
        <ul>
          {portfolios.length > 0 ? (
            portfolios.map((portfolio) => (
              <li className="portfolios" key={portfolio.portfolioid}>
                <div className="portfolio-center">
                  <div>Portfolio: {portfolio.portfolioid}</div>
                  <div>Cash: {portfolio.cash}</div>
                </div>
              </li>
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
      </div>
    </div>
  );
}

export default Portfolio;
