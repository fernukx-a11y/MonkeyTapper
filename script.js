let coins = 0;

const button = document.getElementById("tap-btn");
const coinsText = document.querySelector("p");

if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

button.addEventListener("click", function () {
    coins += 1;
    coinsText.textContent = "💰 Монеты: " + coins;
});
