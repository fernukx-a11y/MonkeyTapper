// --- ИНИЦИАЛИЗАЦИЯ TELEGRAM И ДАННЫХ ИГРОКА ---
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
    tg.expand();
}

const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : {
    id: 999999,
    first_name: "Игрок",
    username: "player"
};

const userId = String(user.id);
const defaultUsername = user.first_name || "Обезьянка";

// Игровые переменные
let coins = 0;
let tapPower = 0.2; 
let multitapLevel = 1;
let multitapCost = 50;
let energy = 1000;
let maxEnergy = 1000;
let passiveIncome = 0;
let refsCount = 0;

let p1Level = 0;
let p1Cost = 100;
let saveTimeout = null;

// Защита от двойного срабатывания (клик + тач на мобилках)
let lastTapTime = 0;

window.addEventListener('DOMContentLoaded', () => {
    initGame();
    initBackgroundBananas();

    // Пассивный доход (раз в секунду)
    setInterval(() => {
        if (passiveIncome > 0) {
            coins = Math.round((coins + passiveIncome) * 10) / 10;
            updateUI();
            debounceSave();
        }
    }, 1000);

    // Восстановление энергии
    setInterval(() => {
        if (energy < maxEnergy) {
            energy = Math.min(maxEnergy, energy + 1);
            updateEnergyUI();
        }
    }, 1000);

    // Навешиваем обработчики
    const monkeyContainer = document.getElementById('monkey-btn') || document.querySelector('.monkey-container');
    if (monkeyContainer) {
        // На мобилках используем touchstart, на ПК click. Разделяем их по времени, чтобы не было двойных кликов.
        monkeyContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastTapTime < 50) return; // Защита от дублирования
            lastTapTime = now;
            handleTap(e);
        }, { passive: false });

        monkeyContainer.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastTapTime < 50) return; // Если только что сработал touch, игнорируем click
            lastTapTime = now;
            handleTap(e);
        });
    }
});

// Загрузка данных
function initGame() {
    try {
        const savedCoins = localStorage.getItem(`monkey_coins_${userId}`);
        if (savedCoins !== null) {
            coins = parseFloat(savedCoins);
            multitapLevel = parseInt(localStorage.getItem(`monkey_mlevel_${userId}`) || "1");
            
            // Жесткая привязка тапа к уровню
            tapPower = Math.round((0.2 + (multitapLevel - 1) * 0.2) * 10) / 10;

            multitapCost = parseInt(localStorage.getItem(`monkey_mcost_${userId}`) || "50");
            energy = parseInt(localStorage.getItem(`monkey_energy_${userId}`) || "1000");
            passiveIncome = parseFloat(localStorage.getItem(`monkey_passive_${userId}`) || "0");
            refsCount = parseInt(localStorage.getItem(`monkey_refs_${userId}`) || "0");
            p1Level = parseInt(localStorage.getItem(`monkey_p1_${userId}`) || "0");
            p1Cost = parseInt(localStorage.getItem(`monkey_p1cost_${userId}`) || "100");
        } else {
            tapPower = 0.2;
            multitapLevel = 1;
        }
    } catch (e) {
        console.error("Ошибка чтения localStorage:", e);
    }

    updateUI();
    updateProfileDisplay();
}

// Функция тапа
function handleTap(e) {
    if (energy <= 0) return;

    let earned = Math.round(tapPower * 10) / 10;
    energy = Math.max(0, energy - 1);

    coins = Math.round((coins + earned) * 10) / 10;
    updateUI();
    updateEnergyUI();

    // Анимация нажатия
    const monkeyContainer = document.querySelector('.monkey-container');
    if (monkeyContainer) {
        monkeyContainer.classList.add('tapped');
        setTimeout(() => {
            monkeyContainer.classList.remove('tapped');
        }, 80);
    }

    // Вибрация в Telegram
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }

    // Летящая циферка (теперь всегда корректно показывает дробные значения, например +0.2)
    let displayEarned = earned < 1 ? earned.toFixed(1) : earned;
    // Используем класс 'flying-one' для всех значений меньше 1, чтобы анимация была одинаковой и точной
    createFloatingText(e, `+${displayEarned}`, earned >= 1 ? 'flying-crit' : 'flying-one');

    debounceSave();
}

// Эффект всплывающих монет поверх контейнера
function createFloatingText(e, text, className) {
    const container = document.querySelector('.game-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = className;
    el.innerText = text;
    el.style.zIndex = "99999"; 

    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if (e) {
        if (e.clientX && e.clientY) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }
    }

    const rect = container.getBoundingClientRect();
    el.style.position = 'absolute';
    el.style.left = `${clientX - rect.left - 15}px`;
    el.style.top = `${clientY - rect.top - 20}px`;

    container.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 700);
}

// Обновление интерфейса
function updateUI() {
    const coinsDisplay = document.getElementById('coins-display');
    if (coinsDisplay) {
        coinsDisplay.innerText = coins.toFixed(1);
    }

    setElemText('multitap-level', multitapLevel);
    setElemText('multitap-power', tapPower.toFixed(1));
    setElemText('multitap-cost', multitapCost);
    setElemText('passive-income-display', passiveIncome.toFixed(1));
    setElemText('ref-count', `Приглашено: ${refsCount}`);
    setElemText('p1-level', p1Level);
    setElemText('p1-cost', p1Cost);

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

    setElemText('prof-coins', coins.toFixed(1));
    setElemText('prof-energy', `${Math.floor(energy)} / ${maxEnergy}`);
}

function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// Сохранение в localStorage
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
function buyMultitap() {
    if (coins >= multitapCost) {
        coins = Math.round((coins - multitapCost) * 10) / 10;
        multitapLevel++;
        tapPower = Math.round((0.2 + (multitapLevel - 1) * 0.2) * 10) / 10; 
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

// Покупка пассивного дохода
function buyPassive(id) {
    if (id === 1) {
        if (coins >= p1Cost) {
            coins = Math.round((coins - p1Cost) * 10) / 10;
            p1Level++;
            passiveIncome = Math.round((passiveIncome + 0.5) * 10) / 10;
            p1Cost = Math.floor(p1Cost * 1.8);

            updateUI();
            debounceSave();

            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    }
}

// Фоновые бананы
function initBackgroundBananas() {
    const container = document.getElementById('background-effects');
    if (!container) return;

    for (let i = 0; i < 6; i++) {
        createBanana(container);
    }
}

function createBanana(container) {
    const banana = document.createElement('div');
    banana.className = 'falling-banana';
    banana.innerText = '🍌';
    
    const randomLeft = Math.random() * 100;
    const randomSize = Math.floor(Math.random() * 16) + 14;
    const randomDuration = Math.random() * 6 + 4;
    const randomDelay = Math.random() * 5;

    banana.style.left = `${randomLeft}%`;
    banana.style.fontSize = `${randomSize}px`;
    banana.style.animationDuration = `${randomDuration}s`;
    banana.style.animationDelay = `${randomDelay}s`;

    container.appendChild(banana);

    banana.addEventListener('animationiteration', () => {
        banana.style.left = `${Math.random() * 100}%`;
    });
}

// Управление профилем и модалками
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

function shareReferralLink() {
    const botUsername = "your_bot_username"; 
    const refLink = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/" + botUsername + "?start=" + userId)}&text=${encodeURIComponent("🐒 Зарабатывай бананы вместе со мной в Monkey Tapper!")}`;
    
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(refLink);
    } else {
        window.open(refLink, '_blank');
    }
}

function claimChannelReward() {
    const claimed = localStorage.getItem(`monkey_channel_claimed_${userId}`);
    if (claimed) {
        alert("Вы уже получили награду за подписку!");
        return;
    }
    coins = Math.round((coins + 250) * 10) / 10;
    localStorage.setItem(`monkey_channel_claimed_${userId}`, "true");
    updateUI();
    alert("Успешно! Начислено +250 монет 🍌");
}

function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

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
            <span style="color: #ffd700; font-weight: bold;">${coins.toFixed(1)} 🍌</span>
        </div>
    `;
}
