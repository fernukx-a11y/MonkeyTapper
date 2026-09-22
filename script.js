// ==========================================
// НАСТРОЙКИ (ВСТАВЬ СВОИ ДАННЫЕ):
const SUPABASE_URL = "https://odzqplffdudeqskaspgd.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_vAeHVzmBuxGcPT0JRCe7-Q_PP57Kqc6"; 
const BOT_USERNAME = "MonkeyTapperTGbot"; // Имя бота без символа @ и без точки на конце
// ==========================================

let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let tapPower = 1;
let multitapCost = 50;
let lastSaveTime = Date.now();
let referralCount = 0;

let saveTimeout = null;

function getUserId() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        return tg.initDataUnsafe.user.id.toString();
    }
    let localDevId = localStorage.getItem("monkey_dev_user_id");
    if (!localDevId) {
        localDevId = "user_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("monkey_dev_user_id", localDevId);
    }
    return localDevId;
}

// Получение ID пригласившего из всех возможных источников
function getReferrerId() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    
    // 1. Проверяем стандартный start_param от Telegram WebApp
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        return tg.initDataUnsafe.start_param.toString();
    }
    
    // 2. Проверяем параметры в обычной строке URL
    const urlParams = new URLSearchParams(window.location.search);
    let paramFromUrl = urlParams.get("tgWebAppStartParam") || urlParams.get("startapp") || urlParams.get("start");
    if (paramFromUrl) return paramFromUrl.toString();

    // 3. Проверяем хэш
    if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        let paramFromHash = hashParams.get("tgWebAppStartParam") || hashParams.get("startapp") || hashParams.get("start");
        if (paramFromHash) return paramFromHash.toString();
    }

    return null;
}

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

async function saveToSupabase() {
    const userId = getUserId();
    lastSaveTime = Date.now();

    const bodyData = {
        user_id: userId,
        coins: coins,
        tap_power: tapPower,
        energy: energy,
        last_time: lastSaveTime
    };

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/players`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify(bodyData)
        });
    } catch (e) {
        console.error("Ошибка сохранения в облако:", e);
    }
}

function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToSupabase();
    }, 500);
}

// Обработка реферального бонуса
async function processReferral(userId) {
    const referrerId = getReferrerId();
    
    if (!referrerId || referrerId === userId) return;

    try {
        const checkRef = await fetch(`${SUPABASE_URL}/rest/v1/referrals?referred_id=eq.${userId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const refData = await checkRef.json();

        if (!refData || refData.length === 0) {
            const resPostRef = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ referrer_id: referrerId, referred_id: userId })
            });

            if (!resPostRef.ok) return;

            coins += 5000;

            const getRefPlayer = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${referrerId}&select=*`, {
                headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const referrerData = await getRefPlayer.json();

            if (referrerData && referrerData.length > 0) {
                const oldCoins = sanitizeNumber(referrerData[0].coins, 0);
                await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${referrerId}`, {
                    method: "PATCH",
                    headers: {
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ coins: oldCoins + 10000 })
                });
            }
        }
    } catch (e) {
        console.error("Сбой в processReferral:", e);
    }
}

async function loadReferralCount(userId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.${userId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const data = await response.json();
        referralCount = data.length || 0;
        const refCountEl = document.getElementById("ref-count");
        if (refCountEl) refCountEl.textContent = "Приглашено друзей: " + referralCount;
    } catch (e) {
        console.error("Ошибка загрузки рефералов:", e);
    }
}

// Выдача награды за подписку на канал
async function claimChannelReward() {
    const userId = getUserId();
    const channelUrl = "https://t.me/monkeytapper";

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(channelUrl);
    } else {
        window.open(channelUrl, "_blank");
    }

    try {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/channel_subscriptions?user_id=eq.${userId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const checkData = await checkRes.json();

        if (checkData && checkData.length > 0) {
            alert("Ты уже получил награду за подписку!");
            return;
        }

        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/channel_subscriptions`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ user_id: userId })
        });

        if (insertRes.ok) {
            coins += 5000;
            updateUI();
            saveData();
            alert("Спасибо за подписку! Тебе начислено 5 000 монет! 🐒💰");
            
            const channelBtn = document.getElementById("channel-btn");
            if (channelBtn) {
                channelBtn.textContent = "✅ Награда получена";
                channelBtn.disabled = true;
            }
        }
    } catch (e) {
        console.error("Ошибка при выдаче награды за канал:", e);
    }
}

// Проверка статуса подписки при старте игры
async function checkChannelStatus(userId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/channel_subscriptions?user_id=eq.${userId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            const channelBtn = document.getElementById("channel-btn");
            if (channelBtn) {
                channelBtn.textContent = "✅ Награда получена";
                channelBtn.disabled = true;
            }
        }
    } catch (e) {
        console.error("Ошибка проверки статуса подписки:", e);
    }
}

async function loadData() {
    const userId = getUserId();

    try {
        await processReferral(userId);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${userId}&select=*`, {
            method: "GET",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            const player = data[0];
            coins = sanitizeNumber(player.coins, coins);
            tapPower = sanitizeNumber(player.tap_power, 1);
            energy = sanitizeNumber(player.energy, maxEnergy);
            lastSaveTime = sanitizeNumber(player.last_time, Date.now());

            applyOfflineEnergy();
            updateUI();
        } else {
            saveToSupabase();
            updateUI();
        }
        
        loadReferralCount(userId);
        checkChannelStatus(userId);
    } catch (e) {
        console.error("Ошибка загрузки из облака:", e);
    }
}

function shareReferralLink() {
    const userId = getUserId();
    const shareUrl = `https://t.me/${BOT_USERNAME}/play?startapp=${userId}`;
    
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Заходи в Monkey Tapper и получи 5,000 монет в подарок! 🐒💰")}`);
    } else {
        navigator.clipboard.writeText(shareUrl);
        alert("Реферальная ссылка скопирована в буфер обмена!");
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
    
    setTimeout(() => { flyingOne.remove(); }, 1000);
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

    const refBtn = document.getElementById("ref-btn");
    if (refBtn) {
        refBtn.addEventListener("click", shareReferralLink);
    }

    const channelBtn = document.getElementById("channel-btn");
    if (channelBtn) {
        channelBtn.addEventListener("click", claimChannelReward);
    }
});
