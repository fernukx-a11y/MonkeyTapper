let coins = 0;
let saveTimeout = null;

const button = document.getElementById("tap-btn");
const coinsText = document.querySelector("p");

// Функция загрузки монеток из CloudStorage
function initApp() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
        tg.ready();
        tg.expand();
    }

    // Загружаем из облака Telegram
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem("user_coins", (err, value) => {
            if (!err && value !== null && value !== undefined && value !== "") {
                coins = parseInt(value, 10) || 0;
            } else {
                // Запасной вариант из памяти браузера
                coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
            }
            updateUI();
        });
    } else {
        coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
        updateUI();
    }
}

// Сохранение монеток в облако Telegram
function saveCoins() {
    localStorage.setItem("user_coins", coins.toString());

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const tg = window.Telegram ? window.Telegram.WebApp : null;
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem("user_coins", coins.toString(), (err) => {
                if (err) console.error("Ошибка сохранения в CloudStorage:", err);
            });
        }
    }, 300);
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
    saveCoins();
}

if (button) {
    button.addEventListener("touchstart", addCoin, { passive: false });
    button.addEventListener("click", addCoin);
}

// Запускаем инициализацию
window.addEventListener("DOMContentLoaded", initApp);
