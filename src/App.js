import './App.css';
import React, { useState } from 'react';
import UserPage from './Complements/UserPage/UserPage';
import LoginPage from './Complements/LoginPage/LoginPage';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TransactionManager from "./Complements/UserPage/UserPage";

const App = () => {
  const [token, setToken] = useState(null);
  return (
    <Router>
      <div className="main-body">
        <Routes>
          <Route path="/" element={<LoginPage setToken={setToken}/>} />
          <Route path="/user" element={<TransactionManager authToken={token} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
