let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let tapPower = 1;
let multitapCost = 50;
let lastSaveTime = Date.now();

let saveTimeout = null;

// Список всех ключей, которые мы использовали ранее, для автоматического восстановления данных
const LOCAL_KEYS_COINS = ["user_coins", "monkey_coins", "monkey_global_coins", "monkey_default_user_coins", "m_coins", "monkey_global_coins_v2"];
const LOCAL_KEYS_POWER = ["user_tap_power", "monkey_tap_power", "monkey_global_tap_power", "monkey_default_user_tap_power", "m_tap_power", "monkey_global_power_v2"];
const LOCAL_KEYS_ENERGY = ["user_energy", "monkey_energy", "monkey_global_energy", "monkey_default_user_energy", "m_energy", "monkey_global_energy_v2"];
const LOCAL_KEYS_TIME = ["user_last_time", "monkey_last_time", "monkey_global_last_time", "monkey_default_user_last_time", "m_last_time", "monkey_global_time_v2"];

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

function saveToAllStorage() {
    lastSaveTime = Date.now();

    // 1. Сохраняем во ВСЕ используемые ключи в localStorage
    LOCAL_KEYS_COINS.forEach(k => localStorage.setItem(k, coins.toString()));
    LOCAL_KEYS_POWER.forEach(k => localStorage.setItem(k, tapPower.toString()));
    LOCAL_KEYS_ENERGY.forEach(k => localStorage.setItem(k, energy.toString()));
    LOCAL_KEYS_TIME.forEach(k => localStorage.setItem(k, lastSaveTime.toString()));

    // 2. Отправляем во ВСЕ варианты ключей Telegram CloudStorage
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.CloudStorage) {
        const cloudData = {};
        LOCAL_KEYS_COINS.concat(LOCAL_KEYS_POWER, LOCAL_KEYS_ENERGY, LOCAL_KEYS_TIME).forEach(k => {
            if (LOCAL_KEYS_COINS.includes(k)) cloudData[k] = coins.toString();
            if (LOCAL_KEYS_POWER.includes(k)) cloudData[k] = tapPower.toString();
            if (LOCAL_KEYS_ENERGY.includes(k)) cloudData[k] = energy.toString();
            if (LOCAL_KEYS_TIME.includes(k)) cloudData[k] = lastSaveTime.toString();
        });

        // Пакетное сохранение в Telegram Cloud
        Object.keys(cloudData).forEach(key => {
            tg.CloudStorage.setItem(key, cloudData[key]);
        });
    }
}

function saveData() {
    // Мгновенное локальное сохранение
    LOCAL_KEYS_COINS.forEach(k => localStorage.setItem(k, coins.toString()));
    LOCAL_KEYS_POWER.forEach(k => localStorage.setItem(k, tapPower.toString()));
    LOCAL_KEYS_ENERGY.forEach(k => localStorage.setItem(k, energy.toString()));
    LOCAL_KEYS_TIME.forEach(k => localStorage.setItem(k, lastSaveTime.toString()));

    // Таймер задержки для CloudStorage, чтобы Telegram не блокировал слишком частые запросы
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToAllStorage();
    }, 400);
}

function loadData() {
    let maxFoundCoins = 0;
    let maxFoundPower = 1;
    let maxFoundTime = Date.now();
    let foundEnergy = maxEnergy;

    // 1. Поиск абсолютного максимума по ВСЕМ старым локальным ключам
    LOCAL_KEYS_COINS.forEach(k => {
        const val = sanitizeNumber(localStorage.getItem(k), 0);
        if (val > maxFoundCoins) maxFoundCoins = val;
    });

    LOCAL_KEYS_POWER.forEach(k => {
        const val = sanitizeNumber(localStorage.getItem(k), 1);
        if (val > maxFoundPower) maxFoundPower = val;
    });

    LOCAL_KEYS_TIME.forEach(k => {
        const val = sanitizeNumber(localStorage.getItem(k), 0);
        if (val > maxFoundTime) maxFoundTime = val;
    });

    LOCAL_KEYS_ENERGY.forEach(k => {
        const val = sanitizeNumber(localStorage.getItem(k), maxEnergy);
        if (val < maxEnergy) foundEnergy = val;
    });

    coins = maxFoundCoins;
    tapPower = maxFoundPower;
    energy = foundEnergy;
    lastSaveTime = maxFoundTime;

    applyOfflineEnergy();
    updateUI();

    // 2. Сканирование CloudStorage по всем известным ключам
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.CloudStorage) {
        const allKeys = [...new Set([...LOCAL_KEYS_COINS, ...LOCAL_KEYS_POWER, ...LOCAL_KEYS_ENERGY, ...LOCAL_KEYS_TIME])];

        tg.CloudStorage.getItems(allKeys, (err, items) => {
            if (!err && items) {
                let updated = false;

                allKeys.forEach(k => {
                    const val = items[k];
                    if (val !== undefined && val !== null) {
                        const num = sanitizeNumber(val, 0);

                        if (LOCAL_KEYS_COINS.includes(k) && num > coins) {
                            coins = num;
                            updated = true;
                        }
                        if (LOCAL_KEYS_POWER.includes(k) && num > tapPower) {
                            tapPower = num;
                            updated = true;
                        }
                        if (LOCAL_KEYS_TIME.includes(k) && num > lastSaveTime) {
                            lastSaveTime = num;
                            if (items["user_energy"]) {
                                energy = sanitizeNumber(items["user_energy"], maxEnergy);
                            }
                            updated = true;
                        }
                    }
                });

                if (updated) {
                    applyOfflineEnergy();
                    updateUI();
                }
                
                // Фиксируем максимальные найденные значения во всех ячейках
                saveToAllStorage();
            }
        });
    } else {
        saveToAllStorage();
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
