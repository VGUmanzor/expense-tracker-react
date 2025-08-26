import axios from "axios";

// Crea una instancia de axios para conectarte con la API backend
const Api = axios.create({
  baseURL: "https://localhost:7026/api", // Cambia este URL según el puerto de tu backend
  headers: {
    "Content-Type": "application/json",
  },
});

export default Api;