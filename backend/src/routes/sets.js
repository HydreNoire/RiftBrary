const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/sets ────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        s.id,
        s.code,
        s.name,
        s.release_date_en,
        COUNT(c.id)                                          AS total_cards,
        COUNT(c.id) FILTER (WHERE c.variant_type IS NULL)    AS base_cards,
        COUNT(c.id) FILTER (WHERE c.variant_type IS NOT NULL) AS variant_cards
      FROM sets s
      LEFT JOIN cards c ON c.set_id = s.id AND c.is_token = false
      GROUP BY s.id
      ORDER BY s.release_date_en ASC
    `);

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sets/:code ──────────────────────────────────────────────────────
router.get('/:code', async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();

    const [setResult, statsResult] = await Promise.all([
      db.query(`SELECT * FROM sets WHERE code = $1`, [code]),
      db.query(`
        SELECT
          category,
          rarity,
          COUNT(*) AS count
        FROM cards
        WHERE set_id = (SELECT id FROM sets WHERE code = $1)
          AND is_token = false
          AND variant_type IS NULL
        GROUP BY category, rarity
        ORDER BY category, rarity
      `, [code]),
    ]);

    if (setResult.rows.length === 0) {
      return res.status(404).json({ error: { message: `Set introuvable : ${code}` } });
    }

    // Regroupe les stats par catégorie
    const byCategory = statsResult.rows.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = {};
      acc[row.category][row.rarity] = parseInt(row.count);
      return acc;
    }, {});

    res.json({
      data: {
        ...setResult.rows[0],
        stats: byCategory,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;