import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import './Stocklist.css'; // CSS import

const API_BASE_URL = 'http://localhost:3001';

function Stocklist() {
    
    const user = localStorage.getItem("user");
    const [stocklists, setStocklists] = useState([]); //All stocklists that belong to user
    const [selectedStocklist, setSelectedStocklist] = useState(null); //Specific stocklist selected to the user
    const [newStocklistVisibility, setNewStocklistVisibility] = useState("private"); //Not super important but controls the dropdown for "private, public, friend"
    const [stocklistToDelete, setStocklistToDelete] = useState(""); //The user input for deleting a stock
    const [loading, setLoading] = useState(false); // Can comment out, but might need if some queries take long
    const [error, setError] = useState(""); //Any error message

    const [stocksInList, setStocksInList] = useState([]); //All stocks selected within a stoocklist
    const [newStockCode, setNewStockCode] = useState(""); //user input for stock that wants to be bought
    const [newStockShares, setNewStockShares] = useState(1); //user input for noshares that want to be bought for the stock above
    const [sellAmount, setSellAmount] = useState({}); //user input for deleting a specific stock in a specific stocklist

    const [stocklistValue, setStocklistValue] = useState(0); //Total value for a specific stocklist

    const navigate = useNavigate();
    const location = useLocation();
    // Fetch stocklists when component mounts or user changes but there might be a return choice from HistoricalStock.jsx
    useEffect(() => {
        if (user) {
            fetchStocklists();
            // Check for selected stocklist in navigation state
            if (location.state?.selectedStocklist) {
                setSelectedStocklist(location.state.selectedStocklist);
            }
        }
    }, [user, location.state]);

    // Fetch stocklists when component mounts or user changes
    // useEffect(() => {
    //     if (user) {
    //         fetchStocklists();
    //     }
    // }, [user]);

    // Fetch stocks when a stocklist is selected
    useEffect(() => {
        if (selectedStocklist) {
            fetchStocksInList();
        } else {
            setStocksInList([]);
        }
    }, [selectedStocklist, user]);

    //Total value of a stock changes
    useEffect(() => {
        const calculateStocklistValue = async () => {
            if (!selectedStocklist) {
                setStocklistValue(0);
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/stocklist-value`, {
                    params: { 
                        userId: user, 
                        stocklistid: selectedStocklist 
                    }
                });
                setStocklistValue(response.data.stocklistValue);
            } catch (err) {
                console.error("Error calculating stocklist value:", err);
                setStocklistValue(0);
            }
        };

        calculateStocklistValue();
    }, [selectedStocklist, user, stocksInList]); // Re-run when these change

    const fetchStocklists = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/stocklists`, {
                params: { userId: user }
            });
            setStocklists(response.data);
            setError("");
        } catch (err) {
            setError("Failed to fetch stocklists");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStocksInList = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/stockliststock`, {
                params: { userId: user, stocklistid: selectedStocklist }
            });
            setStocksInList(response.data);
        } catch (err) {
            setError("Failed to fetch stocks in list");
            console.error(err);
        }
    };

    const handleCreateStocklist = async () => {
        if (!user) return;
        
        try {
            await axios.post(`${API_BASE_URL}/stocklists`, {
                userId: user,
                visibility: newStocklistVisibility
            });
            fetchStocklists();
            setNewStocklistVisibility("private");
        } catch (err) {
            setError("Failed to create stocklist");
            console.error(err);
        }
    };

    const handleDeleteStocklist = async () => {
        if (!user || !stocklistToDelete) return;
        
        const stocklistid = parseInt(stocklistToDelete);
        if (isNaN(stocklistid)) {
            setError("Please enter a valid stocklist ID");
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/stocklists`, {
                data: {
                    userId: user,
                    stocklistid: stocklistid
                }
            });
            fetchStocklists();
            setStocklistToDelete("");
            if (selectedStocklist === stocklistid) {
                setSelectedStocklist(null);
            }
            setError("");
        } catch (err) {
            setError(err.response?.data?.error || "Failed to delete stocklist");
            console.error(err);
        }
    };

    const handleAddStock = async () => {
        if (!newStockCode || newStockShares < 1) return;
        
        try {
            await axios.post(`${API_BASE_URL}/stockliststock`, {
                userId: user,
                stocklistid: selectedStocklist,
                code: newStockCode.toUpperCase(),
                noShares: newStockShares
            });
            setNewStockCode("");
            setNewStockShares(1);
            fetchStocksInList();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to add stock");
            console.error(err);
        }
    };

    const handleSellStock = async (code) => {
        const sharesToSell = sellAmount[code] || 1;
        
        try {
            await axios.put(`${API_BASE_URL}/stockliststock`, {
                userId: user,
                stocklistid: selectedStocklist,
                code,
                sharesToSell
            });
            setSellAmount({ ...sellAmount, [code]: 1 });
            fetchStocksInList();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to sell shares");
            console.error(err);
        }
    };

    const handleDeleteStock = async (code) => {
        try {
            await axios.delete(`${API_BASE_URL}/stockliststock`, {
                data: {
                    userId: user,
                    stocklistid: selectedStocklist,
                    code
                }
            });
            fetchStocksInList();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to delete stock");
            console.error(err);
        }
    };

    return (
        <div className='stocklist-container'>
            <h2>Hello {user}</h2>
            
            <div className="portfolio-selector">
                <div className="selector-header">
                    <h3>Select Portfolio</h3>
                    {selectedStocklist && (
                        <div className="stocklist-value-display">
                            Current Value: ${stocklistValue}
                        </div>
                    )}
                </div>
                <select
                    value={selectedStocklist || ""}
                    onChange={(e) => setSelectedStocklist(Number(e.target.value))}
                >
                    <option value="">-- Select a Portfolio --</option>
                    {stocklists.map(list => (
                        <option key={list.stocklistid} value={list.stocklistid}>
                            Portfolio #{list.stocklistid} ({list.visibility})
                        </option>
                    ))}
                </select>
            </div>
    
            <div className="create-stocklist">
                <h3>Create New Portfolio</h3>
                <select 
                    value={newStocklistVisibility}
                    onChange={(e) => setNewStocklistVisibility(e.target.value)}
                >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="friend">Friends</option>
                </select>
                <button onClick={handleCreateStocklist}>Create</button>
            </div>
            
            <div className="delete-stocklist">
                <h3>Delete Portfolio</h3>
                <input
                    type="text"
                    value={stocklistToDelete}
                    onChange={(e) => setStocklistToDelete(e.target.value)}
                    placeholder="Enter portfolio ID to delete"
                />
                <button onClick={handleDeleteStocklist}>Delete</button>
            </div>
            
            {selectedStocklist && (
                <div className="portfolio-contents">
                    <div className="portfolio-header">
                        <h3>Portfolio #{selectedStocklist} Contents</h3>
                        <div className="stocklist-value">
                            Total Value: ${stocklistValue}
                        </div>
                    </div>
                    
                    <div className="add-stock">
                        <input
                            type="text"
                            value={newStockCode}
                            onChange={(e) => setNewStockCode(e.target.value)}
                            placeholder="Stock symbol (e.g., AAPL)"
                        />
                        <input
                            type="number"
                            min="1"
                            value={newStockShares}
                            onChange={(e) => setNewStockShares(Number(e.target.value))}
                            placeholder="Shares"
                        />
                        <button onClick={handleAddStock}>Add Stock</button>
                    </div>
                    
                    {stocksInList.length === 0 ? (
                        <p className="empty-portfolio">This portfolio is empty</p>
                    ) : (
                        <ul className="stock-list">
                            {stocksInList.map(stock => (
                                <li key={stock.code} className="stock-item">
                                <div className="stock-info">
                                    <span className="stock-code">{stock.code}</span>
                                    <span className="stock-shares">{stock.noshares} shares</span>
                                </div>
                                <div className="stock-actions">
                                    <input
                                    type="number"
                                    min="1"
                                    max={stock.noShares}
                                    value={sellAmount[stock.code] || ""}
                                    onChange={(e) => setSellAmount({
                                        ...sellAmount,
                                        [stock.code]: Number(e.target.value)
                                    })}
                                    placeholder="Shares to sell"
                                    className="sell-input"
                                    />
                                    <button 
                                    onClick={() => handleSellStock(stock.code)}
                                    className="sell-btn"
                                    >
                                    Sell
                                    </button>
                                    <button 
                                    onClick={() => handleDeleteStock(stock.code)}
                                    className="delete-btn"
                                    >
                                    Delete
                                    </button>
                                    {/* Add this button for historical data */}
                                    <button
                                    onClick={() => navigate(`/historical/${stock.code}`, { state: { stocklistid: selectedStocklist } })}
                                    className="history-btn"
                                    >
                                    View History
                                    </button>
                                </div>
                                </li>
                            ))}
                            </ul>
                    )}
                </div>
            )}
            
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default Stocklist;