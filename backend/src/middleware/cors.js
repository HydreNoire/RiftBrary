// src/middleware/cors.js
// Configure CORS pour autoriser uniquement les origines déclarées dans .env.
// En dev : localhost. En prod : ton domaine Vercel.

const cors = require('cors');
const { corsOrigins, isProduction } = require('../config/env');

const corsOptions = {
  origin: (origin, callback) => {
    // Autorise les requêtes sans origine (Postman, curl, etc.) en dev
    if (!origin && !isProduction) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origine non autorisée par la politique CORS : ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

module.exports = cors(corsOptions);
