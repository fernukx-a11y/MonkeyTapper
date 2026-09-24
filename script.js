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

// Переменные для системы заключенных и выкупа
let currentViewedUserId = null; 
let currentRansomPrice = 0;   

function getUserId() {
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username) {
        return tg.initDataUnsafe.user.username.toLowerCase();
    }
    
    if (tg && tg.initData) {
        try {
            const urlParams = new URLSearchParams(tg.initData);
            const userStr = urlParams.get('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                if (userObj && userObj.username) {
                    return userObj.username.toLowerCase();
                }
                if (userObj && userObj.id) {
                    return userObj.id.toString();
                }
            }
        } catch (e) {}
    }

    let localDevId = localStorage.getItem("monkey_persistent_user_id");
    if (!localDevId) {
        localDevId = "peshiy4"; 
        localStorage.setItem("monkey_persistent_user_id", localDevId);
    }
    return localDevId.toLowerCase();
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

// Расчет стоимости выкупа заключенного
function calculatePrisonerPrice(playerObj) {
    const pCoins = Number(playerObj.coins || 0);
    const pPassive = Number(playerObj.passive_income_ps || 0);
    // Базовая формула выкупа: часть монет игрока + надбавка за пассивку
    let price = Math.floor(pCoins * 0.3 + pPassive * 100 + 200);
    return Math.max(100, price); // Минимум 100 монет
}

// Проверка на циклическую зависимость (чтобы владелец не стал заключенным у своего же заключенного)
async function checkCircularDependency(targetUserId, myUserId) {
    if (targetUserId === myUserId) return true;
    let currentId = targetUserId;
    let depth = 0;
    while (depth < 10) {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${currentId}&select=owner_id`, {
                headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const data = await res.json();
            if (!data || data.length === 0 || !data[0].owner_id) break;
            currentId = data[0].owner_id;
            if (currentId === myUserId) return true;
        } catch (e) {
            break;
        }
        depth++;
    }
    return false;
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
        if (!username || username === "Игрок" || username.startsWith("@peshiy")) {
            let tgName = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Игрок";
            if (!window._customUsernameSet) {
                username = tgName.startsWith("@") ? tgName : "@" + tgName;
            }
        }
    } else if (!username.startsWith("@")) {
        username = "@" + username;
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

            let rawName = player.username || player.user_id;
            let displayName = rawName.startsWith("@") ? rawName : "@" + rawName;
            let playerCoins = Number(player.coins).toFixed(1);

            html += `
                <div class="leader-item ${rankClass}" onclick="openPlayerProfile('${player.user_id}')" style="display: flex; justify-content: space-between; padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.2s;">
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

async function openPlayerProfile(targetUserId) {
    currentViewedUserId = targetUserId;
    const leaderboardModal = document.getElementById("leaderboard-modal");
    if (leaderboardModal) leaderboardModal.style.display = "none";

    const modal = document.getElementById("view-profile-modal");
    if (modal) {
        document.body.appendChild(modal);
        modal.style.display = "flex";
        modal.style.zIndex = "99999";
    }

    document.getElementById("vp-username").textContent = "Загрузка...";
    document.getElementById("vp-coins").textContent = "...";
    document.getElementById("vp-tap").textContent = "...";
    document.getElementById("vp-passive").textContent = "...";
    document.getElementById("vp-refs").textContent = "...";
    
    const prisonerSection = document.getElementById("prisoner-section");
    const ransomBtn = document.getElementById("ransom-btn");
    const statusText = document.getElementById("vp-status-text");
    if (prisonerSection) prisonerSection.style.display = "none";

    try {
        const resPlayer = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${targetUserId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const playerData = await resPlayer.json();

        if (playerData && playerData.length > 0) {
            const p = playerData[0];
            let rawName = p.username || p.user_id;
            document.getElementById("vp-username").textContent = rawName.startsWith("@") ? rawName : "@" + rawName;
            document.getElementById("vp-coins").textContent = Number(p.coins || 0).toFixed(1);
            document.getElementById("vp-tap").textContent = Number(p.tap_power || 0.2).toFixed(1);
            document.getElementById("vp-passive").textContent = Number(p.passive_income_ps || 0).toFixed(1);

            // Статус заключенного в профиле
            if (prisonerSection) {
                prisonerSection.style.display = "block";
                const myUserId = getUserId();

                if (p.status === "prisoner" && p.owner_id) {
                    if (p.owner_id === myUserId) {
                        statusText.textContent = "🔒 Этот игрок — твой заключенный!";
                        ransomBtn.style.display = "none";
                    } else {
                        currentRansomPrice = calculatePrisonerPrice(p);
                        document.getElementById("ransom-price").textContent = currentRansomPrice;
                        statusText.textContent = `⛓️ Сидит в тюрьме у @${p.owner_id}`;
                        ransomBtn.style.display = "inline-block";
                    }
                } else {
                    statusText.textContent = "✨ Игрок на свободе";
                    ransomBtn.style.display = "none";
                }
            }

        } else {
            document.getElementById("vp-username").textContent = "Не найден";
        }

        const resRefs = await fetch(`${SUPABASE_URL}/rest/v1/referrals?referrer_id=eq.${targetUserId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const refsData = await resRefs.json();
        document.getElementById("vp-refs").textContent = refsData ? refsData.length : 0;

    } catch (e) {
        console.error("Ошибка при открытии профиля игрока:", e);
        document.getElementById("vp-username").textContent = "Ошибка загрузки";
    }
}

// Функция выкупа заключенного
async function buyRansom() {
    if (!currentViewedUserId) return;
    const myUserId = getUserId();

    if (coins < currentRansomPrice) {
        alert("Недостаточно монет для выкупа!");
        return;
    }

    try {
        const resCheck = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${currentViewedUserId}&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const dataCheck = await resCheck.json();
        
        if (!dataCheck || dataCheck.length === 0) {
            alert("Игрок не найден!");
            return;
        }

        const prisoner = dataCheck[0];
        if (prisoner.status !== "prisoner") {
            alert("Этот игрок уже не в тюрьме!");
            openPlayerProfile(currentViewedUserId);
            return;
        }

        const oldOwnerId = prisoner.owner_id;

        const isCircular = await checkCircularDependency(currentViewedUserId, myUserId);
        if (isCircular) {
            alert("Ошибка выкупа: нельзя зациклить цепочку владельцев!");
            return;
        }

        coins -= currentRansomPrice;

        const updatePrisoner = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${currentViewedUserId}`, {
            method: "PATCH",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ owner_id: myUserId })
        });

        if (!updatePrisoner.ok) {
            alert("Ошибка при выкупе!");
            coins += currentRansomPrice; 
            return;
        }

        if (oldOwnerId) {
            const resOldOwner = await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${oldOwnerId}&select=coins`, {
                headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const oldOwnerData = await resOldOwner.json();
            if (oldOwnerData && oldOwnerData.length > 0) {
                const oldOwnerCoins = sanitizeFloat(oldOwnerData[0].coins, 0);
                const compensation = Math.floor(currentRansomPrice * 0.5);
                await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${oldOwnerId}`, {
                    method: "PATCH",
                    headers: {
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ coins: oldOwnerCoins + compensation })
                });
            }
        }

        alert("Успешно! Вы выкупили заключенного, теперь он работает на вас! 🐒⛓️");
        updateUI();
        saveData();
        openPlayerProfile(currentViewedUserId);

    } catch (e) {
        console.error("Ошибка в процессе выкупа:", e);
        alert("Произошла сетевая ошибка при выкупе.");
    }
}

// Сбор налогов с заключенных
async function collectPrisonersIncome() {
    const myUserId = getUserId();
    if (!myUserId) return;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/players?owner_id=eq.${myUserId}&status=eq.prisoner&select=*`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const prisoners = await res.json();

        if (prisoners && prisoners.length > 0) {
            let totalTribute = 0;

            for (const p of prisoners) {
                const prisonerPassive = Number(p.passive_income_ps || 0);
                const tribute = prisonerPassive * 0.2; // 20% от пассивки заключенного
                totalTribute += tribute;
            }

            if (totalTribute > 0) {
                coins += totalTribute;
                updateUI();
                saveData();
            }
        }
    } catch (e) {
        console.error("Ошибка при сборе дохода с заключенных:", e);
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
            let rawName = player.username || userId;
            username = rawName.startsWith("@") ? rawName : "@" + rawName;
            
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
                let tgName = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || userId;
                username = tgName.startsWith("@") ? tgName : "@" + tgName;
            } else {
                username = userId.startsWith("@") ? userId : "@" + userId;
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
    let newName = input.value.trim();
    if (newName.length < 2) {
        alert("Ник слишком короткий!");
        return;
    }
    
    window._customUsernameSet = true;
    username = newName.startsWith("@") ? newName : "@" + newName;
    
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
    setInterval(collectPrisonersIncome, 10000); // Сбор налогов с заключенных раз в 10 сек
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
        const viewProfileModal = document.getElementById("view-profile-modal");
        if (e.target === viewProfileModal) viewProfileModal.style.display = "none";
    });
});
