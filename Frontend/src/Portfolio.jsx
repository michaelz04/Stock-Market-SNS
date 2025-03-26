import { useState, useContext, useEffect } from "react";
import "./Portfolio.css";
import axios from "axios";

function Portfolio() {
  const user = localStorage.getItem("user");

  const [cash, setCash] = useState(0);
  const [portfolios, setPortfolios] = useState([]);

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.post("http://localhost:3001/portfolio", {
          user,
        });
        console.log(response.data.portfolios);
        setPortfolios(response.data.portfolios);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    };

    fetchPortfolios();
  }, [user]);

  function handleCreatePortfolio(event) {
    event.preventDefault();

    console.log(user);

    axios
      .post("http://localhost:3001/createportfolio", { user, cash })
      .then((res) => {
        if (res.data.message == "success") {
          // success
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
              <li key={portfolio.portfolioid}>
                <p>Portfolio: {portfolio.portfolioid}</p>
              </li>
            ))
          ) : (
            <p>No portfolios found. Create one to get started!</p>
          )}
        </ul>
        <button onClick={handleCreatePortfolio}>Create New Portfolio</button>
        <div className="input">
          <input
            type="text"
            placeholder="Cash"
            onChange={(e) => setCash(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
