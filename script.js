let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let tapPower = 1;
let multitapCost = 50;
let lastSaveTime = Date.now();

function sanitizeNumber(val, fallback) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
}

function calculateCost(power) {
    return 50 * Math.pow(2, power - 1);
}

function applyOfflineEnergy() {
    const now = Date.now();
    const secondsPassed = Math.floor((now - lastSaveTime) / 1000);
    if (secondsPassed > 0) {
        energy = Math.min(maxEnergy, energy + secondsPassed);
    }
    lastSaveTime = now;
}

function saveData() {
    lastSaveTime = Date.now();
    
    // Сохраняем в localStorage
    localStorage.setItem("monkey_coins", coins.toString());
    localStorage.setItem("monkey_energy", energy.toString());
    localStorage.setItem("monkey_tap_power", tapPower.toString());
    localStorage.setItem("monkey_last_time", lastSaveTime.toString());

    // Сохраняем в Telegram CloudStorage
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.setItem("user_coins", coins.toString());
        tg.CloudStorage.setItem("user_energy", energy.toString());
        tg.CloudStorage.setItem("user_tap_power", tapPower.toString());
        tg.CloudStorage.setItem("user_last_time", lastSaveTime.toString());
    }
}

function loadData() {
    // 1. Читаем все возможные варианты из localStorage
    const localCoins = sanitizeNumber(localStorage.getItem("monkey_coins") || localStorage.getItem("monkey_global_coins") || localStorage.getItem("user_coins"), 0);
    const localEnergy = sanitizeNumber(localStorage.getItem("monkey_energy") || localStorage.getItem("monkey_global_energy") || localStorage.getItem("user_energy"), maxEnergy);
    const localPower = sanitizeNumber(localStorage.getItem("monkey_tap_power") || localStorage.getItem("monkey_global_tap_power") || localStorage.getItem("user_tap_power"), 1);
    const localTime = sanitizeNumber(localStorage.getItem("monkey_last_time") || localStorage.getItem("monkey_global_last_time") || localStorage.getItem("user_last_time"), Date.now());

    coins = localCoins;
    energy = localEnergy;
    tapPower = localPower;
    lastSaveTime = localTime;

    applyOfflineEnergy();
    updateUI();

    // 2. Синхронизируем с CloudStorage: выбираем МАКСИМАЛЬНЫЙ уровень и монеты
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getKeys((err, keys) => {
            if (!err && keys && keys.length > 0) {
                tg.CloudStorage.getItems(["user_coins", "user_energy", "user_tap_power", "user_last_time"], (errI, items) => {
                    if (!errI && items) {
                        const cloudCoins = sanitizeNumber(items["user_coins"], 0);
                        const cloudEnergy = sanitizeNumber(items["user_energy"], maxEnergy);
                        const cloudPower = sanitizeNumber(items["user_tap_power"], 1);
                        const cloudTime = sanitizeNumber(items["user_last_time"], Date.now());

                        // Всегда берем НАИВЫСШИЙ уровень прокачки и НАИБОЛЬШЕЕ число монет
                        tapPower = Math.max(tapPower, cloudPower);
                        coins = Math.max(coins, cloudCoins);
                        
                        // Берем энергию из более свежего сохранения
                        if (cloudTime > lastSaveTime) {
                            energy = cloudEnergy;
                            lastSaveTime = cloudTime;
                        }

                        applyOfflineEnergy();
                        updateUI();
                        saveData(); // Фиксируем максимум на обоих устройствах
                    }
                });
            } else {
                saveData();
            }
        });
    } else {
        saveData();
    }
}

function initApp() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.ready();
        tg.expand();
    }

    loadData();
    setInterval(regenEnergy, 1000);
}

function updateUI() {
    if (isNaN(energy)) energy = maxEnergy;
    if (isNaN(coins)) coins = 0;
    if (isNaN(tapPower) || tapPower < 1) tapPower = 1;

    multitapCost = calculateCost(tapPower);

    const coinsDisplay = document.getElementById("coins-display");
    const energyDisplay = document.getElementById("energy-display");
    const energyBarFill = document.getElementById("energy-bar-fill");
    
    const multitapLevel = document.getElementById("multitap-level");
    const multitapPower = document.getElementById("multitap-power");
    const multitapCostDisplay = document.getElementById("multitap-cost");
    const multitapBtn = document.getElementById("multitap-btn");

    if (coinsDisplay) coinsDisplay.textContent = "💰 Монеты: " + coins;
    if (energyDisplay) energyDisplay.textContent = energy;
    
    if (energyBarFill) {
        const percentage = Math.max(0, Math.min(100, (energy / maxEnergy) * 100));
        energyBarFill.style.width = percentage + "%";
    }

    if (multitapLevel) multitapLevel.textContent = tapPower;
    if (multitapPower) multitapPower.textContent = tapPower;
    if (multitapCostDisplay) multitapCostDisplay.textContent = multitapCost;
    
    if (multitapBtn) {
        multitapBtn.disabled = coins < multitapCost;
    }
}

function buyMultitap(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (coins >= multitapCost) {
        coins -= multitapCost;
        tapPower += 1;
        updateUI();
        saveData();
    }
}

function regenEnergy() {
    if (energy < maxEnergy) {
        energy += 1;
        updateUI();
        saveData();
    }
}

function createFlyingOne(x, y, text) {
    const flyingOne = document.createElement("div");
    flyingOne.classList.add("flying-one");
    flyingOne.textContent = "+" + text;
    
    flyingOne.style.left = x + "px";
    flyingOne.style.top = y + "px";
    
    document.body.appendChild(flyingOne);
    
    setTimeout(() => {
        flyingOne.remove();
    }, 1000);
}

function handleTap(e) {
    if (energy <= 0) return;

    coins += tapPower;
    energy -= 1;
    
    updateUI();
    saveData();
    
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
    
    createFlyingOne(clientX, clientY, tapPower);
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

    const multitapBtn = document.getElementById("multitap-btn");
    if (multitapBtn) {
        let isBuying = false;
        const triggerBuy = (e) => {
            if (isBuying) return;
            isBuying = true;
            buyMultitap(e);
            setTimeout(() => { isBuying = false; }, 300);
        };
        multitapBtn.addEventListener("pointerdown", triggerBuy);
        multitapBtn.addEventListener("click", triggerBuy);
    }
});
