// ==========================================
// НАСТРОЙКИ:
const SUPABASE_URL = "https://odzqplffdudeqskaspgd.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_vAeHVzmBuxGcPT0JRCe7-Q_PP57Kqc6"; 
const BOT_USERNAME = "MonkeyTapperTGbot";
// ==========================================

let coins = 0;
let energy = 1000;
const maxEnergy = 1000;
let tapPower = 0.2; 
let multitapCost = 50; 
let username = "Игрок";

let passiveIncomePS = 0;
let passive1Level = 0;
let passive1Cost = 150;  
let passive2Level = 0;
let passive2Cost = 2000; 

let lastSaveTime = Date.now();
let referralCount = 0;
let saveTimeout = null;

function getUserId() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        return tg.initDataUnsafe.user.id.toString();
    }
    
    if (tg && tg.initData) {
        try {
            const urlParams = new URLSearchParams(tg.initData);
            const userStr = urlParams.get('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                if (userObj && userObj.id) return userObj.id.toString();
            }
        } catch (e) {}
    }

    let localDevId = localStorage.getItem("monkey_persistent_user_id");
    if (!localDevId) {
        localDevId = "browser_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("monkey_persistent_user_id", localDevId);
    }
    return localDevId;
}

function getReferrerId() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        return tg.initDataUnsafe.start_param.toString();
    }
    const urlParams = new URLSearchParams(window.location.search);
    let paramFromUrl = urlParams.get("tgWebAppStartParam") || urlParams.get("startapp") || urlParams.get("start");
    if (paramFromUrl) return paramFromUrl.toString();

    if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        let paramFromHash = hashParams.get("tgWebAppStartParam") || hashParams.get("startapp") || hashParams.get("start");
        if (paramFromHash) return paramFromHash.toString();
    }
    return null;
}

function sanitizeFloat(val, fallback) {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
}

function sanitizeInt(val, fallback) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
}

function calculateCost(power) {
    const level = Math.round((power - 0.2) / 0.2) + 1;
    return Math.floor(50 * Math.pow(3.0, level - 1));
}

function applyOfflineProgress() {
    const now = Date.now();
    const secondsPassed = Math.floor((now - lastSaveTime) / 1000);
    if (secondsPassed > 0) {
        const energyRestored = Math.floor(secondsPassed / 5);
        energy = Math.min(maxEnergy, energy + energyRestored);
        
        if (passiveIncomePS > 0) {
            const offlineCoins = passiveIncomePS * secondsPassed * 0.2;
            coins += offlineCoins;
        }
    }
    lastSaveTime = now;
}

async function saveToSupabase() {
    const userId = getUserId();
    lastSaveTime = Date.now();

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        if (!username || username === "Игрок") {
            username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Игрок";
        }
    }

    const bodyData = {
        user_id: userId,
        username: username,
        coins: coins,
        tap_power: tapPower,
        energy: energy,
        last_time: lastSaveTime,
        passive_income_ps: passiveIncomePS,
        passive1_level: passive1Level,
        passive1_cost: passive1Cost,
        passive2_level: passive2Level,
        passive2_cost: passive2Cost
    };

    try {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${userId}&select=user_id`, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const checkData = await checkRes.json();

        let response;
        if (checkData && checkData.length > 0) {
            response = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${userId}`, {
                method: "PATCH",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(bodyData)
            });
        } else {
            response = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(bodyData)
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            console.error("❌ Ошибка сохранения:", response.status, errText);
        }
    } catch (e) {
        console.error("🌐 Сетевая ошибка сохранения:", e);
    }
}

function saveData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToSupabase();
    }, 500);
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveToSupabase();
});

window.addEventListener("beforeunload", () => {
    saveToSupabase();
});

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

            coins += 100; 

            const getRefPlayer = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${referrerId}&select=*`, {
                headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const referrerData = await getRefPlayer.json();

            if (referrerData && referrerData.length > 0) {
                const oldCoins = sanitizeFloat(referrerData[0].coins, 0);
                await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${referrerId}`, {
                    method: "PATCH",
                    headers: {
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ coins: oldCoins + 250 })
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
        if (refCountEl) refCountEl.textContent = "Приглашено: " + referralCount;
        
        const profRefs = document.getElementById("prof-refs");
        if (profRefs) profRefs.textContent = referralCount;
    } catch (e) {
        console.error("Ошибка загрузки рефералов:", e);
    }
}

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
            alert("Ты уже получил награду!");
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
            coins += 250; 
            updateUI();
            saveData();
            alert("Спасибо за подписку! Тебе начислено 250 монет! 🐒");
            
            const channelBtn = document.getElementById("channel-btn");
            if (channelBtn) {
                const titleEl = channelBtn.querySelector(".upgrade-title") || channelBtn.querySelector("span");
                if (titleEl) titleEl.textContent = "✅ Награда получена";
                channelBtn.disabled = true;
            }
        }
    } catch (e) {
        console.error("Ошибка при выдаче награды за канал:", e);
    }
}

async function checkChannelStatus(userId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/channel_subscriptions?user_id=eq.${userId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            const channelBtn = document.getElementById("channel-btn");
            if (channelBtn) {
                const titleEl = channelBtn.querySelector(".upgrade-title") || channelBtn.querySelector("span");
                if (titleEl) titleEl.textContent = "✅ Награда получена";
                channelBtn.disabled = true;
            }
        }
    } catch (e) {
        console.error("Ошибка проверки статуса подписки:", e);
    }
}

async function loadLeaderboard() {
    const listContainer = document.getElementById("leaderboard-list");
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="loading-text">Загрузка рейтинга...</p>';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/players?select=user_id,username,coins&order=coins.desc&limit=10`, {
            headers: { 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            }
        });
        const data = await response.json();

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<p class="loading-text">Пока нет игроков в рейтинге</p>';
            return;
        }

        let html = "";
        data.forEach((player, index) => {
            const rank = index + 1;
            let rankClass = "";
            if (rank === 1) rankClass = "top-1";
            else if (rank === 2) rankClass = "top-2";
            else if (rank === 3) rankClass = "top-3";

            let displayName = player.username ? player.username : ("Игрок " + player.user_id.toString().substring(0, 4));
            let playerCoins = Number(player.coins).toFixed(1);

            html += `
                <div class="leader-item ${rankClass}" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span>#${rank} ${displayName}</span>
                    <span>💰 ${playerCoins}</span>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    } catch (e) {
        console.error("Ошибка загрузки лидеров:", e);
        listContainer.innerHTML = '<p class="loading-text">Ошибка загрузки рейтинга</p>';
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
            username = player.username || "Игрок";
            coins = sanitizeFloat(player.coins, coins);
            tapPower = sanitizeFloat(player.tap_power, 0.2);
            energy = sanitizeInt(player.energy, maxEnergy);
            lastSaveTime = sanitizeInt(player.last_time, Date.now());
            
            passiveIncomePS = sanitizeFloat(player.passive_income_ps, 0);
            passive1Level = sanitizeInt(player.passive1_level, 0);
            passive1Cost = sanitizeInt(player.passive1_cost, 150);
            passive2Level = sanitizeInt(player.passive2_level, 0);
            passive2Cost = sanitizeInt(player.passive2_cost, 2000);

            applyOfflineProgress();
            updateUI();
        } else {
            const tg = window.Telegram ? window.Telegram.WebApp : null;
            if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
                username = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Игрок";
            }
            await saveToSupabase();
            updateUI();
        }
        
        loadReferralCount(userId);
        checkChannelStatus(userId);
    } catch (e) {
        console.error("Ошибка загрузки данных:", e);
    }
}

function openRenameModal() {
    const modal = document.getElementById("rename-modal");
    if (modal) modal.style.display = "flex";
}

async function saveUsername() {
    const input = document.getElementById("username-input");
    if (!input) return;
    const newName = input.value.trim();
    if (newName.length < 2) {
        alert("Ник слишком короткий!");
        return;
    }
    username = newName;
    const modal = document.getElementById("rename-modal");
    if (modal) modal.style.display = "none";
    updateProfileUI();
    await saveToSupabase();
    alert("Ник успешно изменен!");
}

function shareReferralLink() {
    const userId = getUserId();
    const shareUrl = `https://t.me/${BOT_USERNAME}/play?startapp=${userId}`;
    
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Заходи в ультра-хардкорный Monkey Tapper! 🐒🍌")}`);
    } else {
        navigator.clipboard.writeText(shareUrl);
        alert("Ссылка скопирована!");
    }
}

function initBackgroundBananas() {
    let bgContainer = document.getElementById("background-effects");
    if (!bgContainer) {
        bgContainer = document.createElement("div");
        bgContainer.id = "background-effects";
        const gameContainer = document.querySelector(".game-container");
        if (gameContainer) {
            gameContainer.prepend(bgContainer);
        } else {
            document.body.prepend(bgContainer);
        }
    }

    setInterval(() => {
        const banana = document.createElement("div");
        banana.classList.add("falling-banana");
        banana.textContent = "🍌";
        banana.style.left = Math.random() * 100 + "%";
        const duration = Math.random() * 5 + 5;
        banana.style.animationDuration = duration + "s";
        const size = Math.random() * 14 + 18;
        banana.style.fontSize = size + "px";
        bgContainer.appendChild(banana);

        setTimeout(() => {
            banana.remove();
        }, duration * 1000);
    }, 700);
}

function initApp() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.ready();
        tg.expand();
    }

    loadData();
    initBackgroundBananas();
    setInterval(gameTick, 1000);
}

function updateUI() {
    if (isNaN(energy)) energy = maxEnergy;
    if (isNaN(coins)) coins = 0;
    if (isNaN(tapPower) || tapPower < 0.2) tapPower = 0.2;

    multitapCost = calculateCost(tapPower);

    const coinsDisplay = document.getElementById("coins-display");
    const energyDisplay = document.getElementById("energy-display");
    const energyBarFill = document.getElementById("energy-bar-fill");
    
    const multitapLevel = document.getElementById("multitap-level");
    const multitapPower = document.getElementById("multitap-power");
    const multitapCostDisplay = document.getElementById("multitap-cost");
    const multitapBtn = document.getElementById("multitap-btn");

    const passiveIncomeDisplay = document.getElementById("passive-income-display");
    const p1Level = document.getElementById("p1-level");
    const p1Cost = document.getElementById("p1-cost");
    const p1Btn = document.getElementById("passive-1-btn");

    const cardPassive2 = document.getElementById("card-passive-2");
    const p2Level = document.getElementById("p2-level");
    const p2Cost = document.getElementById("p2-cost");
    const p2Btn = document.getElementById("passive-2-btn");

    if (coinsDisplay) coinsDisplay.textContent = coins.toFixed(1);
    if (energyDisplay) energyDisplay.textContent = Math.floor(energy);
    
    if (energyBarFill) {
        const percentage = Math.max(0, Math.min(100, (energy / maxEnergy) * 100));
        energyBarFill.style.width = percentage + "%";
    }

    const currentVirtualLevel = Math.round((tapPower - 0.2) / 0.2) + 1;
    if (multitapLevel) multitapLevel.textContent = currentVirtualLevel > 6 ? 6 : currentVirtualLevel;
    if (multitapPower) multitapPower.textContent = tapPower.toFixed(1);
    
    if (currentVirtualLevel >= 6) {
        if (multitapCostDisplay) multitapCostDisplay.textContent = "MAX";
        if (multitapBtn) multitapBtn.disabled = true;
    } else {
        if (multitapCostDisplay) multitapCostDisplay.textContent = multitapCost;
        if (multitapBtn) multitapBtn.disabled = coins < multitapCost;
    }

    if (passiveIncomeDisplay) passiveIncomeDisplay.textContent = passiveIncomePS.toFixed(1);
    if (p1Level) p1Level.textContent = passive1Level;
    if (passive1Level >= 6) {
        if (p1Cost) p1Cost.textContent = "MAX";
        if (p1Btn) p1Btn.disabled = true;
    } else {
        if (p1Cost) p1Cost.textContent = passive1Cost;
        if (p1Btn) p1Btn.disabled = coins < passive1Cost;
    }

    if (p2Level) p2Level.textContent = passive2Level;
    if (cardPassive2 && p2Btn) {
        if (passive2Level >= 6) {
            cardPassive2.classList.remove("locked");
            if (p2Cost) p2Cost.textContent = "MAX";
            p2Btn.disabled = true;
            const titleEl = cardPassive2.querySelector(".upgrade-title");
            if (titleEl) titleEl.textContent = "Банановая ферма (MAX)";
        } else if (passive1Level > 0 || coins >= 1000) {
            cardPassive2.classList.remove("locked");
            const iconEl = cardPassive2.querySelector(".upgrade-icon");
            const titleEl = cardPassive2.querySelector(".upgrade-title");
            if (iconEl) iconEl.textContent = "🏭";
            if (titleEl) titleEl.textContent = "Банановая ферма";
            if (p2Cost) p2Cost.textContent = passive2Cost;
            p2Btn.disabled = coins < passive2Cost;
        } else {
            cardPassive2.classList.add("locked");
            const iconEl = cardPassive2.querySelector(".upgrade-icon");
            const titleEl = cardPassive2.querySelector(".upgrade-title");
            if (iconEl) iconEl.textContent = "🔒";
            if (titleEl) titleEl.textContent = "Заблокировано (нужен куст или 1k монет)";
            if (p2Cost) p2Cost.textContent = passive2Cost;
            p2Btn.disabled = true;
        }
    }

    // Обновляем экран профиля
    updateProfileUI();
}

function updateProfileUI() {
    const profUsername = document.getElementById("profile-username");
    const profUserid = document.getElementById("profile-userid");
    const profCoins = document.getElementById("prof-coins");
    const profTap = document.getElementById("prof-tap");
    const profPassive = document.getElementById("prof-passive");
    const profEnergy = document.getElementById("prof-energy");

    if (profUsername) profUsername.textContent = username;
    if (profUserid) profUserid.textContent = getUserId();
    if (profCoins) profCoins.textContent = coins.toFixed(1);
    if (profTap) profTap.textContent = tapPower.toFixed(1);
    if (profPassive) profPassive.textContent = passiveIncomePS.toFixed(1);
    if (profEnergy) profEnergy.textContent = `${Math.floor(energy)} / ${maxEnergy}`;
}

function buyMultitap(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const currentVirtualLevel = Math.round((tapPower - 0.2) / 0.2) + 1;
    if (currentVirtualLevel < 6 && coins >= multitapCost) {
        coins -= multitapCost;
        tapPower = Number((tapPower + 0.2).toFixed(2)); 
        updateUI();
        saveData();
    }
}

function buyPassive1(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (passive1Level < 6 && coins >= passive1Cost) {
        coins -= passive1Cost;
        passive1Level++;
        passiveIncomePS = Number((passiveIncomePS + 0.5).toFixed(1)); 
        passive1Cost = Math.floor(passive1Cost * 2.5); 
        updateUI();
        saveData();
    }
}

function buyPassive2(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const cardPassive2 = document.getElementById("card-passive-2");
    if (passive2Level < 6 && coins >= passive2Cost && cardPassive2 && !cardPassive2.classList.contains("locked")) {
        coins -= passive2Cost;
        passive2Level++;
        passiveIncomePS = Number((passiveIncomePS + 2.0).toFixed(1)); 
        passive2Cost = Math.floor(passive2Cost * 2.8); 
        updateUI();
        saveData();
    }
}

let tickCounter = 0;
function gameTick() {
    tickCounter++;
    if (tickCounter % 5 === 0) {
        if (energy < maxEnergy) {
            energy = Math.min(maxEnergy, energy + 1);
        }
    }
    if (passiveIncomePS > 0) {
        coins = Number((coins + passiveIncomePS).toFixed(2));
    }
    updateUI();
    saveData();
}

function createFlyingOne(x, y, text, isCrit) {
    const flyingEl = document.createElement("div");
    flyingEl.classList.add(isCrit ? "flying-crit" : "flying-one");
    flyingEl.textContent = isCrit ? `CRIT! +${text}` : `+${text}`;
    flyingEl.style.left = x + "px";
    flyingEl.style.top = y + "px";
    document.body.appendChild(flyingEl);
    
    setTimeout(() => { flyingEl.remove(); }, 800);
}

function handleTap(e) {
    if (energy <= 0) return;

    energy -= 1;

    const critChance = 0.03; 
    let earnedCoins = tapPower;
    let isCrit = Math.random() < critChance;

    if (isCrit) {
        earnedCoins *= 3; 
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    } else {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    coins = Number((coins + earnedCoins).toFixed(2));
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

    if ((clientX === undefined || clientY === undefined || (clientX === 0 && clientY === 0)) && tapArea) {
        const rect = tapArea.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
    }
    
    createFlyingOne(clientX, clientY, earnedCoins.toFixed(1), isCrit);
}

function switchScreen(target) {
    const screens = document.querySelectorAll('.screen');
    const navItems = document.querySelectorAll('.nav-item');
    
    let activeIndex = 0;
    if (target === 'boosts' || target === 1) activeIndex = 1;
    if (target === 'profile' || target === 2) activeIndex = 2;

    screens.forEach((screen, index) => {
        if (index === activeIndex) screen.classList.add('active');
        else screen.classList.remove('active');
    });

    navItems.forEach((item, index) => {
        if (index === activeIndex) item.classList.add('active');
        else item.classList.remove('active');
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems.length >= 3) {
        navItems[0].addEventListener('pointerdown', (e) => { e.preventDefault(); switchScreen('game'); });
        navItems[1].addEventListener('pointerdown', (e) => { e.preventDefault(); switchScreen('boosts'); });
        navItems[2].addEventListener('pointerdown', (e) => { e.preventDefault(); switchScreen('profile'); });
    }

    const tapArea = document.getElementById("tap-area");
    if (tapArea) {
        tapArea.addEventListener("pointerdown", (e) => {
            if (e.button === 0 || e.pointerType === "touch") {
                e.preventDefault();
                handleTap(e);
            }
        });
    }

    const multitapBtn = document.getElementById("multitap-btn");
    if (multitapBtn) {
        let isBuying = false;
        multitapBtn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            if (isBuying) return;
            isBuying = true;
            buyMultitap(e);
            setTimeout(() => { isBuying = false; }, 300);
        });
    }

    const p1Btn = document.getElementById("passive-1-btn");
    if (p1Btn) p1Btn.addEventListener("pointerdown", (e) => { e.preventDefault(); buyPassive1(e); });

    const p2Btn = document.getElementById("passive-2-btn");
    if (p2Btn) p2Btn.addEventListener("pointerdown", (e) => { e.preventDefault(); buyPassive2(e); });

    const refBtn = document.getElementById("ref-btn");
    if (refBtn) refBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); shareReferralLink(); });

    const channelBtn = document.getElementById("channel-btn");
    if (channelBtn) channelBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); claimChannelReward(); });

    const modal = document.getElementById("leaderboard-modal");
    const leaderboardBtn = document.getElementById("leaderboard-btn");
    const closeModal = document.getElementById("close-modal");

    if (leaderboardBtn && modal) {
        leaderboardBtn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            modal.style.display = "flex";
            loadLeaderboard();
        });
    }

    if (closeModal && modal) {
        closeModal.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            modal.style.display = "none";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
});
