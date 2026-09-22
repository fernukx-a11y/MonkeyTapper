let coins = 0;
const button = document.getElementById("tap-btn");
const coinsText = document.querySelector("p");

// Получаем объект WebApp Telegram
const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
    tg.ready();
    tg.expand();
}

// Загружаем монеты из бесплатного облака Telegram (CloudStorage)
function loadCoins() {
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem("user_coins", (err, value) => {
            if (!err && value) {
                coins = parseInt(value, 10) || 0;
            } else {
                coins = 0;
            }
            updateUI();
        });
    } else {
        // Запасной вариант для тестирования в обычном браузере
        coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
        updateUI();
    }
}

// Сохраняем монеты в облако Telegram
function saveCoins() {
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.setItem("user_coins", coins.toString(), (err, success) => {
            if (err) console.error("Ошибка сохранения в CloudStorage:", err);
        });
    } else {
        localStorage.setItem("user_coins", coins.toString());
    }
}

// Обновляем текст на экране
function updateUI() {
    if (coinsText) {
        coinsText.textContent = "💰 Монеты: " + coins;
    }
}

// Добавление монеты при клике/тапе
function addCoin(e) {
    if (e) e.preventDefault();
    coins += 1;
    updateUI();
    saveCoins(); // Автоматически сохраняем в облако Telegram
}

if (button) {
    button.addEventListener("touchstart", addCoin, { passive: false });
    button.addEventListener("click", addCoin);
}

// Запускаем загрузку при открытии
loadCoins();
