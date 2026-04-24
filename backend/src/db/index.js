// src/db/index.js
// Pool de connexions PostgreSQL via node-postgres.
// On utilise le driver pg directement plutôt que le client Supabase
// pour les requêtes SQL complexes (filtres, jointures, full-text search).
// Le client Supabase (@supabase/supabase-js) sera utilisé pour l'auth et le realtime.

const { Pool } = require('pg');
const { databaseUrl, isProduction } = require('../config/env');

const pool = new Pool({
  connectionString: databaseUrl,
  // Supabase exige SSL en production. En dev local tu peux désactiver.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Taille du pool : Render free tier a des limites de connexions
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Vérifie la connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error('[db] Impossible de se connecter à PostgreSQL :', err.message);
    process.exit(1);
  }
  release();
  console.log('[db] Connexion PostgreSQL établie');
});

/**
 * Exécute une requête SQL paramétrée.
 * @param {string} text   - Requête SQL avec $1, $2, etc.
 * @param {Array}  params - Paramètres positionnels
 * @returns {Promise<import('pg').QueryResult>}
 *
 * @example
 * const result = await db.query('SELECT * FROM cards WHERE id = $1', [cardId]);
 */
const query = (text, params) => pool.query(text, params);

/**
 * Récupère un client du pool pour les transactions multi-requêtes.
 * Pense à appeler client.release() dans un bloc finally.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
