let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let saveTimeout = null;

function initApp() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
        tg.ready();
        tg.expand();
    }

    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem("user_coins", (err, value) => {
            if (!err && value) coins = parseInt(value, 10) || 0;
            else coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
            
            tg.CloudStorage.getItem("user_energy", (errE, valE) => {
                if (!errE && valE !== null) energy = parseInt(valE, 10);
                else energy = parseInt(localStorage.getItem("user_energy"), 10) || maxEnergy;
                updateUI();
            });
        });
    } else {
        coins = parseInt(localStorage.getItem("user_coins"), 10) || 0;
        const savedEnergy = localStorage.getItem("user_energy");
        energy = savedEnergy !== null ? parseInt(savedEnergy, 10) : maxEnergy;
        updateUI();
    }

    setInterval(regenEnergy, 1000);
}

function saveCoins() {
    localStorage.setItem("user_coins", coins.toString());
    localStorage.setItem("user_energy", energy.toString());

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const tg = window.Telegram ? window.Telegram.WebApp : null;
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem("user_coins", coins.toString());
            tg.CloudStorage.setItem("user_energy", energy.toString());
        }
    }, 300);
}

function updateUI() {
    const coinsDisplay = document.getElementById("coins-display");
    const energyDisplay = document.getElementById("energy-display");
    const energyBarFill = document.getElementById("energy-bar-fill");

    if (coinsDisplay) coinsDisplay.textContent = "💰 Монеты: " + coins;
    if (energyDisplay) energyDisplay.textContent = energy;
    
    if (energyBarFill) {
        const percentage = Math.max(0, Math.min(100, (energy / maxEnergy) * 100));
        energyBarFill.style.width = percentage + "%";
    }
}

function regenEnergy() {
    if (energy < maxEnergy) {
        energy += 1;
        updateUI();
        saveCoins();
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
    if (energy <= 0) return;

    coins += 1;
    energy -= 1;
    
    updateUI();
    saveCoins();
    
    let clientX, clientY;
    const tapArea = document.getElementById("tap-area");

    if (e.type === "touchstart" || e.type === "touchend") {
        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    if ((clientX === undefined || clientY === undefined) && tapArea) {
        const rect = tapArea.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
    }
    
    createFlyingOne(clientX, clientY);
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    const tapArea = document.getElementById("tap-area");
    if (tapArea) {
        tapArea.addEventListener("pointerdown", (e) => {
            if (e.button === 0 || e.pointerType === "touch") {
                handleTap(e);
            }
        });
    }
});
