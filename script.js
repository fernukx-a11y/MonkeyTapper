let coins = 0;
let saveTimeout = null;

const button = document.getElementById("tap-btn");
const coinsText = document.querySelector("p");

const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
    tg.ready();
    tg.expand();
}

// Загрузка монет из облака Telegram
function loadCoins() {
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem("user_coins", (err, value) => {
            if (!err && value !== null && value !== undefined && value !== "") {
                coins = parseInt(value, 10) || 0;
            } else {
                coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
            }
            updateUI();
        });
    } else {
        coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
        updateUI();
    }
}

// Сохранение с задержкой (чтобы не спамить Telegram при быстрых тапах)
function saveCoinsDebounced() {
    localStorage.setItem("user_coins", coins.toString());

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem("user_coins", coins.toString(), (err) => {
                if (err) console.error("CloudStorage error:", err);
            });
        }
    }, 500);
}

function updateUI() {
    if (coinsText) {
        coinsText.textContent = "💰 Монеты: " + coins;
    }
}

function addCoin(e) {
    if (e) e.preventDefault();
    coins += 1;
    updateUI();
    saveCoinsDebounced();
}

if (button) {
    button.addEventListener("touchstart", addCoin, { passive: false });
    button.addEventListener("click", addCoin);
}

loadCoins();
