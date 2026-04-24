// src/routes/cards.js
// Route placeholder pour la bibliothèque de cartes.
// La logique complète (filtres, full-text search, join sets) sera développée en Phase 1.
// Pour l'instant : structure de réponse cohérente + health check de la BDD.

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/cards
 * Liste paginée des cartes. Paramètres query supportés (Phase 1) :
 *   - page    : numéro de page (défaut 1)
 *   - limit   : résultats par page (défaut 20, max 100)
 *   - type    : filtrer par type de carte
 *   - set     : filtrer par set
 *   - search  : recherche full-text sur le nom
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // TODO Phase 1 : construire la vraie requête avec filtres dynamiques
    // Pour l'instant on vérifie juste que la BDD répond
    const result = await db.query(
      'SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = $1',
      ['public']
    );

    res.json({
      data: [],
      pagination: {
        page,
        limit,
        offset,
        total: 0,
        totalPages: 0,
      },
      _dev: `BDD accessible — ${result.rows[0].total} tables dans le schéma public`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/:id
 * Détail d'une carte par son ID ou son slug.
 * Implémentation complète en Phase 1.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO Phase 1
    res.json({ data: null, _dev: `Carte ${id} — endpoint à implémenter en Phase 1` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
