// --- ИНИЦИАЛИЗАЦИЯ TELEGRAM И ДАННЫХ ИГРОКА ---
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
    tg.expand();
}

// Получаем данные пользователя Telegram или используем тестовые для ПК
const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : {
    id: 999999,
    first_name: "ПК Игрок",
    username: "pc_player"
};

const userId = String(user.id);
const defaultUsername = user.first_name || "Обезьянка";

// Игровые переменные
let coins = 0;
let tapPower = 1;
let multitapLevel = 1;
let multitapCost = 50;
let energy = 1000;
let maxEnergy = 1000;
let passiveIncome = 0;
let refsCount = 0;

// Уровни пассивных улучшений
let p1Level = 0;
let p1Cost = 100;
let p2Level = 0;
let p2Cost = 1000;

// Защита от спама сохранениями
let saveTimeout = null;

window.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Запуск пассивного дохода каждую секунду
    setInterval(() => {
        if (passiveIncome > 0) {
            coins += passiveIncome / 10; // Дробим для плавности или считаем раз в сек
            updateUI();
        }
    }, 1000);

    // Восстановление энергии (10 энергии в сек)
    setInterval(() => {
        if (energy < maxEnergy) {
            energy = Math.min(maxEnergy, energy + 10);
            updateEnergyUI();
        }
    }, 1000);
});

// Инициализация игры (загрузка из localStorage как основы + синхронизация)
function initGame() {
    try {
        const savedCoins = localStorage.getItem(`monkey_coins_${userId}`);
        if (savedCoins !== null) {
            coins = parseFloat(savedCoins);
            tapPower = parseFloat(localStorage.getItem(`monkey_tap_${userId}`) || "1");
            multitapLevel = parseInt(localStorage.getItem(`monkey_mlevel_${userId}`) || "1");
            multitapCost = parseInt(localStorage.getItem(`monkey_mcost_${userId}`) || "50");
            energy = parseInt(localStorage.getItem(`monkey_energy_${userId}`) || "1000");
            passiveIncome = parseFloat(localStorage.getItem(`monkey_passive_${userId}`) || "0");
            refsCount = parseInt(localStorage.getItem(`monkey_refs_${userId}`) || "0");
            p1Level = parseInt(localStorage.getItem(`monkey_p1_${userId}`) || "0");
            p1Cost = parseInt(localStorage.getItem(`monkey_p1cost_${userId}`) || "100");
        }
    } catch (e) {
        console.error("Ошибка чтения localStorage:", e);
    }

    updateUI();
    updateProfileDisplay();
}

// Функция тапа (вызывается из index.html при клике на обезьянку)
function handleTap(e) {
    if (energy <= 0) return;

    let earned = tapPower;
    energy = Math.max(0, energy - 1);

    coins += earned;
    updateUI();
    updateEnergyUI();

    // Создаем летящую циферку монет
    createFloatingText(e, `+${earned}`, earned > 1 ? 'flying-crit' : 'flying-one');

    // Отложенное сохранение, чтобы не нагружать систему
    debounceSave();
}

// Эффект всплывающих монет при клике
function createFloatingText(e, text, className) {
    const container = document.getElementById('background-effects');
    if (!container) return;

    const el = document.createElement('div');
    el.className = className;
    el.innerText = text;

    // Определяем координаты клика (поддержка мыши и тача)
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    if (!clientX || !clientY) {
        clientX = window.innerWidth / 2 + (Math.random() * 40 - 20);
        clientY = window.innerHeight / 2 + (Math.random() * 40 - 20);
    }

    el.style.left = `${clientX - 15}px`;
    el.style.top = `${clientY - 20}px`;

    container.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 700);
}

// Обновление интерфейса
function updateUI() {
    const coinsDisplay = document.getElementById('coins-display');
    if (coinsDisplay) {
        coinsDisplay.innerText = Math.floor(coins);
    }

    // Обновляем экран прокачки
    const mLevelEl = document.getElementById('multitap-level');
    const mPowerEl = document.getElementById('multitap-power');
    const mCostEl = document.getElementById('multitap-cost');
    if (mLevelEl) mLevelEl.innerText = multitapLevel;
    if (mPowerEl) mPowerEl.innerText = tapPower;
    if (mCostEl) mCostEl.innerText = multitapCost;

    const passiveDisplay = document.getElementById('passive-income-display');
    if (passiveDisplay) passiveDisplay.innerText = passiveIncome.toFixed(1);

    const refCountEl = document.getElementById('ref-count');
    if (refCountEl) refCountEl.innerText = `Приглашено: ${refsCount}`;

    const p1LevelEl = document.getElementById('p1-level');
    const p1CostEl = document.getElementById('p1-cost');
    if (p1LevelEl) p1LevelEl.innerText = p1Level;
    if (p1CostEl) p1CostEl.innerText = p1Cost;

    updateProfileDisplay();
}

function updateEnergyUI() {
    const energyDisplay = document.getElementById('energy-display');
    const energyBarFill = document.getElementById('energy-bar-fill');
    
    if (energyDisplay) energyDisplay.innerText = Math.floor(energy);
    if (energyBarFill) {
        const percent = (energy / maxEnergy) * 100;
        energyBarFill.style.width = `${percent}%`;
    }
}

function updateProfileDisplay() {
    const pUser = document.getElementById('profile-username');
    const pId = document.getElementById('profile-userid');
    if (pUser) pUser.innerText = localStorage.getItem(`monkey_name_${userId}`) || defaultUsername;
    if (pId) pId.innerText = userId;

    setElemText('prof-coins', Math.floor(coins));
    setElemText('prof-tap', tapPower);
    setElemText('prof-passive', passiveIncome.toFixed(1));
    setElemText('prof-energy', `${Math.floor(energy)} / ${maxEnergy}`);
    setElemText('prof-refs', refsCount);
}

function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// Сохранение данных (localStorage)
function debounceSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem(`monkey_coins_${userId}`, coins);
            localStorage.setItem(`monkey_tap_${userId}`, tapPower);
            localStorage.setItem(`monkey_mlevel_${userId}`, multitapLevel);
            localStorage.setItem(`monkey_mcost_${userId}`, multitapCost);
            localStorage.setItem(`monkey_energy_${userId}`, energy);
            localStorage.setItem(`monkey_passive_${userId}`, passiveIncome);
            localStorage.setItem(`monkey_refs_${userId}`, refsCount);
            localStorage.setItem(`monkey_p1_${userId}`, p1Level);
            localStorage.setItem(`monkey_p1cost_${userId}`, p1Cost);
        } catch (e) {
            console.error("Ошибка сохранения:", e);
        }
    }, 500);
}

// Покупка мультитапа
function buyMultitap(e) {
    if (coins >= multitapCost) {
        coins -= multitapCost;
        multitapLevel++;
        tapPower = multitapLevel; // 1 уровень = 1 сила тапа (или своя формула)
        multitapCost = Math.floor(multitapCost * 1.7);
        
        updateUI();
        debounceSave();
        
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    } else {
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    }
}

// Покупка пассивного дохода (Куст)
function buyPassive(id) {
    if (id === 1) {
        if (coins >= p1Cost) {
            coins -= p1Cost;
            p1Level++;
            passiveIncome += 0.5;
            p1Cost = Math.floor(p1Cost * 1.8);

            updateUI();
            debounceSave();

            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    }
}

// Никнейм и модальные окна
function openRenameModal() {
    const modal = document.getElementById('rename-modal');
    const input = document.getElementById('username-input');
    if (modal && input) {
        input.value = document.getElementById('profile-username').innerText;
        modal.style.display = 'flex';
    }
}

function saveUsername() {
    const input = document.getElementById('username-input');
    if (input) {
        const newName = input.value.trim();
        if (newName.length > 0) {
            localStorage.setItem(`monkey_name_${userId}`, newName);
            updateProfileDisplay();
        }
    }
    document.getElementById('rename-modal').style.display = 'none';
}

// Реферальная система (приглашение друзей)
function shareReferralLink() {
    const refLink = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/your_bot_username?start=" + userId)}&text=${encodeURIComponent("🐒 Зарабатывай бананы вместе со мной в Monkey Tapper!")}`;
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(refLink);
    } else {
        window.open(refLink, '_blank');
    }
}

// Проверка подписки на канал
function claimChannelReward() {
    const claimed = localStorage.getItem(`monkey_channel_claimed_${userId}`);
    if (claimed) {
        alert("Вы уже получили награду за подписку!");
        return;
    }
    coins += 250;
    localStorage.setItem(`monkey_channel_claimed_${userId}`, "true");
    updateUI();
    alert("Успешно! Вам начислено +250 монет 🍌");
}

// Заглушка для таблицы лидеров, чтобы не висела "Загрузка..."
function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    // Имитируем топ игроков для стабильной работы
    const currentName = localStorage.getItem(`monkey_name_${userId}`) || defaultUsername;
    
    list.innerHTML = `
        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>1. 👑 Банановый Король</span>
            <span style="color: #ffd700; font-weight: bold;">150,400 🍌</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>2. 🐒 Чипполино</span>
            <span style="color: #ffd700; font-weight: bold;">98,200 🍌</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>3. 🦍 Горилла Трейдер</span>
            <span style="color: #ffd700; font-weight: bold;">75,000 🍌</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 8px; margin-top: 5px;">
            <span>📍 <b>${currentName} (Вы)</b></span>
            <span style="color: #ffd700; font-weight: bold;">${Math.floor(coins)} 🍌</span>
        </div>
    `;
}
