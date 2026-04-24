// src/middleware/errorHandler.js
// Gestionnaire d'erreurs global Express (4 paramètres = middleware d'erreur).
// Doit être le DERNIER middleware enregistré dans index.js.

const { isProduction } = require('../config/env');

/**
 * Formate toutes les erreurs non gérées en réponse JSON cohérente.
 * En production, on masque les détails internes (stack traces).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erreur interne du serveur';

  // Log complet côté serveur
  console.error(`[error] ${req.method} ${req.path} → ${status}`, err);

  res.status(status).json({
    error: {
      message: isProduction && status === 500 ? 'Erreur interne du serveur' : message,
      // Stack trace uniquement en développement
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
};

/**
 * Middleware pour les routes inexistantes (404).
 * À placer avant errorHandler dans index.js.
 */
const notFound = (req, res) => {
  res.status(404).json({
    error: { message: `Route introuvable : ${req.method} ${req.path}` },
  });
};

module.exports = { errorHandler, notFound };
