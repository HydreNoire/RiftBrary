// src/sync/sources/riftcodex.js
// Adaptateur pour l'API Riftcodex (https://api.riftcodex.com)
// Gratuite, sans auth, disponible maintenant.
//
// Quand la clé Riot officielle sera approuvée, on créera un fichier
// src/sync/sources/riot.js avec la même interface (fetchCardsBySet / fetchSets)
// et on changera juste l'import dans sync/index.js — rien d'autre à toucher.

const BASE_URL = 'https://api.riftcodex.com';
const PAGE_SIZE = 100; // Max autorisé par l'API

/**
 * Récupère toutes les cartes d'un set depuis Riftcodex.
 * Gère la pagination automatiquement.
 *
 * @param {string} setCode - Code Riftcodex du set : 'ogn', 'sfd', etc.
 * @returns {Promise<Array>} Tableau de toutes les cartes du set
 */
async function fetchCardsBySet(setCode) {
  const allCards = [];
  let page = 1;

  console.log(`[riftcodex] Récupération du set "${setCode}"...`);

  while (true) {
    const url = `${BASE_URL}/cards?set_id=${setCode}&size=${PAGE_SIZE}&page=${page}&sort=collector_number&dir=1`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Riftcodex API ${res.status} — set=${setCode} page=${page}`);
    }

    const data = await res.json();

    // L'API retourne [] quand il n'y a plus de résultats
    if (!Array.isArray(data) || data.length === 0) break;

    allCards.push(...data);
    console.log(`[riftcodex]   Page ${page} — ${data.length} cartes (total: ${allCards.length})`);

    // Si on a reçu moins que PAGE_SIZE, c'est la dernière page
    if (data.length < PAGE_SIZE) break;

    page++;

    // Petite pause entre les pages pour ne pas abuser de l'API
    await sleep(200);
  }

  console.log(`[riftcodex] Set "${setCode}" — ${allCards.length} cartes récupérées`);
  return allCards;
}

/**
 * Récupère la liste des sets disponibles sur Riftcodex.
 * @returns {Promise<Array>}
 */
async function fetchSets() {
  const res = await fetch(`${BASE_URL}/sets`);
  if (!res.ok) throw new Error(`Riftcodex API ${res.status} — /sets`);
  return res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { fetchCardsBySet, fetchSets };
