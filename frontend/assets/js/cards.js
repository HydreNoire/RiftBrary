// ─── Card Load ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const {data, error} = await rifboundApi.cards.getAll();

    if (error) {
        console.log('{Cards} Erreur :', error)
    }

    renderFilters();
    renderCards(data.data);

});

function renderCard(card) {
    let cardString = `<div class="card">
    <img src="${card.image_url}" alt="cardimg" style="object-fit: cover; width: 100%; display: block; aspect-ratio: 2/3;">
    <p>${card.name} - ${card.set.code}</p>
    </div>`

    return cardString;
}

function renderCards(cards) {
    let container = document.getElementById('cards_container');
    container.innerHTML = "";

    cards.forEach(card => {
        container.innerHTML += renderCard(card);
    });
}

// ─── Pills generator ─────────────────────────────────────────────────────────────────
const FILTERS = {
    rarity: ['common', 'uncommon', 'rare', 'epic', 'showcase'],
    types: ['unit', 'spell', 'equipment', 'landmark'],
    domains: ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'],
}

const activeFilters = {
    rarity: null,
    types: null,
    domains: null,
    set: null,
}

async function renderFilters() {
    const rarityContainer = document.getElementById('pills_rarity_container');
    rarityContainer.innerHTML = FILTERS.rarity
        .map(rare => `<span class="pill" data-filter="rarity" data-value="${rare}">${rare}</span>`)
        .join('');

    const typeContainer = document.getElementById('pills_types_container');
    typeContainer.innerHTML = FILTERS.types
        .map(type => `<span class="pill" data-filter="type" data-value="${type}">${type}</span>`)
        .join('');

    const domainContainer = document.getElementById('pills_domains_container');
    domainContainer.innerHTML = FILTERS.domains
        .map(domain => `<span class="pill" data-filter="domain" data-value="${domain}">${domain}</span>`)
        .join('');

    const { data, error } = await rifboundApi.sets.getAll();

    if (error) {
        console.log('{Sets} Erreur :', error)
    }

    const setContainer = document.getElementById('pills_sets_container');
    setContainer.innerHTML = data.data
        .map(set => `<span class="pill" data-filter="set" data-value="${set.code}">${set.code}</span>`)
        .join('');
}