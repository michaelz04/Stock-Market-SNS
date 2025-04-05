import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Review.css';

const API_BASE_URL = 'http://localhost:3001';

function Review() {
    const user = localStorage.getItem("user");
    const [activeTab, setActiveTab] = useState('share');
    
    // Share tab states
    const [sharableStocklists, setSharableStocklists] = useState([]);
    const [shareInputs, setShareInputs] = useState({});
    const [sharedUsers, setSharedUsers] = useState({});
    
    // Review tab states
    const [userPublicStocklists, setUserPublicStocklists] = useState([]);
    const [otherPublicStocklists, setOtherPublicStocklists] = useState([]);
    
    // Shared tab states
    const [sharedByUserStocklists, setSharedByUserStocklists] = useState([]);
    const [sharedWithUserStocklists, setSharedWithUserStocklists] = useState([]);
    
    // Common states
    const [reviewTexts, setReviewTexts] = useState({});
    const [existingReviews, setExistingReviews] = useState({});
    const [viewingReviewsFor, setViewingReviewsFor] = useState(null);
    const [currentReviews, setCurrentReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!user) return;
        
        if (activeTab === 'share') {
            fetchSharableStocklists();
        } else if (activeTab === 'review') {
            fetchPublicStocklists();
        } else if (activeTab === 'manage') {
            fetchSharedStocklists();
        }
    }, [activeTab, user]);

    // Share tab functions
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

    // Review tab functions
    const fetchPublicStocklists = async () => {
        setLoading(true);
        try {
            // Fetch user's public stocklists
            const userPublicResponse = await axios.get(`${API_BASE_URL}/stocklists-public`, {
                params: { userId: user }
            });
            setUserPublicStocklists(userPublicResponse.data);

            // Fetch all other public stocklists
            const otherPublicResponse = await axios.get(`${API_BASE_URL}/stocklists-public-others`, {
                params: { userId: user }
            });
            setOtherPublicStocklists(otherPublicResponse.data);

            // Load user's existing reviews
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
            
            setError("");
        } catch (err) {
            setError("Failed to fetch public stocklists");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Shared tab functions
    const fetchSharedStocklists = async () => {
        setLoading(true);
        try {
            // Get stocklists shared BY the user
            const sharedByResponse = await axios.get(`${API_BASE_URL}/stocklists-shared-by-user`, {
                params: { userId: user }
            });
            setSharedByUserStocklists(sharedByResponse.data);

            // Get stocklists shared WITH the user
            const sharedWithResponse = await axios.get(`${API_BASE_URL}/stocklists-shared-with-user`, {
                params: { userId: user }
            });
            setSharedWithUserStocklists(sharedWithResponse.data);

            // Load user's existing reviews
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
            
            setError("");
        } catch (err) {
            setError("Failed to fetch shared stocklists");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Common functions
    const fetchReviewsForStocklist = async (stocklistId) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/stocklist-reviews`, {
                params: { 
                    stocklistId,
                    userId: user // Add this line
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
            
            // Refresh data
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
            
            // Refresh data
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
                        <div key={`other-public-${stocklist.stocklistid}-${stocklist.userid}`} className="stocklist-item">
                          <h4>Stocklist #{stocklist.stocklistid} by {stocklist.userid}</h4>
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
              <div key={`shared-with-${stocklist.stocklistid}-${stocklist.owner_id}`} className="stocklist-item">
                <h4>Stocklist #{stocklist.stocklistid} by {stocklist.owner_id}</h4>
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