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
                const tribute = prisonerPassive * 0.2; 
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

// Игровой тик: восстанавливает энергию и капает пассивный доход
function gameTick() {
    tickCounter++;

    // Восстановление энергии по 1 единице каждые 5 секунд
    if (tickCounter % 5 === 0) {
        if (energy < maxEnergy) {
            energy = Math.min(maxEnergy, energy + 1);
            updateUI();
        }
    }

    // Пассивный доход монет каждую секунду
    if (passiveIncomePS > 0) {
        coins += passiveIncomePS;
        updateUI();
    }
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
    setInterval(collectPrisonersIncome, 10000); 
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
    const profRefs = document.getElementById("prof-refs");

    if (profUsername) profUsername.textContent = username;
    if (profUserid) profUserid.textContent = getUserId();
    if (profCoins) profCoins.textContent = coins.toFixed(1);
    if (profTap) profTap.textContent = tapPower.toFixed(1);
    if (profPassive) profPassive.textContent = passiveIncomePS.toFixed(1);
    if (profEnergy) profEnergy.textContent = `${Math.floor(energy)} / ${maxEnergy}`;
    if (profRefs) profRefs.textContent = referralCount;
}

// Покупка улучшений кликера (Мультитап)
async function buyMultitap(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (coins < multitapCost) {
        alert("Недостаточно монет!");
        return;
    }

    const currentVirtualLevel = Math.round((tapPower - 0.2) / 0.2) + 1;
    if (currentVirtualLevel >= 6) {
        alert("Достигнут максимальный уровень мультитапа!");
        return;
    }

    coins -= multitapCost;
    tapPower = Number((tapPower + 0.2).toFixed(2)); 
    
    updateUI();
    saveData();
}

// Покупка пассивных улучшений (Куст / Ферма)
async function buyPassive(tier) {
    if (tier === 1) {
        if (passive1Level >= 6) {
            alert("Достигнут максимальный уровень!");
            return;
        }
        if (coins < passive1Cost) {
            alert("Недостаточно монет!");
            return;
        }

        coins -= passive1Cost;
        passive1Level++;
        passiveIncomePS = Number((passiveIncomePS + 1).toFixed(1));
        passive1Cost = Math.floor(passive1Cost * 1.8);

    } else if (tier === 2) {
        if (passive2Level >= 6) {
            alert("Достигнут максимальный уровень!");
            return;
        }
        if (coins < passive2Cost) {
            alert("Недостаточно монет!");
            return;
        }

        coins -= passive2Cost;
        passive2Level++;
        passiveIncomePS = Number((passiveIncomePS + 5).toFixed(1));
        passive2Cost = Math.floor(passive2Cost * 2.0);
    }

    updateUI();
    saveData();
}

// Обработка клика по главной кнопке (банану/обезьянке)
function handleTap(event) {
    if (energy < tapPower) {
        alert("Недостаточно энергии!");
        return;
    }

    energy = Math.max(0, energy - tapPower);
    coins += tapPower;

    updateUI();
    saveData();

    // Визуальный эффект всплывающей цифры при клике
    if (event) {
        const x = event.clientX || (event.touches ? event.touches[0].clientX : window.innerWidth / 2);
        const y = event.clientY || (event.touches ? event.touches[0].clientY : window.innerHeight / 2);

        const floatText = document.createElement("div");
        floatText.className = "floating-tap-text";
        floatText.textContent = "+" + tapPower.toFixed(1);
        floatText.style.left = x + "px";
        floatText.style.top = y + "px";
        document.body.appendChild(floatText);

        setTimeout(() => {
            floatText.remove();
        }, 1000);
    }
}

// Управление вкладками интерфейса
function switchTab(tabId) {
    const tabs = document.querySelectorAll(".tab-content");
    tabs.forEach(tab => {
        tab.style.display = "none";
    });

    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = "block";
    }

    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => btn.classList.remove("active"));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }

    if (tabId === "leaderboard-tab") {
        loadLeaderboard();
    }
}

// Закрытие модальных окон при клике вне их зоны
window.onclick = function(event) {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
};

// Запуск инициализации при загрузке документа
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
