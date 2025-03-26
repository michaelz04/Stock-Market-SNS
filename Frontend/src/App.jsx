import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useState, createContext, useEffect } from "react";
import Login from "./Login";
import Home from "./Home";
import Portfolio from "./Portfolio";
import Stocklist from "./Stocklist";
import Friend from "./Friend";
import Navbar from "./Navbar";

export const UserContext = createContext();

function App() {
  const [user, setUser] = useState(() => localStorage.getItem("user"));

  useEffect(() => {
    localStorage.setItem("user", user);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Router>
        <AppContent />
      </Router>
    </UserContext.Provider>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <>
      {location.pathname !== "/" && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/portfolios" element={<Portfolio />} />
        <Route path="/stocklists" element={<Stocklist />} />
        <Route path="/friends" element={<Friend />} />
      </Routes>
    </>
  );
}

export default App;
