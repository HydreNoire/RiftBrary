// src/sync/run.js
require('dotenv').config({ path: '../.env' });
const { runSync } = require('./index');

runSync()
  .then((stats) => {
    console.log('[sync] Résumé :', stats);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[sync] Erreur fatale :', err);
    process.exit(1);
  });