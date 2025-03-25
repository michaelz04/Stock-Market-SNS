import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState, createContext, useContext } from "react";
import Login from './Login';
import Home from './Home';

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
      </Routes>
    </Router>
  );
}

export default App;
