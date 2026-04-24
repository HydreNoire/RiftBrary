// src/routes/cards.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/cards ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM cards_full
         ORDER BY set->>'code', card_number
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM cards_full`),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/cards/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Accepte un ID numérique ou un slug texte
    const isNumeric = /^\d+$/.test(id);
    const result = await db.query(
      `SELECT * FROM cards_full WHERE ${isNumeric ? 'id = $1' : 'slug = $1'}`,
      [isNumeric ? parseInt(id) : id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: `Carte introuvable : ${id}` } });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;