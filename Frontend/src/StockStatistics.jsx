import { useState, useEffect } from "react";
import "./PortfolioStatistics.css"; // Reusing the same CSS
import axios from "axios";
import { useNavigate, useLocation, useParams } from "react-router-dom";

function StockStatistics() {
  const { stocklistId } = useParams();
 // const user = localStorage.getItem("user");
  const location = useLocation();
  const [origin, setOrigin] = useState('stocklists'); // Default origin

  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("2013-02-08");
  const [endDate, setEndDate] = useState("2018-02-07");
  const [currentStart, setCurrentStart] = useState("2013-02-08");
  const [currentEnd, setCurrentEnd] = useState("2018-02-07");
  const [stocks, setStocks] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [covMatrix, setCovMatrix] = useState({});
  const [corMatrix, setCorMatrix] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    // Set origin from navigation state if available
    if (location.state?.origin) {
      setOrigin(location.state.origin);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await axios.post(
          "http://localhost:3001/stockstatistics",
          {
            stocklistId,
            startDate,
            endDate,
          }
        );
        const { stocks, covMatrix, corMatrix } = response.data;

        setStocks(stocks);
        setCovMatrix(covMatrix);
        setCorMatrix(corMatrix);
        setCurrentStart(startDate);
        setCurrentEnd(endDate);
      } catch (error) {
        console.error("Error fetching statistics:", error);
        setError("Failed to load statistics");
      }
    };

    if (stocklistId) {
      fetchStatistics();
    }
  }, [stocklistId, refresh]);

  const handleDate = (event) => {
    event.preventDefault();
    setRefresh(prev => !prev);
  };

  const handleBack = () => {
    if (origin === 'review') {
      navigate('/reviews');
    } else {
      navigate('/stocklists', { 
        state: { selectedStocklist: stocklistId } 
      });
    }
  };

  const handleStockClick = (code) => {
    navigate(`/historical/${code}`, {
      state: {
        stocklistId,
        origin: 'stockstatistics'
      }
    });
  };

  return (
    <div className="portfolio-details">
      <button onClick={handleBack} className="back-button">
        Back to {origin === 'review' ? 'Reviews' : 'Stocklists'}
      </button>
      
      <h2>Stocklist Statistics</h2>
      <h2>Select Interval</h2>
      <div className="input-container">
        <div className="shares-container">
          <div className="input">
            <input
              type="text"
              placeholder="Start Date (yyyy-mm-dd)"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="input">
            <input
              type="text"
              placeholder="End Date (yyyy-mm-dd)"
              value={endDate}
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
                    onClick={() => handleStockClick(stock.code)}
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
                            Corr({rowStock}, {colStock}) ={" "}
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

export default StockStatistics;