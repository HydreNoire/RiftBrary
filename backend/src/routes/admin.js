// src/routes/admin.js
// Routes d'administration — uniquement accessibles avec le header X-Sync-Secret.
// Auth basique suffisante pour l'instant (Phase 3 ajoutera un vrai système d'auth).
//
// Endpoint disponible :
//   POST /api/admin/sync  → Lance le sync Riftbound

const express   = require('express');
const router    = express.Router();
const { runSync } = require('../sync');

// Middleware de protection : vérifie le header X-Sync-Secret
// Ajoute SYNC_SECRET dans ton .env (une chaîne aléatoire, genre un UUID)
router.use((req, res, next) => {
  const secret = process.env.SYNC_SECRET;

  if (!secret) {
    console.error('[admin] SYNC_SECRET non défini dans .env — routes admin désactivées');
    return res.status(503).json({ error: { message: 'Routes admin non configurées' } });
  }

  if (req.headers['x-sync-secret'] !== secret) {
    return res.status(401).json({ error: { message: 'Non autorisé' } });
  }

  next();
});

/**
 * POST /api/admin/sync
 * Lance le sync complet depuis l'API Riftcodex.
 *
 * Usage :
 *   curl -X POST http://localhost:3001/api/admin/sync \
 *     -H "X-Sync-Secret: ton-secret"
 *
 * Réponse :
 *   { inserted: 298, updated: 0, skipped: 0, errors: [], duration: "12.4s" }
 */
router.post('/sync', async (req, res, next) => {
  try {
    console.log('[admin] Sync déclenché manuellement');
    const result = await runSync();
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/sync/:setCode
 * Sync un seul set (utile pour les mises à jour partielles et les tests).
 *
 * Usage :
 *   curl -X POST http://localhost:3001/api/admin/sync/OGN \
 *     -H "X-Sync-Secret: ton-secret"
 */
router.post('/sync/:setCode', async (req, res, next) => {
  try {
    const { setCode } = req.params;
    console.log(`[admin] Sync set "${setCode}" déclenché manuellement`);
    // TODO Phase suivante : exposer runSync(setCode) pour les syncs partiels
    res.json({ success: true, message: `Sync du set "${setCode}" — à implémenter` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
