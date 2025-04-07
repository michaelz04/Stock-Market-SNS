import { useState, useEffect } from 'react';
import axios from 'axios';
import './Friend.css';

const API_BASE_URL = 'http://localhost:3001';

function Friend() {
  const user = localStorage.getItem("user");
    const [friendUsername, setFriendUsername] = useState("");
    const [message, setMessage] = useState("");
    //const [messageType, setMessageType] = useState("");
    const [pendingRequests, setPendingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [activeTab, setActiveTab] = useState("send");

    const [friendsList, setFriendsList] = useState([]);

    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        if (user) {
            fetchPendingRequests();
            fetchOutgoingRequests();
            fetchFriendsList();
            fetchAllUsers();
        }
    }, [user]);


    const fetchAllUsers = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/all-users`, {
            params: { currentUser: user }
          });
          setAllUsers(response.data.users);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };

    const fetchFriendsList = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/friends-list`, {
            params: { userId: user }
          });
          setFriendsList(response.data.friends);
        } catch (error) {
          console.error("Error fetching friends list:", error);
        }
      };

    
    const fetchPendingRequests = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/pending-requests`, {
                params: { userId: user }
            });
            setPendingRequests(response.data.requests);
        } catch (error) {
            console.error("Error fetching pending requests:", error);
        }
    };

    const fetchOutgoingRequests = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/outgoing-requests`, {
                params: { userId: user }
            });
            setOutgoingRequests(response.data.requests);
        } catch (error) {
            console.error("Error fetching outgoing requests:", error);
        }
    };

    const handleRemoveFriend = async (friendId) => {
        if (!window.confirm(`Are you sure you want to remove ${friendId} as a friend?`)) {
          return;
        }
        
        try {
          const response = await axios.post(`${API_BASE_URL}/remove-friend`, {
            userId: user,
            friendId
          });
          
          setMessage(response.data.message);
          //setMessageType("success");
          await fetchFriendsList(); // Refresh the list
        } catch (error) {
          setMessage(error.response?.data?.message || "Error removing friend");
        //   setMessageType("error");
        }
      };

    const handleSendRequest = async () => {
        if (!friendUsername.trim()) {
            setMessage("Please enter a username");
            // setMessageType("error");
            return;
        }

        try {
            const statusResponse = await axios.get(`${API_BASE_URL}/friendship-status`, {
                params: {
                    user1: user,
                    user2: friendUsername
                }
            });

            const status = statusResponse.data.status;

            if (status === 'already_friends') {
                setMessage(`You are already friends with ${friendUsername}`);
                // setMessageType("error");
                return;
            }

            if (status === 'outgoing_request_exists') {
                setMessage(`You already sent a friend request to ${friendUsername}`);
                // setMessageType("error");
                return;
            }

            if (status === 'incoming_request_exists') {
                setMessage(`${friendUsername} already sent you a request. Accepting...`);
                // setMessageType("info");
            }
            
            if (status === 'no_relationship') {
                console.log("No prior relationship - sending new request");
            }
            //This is if status === incoming_request_status (if a 2nd user already sent a friend request)
            // or status === 'no_relationship', which in both cases
            // we will consider it as a "send-friend-request" case where, we accept user1, user2 and put it in
            // FriendsWith with conditions user1 < user2.

            const response = await axios.post(`${API_BASE_URL}/send-friend-request`, {
                senderId: user,
                receiverId: friendUsername
            });

            setMessage(response.data.message);
            // setMessageType("success");
            setFriendUsername("");

            await fetchPendingRequests(); //Need to do all 3 to prevent a bug where theres a incoming friend request, and user types to add this person anyways.
            await fetchFriendsList(); //Can choose to check which status to do which await()
            await fetchOutgoingRequests(); //After a user sends a friend request make sure to update outgoing.

        } catch (error) {
            if (error.response) {
                setMessage(error.response.data.message);
            } else {
                setMessage("An error occurred while processing your request");
            }
            // setMessageType("error");
            console.error(error);
        }
    };

    const handleRespondToRequest = async (senderId, action) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/respond-to-request`, {
                senderId,
                receiverId: user,
                action
            });
            
            setMessage(response.data.message);
            // setMessageType("success");
            await fetchPendingRequests();
            await fetchFriendsList();
        } catch (error) {
            
            setMessage(error.response?.data?.message || "Error processing request");
            // setMessageType("error");
            console.error(error);
        }
    };

    const handleCancelRequest = async (receiverId) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/cancel-request`, {
                senderId: user,
                receiverId
            });
            
            setMessage(response.data.message);
            //setMessageType("success");
            await fetchOutgoingRequests();
        } catch (error) {
            setMessage(error.response?.data?.message || "Error cancelling request");
            //setMessageType("error");
            console.error(error);
        }
    };

    return (
        <div className='friend-body'>
            <h2>Hello {user}</h2>
            
            <div className="tabs">
                <button 
                    className={activeTab === "send" ? "active" : ""} 
                    onClick={() => setActiveTab("send")}
                >
                    Send Request
                </button>
                <button 
                    className={activeTab === "pending" ? "active" : ""} 
                    onClick={() => setActiveTab("pending")}
                >
                    Pending Requests ({pendingRequests.length})
                </button>
                <button 
                    className={activeTab === "outgoing" ? "active" : ""} 
                    onClick={() => setActiveTab("outgoing")}
                >
                    Outgoing Requests ({outgoingRequests.length})
                </button>

                <button 
                className={activeTab === "friends" ? "active" : ""} 
                onClick={() => setActiveTab("friends")}
                >
                 Friends List ({friendsList.length})
                </button>

                <button 
                className={activeTab === "allUsers" ? "active" : ""}
                onClick={() => {
                setActiveTab("allUsers");
                fetchAllUsers();
                }}
            >
                All Users ({allUsers.length})
            </button>

            </div>
            
            {activeTab === "send" && (
                <div className="friend-request-section">
                    <h3>Send Friend Request</h3>
                    <input
                        type="text"
                        value={friendUsername}
                        onChange={(e) => setFriendUsername(e.target.value)}
                        placeholder="Enter friend's username"
                    />
                    <button onClick={handleSendRequest}>Send Request</button>
                </div>
            )}
            
            {activeTab === "pending" && (
                <div className="requests-section">
                    <h3>Pending Friend Requests</h3>
                    {pendingRequests.length === 0 ? (
                        <p>No pending requests</p>
                    ) : (
                        <ul className="requests-list">
                            {pendingRequests.map((request, index) => (
                                <li key={index} className="request-item">
                                    <span>{request.senderid}</span>
                                    <div>
                                        <button 
                                            className="accept-btn"
                                            onClick={() => handleRespondToRequest(request.senderid, 'accept')}
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            className="decline-btn"
                                            onClick={() => handleRespondToRequest(request.senderid, 'decline')}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            
            {activeTab === "outgoing" && (
                <div className="requests-section">
                    <h3>Outgoing Friend Requests</h3>
                    {outgoingRequests.length === 0 ? (
                        <p>No outgoing requests</p>
                    ) : (
                        <ul className="requests-list">
                            {outgoingRequests.map((request, index) => (
                                <li key={index} className="request-item">
                                    <span>{request.receiverid}</span>
                                    <button 
                                        className="cancel-btn"
                                        onClick={() => handleCancelRequest(request.receiverid)}
                                    >
                                        Cancel
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {activeTab === "friends" && (
            <div className="friends-section">
                <h3>Your Friends</h3>
                {friendsList.length === 0 ? (
                <p>You don't have any friends yet</p>
                ) : (
                <ul className="friends-list">
                    {friendsList.map((friend, index) => (
                    <li key={index} className="friend-item">
                        <span>{friend.friendid}</span>
                        <button 
                        className="remove-btn"
                        onClick={() => handleRemoveFriend(friend.friendid)}
                        >
                        Remove
                        </button>
                    </li>
                    ))}
                </ul>
                )}
            </div>
            )}

            {activeTab === "allUsers" && (
            <div className="users-list">
                <h3>All Users</h3>
                <ul>
                {allUsers.map((userData, index) => (
                    <li key={index}>{userData.userid}</li>
                ))}
                </ul>
            </div>
            )}
                        
            {message && <div className="message">{message}</div>}
        </div>
    );
}

export default Friend;