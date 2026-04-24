// src/sync/transformers/card.transformer.js
// Transforme la réponse brute de l'API Riftcodex vers le format attendue de notre BDD PostgreSQL.
//
// Exemple de carte brute (Riftcodex) :
// {
//   id: "69bc5bc7d308c64675ca86c1",
//   name: "Magma Wurm",
//   riftbound_id: "ogn-011-298",
//   collector_number: 11,
//   attributes: { energy: 8, might: 8, power: 1 },
//   classification: { type: "Unit", rarity: "Common", domain: ["Fury"] },
//   text: { plain: "Other friendly units enter ready.", flavour: "..." },
//   set: { set_id: "OGN", label: "Origins" },
//   media: { image_url: "https://...", artist: "Envar Studio" },
//   tags: ["Freljord"],
//   metadata: { alternate_art: false, overnumbered: false, signature: false }
// }

// Correspondance types API → catégories de notre schéma
const CATEGORY_MAP = {
  unit:        'unit',
  champion:    'champion',
  legend:      'legend',
  spell:       'spell',
  gear:        'item',    
  item:        'item',
  rune:        'rune',
  battlefield: 'battlefield',
  token:       'token',
};

const RARITY_MAP = {
  common:       'common',
  uncommon:     'uncommon',
  rare:         'rare',
  epic:         'epic',
  overnumbered: 'overnumbered',
  showcase:     'showcase',
};

/**
 * Transforme une carte brute de l'API en objet prêt pour la BDD.
 *
 * @param {Object} raw    - Carte brute de l'API Riftcodex
 * @param {number} setId  - ID PostgreSQL du set (depuis notre table sets)
 * @returns {Object}      - Carte transformée avec ses relations
 */
function transformCard(raw, setId) {
  // "ogn-011-298" → setCode="OGN", paddedNumber="011" → cardNumber="OGN-011"
  const parts = (raw.riftbound_id || '').toLowerCase().split('-');
  const setCode = (raw.set?.set_id || parts[0] || 'UNK').toUpperCase();
  const num = String(raw.collector_number || parts[1] || '0').padStart(3, '0');
  const cardNumber = `${setCode}-${num}`;

  const category = CATEGORY_MAP[(raw.classification?.type || '').toLowerCase()] || 'unit';
  const rarity   = RARITY_MAP[(raw.classification?.rarity || '').toLowerCase()] || 'common';

  // Détection des variantes : une carte est une variante si l'un de ces flags est true.
  // Une variante correspond à un objet de collection distinct (foil, alt art, etc.)
  // mais n'est PAS une nouvelle carte de base.
  const isAltArt    = raw.metadata?.alternate_art   === true;
  const isOvernumbered = raw.metadata?.overnumbered === true;
  const isSignature = raw.metadata?.signature        === true;
  const isVariant   = isAltArt || isOvernumbered || isSignature;

  let variantType = null;
  if (isAltArt)        variantType = 'alt_art';
  else if (isOvernumbered) variantType = 'overnumbered';
  else if (isSignature) variantType = 'signature_stamp';

  // Power cost : "attributes.power = 1" + "domain[0] = Fury" → "1 Fury recyclé"
  // TODO : gérer les multi-domaines quand on aura des exemples concrets
  const powerAmount = raw.attributes?.power || 0;
  const powerDomainCode = powerAmount > 0
    ? (raw.classification?.domain?.[0] || '').toLowerCase()
    : null;

  return {
    // ── Champs table cards ────────────────────────────────────────────────
    cardNumber,
    setId,
    // Le slug inclut le card_number pour garantir l'unicité même si deux cartes de sets différents ont le même nom (ex: reprints)
    slug: slugify(`${raw.name}-${cardNumber}`),
    name: raw.name || '',
    category,
    rarity,
    energyCost: raw.attributes?.energy ?? null,
    might:      raw.attributes?.might  ?? null,
    abilityText: raw.text?.plain   ?? null,
    flavorText:  raw.text?.flavour ?? null,
    imageUrl:    raw.media?.image_url ?? null,
    artist:      raw.media?.artist    ?? null,
    isToken:     category === 'token',
    riotCardId:  raw.id ?? null,
    lastSyncedAt: new Date().toISOString(),

    // ── Relations ─────────────────────────────────────────────────────────
    // Codes en minuscules pour matcher les codes de notre table domains
    domainCodes: (raw.classification?.domain || []).map((d) => d.toLowerCase()),

    // Tags → champion_tags (régions Runeterra, champions...)
    tagSlugs: (raw.tags || []).map((t) => slugify(t)),
    tagNames: raw.tags || [],

    // Power cost typé par domaine (table card_power_costs)
    powerCost: powerDomainCode
      ? { domainCode: powerDomainCode, amount: powerAmount }
      : null,

    // ── Variants ──────────────────────────────────────────────────────────
    isVariant: isVariant,
    variantType: variantType,
    baseMatchKey: raw.metadata?.clean_name || raw.name,
  };
}

/**
 * Slugifie une chaîne : "Magma Wurm OGN-011" → "magma-wurm-ogn-011"
 * Gère les apostrophes (Kha'Zix), accents, caractères spéciaux.
 */
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // Supprime les diacritiques (accents)
    .replace(/[^a-z0-9\s-]/g, '')      // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '-')              // Espaces → tirets
    .replace(/-+/g, '-');              // Tirets multiples → un seul
}

module.exports = { transformCard, slugify };
