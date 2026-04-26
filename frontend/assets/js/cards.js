document.addEventListener('DOMContentLoaded', async () => {
    await renderFilters();
    fetchAndRender();
    
    // Management of buffers and filters for fetching
    document.getElementById('filters_container').addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        
        const filter = pill.dataset.filter;
        const value = pill.dataset.value;
        
        const index = activeFilters[filter].indexOf(value);
        if (index > -1) {
            activeFilters[filter].splice(index, 1);
            pill.classList.remove('active');
        } else {
            activeFilters[filter].push(value);
            pill.classList.add('active');
        }

        fetchAndRender();
    })
});

// ─── Fetch filters and render Cards ─────────────────────────────────────────────────
async function fetchAndRender() {
    const { data, error } = await rifboundApi.cards.getAll(activeFilters);

    if (error) {
      console.error('[cards] Erreur :', error);
      return;
    }   

    renderCards(data.data);
}

// ─── Card Render ───────────────────────────────────────────────────────────────────
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
    type: ['unit', 'spell', 'equipment', 'landmark'],
    domains: ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'],
}

const activeFilters = {
    rarity: [],
    type: [],
    domains: [],
    set: [],
}

async function renderFilters() {
    const rarityContainer = document.getElementById('pills_rarity_container');
    rarityContainer.innerHTML = FILTERS.rarity
        .map(rare => `<span class="pill" data-filter="rarity" data-value="${rare}">${rare}</span>`)
        .join('');

    const typeContainer = document.getElementById('pills_types_container');
    typeContainer.innerHTML = FILTERS.type
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