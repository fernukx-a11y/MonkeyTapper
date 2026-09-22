let coins = 0;
let tgUser = null;

const button = document.getElementById("tap-btn");
const coinsText = document.querySelector("p");

// Получаем данные пользователя из Telegram
if (window.Telegram && window.Telegram.WebApp) {
    const webapp = window.Telegram.WebApp;
    webapp.ready();
    webapp.expand();
    
    if (webapp.initDataUnsafe && webapp.initDataUnsafe.user) {
        tgUser = webapp.initDataUnsafe.user;
    }
}

// Загрузка монет с сервера
async function loadCoins() {
    if (!tgUser) return;
    try {
        const response = await fetch(`https://YOUR_SERVER_URL/api/get_coins?user_id=${tgUser.id}`);
        const data = await response.json();
        coins = data.coins || 0;
        if (coinsText) coinsText.textContent = "💰 Монеты: " + coins;
    } catch (e) {
        console.log("Ошибка загрузки монет с сервера:", e);
    }
}

// Отправка клика на сервер
async function addCoin(e) {
    if (e) e.preventDefault();
    coins += 1;
    if (coinsText) coinsText.textContent = "💰 Монеты: " + coins;

    if (tgUser) {
        try {
            await fetch(`https://YOUR_SERVER_URL/api/click`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: tgUser.id, coins: coins })
            });
        } catch (err) {
            console.log("Ошибка отправки клика:", err);
        }
    }
}

if (button) {
    button.addEventListener("touchstart", addCoin, { passive: false });
    button.addEventListener("click", addCoin);
}

// Инициализация при открытии
loadCoins();
