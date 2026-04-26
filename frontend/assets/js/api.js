// assets/js/api.js
// Client API centralisé pour communiquer avec le backend Rifbound.
// Toutes les requêtes vers l'API passent par ce module — pas de fetch() direct

const API_BASE_URL = window.ENV?.API_URL || 'http://localhost:3001/api';

/**
 * Wrapper fetch avec gestion d'erreurs centralisée.
 * Retourne toujours { data, error }
 *
 * @param {string} endpoint  - Ex : '/cards', '/cards/123', '/decks'
 * @param {RequestInit} opts - Options fetch optionnelles
 */
async function apiFetch(endpoint, opts = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
      ...opts,
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json.error?.message || `Erreur ${res.status}` };
    }

    return { data: json, error: null };
  } catch (err) {
    console.error('[api] Erreur réseau :', err);
    return { data: null, error: 'Impossible de contacter le serveur.' };
  }
}

// ─── Cards ───────────────────────────────────────────────────────────────────

const cards = {
  /**
   * Récupère la liste paginée des cartes.
   * @param {{ page?, limit?, type?, set?, search? }} params
   */
  getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return apiFetch(`/cards${qs ? `?${qs}` : ''}`);
  },

  /** Récupère le détail d'une carte par son id ou slug */
  getById(id) {
    return apiFetch(`/cards/${id}`);
  },
};

// ─── Health ───────────────────────────────────────────────────────────────────

const health = {
  check() {
    return apiFetch('/health');
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────
// Sera étendu avec decks, collection, auth 

window.rifboundApi = { cards, health };
