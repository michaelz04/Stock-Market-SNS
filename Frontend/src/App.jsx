import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState, createContext, useContext } from "react";
import Login from './Login';
import Home from './Home';
import Portfolio from './Portfolio';
import Stocklist from './Stocklist';
import Friend from './Friend';

export const UserContext = createContext();

function App() {
  const [user, setUser] = useState("");

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <UserContext.Provider value={{user, setUser}}>
            <Login />
          </UserContext.Provider>
          } />
        <Route path="/home" element={
          <UserContext.Provider value={user}>
            <Home />
          </UserContext.Provider>
          } />
        <Route path="/portfolios" element={
          <UserContext.Provider value={user}>
            <Portfolio />
          </UserContext.Provider>
          } />
        <Route path="/stocklists" element={
          <UserContext.Provider value={user}>
            <Stocklist />
          </UserContext.Provider>
          } />
        <Route path="/friends" element={
          <UserContext.Provider value={user}>
            <Friend />
          </UserContext.Provider>
          } />
      </Routes>
    </Router>
  );
}

export default App;
