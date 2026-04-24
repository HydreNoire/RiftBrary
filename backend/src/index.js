// src/index.js
// Point d'entrée du serveur Express Rifbound.
// Lance les middlewares dans l'ordre correct, monte les routes,
// puis démarre le serveur HTTP.

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { port, nodeEnv } = require('./config/env');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// ─── Sécurité ────────────────────────────────────────────────────────────────
// helmet pose des headers HTTP de sécurité (HSTS, XSS protection, etc.)
app.use(helmet());

// Rate limiter global : 200 requêtes / 15 min par IP
// Ajuste selon tes besoins (le sync Riot API peut en consommer plus en interne)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Trop de requêtes, réessaie dans quelques minutes.' } },
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(corsMiddleware);

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging minimal en dev ──────────────────────────────────────────────────
if (nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── 404 & Erreurs ───────────────────────────────────────────────────────────
// notFound DOIT être avant errorHandler
app.use(notFound);
app.use(errorHandler);

// ─── Démarrage ───────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`[server] Rifbound API démarrée — http://localhost:${port} (${nodeEnv})`);
  console.log(`[server] Health check → http://localhost:${port}/api/health`);
});

// Gestion des erreurs non catchées (évite que le process crash silencieusement)
process.on('uncaughtException', (err) => {
  console.error('[process] uncaughtException :', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandledRejection :', reason);
  process.exit(1);
});

module.exports = app; // Utile pour les tests
