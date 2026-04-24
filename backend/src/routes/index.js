// src/routes/index.js
// Point d'entrée central pour toutes les routes API.
// Ajouter ici les nouvelles routes au fur et à mesure des phases.

const express = require('express');
const router = express.Router();

const cardsRouter = require('./cards');
// Phase 1+  : const setsRouter    = require('./sets');
// Phase 2+  : const decksRouter   = require('./decks');
// Phase 3+  : const usersRouter   = require('./users');
// Phase 3+  : const collectRouter = require('./collection');

// Health check — utilisé par Render pour vérifier que le service est vivant
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rifbound-api',
  });
});

router.use('/cards', cardsRouter);
// router.use('/sets',       setsRouter);
// router.use('/decks',      decksRouter);
// router.use('/users',      usersRouter);
// router.use('/collection', collectRouter);

module.exports = router;
