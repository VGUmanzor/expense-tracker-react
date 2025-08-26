import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 
import jwt_decode from "jwt-decode";
import './LoginPage.css';

// ...existing code...
const Login = ({ setToken }) => {
  const [email, setemail] = useState("");  
  const [password, setPassword] = useState("");  
  const [isRegister, setIsRegister] = useState(false); 
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("https://localhost:7026/api/Auth/login", { email, password });
      if (response.data && response.data.token) {
        setToken(response.data.token);  
        localStorage.setItem("authToken", response.data.token); 
        console.log("Login successful:", response.data.token);
        navigate("/user")
      } else {
        console.error("No token received.");
      }
    } catch (error) {
      console.error("Login failed:", error);  
    }
  };


const handleRegister = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.post("https://localhost:7026/api/Users/register", {
      email,
      password: password, 
    });
    if (response.status === 200 || response.status === 201) {
      alert("User registered successfully. You can now log in.");
      setIsRegister(false);
      setemail("");
      setPassword("");
    } else {
      alert("Error registering user.");
    }
  } catch (error) {
    alert("Error registering user.");
    console.error("Register failed:", error);
  }
};

  return (
    <div className="containerLogin body">
      <div className="wrapper">
        <h2 className="form-signin-heading">{isRegister ? "Register" : "Login"}</h2>
        <form className="form-signin" onSubmit={isRegister ? handleRegister : handleLogin}>
          <input
            className="form-control"
            type="text"
            placeholder="Email"
            value={email}
            onChange={(e) => setemail(e.target.value)} 
          />
          <input
            className="form-control"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button className="btn btn-lg btn-primary btn-block" type="submit">
            {isRegister ? "Register" : "Login"}
          </button>
        </form>
        <button
          className="btn btn-link"
          style={{ marginTop: "10px" }}
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? "You have an account? Log in" : "You don't have an account? Register"}
        </button>
      </div>
    </div>
  );
};

export default Login;
