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
 * @param {Object} card      - Carte transformée (depuis card.transformer.js)
 * @param {Map}    domainMap - Map { domainCode → domainId }
 * @returns {{ id: number, action: 'inserted' | 'updated' }}
 */
async function importCard(card, domainMap) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // ── 1. UPSERT carte principale ─────────────────────────────────────────
    // ON CONFLICT (set_id, card_number) : si la carte existe, on met à jour
    // tous les champs sauf id, set_id, card_number et created_at.
    const upsertResult = await client.query(
      `INSERT INTO cards (
        card_number, set_id, slug, name, category, rarity,
        energy_cost, might, ability_text, flavor_text,
        image_url, artist, is_token, riot_card_id, last_synced_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (set_id, card_number) DO UPDATE SET
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
        updated_at     = NOW()
      RETURNING id, (xmax = 0) AS is_new`,
      [
        card.cardNumber, card.setId, card.slug, card.name,
        card.category, card.rarity,
        card.energyCost, card.might,
        card.abilityText, card.flavorText,
        card.imageUrl, card.artist,
        card.isToken, card.riotCardId, card.lastSyncedAt,
      ]
    );

    const cardId  = upsertResult.rows[0].id;
    const isNew   = upsertResult.rows[0].is_new;

    // ── 2. Domains ─────────────────────────────────────────────────────────
    // Stratégie DELETE + INSERT : simple et idempotent.
    // On supprime les anciens domaines et on réinsère — ça gère les cas où
    // un domaine aurait changé entre deux syncs.
    await client.query('DELETE FROM card_domains WHERE card_id = $1', [cardId]);

    for (const code of card.domainCodes) {
      const domainId = domainMap.get(code);
      if (!domainId) {
        console.warn(`[importer] Domaine inconnu "${code}" pour la carte ${card.cardNumber}`);
        continue;
      }
      await client.query(
        'INSERT INTO card_domains (card_id, domain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, domainId]
      );
    }

    // ── 3. Power costs ─────────────────────────────────────────────────────
    await client.query('DELETE FROM card_power_costs WHERE card_id = $1', [cardId]);

    if (card.powerCost) {
      const domainId = domainMap.get(card.powerCost.domainCode);
      if (domainId) {
        await client.query(
          'INSERT INTO card_power_costs (card_id, domain_id, amount) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [cardId, domainId, card.powerCost.amount]
        );
      }
    }

    // ── 4. Champion tags ────────────────────────────────────────────────────
    // Upsert des tags dans champion_tags, puis liaison dans card_champion_tags
    await client.query('DELETE FROM card_champion_tags WHERE card_id = $1', [cardId]);

    for (let i = 0; i < card.tagSlugs.length; i++) {
      const slug = card.tagSlugs[i];
      const name = card.tagNames[i];

      // Upsert le tag s'il n'existe pas encore
      const tagResult = await client.query(
        `INSERT INTO champion_tags (slug, name)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [slug, name]
      );
      const tagId = tagResult.rows[0].id;

      await client.query(
        'INSERT INTO card_champion_tags (card_id, champion_tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cardId, tagId]
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

/**
 * Importe une variante de carte (foil, alt_art, signature_stamp...).
 * La variante est liée à la carte de base via base_card_id.
 *
 * @param {Object} card   - Carte transformée (isVariant = true)
 * @param {Object} baseCard - { id } de la carte de base déjà importée
 */
async function importVariant(card, baseCard) {
  await db.query(
    `INSERT INTO card_variants (base_card_id, variant_type, collector_number, image_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (base_card_id, variant_type, collector_number) DO UPDATE SET
       image_url  = EXCLUDED.image_url`,
    [baseCard.id, card.variantType, card.cardNumber, card.imageUrl]
  );
}

module.exports = { importCard, importVariant, loadLookupMaps };
