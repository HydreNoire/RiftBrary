// src/sync/index.js
// Orchestrateur du sync Riftbound.
// Enchaîne : fetch API → transformation → import BDD
//
// Pour swapper de source (Riftcodex → Riot officiel),
// il suffit de changer la ligne d'import ci-dessous :
// const source = require('./sources/riot');

const source      = require('./sources/riftcodex');
const { transformCard } = require('./transformers/card.transformer');
const { importCard, importVariant, loadLookupMaps } = require('./importers/card.importer');

// Sets à synchroniser : { setCode BDD → setCode Riftcodex }
// Le setCode BDD est la colonne `code` de notre table sets.
// Le setCode Riftcodex est l'identifiant utilisé dans les requêtes API.
// TODO : rendre cette config dynamique (lire depuis la table sets)
const SETS_TO_SYNC = [
  { dbCode: 'OGN', sourceCode: 'ogn' },
  { dbCode: 'UNL', sourceCode: 'unl' }, // À confirmer — code Unleashed
  { dbCode: 'SFD', sourceCode: 'sfd' },
];

/**
 * Lance le sync complet de tous les sets configurés.
 * Idempotent : peut être relancé autant de fois que voulu sans doublons.
 *
 * @returns {Object} Résumé du sync : { inserted, updated, skipped, errors, duration }
 */
async function runSync() {
  const startedAt = Date.now();
  const stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  console.log('[sync] Démarrage du sync Riftbound...');

  // Charge les lookup maps une seule fois pour tout le sync
  const { domainMap, setMap } = await loadLookupMaps();
  console.log(`[sync] ${domainMap.size} domaines, ${setMap.size} sets chargés`);

  for (const { dbCode, sourceCode } of SETS_TO_SYNC) {
    const setId = setMap.get(dbCode.toUpperCase());
    if (!setId) {
      console.warn(`[sync] Set "${dbCode}" introuvable dans la BDD — skipped`);
      stats.skipped++;
      continue;
    }

    let rawCards;
    try {
      rawCards = await source.fetchCardsBySet(sourceCode);
    } catch (err) {
      console.error(`[sync] Impossible de récupérer le set "${sourceCode}" :`, err.message);
      stats.errors.push({ set: dbCode, error: err.message });
      continue;
    }

    console.log(`[sync] Set ${dbCode} — ${rawCards.length} cartes à traiter`);

    // Sépare les cartes de base des variantes.
    // Les cartes de base doivent être importées EN PREMIER
    // pour que les variantes puissent référencer leur base_card_id.
    const baseCards    = rawCards.filter((c) => !isVariant(c));
    const variantCards = rawCards.filter((c) =>  isVariant(c));

    // ── Passe 1 : import des cartes de base ────────────────────────────
    // On construit aussi un index name → {id} pour lier les variantes ensuite
    const baseCardIndex = new Map(); // key: "Card Name|setId" → { id }

    for (const raw of baseCards) {
      try {
        const card   = transformCard(raw, setId);
        const result = await importCard(card, domainMap);

        baseCardIndex.set(`${card.name}|${setId}`, { id: result.id });

        if (result.action === 'inserted') stats.inserted++;
        else stats.updated++;
      } catch (err) {
        console.error(`[sync] Erreur carte ${raw.riftbound_id} :`, err.message);
        stats.errors.push({ card: raw.riftbound_id, error: err.message });
      }
    }

    // ── Passe 2 : import des variantes ─────────────────────────────────
    for (const raw of variantCards) {
      try {
        const card     = transformCard(raw, setId);
        const baseCard = baseCardIndex.get(`${card.name}|${setId}`);

        if (!baseCard) {
          console.warn(`[sync] Variante "${raw.name}" sans carte de base trouvée — skipped`);
          stats.skipped++;
          continue;
        }

        await importVariant(card, baseCard);
        stats.inserted++;
      } catch (err) {
        console.error(`[sync] Erreur variante ${raw.riftbound_id} :`, err.message);
        stats.errors.push({ card: raw.riftbound_id, error: err.message });
      }
    }

    console.log(`[sync] Set ${dbCode} terminé — base: ${baseCards.length}, variantes: ${variantCards.length}`);
  }

  const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[sync] Terminé en ${duration}s — ${stats.inserted} insérées, ${stats.updated} mises à jour, ${stats.errors.length} erreurs`);

  return { ...stats, duration: `${duration}s` };
}

/**
 * Indique si une carte brute est une variante de collection
 * (alt art, overnumbered, signature stamp).
 */
function isVariant(raw) {
  return raw.metadata?.alternate_art === true
      || raw.metadata?.overnumbered  === true
      || raw.metadata?.signature     === true;
}

module.exports = { runSync };
