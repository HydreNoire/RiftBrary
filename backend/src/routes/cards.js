// src/routes/cards.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const cache = require('../cache');

// ─── GET /api/cards ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    const add = (sql, value) => {
      params.push(value);
      conditions.push(sql.replace('?', `$${params.length}`));
    };

    if (req.query.set) add(`set->>'code' = ?`, req.query.set.toUpperCase());
    if (req.query.category) add('category = ?',      req.query.category.toLowerCase());
    if (req.query.rarity) add('rarity = ?',        req.query.rarity.toLowerCase());
    if (req.query.cost) add('energy_cost = ?',   parseInt(req.query.cost));
    if (req.query.variant_type === 'base') {
      conditions.push('variant_type IS NULL');
    } else if (req.query.variant_type) {
      add('variant_type = ?', req.query.variant_type.toLowerCase());
    }
    if (req.query.search) {
      params.push(req.query.search);
      conditions.push(`search_vector @@ websearch_to_tsquery('english', $${params.length})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const hasFilters = conditions.length > 0 || page > 1 || limit !== 20;
    const CACHE_KEY = 'cards:default';

    // ── Cache hit ─────────────────────────────────────────────────────────────
    if (!hasFilters) {
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=300');
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    }

    // ── Requêtes BDD ──────────────────────────────────────────────────────────
    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM cards_full ${where}
         ORDER BY set->>'code', card_number
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM cards_full ${where}`, params),
    ]);

    const total      = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    const payload    = {
      data: dataResult.rows.map(({ search_vector, ...card }) => card),
      pagination: { page, limit, total, totalPages },
    };

    if (!hasFilters) cache.set(CACHE_KEY, payload);

    res.set('Cache-Control', hasFilters ? 'no-store' : 'public, max-age=300');
    res.set('X-Cache', 'MISS');
    res.json(payload);
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