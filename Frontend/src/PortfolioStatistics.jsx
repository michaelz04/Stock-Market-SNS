import { useState, useEffect } from "react";
import "./PortfolioStatistics.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function PortfolioStatistics({ portfolioId }) {
  const user = localStorage.getItem("user");

  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("2013-02-08");
  const [endDate, setEndDate] = useState("2018-02-07");
  const [currentStart, setCurrentStart] = useState("2013-02-08");
  const [currentEnd, setCurrentEnd] = useState("2018-02-07");
  const [stocks, setStocks] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [covMatrix, setCovMatrix] = useState([]);
  const [corMatrix, setCorMatrix] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.post(
          "http://localhost:3001/portfoliostatistics",
          {
            user,
            portfolioId,
            startDate,
            endDate,
          }
        );
        const { stocks, covMatrix, corMatrix } = response.data;

        setStocks(stocks);
        setCovMatrix(covMatrix);
        setCorMatrix(corMatrix);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    };

    fetchPortfolios();
  }, [user, refresh]);

  function handleDate(event) {
    event.preventDefault();

    const fetchPortfolios = async () => {
      try {
        const response = await axios.post(
          "http://localhost:3001/portfoliostatistics",
          {
            user,
            portfolioId,
            startDate,
            endDate,
          }
        );
        const { stocks, covMatrix, corMatrix } = response.data;

        console.log(response.data);

        setStocks(stocks);
        setCovMatrix(covMatrix);
        setCovMatrix(corMatrix);
        setCurrentStart(startDate);
        setCurrentEnd(endDate);
        setError("");
        setRefresh((prev) => !prev);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
        setError("Error");
      }
    };

    fetchPortfolios();
  }

  return (
    <div className="portfolio-details">
      <h2>Portfolio Statistics</h2>
      <h2>Select Interval</h2>
      <div className="input-container">
        <div className="shares-container">
          <div className="input">
            <input
              type="text"
              placeholder="Start Date (yyyy-mm-dd)"
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="End Date (yyyy-mm-dd)"
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="input-button" onClick={handleDate}>
          Select
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <h2>Current Interval</h2>
      <h2>
        {currentStart} - {currentEnd}
      </h2>
      <div className="statistics-body">
        <div className="body-container">
          <h3 className="header-center">Stock Statistics</h3>
          <ul>
            {stocks.length > 0 ? (
              stocks.map((stock) => (
                <div className="stock-container" key={stock.code}>
                  <li
                    className="stock"
                    onClick={() =>
                      navigate(`/historical/${stock.code}`, {
                        state: {
                          stocklistid: portfolioId,
                          origin: "portfolios",
                        },
                      })
                    }
                  >
                    <div className="stock-center">
                      <div>Stock: {stock.code}</div>
                      <div>Beta: {Number(stock.beta).toFixed(2)}</div>
                      <div>COV: {Number(stock.cov).toFixed(2)}</div>
                    </div>
                  </li>
                </div>
              ))
            ) : (
              <p>No stocks found</p>
            )}
          </ul>
        </div>
        <div className="body-container">
          <h3 className="header-center">Covariance Matrix</h3>
          <ul>
            {Object.keys(covMatrix).length > 0 ? (
              Object.entries(covMatrix).map(([rowStock, cols]) => (
                <div className="stock-container" key={rowStock}>
                  <li className="matrix">
                    <div className="stock-center">
                      <div>Stock: {rowStock}</div>
                      <ul>
                        {Object.entries(cols).map(([colStock, value]) => (
                          <li key={colStock}>
                            Cov({rowStock}, {colStock}) ={" "}
                            {value?.toFixed(4) ?? "N/A"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                </div>
              ))
            ) : (
              <p>No Covariance Matrix</p>
            )}
          </ul>
        </div>
        <div className="body-container">
          <h3 className="header-center">Correlation Matrix</h3>
          <ul>
            {Object.keys(corMatrix).length > 0 ? (
              Object.entries(corMatrix).map(([rowStock, cols]) => (
                <div className="stock-container" key={rowStock}>
                  <li className="matrix">
                    <div className="stock-center">
                      <div>Stock: {rowStock}</div>
                      <ul>
                        {Object.entries(cols).map(([colStock, value]) => (
                          <li key={colStock}>
                            Cov({rowStock}, {colStock}) ={" "}
                            {value?.toFixed(4) ?? "N/A"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                </div>
              ))
            ) : (
              <p>No Correlation Matrix</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PortfolioStatistics;
