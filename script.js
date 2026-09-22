let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let tapPower = 1;
let multitapCost = 50;
let lastSaveTime = Date.now();

let saveTimeout = null;

// Фиксированные ключи для полной совместимости
const KEY_COINS = "monkey_global_coins_v2";
const KEY_ENERGY = "monkey_global_energy_v2";
const KEY_POWER = "monkey_global_power_v2";
const KEY_TIME = "monkey_global_time_v2";

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
    
    // 1. Локальное сохранение
    localStorage.setItem(KEY_COINS, coins.toString());
    localStorage.setItem(KEY_ENERGY, energy.toString());
    localStorage.setItem(KEY_POWER, tapPower.toString());
    localStorage.setItem(KEY_TIME, lastSaveTime.toString());

    // 2. Отправка в CloudStorage с дебаунсом (задержкой)
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const tg = window.Telegram ? window.Telegram.WebApp : null;
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem(KEY_COINS, coins.toString());
            tg.CloudStorage.setItem(KEY_ENERGY, energy.toString());
            tg.CloudStorage.setItem(KEY_POWER, tapPower.toString());
            tg.CloudStorage.setItem(KEY_TIME, lastSaveTime.toString());
        }
    }, 300);
}

function loadData() {
    // 1. Сначала читаем всё из localStorage
    const lCoins = sanitizeNumber(localStorage.getItem(KEY_COINS), 0);
    const lEnergy = sanitizeNumber(localStorage.getItem(KEY_ENERGY), maxEnergy);
    const lPower = sanitizeNumber(localStorage.getItem(KEY_POWER), 1);
    const lTime = sanitizeNumber(localStorage.getItem(KEY_TIME), Date.now());

    coins = lCoins;
    energy = lEnergy;
    tapPower = lPower;
    lastSaveTime = lTime;

    applyOfflineEnergy();
    updateUI();

    // 2. Подтягиваем из Telegram CloudStorage и выбираем СТРОГИЙ МАКСИМУМ
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItems([KEY_COINS, KEY_ENERGY, KEY_POWER, KEY_TIME], (err, items) => {
            if (!err && items) {
                const cCoins = sanitizeNumber(items[KEY_COINS], 0);
                const cPower = sanitizeNumber(items[KEY_POWER], 1);
                const cEnergy = sanitizeNumber(items[KEY_ENERGY], maxEnergy);
                const cTime = sanitizeNumber(items[KEY_TIME], Date.now());

                // Берём максимальные доступные значения из двух источников
                coins = Math.max(coins, cCoins);
                tapPower = Math.max(tapPower, cPower);

                if (cTime > lastSaveTime) {
                    energy = cEnergy;
                    lastSaveTime = cTime;
                }

                applyOfflineEnergy();
                updateUI();
                saveData(); // Принудительно выравниваем оба источника
            }
        });
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
