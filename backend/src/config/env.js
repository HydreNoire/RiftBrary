// src/config/env.js
// Charge et valide toutes les variables d'environnement au démarrage.
// Si une variable critique manque, le serveur s'arrête immédiatement avec
// un message clair — mieux vaut crasher tôt que d'avoir des erreurs silencieuses.

require('dotenv').config();

const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('[config] Variables d\'environnement manquantes :', missing.join(', '));
  console.error('[config] Copie .env.example vers .env et remplis les valeurs.');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // PostgreSQL direct (Supabase connection string — mode "Transaction" ou "Session")
  databaseUrl: process.env.DATABASE_URL,

  // Supabase client (pour auth et realtime côté serveur)
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY, // service_role (secret, jamais côté front)

  // CORS : liste d'origines autorisées séparées par des virgules
  // Ex : "http://localhost:5500,https://rifbound.vercel.app"
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map((o) => o.trim()),
};
