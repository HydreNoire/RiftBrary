// src/routes/index.js
// Point d'entrée central pour toutes les routes API.
// Ajouter ici les nouvelles routes au fur et à mesure des phases.

const express = require('express');
const router = express.Router();

const cardsRouter = require('./cards');
const setsRouter = require('./sets');
const adminRouter = require('./admin');

// Health check — utilisé par Render pour vérifier la dispo du service
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rifbound-api',
  });
});

router.use('/cards', cardsRouter);
router.use('/sets', setsRouter);
router.use('/admin', adminRouter);

module.exports = router;
