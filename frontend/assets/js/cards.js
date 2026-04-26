document.addEventListener('DOMContentLoaded', async () => {
    const {data, error} = await rifboundApi.cards.getAll();

    if (error) {
        console.log('{Cards} Erreur :', error)
    }

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