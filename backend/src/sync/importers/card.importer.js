// src/sync/importers/card.importer.js
// Contient la logique d'UPSERT vers PostgreSQL

const db = require('../../db');

/**
 * Charge les lookup tables (domains et sets) depuis la BDD.
 * Retourne des Maps {code → id} pour éviter de faire des requêtes
 * supplémentaires à chaque carte.
 *
 * @returns {{ domainMap: Map, setMap: Map }}
 */
async function loadLookupMaps() {
  const [domainsResult, setsResult] = await Promise.all([
    db.query('SELECT id, code FROM domains'),
    db.query('SELECT id, code FROM sets'),
  ]);

  const domainMap = new Map(domainsResult.rows.map((r) => [r.code, r.id]));
  const setMap    = new Map(setsResult.rows.map((r) => [r.code.toUpperCase(), r.id]));

  return { domainMap, setMap };
}

/**
 * Importe (UPSERT) une carte de base et toutes ses relations.
 * Si la carte existe déjà (même set_id + card_number), elle est mise à jour.
 *
 * @param {Object} card 
 * @param {Map} domainMap
 * @returns {{ id: number, action: 'inserted' | 'updated' }}
 */
async function importCard(card, domainMap, baseCardIndex = new Map()) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Résolution du base_card_id pour les variantes
    let baseCardId = null;
    if (card.isVariant && card.baseMatchKey) {
      // Cherche d'abord dans l'index en mémoire
      const fromIndex = baseCardIndex.get(`${card.baseMatchKey}|${card.setId}`);
      if (fromIndex) {
        baseCardId = fromIndex.id;
      } else {
        // Fallback BDD — reprint cross-set
        const res = await client.query(
          `SELECT id FROM cards 
           WHERE name = $1 AND variant_type IS NULL
           ORDER BY id ASC LIMIT 1`,
          [card.baseMatchKey]
        );
        if (res.rows.length > 0) baseCardId = res.rows[0].id;
      }
    }

    const upsertResult = await client.query(
      `INSERT INTO cards (
        card_number, set_id, slug, name, category, rarity,
        energy_cost, might, ability_text, flavor_text,
        image_url, artist, is_token, riot_card_id, last_synced_at,
        variant_type, base_card_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (set_id, card_number, variant_type) DO UPDATE SET
        slug           = EXCLUDED.slug,
        name           = EXCLUDED.name,
        category       = EXCLUDED.category,
        rarity         = EXCLUDED.rarity,
        energy_cost    = EXCLUDED.energy_cost,
        might          = EXCLUDED.might,
        ability_text   = EXCLUDED.ability_text,
        flavor_text    = EXCLUDED.flavor_text,
        image_url      = EXCLUDED.image_url,
        artist         = EXCLUDED.artist,
        is_token       = EXCLUDED.is_token,
        riot_card_id   = EXCLUDED.riot_card_id,
        last_synced_at = EXCLUDED.last_synced_at,
        variant_type   = EXCLUDED.variant_type,
        base_card_id   = EXCLUDED.base_card_id,
        updated_at     = NOW()
      RETURNING id, (xmax = 0) AS is_new`,
      [
        card.cardNumber, card.setId, card.slug, card.name,
        card.category, card.rarity,
        card.energyCost, card.might,
        card.abilityText, card.flavorText,
        card.imageUrl, card.artist,
        card.isToken, card.riotCardId, card.lastSyncedAt,
        card.variantType, baseCardId,
      ]
    );

    const cardId = upsertResult.rows[0].id;
    const isNew  = upsertResult.rows[0].is_new;

    // ── Domains ───────────────────────────────────────────────────────────
    await client.query('DELETE FROM card_domains WHERE card_id = $1', [cardId]);

    for (const code of card.domainCodes) {
      const domainId = domainMap.get(code);
      if (!domainId) {
        console.warn(`[import] domaine inconnu ignoré : "${code}" (carte: ${card.name})`);
        continue;
      }
      await client.query(
        'INSERT INTO card_domains (card_id, domain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, domainId]
      );
    }

    // ── Power costs ───────────────────────────────────────────────────────
    await client.query('DELETE FROM card_power_costs WHERE card_id = $1', [cardId]);

    if (card.powerCost) {
      const domainId = domainMap.get(card.powerCost.domainCode);
      if (domainId) {
        await client.query(
          `INSERT INTO card_power_costs (card_id, domain_id, amount)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING`,
          [cardId, domainId, card.powerCost.amount]
        );
      } else {
        console.warn(`[import] domaine power_cost inconnu : "${card.powerCost.domainCode}" (carte: ${card.name})`);
      }
    }

    // ── Keywords ──────────────────────────────────────────────────────────────
    await client.query('DELETE FROM card_keywords WHERE card_id = $1', [cardId]);

    for (const kwName of (card.keywords || [])) {
      const kwResult = await client.query(
        `INSERT INTO keywords (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id`,
        [kwName, 'À documenter']
      );
      await client.query(
        'INSERT INTO card_keywords (card_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, kwResult.rows[0].id]
      );
    }

    // ── Champion tags ──────────────────────────────────────────────────────────
    await client.query('DELETE FROM card_champion_tags WHERE card_id = $1', [cardId]);

    for (let i = 0; i < (card.tagSlugs || []).length; i++) {
      const slug = card.tagSlugs[i];
      const name = card.tagNames[i];

      const tagResult = await client.query(
        `INSERT INTO champion_tags (slug, name)
        VALUES ($1, $2)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id`,
        [slug, name]
      );
      await client.query(
        'INSERT INTO card_champion_tags (card_id, champion_tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, tagResult.rows[0].id]
      );
    }

    await client.query('COMMIT');
    return { id: cardId, action: isNew ? 'inserted' : 'updated' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { importCard, loadLookupMaps };
