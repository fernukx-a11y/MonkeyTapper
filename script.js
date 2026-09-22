let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let tapPower = 1;
let multitapCost = 50;
let lastSaveTime = Date.now();

let saveTimeout = null;

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

function initApp() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
        tg.ready();
        tg.expand();
    }

    // Загружаем локальные данные заранее
    const localCoins = sanitizeNumber(localStorage.getItem("user_coins"), 0);
    const localEnergy = sanitizeNumber(localStorage.getItem("user_energy"), maxEnergy);
    const localTapPower = sanitizeNumber(localStorage.getItem("user_tap_power"), 1);
    const localTime = sanitizeNumber(localStorage.getItem("user_last_time"), Date.now());

    coins = localCoins;
    energy = localEnergy;
    tapPower = localTapPower;
    lastSaveTime = localTime;

    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem("user_coins", (err, valC) => {
            if (!err && valC !== null) {
                const cloudCoins = sanitizeNumber(valC, 0);
                coins = Math.max(coins, cloudCoins);
            }

            tg.CloudStorage.getItem("user_energy", (errE, valE) => {
                if (!errE && valE !== null) {
                    const cloudEnergy = sanitizeNumber(valE, maxEnergy);
                    energy = cloudEnergy;
                }

                tg.CloudStorage.getItem("user_tap_power", (errP, valP) => {
                    if (!errP && valP !== null) {
                        const cloudPower = sanitizeNumber(valP, 1);
                        // Берём максимальный уровень power (чтобы не затирать прогресс)
                        tapPower = Math.max(tapPower, cloudPower);
                    }

                    tg.CloudStorage.getItem("user_last_time", (errT, valT) => {
                        if (!errT && valT !== null) {
                            const cloudTime = sanitizeNumber(valT, Date.now());
                            lastSaveTime = Math.max(lastSaveTime, cloudTime);
                        }

                        applyOfflineEnergy();
                        updateUI();
                        forceSave();
                    });
                });
            });
        });
    } else {
        applyOfflineEnergy();
        updateUI();
        forceSave();
    }

    setInterval(regenEnergy, 1000);
}

function forceSave() {
    lastSaveTime = Date.now();
    
    localStorage.setItem("user_coins", coins.toString());
    localStorage.setItem("user_energy", energy.toString());
    localStorage.setItem("user_tap_power", tapPower.toString());
    localStorage.setItem("user_last_time", lastSaveTime.toString());

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.setItem("user_coins", coins.toString());
        tg.CloudStorage.setItem("user_energy", energy.toString());
        tg.CloudStorage.setItem("user_tap_power", tapPower.toString());
        tg.CloudStorage.setItem("user_last_time", lastSaveTime.toString());
    }
}

function saveCoins() {
    lastSaveTime = Date.now();
    
    localStorage.setItem("user_coins", coins.toString());
    localStorage.setItem("user_energy", energy.toString());
    localStorage.setItem("user_tap_power", tapPower.toString());
    localStorage.setItem("user_last_time", lastSaveTime.toString());

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const tg = window.Telegram ? window.Telegram.WebApp : null;
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem("user_coins", coins.toString());
            tg.CloudStorage.setItem("user_energy", energy.toString());
            tg.CloudStorage.setItem("user_tap_power", tapPower.toString());
            tg.CloudStorage.setItem("user_last_time", lastSaveTime.toString());
        }
    }, 300);
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
        forceSave();
    }
}

function regenEnergy() {
    if (energy < maxEnergy) {
        energy += 1;
        updateUI();
        saveCoins();
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
            setTimeout(() => { isBuying = false; }, 200);
        };
        multitapBtn.addEventListener("pointerdown", triggerBuy);
        multitapBtn.addEventListener("click", triggerBuy);
    }
});
