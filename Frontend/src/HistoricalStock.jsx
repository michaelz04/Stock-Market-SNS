import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = 'http://localhost:3001';

function HistoricalStock() {
  const user = localStorage.getItem("user");
  const { stockCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [startDate, setStartDate] = useState('');
  const [timeRange, setTimeRange] = useState('week');
  const [priceData, setPriceData] = useState([]);
  const [predictionData, setPredictionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stocksInPortfolio, setStocksInPortfolio] = useState([]);
  const [selectedStocklist, setSelectedStocklist] = useState(null);
  const [activeTab, setActiveTab] = useState('historical');
  const [futureError, setFutureError] = useState('');
  const [origin, setOrigin] = useState('stocklist'); // Track where user came from

  const timeRangeMap = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
    '5years': 1825
  };

  
  // useEffect(() => {
  //   if (location.state?.stocklistid) {
  //     setSelectedStocklist(location.state.stocklistid);
  //     setOrigin(location.state.origin || 'stocklist'); // Set origin from navigation
  //     fetchStocksInPortfolio(location.state.stocklistid);
  //   }
  // }, [location.state]);

  useEffect(() => {
    if (location.state) {
      // Always get stocklistid from location.state if it exists
      if (location.state.stocklistid) {
        setSelectedStocklist(location.state.stocklistid);
      }
      // Always get origin from location.state if it exists, otherwise default to 'stocklist'
      setOrigin(location.state.origin || 'stocklist');
      
      // Only fetch if we have a stocklistid
      if (location.state.stocklistid) {
        fetchStocksInPortfolio(location.state.stocklistid);
      }
    }
  }, [location.state]);

  useEffect(() => {
    console.log('Current origin:', origin);
    console.log('Current stocklistid:', selectedStocklist);
  }, [origin, selectedStocklist]);

  useEffect(() => {
    if (selectedStocklist) {
      console.log(`Origin changed to: ${origin}, refetching stocks...`);
      fetchStocksInPortfolio(selectedStocklist);
    }
  }, [origin, selectedStocklist]); 

  const fetchStocksInPortfolio = async (stocklistid) => {
    try {
      let response;
      if (origin === "review") {
        // For public/shared stocklists
        console.log("Using /stockliststock-by-id endpoint");
        response = await axios.get(`${API_BASE_URL}/stockliststock-by-id`, {
          params: { stocklistid }
        });
      } else {
        // For user's own stocklists
        response = await axios.get(`${API_BASE_URL}/stockliststock`, {
          params: { userId: user, stocklistid }
        });
      }

      console.log("Full API response:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        config: response.config
      });
  
      // Debug log just the data we care about
      console.log("Stock data received:", response.data);
      setStocksInPortfolio(response.data);
    } catch (err) {
      console.error("Failed to fetch stocks:", err);
      setStocksInPortfolio([]); // Ensure empty array on error
    }
  };

  const fetchHistoricalData = async () => {
    if (!startDate) return;

    setLoading(true);
    try {
      const endDate = new Date(startDate);
      const start = new Date(startDate);
      start.setDate(start.getDate() - timeRangeMap[timeRange]);

      const response = await axios.get(`${API_BASE_URL}/stock-history`, {
        params: {
          code: stockCode,
          start: start.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });

      setPriceData(response.data);
    } catch (err) {
      console.error("Failed to fetch historical data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictionData = async () => {
    if (!startDate) return;

    setLoading(true);
    setFutureError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/predict-stock`, {
        params: {
          code: stockCode,
          start: startDate,
          days: timeRangeMap[timeRange]
        }
      });

      setPredictionData(response.data);
    } catch (err) {
      if (err.response?.data?.error) {
        setFutureError(err.response.data.error);
      } else {
        setFutureError("Failed to fetch prediction data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (e) => {
    const newStockCode = e.target.value;
    if (newStockCode !== stockCode) {
      navigate(`/historical/${newStockCode}`, { 
        state: { 
          stocklistid: selectedStocklist,
          origin // Preserve origin when switching stocks
        }
      });
    }
  };

  const handleBack = () => {
    if (origin === 'review') {
      navigate('/reviews');
    } else {
      if (selectedStocklist) {
        navigate('/stocklists', { state: { selectedStocklist } });
      } else {
        navigate('/stocklists');
      }
    }
  };

  const chartData = {
    labels: priceData.map(item => item.timestamp),
    datasets: [{
      label: `${stockCode} Close Price`,
      data: priceData.map(item => item.close),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const predictionChartData = {
    labels: predictionData.map(item => item.timestamp),
    datasets: [{
      label: `${stockCode} Predicted Close Price`,
      data: predictionData.map(item => item.predictedClose),
      borderColor: 'rgb(255, 99, 132)',
      borderDash: [5, 5],
      tension: 0.1
    }]
  };

  return (
    <div className="historical-container">
    <button onClick={handleBack}>
      {origin === 'review' ? '← Back to Review' : '← Back to Stocklist'}
    </button>
    <h2>{activeTab === 'historical' ? 'Historical Prices (1 Share)' : 'Future Prediction (1 Share)'}: {stockCode}</h2>

    {stocksInPortfolio.length > 0 ? (
      <div className="stock-selector">
        <select value={stockCode} onChange={handleStockChange}>
          {stocksInPortfolio.map(stock => (
            <option key={stock.code} value={stock.code}>
              {stock.code} ({stock.noShares} shares)
            </option>
          ))}
        </select>
      </div>
    ) : (
      <p>No stocks available in this stocklist</p>
    )}


      <div className="tab-buttons">
        <button onClick={() => setActiveTab('historical')}>Historical</button>
        <button onClick={() => setActiveTab('prediction')}>Future Prediction</button>
      </div>

      <div className="controls">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="week">1 Week</option>
          <option value="month">1 Month</option>
          <option value="quarter">3 Months</option>
          <option value="year">1 Year</option>
          <option value="5years">5 Years</option>
        </select>
        <button
          onClick={activeTab === 'historical' ? fetchHistoricalData : fetchPredictionData}
          disabled={!startDate || loading}
        >
          {loading ? 'Loading...' : activeTab === 'historical' ? 'View History' : 'Predict Future'}
        </button>
      </div>

      {activeTab === 'historical' && (
        priceData.length > 0 ? (
          <div className="chart-container">
            <Line
              data={chartData}
              options={{
                responsive: true,
                scales: {
                  x: {
                    type: 'time',
                    time: {
                      unit: timeRange === '5years' ? 'year' : 'month',
                      parser: 'yyyy-MM-dd',
                      tooltipFormat: 'MMM d, yyyy'
                    }
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="no-data-message">
            {loading ? 'Loading data...' : 'No historical data available for the selected period'}
          </div>
        )
      )}

      {activeTab === 'prediction' && (
        <>
          {futureError && (
            <div className="error-message" style={{ color: 'red', marginTop: '0.5rem' }}>
              {futureError}
            </div>
          )}
          {predictionData.length > 0 ? (
            <div className="chart-container">
              <Line
                data={predictionChartData}
                options={{
                  responsive: true,
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: timeRange === '5years' ? 'year' : 'month',
                        parser: 'yyyy-MM-dd',
                        tooltipFormat: 'MMM d, yyyy'
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="no-data-message">
              {loading ? 'Loading prediction...' : 'No prediction data available'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HistoricalStock;