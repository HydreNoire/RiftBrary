document.addEventListener('DOMContentLoaded', async () => {
    rifboundApi.cards.getAll();
    console.log(rifboundApi.cards.getAll());
});

function renderCard(card) {
    let cardString = `<div>
    <img src=".${card.image_url}" alt="cardimg">
    ${card.name} - ${card.set.code} - ${card.set.code}
    </div>`
}

function renderCards(cards) {

}