import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Review.css';

const API_BASE_URL = 'http://localhost:3001';

function Review() {
    const user = localStorage.getItem("user");
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('share');
    const [sharableStocklists, setSharableStocklists] = useState([]);
    const [shareInputs, setShareInputs] = useState({});
    const [sharedUsers, setSharedUsers] = useState({});
    const [userPublicStocklists, setUserPublicStocklists] = useState([]);
    const [otherPublicStocklists, setOtherPublicStocklists] = useState([]);
    const [sharedByUserStocklists, setSharedByUserStocklists] = useState([]);
    const [sharedWithUserStocklists, setSharedWithUserStocklists] = useState([]);
    const [reviewTexts, setReviewTexts] = useState({});
    const [existingReviews, setExistingReviews] = useState({});
    const [viewingReviewsFor, setViewingReviewsFor] = useState(null);
    const [currentReviews, setCurrentReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [stocklistStocks, setStocklistStocks] = useState({});

    const [stocklistValues, setStocklistValues] = useState({});

    useEffect(() => {
        if (!user) return;
        if (activeTab === 'share') fetchSharableStocklists();
        else if (activeTab === 'review') fetchPublicStocklists();
        else if (activeTab === 'manage') fetchSharedStocklists();
    }, [activeTab, user]);

    // const fetchStocksForStocklist = async (stocklistId) => {
    //     try {
    //         const response = await axios.get(`${API_BASE_URL}/stockliststock-by-id`, {
    //             params: { stocklistid: stocklistId }
    //         });
    //         setStocklistStocks(prev => ({
    //             ...prev,
    //             [stocklistId]: response.data
    //         }));
    //     } catch (err) {
    //         console.error("Failed to fetch stocks:", err);
    //     }
    // };

    const fetchStocksForStocklist = async (stocklistId) => {
      try {
          // First get the stocks in the list
          const stocksResponse = await axios.get(`${API_BASE_URL}/stockliststock-by-id`, {
              params: { stocklistid: stocklistId }
          });
          
          // Then get current prices for each stock
          const stocksWithPrices = await Promise.all(
              stocksResponse.data.map(async (stock) => {
                  const priceResponse = await axios.get(`${API_BASE_URL}/stock-latest-price`, {
                      params: { code: stock.code }
                  });
                  return {
                      ...stock,
                      currentPrice: priceResponse.data.close
                  };
              })
          );
          
          // Calculate total value
          const totalValue = stocksWithPrices.reduce(
              (sum, stock) => sum + (stock.currentPrice * stock.noshares),
              0
          );
  
          // Update both stocks and values state
          setStocklistStocks(prev => ({
              ...prev,
              [stocklistId]: stocksWithPrices
          }));
          setStocklistValues(prev => ({
              ...prev,
              [stocklistId]: totalValue.toFixed(2)
          }));
      } catch (err) {
          console.error("Failed to fetch stocks:", err);
          setStocklistValues(prev => ({
              ...prev,
              [stocklistId]: "N/A"
          }));
      }
  };

    const navigateToHistorical = (stockCode, stocklistId) => {
      navigate(`/historical/${stockCode}`, { 
          state: { 
              stocklistid: stocklistId,
              origin: 'review'  
          }
      });
  };
  

    const fetchSharableStocklists = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/stocklists-shareable`, {
                params: { userId: user }
            });
            setSharableStocklists(response.data);
            
            const inputs = {};
            response.data.forEach(stocklist => {
                inputs[stocklist.stocklistid] = "";
            });
            setShareInputs(inputs);
            
            const sharedData = {};
            for (const stocklist of response.data) {
                const usersResponse = await axios.get(`${API_BASE_URL}/stocklist-shared-users`, {
                    params: { stocklistId: stocklist.stocklistid }
                });
                sharedData[stocklist.stocklistid] = usersResponse.data;
            }
            setSharedUsers(sharedData);
            
            setError("");
        } catch (err) {
            setError("Failed to fetch shareable stocklists");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPublicStocklists = async () => {
        setLoading(true);
        try {
            const userPublicResponse = await axios.get(`${API_BASE_URL}/stocklists-public`, {
                params: { userId: user }
            });
            setUserPublicStocklists(userPublicResponse.data);

            const otherPublicResponse = await axios.get(`${API_BASE_URL}/stocklists-public-others`, {
                params: { userId: user }
            });
            setOtherPublicStocklists(otherPublicResponse.data);

            const reviewsResponse = await axios.get(`${API_BASE_URL}/user-reviews`, {
                params: { userId: user }
            });
            
            const reviewMap = {};
            const existingMap = {};
            reviewsResponse.data.forEach(review => {
                reviewMap[review.stocklist_id] = review.review_text;
                existingMap[review.stocklist_id] = review.review_id;
            });
            
            setReviewTexts(reviewMap);
            setExistingReviews(existingMap);
            
            const allStocklists = [...userPublicResponse.data, ...otherPublicResponse.data];
            for (const stocklist of allStocklists) {
                await fetchStocksForStocklist(stocklist.stocklistid);
            }
            
            setError("");
        } catch (err) {
            setError("Failed to fetch public stocklists");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSharedStocklists = async () => {
        setLoading(true);
        try {
            const sharedByResponse = await axios.get(`${API_BASE_URL}/stocklists-shared-by-user`, {
                params: { userId: user }
            });
            setSharedByUserStocklists(sharedByResponse.data);

            const sharedWithResponse = await axios.get(`${API_BASE_URL}/stocklists-shared-with-user`, {
                params: { userId: user }
            });
            setSharedWithUserStocklists(sharedWithResponse.data);

            const reviewsResponse = await axios.get(`${API_BASE_URL}/user-reviews`, {
                params: { userId: user }
            });
            
            const reviewMap = {};
            const existingMap = {};
            reviewsResponse.data.forEach(review => {
                reviewMap[review.stocklist_id] = review.review_text;
                existingMap[review.stocklist_id] = review.review_id;
            });
            
            setReviewTexts(reviewMap);
            setExistingReviews(existingMap);
            
            const allStocklists = [...sharedByResponse.data, ...sharedWithResponse.data];
            for (const stocklist of allStocklists) {
                await fetchStocksForStocklist(stocklist.stocklistid);
            }
            
            setError("");
        } catch (err) {
            setError("Failed to fetch shared stocklists");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewsForStocklist = async (stocklistId) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/stocklist-reviews`, {
                params: { 
                    stocklistId,
                    userId: user
                }
            });
            setCurrentReviews(response.data);
            setViewingReviewsFor(stocklistId);
            setError("");
        } catch (err) {
            setError("Failed to fetch reviews");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async (stocklistId) => {
        const reviewText = reviewTexts[stocklistId]?.trim();
        if (!reviewText) {
            setError("Review cannot be empty");
            return;
        }
        if (reviewText.length > 4000) {
            setError("Review cannot exceed 4000 characters");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/reviews`, {
                stocklistId,
                userId: user,
                reviewText,
                reviewId: existingReviews[stocklistId]
            });
            
            if (activeTab === 'review') {
                fetchPublicStocklists();
            } else if (activeTab === 'manage') {
                fetchSharedStocklists();
            }
            
            if (viewingReviewsFor === stocklistId) {
                fetchReviewsForStocklist(stocklistId);
            }
            
            setSuccess(existingReviews[stocklistId] ? "Review updated!" : "Review submitted!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to submit review");
            console.error(err);
        }
    };

    const handleDeleteReview = async (reviewId, stocklistId) => {
        try {
            await axios.delete(`${API_BASE_URL}/reviews`, {
                data: { reviewId, currentUserId: user }
            });
            
            if (activeTab === 'review') {
                fetchPublicStocklists();
            } else if (activeTab === 'manage') {
                fetchSharedStocklists();
            }
            
            if (viewingReviewsFor === stocklistId) {
                fetchReviewsForStocklist(stocklistId);
            }
            
            setSuccess("Review deleted successfully");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to delete review");
            console.error(err);
        }
    };

    const handleInputChange = (stocklistId, value) => {
        setShareInputs(prev => ({
            ...prev,
            [stocklistId]: value
        }));
    };

    const handleShareStocklist = async (stocklistId) => {
        const username = shareInputs[stocklistId]?.trim();
        if (!username) {
            setError("Please enter a username");
            return;
        }

        try {
            const areFriends = await axios.get(`${API_BASE_URL}/check-friendship`, {
                params: { user1: user, user2: username }
            });

            if (!areFriends.data.isFriend) {
                setError("You can only share with friends");
                return;
            }

            await axios.post(`${API_BASE_URL}/share-stocklist`, {
                stocklistId,
                userId: username
            });

            const updatedUsers = [...(sharedUsers[stocklistId] || []), username];
            setSharedUsers({
                ...sharedUsers,
                [stocklistId]: updatedUsers
            });

            setShareInputs(prev => ({
                ...prev,
                [stocklistId]: ""
            }));

            setSuccess(`Successfully shared stocklist ${stocklistId} with ${username}`);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to share stocklist");
            console.error(err);
        }
    };

    const handleUnshareStocklist = async (stocklistId) => {
        const username = shareInputs[stocklistId]?.trim();
        if (!username) {
            setError("Please enter a username");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/unshare-stocklist`, {
                stocklistId,
                userId: username
            });

            const updatedUsers = (sharedUsers[stocklistId] || []).filter(u => u !== username);
            setSharedUsers({
                ...sharedUsers,
                [stocklistId]: updatedUsers
            });

            setShareInputs(prev => ({
                ...prev,
                [stocklistId]: ""
            }));

            setSuccess(`Successfully unshared stocklist ${stocklistId} with ${username}`);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to unshare stocklist");
            console.error(err);
        }
    };

    return (
        <div className="review-container">
            <div className="tabs">
                <button 
                    className={activeTab === 'share' ? 'active' : ''}
                    onClick={() => setActiveTab('share')}
                >
                    Share Stocklists
                </button>
                <button 
                    className={activeTab === 'review' ? 'active' : ''}
                    onClick={() => {
                        setActiveTab('review');
                        setViewingReviewsFor(null);
                    }}
                >
                    Public Stocklists
                </button>
                <button 
                    className={activeTab === 'manage' ? 'active' : ''}
                    onClick={() => {
                        setActiveTab('manage');
                        setViewingReviewsFor(null);
                    }}
                >
                    Shared Stocklists
                </button>
            </div>
        
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
        
            {activeTab === 'share' && (
                <div className="share-tab">
                    <h3>Share Your Stocklists</h3>
                    {loading ? (
                        <p>Loading...</p>
                    ) : sharableStocklists.length === 0 ? (
                        <p>You have no stocklists with 'friend' visibility to share.</p>
                    ) : (
                        <div className="stocklist-grid">
                            {sharableStocklists.map(stocklist => (
                                <div key={`share-${stocklist.stocklistid}`} className="stocklist-card">
                                    <h4>Stocklist #{stocklist.stocklistid}</h4>
                                    
                                    <div className="shared-with-section">
                                        <strong>Currently Shared With:</strong>
                                        {sharedUsers[stocklist.stocklistid]?.length > 0 ? (
                                            <ul className="shared-users-list">
                                                {sharedUsers[stocklist.stocklistid].map(username => (
                                                    <li key={`shared-user-${username}`}>{username}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p>Not shared with anyone yet</p>
                                        )}
                                    </div>
                                    
                                    <div className="share-controls">
                                        <input
                                            type="text"
                                            value={shareInputs[stocklist.stocklistid] || ""}
                                            onChange={(e) => handleInputChange(stocklist.stocklistid, e.target.value)}
                                            placeholder="Friend's username"
                                        />
                                        <div className="share-buttons">
                                            <button 
                                                onClick={() => handleShareStocklist(stocklist.stocklistid)}
                                                className="share-btn"
                                            >
                                                Share
                                            </button>
                                            <button 
                                                onClick={() => handleUnshareStocklist(stocklist.stocklistid)}
                                                className="unshare-btn"
                                            >
                                                Unshare
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        
            {activeTab === 'review' && (
                <div className="public-tab">
                    {viewingReviewsFor ? (
                        <div className="reviews-view">
                            <button 
                                className="back-button"
                                onClick={() => setViewingReviewsFor(null)}
                            >
                                ← Back to Public Stocklists
                            </button>
                            <h3>Reviews for Stocklist #{viewingReviewsFor}</h3>
                            {loading ? (
                                <p>Loading reviews...</p>
                            ) : currentReviews.length === 0 ? (
                                <p>No reviews yet for this stocklist</p>
                            ) : (
                                <div className="reviews-list">
                                    {currentReviews.map(review => (
                                        <div key={`public-review-${review.review_id}`} className="review-item">
                                            <div className="review-header">
                                                <span className="reviewer">{review.reviewer_name || review.reviewer_id}</span>
                                                {(review.reviewer_id === user || 
                                                userPublicStocklists.some(s => s.stocklistid === viewingReviewsFor)) && (
                                                    <button
                                                        onClick={() => handleDeleteReview(review.review_id, viewingReviewsFor)}
                                                        className="delete-review-btn"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                            <p className="review-text">{review.review_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="split-container">
                            <div className="left-container">
                                <h3>Your Public Stocklists</h3>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : userPublicStocklists.length === 0 ? (
                                    <p>You have no public stocklists.</p>
                                ) : (
                                    userPublicStocklists.map(stocklist => (
                                        <div key={`my-public-${stocklist.stocklistid}`} className="stocklist-item">
                                            <h4>Stocklist #{stocklist.stocklistid}</h4>

                                            <div className="stocklist-total-value">
                                            <strong>Total Value:</strong> ${stocklistValues[stocklist.stocklistid] || "Calculating..."}
                                        </div>
                                            
                                            <div className="stocks-list">
                                                <h5>Stocks in this list:</h5>
                                                {stocklistStocks[stocklist.stocklistid]?.length > 0 ? (
                                                    <ul>
                                                        {stocklistStocks[stocklist.stocklistid].map(stock => (
                                                            <li key={`stock-${stock.code}`}>
                                                                {stock.code} - {stock.noshares} shares
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No stocks in this list</p>
                                                )}
                                            </div>

                                            {stocklistStocks[stocklist.stocklistid]?.length > 0 && (
                                                <button
                                                    onClick={() => navigateToHistorical(stocklistStocks[stocklist.stocklistid][0].code, stocklist.stocklistid)}
                                                    className="historical-btn"
                                                >
                                                    View Historical/Future Stocks
                                                </button>
                                            )}
                                            
                                            <button
                                                className="view-reviews-btn"
                                                onClick={() => fetchReviewsForStocklist(stocklist.stocklistid)}
                                            >
                                                View All Reviews
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
            
                            <div className="right-container">
                                <h3>All Other Public Stocklists</h3>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : otherPublicStocklists.length === 0 ? (
                                    <p>No other public stocklists available.</p>
                                ) : (
                                    otherPublicStocklists.map(stocklist => (
                                        <div key={`other-public-${stocklist.stocklistid}`} className="stocklist-item">
                                            <h4>Stocklist #{stocklist.stocklistid} by {stocklist.userid}</h4>
                                            <div className="stocklist-total-value">
                                            <strong>Total Value:</strong> ${stocklistValues[stocklist.stocklistid] || "Calculating..."}
                                        </div>
                                            <div className="stocks-list">
                                                <h5>Stocks in this list:</h5>
                                                {stocklistStocks[stocklist.stocklistid]?.length > 0 ? (
                                                    <ul>
                                                        {stocklistStocks[stocklist.stocklistid].map(stock => (
                                                            <li key={`stock-${stock.code}`}>
                                                                {stock.code} - {stock.noshares} shares
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No stocks in this list</p>
                                                )}
                                            </div>

                                            {stocklistStocks[stocklist.stocklistid]?.length > 0 && (
                                                <button
                                                    onClick={() => navigateToHistorical(stocklistStocks[stocklist.stocklistid][0].code, stocklist.stocklistid)}
                                                    className="historical-btn"
                                                >
                                                    View Historical/Future Stocks
                                                </button>
                                            )}
                                            
                                            <div className="review-controls">
                                                <button
                                                    className="view-reviews-btn"
                                                    onClick={() => fetchReviewsForStocklist(stocklist.stocklistid)}
                                                >
                                                    View All Reviews
                                                </button>
                                                <div className="review-form">
                                                    <textarea
                                                        value={reviewTexts[stocklist.stocklistid] || ""}
                                                        onChange={(e) => setReviewTexts({
                                                            ...reviewTexts,
                                                            [stocklist.stocklistid]: e.target.value
                                                        })}
                                                        placeholder="Write your review (max 4000 chars)"
                                                        maxLength={4000}
                                                        rows={4}
                                                    />
                                                    <div className="char-count">
                                                        {(reviewTexts[stocklist.stocklistid]?.length || 0)}/4000 characters
                                                    </div>
                                                    <button
                                                        onClick={() => handleSubmitReview(stocklist.stocklistid)}
                                                        className="submit-review-btn"
                                                        disabled={!reviewTexts[stocklist.stocklistid]?.trim()}
                                                    >
                                                        {existingReviews[stocklist.stocklistid] ? "Update Review" : "Submit Review"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        
            {activeTab === 'manage' && (
                <div className="shared-tab">
                    {viewingReviewsFor ? (
                        <div className="reviews-view">
                            <button 
                                className="back-button"
                                onClick={() => setViewingReviewsFor(null)}
                            >
                                ← Back to Shared Stocklists
                            </button>
                            <h3>Reviews for Stocklist #{viewingReviewsFor}</h3>
                            {loading ? (
                                <p>Loading reviews...</p>
                            ) : currentReviews.length === 0 ? (
                                <p>No reviews yet for this stocklist</p>
                            ) : (
                                <div className="reviews-list">
                                    {currentReviews.map(review => (
                                        <div key={`shared-review-${review.review_id}`} className="review-item">
                                            <div className="review-header">
                                                <span className="reviewer">{review.reviewer_name || review.reviewer_id}</span>
                                                {(review.reviewer_id === user || 
                                                sharedByUserStocklists.some(s => s.stocklistid === viewingReviewsFor)) && (
                                                    <button
                                                        onClick={() => handleDeleteReview(review.review_id, viewingReviewsFor)}
                                                        className="delete-review-btn"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                            <p className="review-text">{review.review_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="split-container">
                            <div className="left-container">
                                <h3>Your Shared Stocklists</h3>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : sharedByUserStocklists.length === 0 ? (
                                    <p>You haven't shared any stocklists yet</p>
                                ) : (
                                    sharedByUserStocklists.map((stocklist, index) => (
                                        <div key={`shared-by-${stocklist.stocklistid}-${index}`} className="stocklist-item">
                                            <h4>Stocklist #{stocklist.stocklistid}</h4>
                                            <div className="stocklist-total-value">
                                            <strong>Total Value:</strong> ${stocklistValues[stocklist.stocklistid] || "Calculating..."}
                                        </div>
                                            <div className="stocks-list">
                                                <h5>Stocks in this list:</h5>
                                                {stocklistStocks[stocklist.stocklistid]?.length > 0 ? (
                                                    <ul>
                                                        {stocklistStocks[stocklist.stocklistid].map(stock => (
                                                            <li key={`stock-${stock.code}`}>
                                                                {stock.code} - {stock.noshares} shares
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No stocks in this list</p>
                                                )}
                                            </div>

                                            {stocklistStocks[stocklist.stocklistid]?.length > 0 && (
                                                <button
                                                    onClick={() => navigateToHistorical(stocklistStocks[stocklist.stocklistid][0].code, stocklist.stocklistid)}
                                                    className="historical-btn"
                                                >
                                                    View Historical/Future Stocks
                                                </button>
                                            )}
                                            
                                            <button
                                                className="view-reviews-btn"
                                                onClick={() => fetchReviewsForStocklist(stocklist.stocklistid)}
                                            >
                                                View All Reviews
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="right-container">
                                <h3>Shared With You</h3>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : sharedWithUserStocklists.length === 0 ? (
                                    <p>No stocklists have been shared with you</p>
                                ) : (
                                    sharedWithUserStocklists.map(stocklist => (
                                        <div key={`shared-with-${stocklist.stocklistid}`} className="stocklist-item">
                                            <h4>Stocklist #{stocklist.stocklistid} by {stocklist.owner_id}</h4>
                                            <div className="stocklist-total-value">
                                            <strong>Total Value:</strong> ${stocklistValues[stocklist.stocklistid] || "Calculating..."}
                                        </div>
                                            <div className="stocks-list">
                                                <h5>Stocks in this list:</h5>
                                                {stocklistStocks[stocklist.stocklistid]?.length > 0 ? (
                                                    <ul>
                                                        {stocklistStocks[stocklist.stocklistid].map(stock => (
                                                            <li key={`stock-${stock.code}`}>
                                                                {stock.code} - {stock.noshares} shares
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No stocks in this list</p>
                                                )}
                                            </div>

                                            {stocklistStocks[stocklist.stocklistid]?.length > 0 && (
                                                <button
                                                    onClick={() => navigateToHistorical(stocklistStocks[stocklist.stocklistid][0].code, stocklist.stocklistid)}
                                                    className="historical-btn"
                                                >
                                                    View Historical/Future Stocks
                                                </button>
                                            )}
                                            
                                            <div className="review-controls">
                                                <div className="review-form">
                                                    <textarea
                                                        value={reviewTexts[stocklist.stocklistid] || ""}
                                                        onChange={(e) => setReviewTexts({
                                                            ...reviewTexts,
                                                            [stocklist.stocklistid]: e.target.value
                                                        })}
                                                        placeholder="Write your review (max 4000 chars)"
                                                        maxLength={4000}
                                                        rows={4}
                                                    />
                                                    <div className="char-count">
                                                        {(reviewTexts[stocklist.stocklistid]?.length || 0)}/4000 characters
                                                    </div>
                                                    <button
                                                        onClick={() => handleSubmitReview(stocklist.stocklistid)}
                                                        className="submit-review-btn"
                                                        disabled={!reviewTexts[stocklist.stocklistid]?.trim()}
                                                    >
                                                        {existingReviews[stocklist.stocklistid] ? "Update Review" : "Submit Review"}
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteReview(existingReviews[stocklist.stocklistid], stocklist.stocklistid)}
                                                        className="delete-review-btn"
                                                    >
                                                        Delete Review
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Review;