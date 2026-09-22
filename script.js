let coins = 0;
let saveTimeout = null;

const tapArea = document.getElementById("tap-area");
const coinsDisplay = document.getElementById("coins-display");

function initApp() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
        tg.ready();
        tg.expand();
    }

    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem("user_coins", (err, value) => {
            if (!err && value) {
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

function saveCoins() {
    localStorage.setItem("user_coins", coins.toString());

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const tg = window.Telegram ? window.Telegram.WebApp : null;
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem("user_coins", coins.toString());
        }
    }, 300);
}

function updateUI() {
    if (coinsDisplay) {
        coinsDisplay.textContent = "💰 Монеты: " + coins;
    }
}

function createFlyingOne(x, y) {
    const flyingOne = document.createElement("div");
    flyingOne.classList.add("flying-one");
    flyingOne.textContent = "+1";
    
    flyingOne.style.left = x + "px";
    flyingOne.style.top = y + "px";
    
    document.body.appendChild(flyingOne);
    
    setTimeout(() => {
        flyingOne.remove();
    }, 1000);
}

function handleTap(e) {
    if (e) e.preventDefault();
    
    coins += 1;
    updateUI();
    saveCoins();
    
    let clientX, clientY;
    if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    if (clientX === undefined || clientY === undefined) {
        const rect = tapArea.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
    }
    
    createFlyingOne(clientX, clientY);
}

if (tapArea) {
    tapArea.addEventListener("pointerdown", handleTap);
}

window.addEventListener("DOMContentLoaded", initApp);
