```javascript
// ======================================================
// TELEGRAM
// ======================================================

const tg =
    window.Telegram &&
    window.Telegram.WebApp
        ? window.Telegram.WebApp
        : null;

if (tg) {
    tg.expand();
    tg.ready();
}


// ======================================================
// USER
// ======================================================

const user =
    tg &&
    tg.initDataUnsafe &&
    tg.initDataUnsafe.user
        ? tg.initDataUnsafe.user
        : {
            id: 999999,
            first_name: "Игрок",
            username: "player"
        };


const userId =
    String(user.id);


const defaultUsername =
    user.first_name ||
    user.username ||
    "Обезьянка";


// ======================================================
// GAME
// ======================================================

let coins = 0;

let tapPower = 0.2;

let multitapLevel = 1;

let multitapCost = 50;

let energy = 1000;

const maxEnergy = 1000;

let passiveIncome = 0;

let refsCount = 0;

let p1Level = 0;

let p1Cost = 100;

let p2Level = 0;

let p2Cost = 1000;

let saveTimeout = null;


// ======================================================
// START
// ======================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        initGame();

        initBackgroundBananas();


        // Пассивный доход

        setInterval(
            () => {

                if (passiveIncome > 0) {

                    coins =
                        Math.round(
                            (coins + passiveIncome) * 10
                        ) / 10;

                    updateUI();

                    debounceSave();

                }

            },
            1000
        );


        // Энергия

        setInterval(
            () => {

                if (energy < maxEnergy) {

                    energy =
                        Math.min(
                            maxEnergy,
                            energy + 1
                        );

                    updateEnergyUI();

                    debounceSave();

                }

            },
            1000
        );

    }
);


// ======================================================
// LOAD
// ======================================================

function initGame() {

    try {

        const savedCoins =
            localStorage.getItem(
                `monkey_coins_${userId}`
            );


        if (savedCoins !== null) {

            coins =
                parseFloat(savedCoins) || 0;


            multitapLevel =
                parseInt(
                    localStorage.getItem(
                        `monkey_mlevel_${userId}`
                    ) || "1"
                );


            multitapCost =
                parseInt(
                    localStorage.getItem(
                        `monkey_mcost_${userId}`
                    ) || "50"
                );


            energy =
                parseFloat(
                    localStorage.getItem(
                        `monkey_energy_${userId}`
                    ) || "1000"
                );


            passiveIncome =
                parseFloat(
                    localStorage.getItem(
                        `monkey_passive_${userId}`
                    ) || "0"
                );


            refsCount =
                parseInt(
                    localStorage.getItem(
                        `monkey_refs_${userId}`
                    ) || "0"
                );


            p1Level =
                parseInt(
                    localStorage.getItem(
                        `monkey_p1_${userId}`
                    ) || "0"
                );


            p1Cost =
                parseInt(
                    localStorage.getItem(
                        `monkey_p1cost_${userId}`
                    ) || "100"
                );


            p2Level =
                parseInt(
                    localStorage.getItem(
                        `monkey_p2_${userId}`
                    ) || "0"
                );


            p2Cost =
                parseInt(
                    localStorage.getItem(
                        `monkey_p2cost_${userId}`
                    ) || "1000"
                );

        }


        // Сила тапа

        tapPower =
            Math.round(
                (
                    0.2 +
                    (multitapLevel - 1) * 0.2
                ) * 10
            ) / 10;


        energy =
            Math.max(
                0,
                Math.min(
                    maxEnergy,
                    energy
                )
            );


    } catch (error) {

        console.error(
            "Ошибка загрузки:",
            error
        );

    }


    updateUI();

    updateEnergyUI();

    updatePassive2();

}


// ======================================================
// TAP
// ======================================================

function handleTap(event) {

    if (energy <= 0) {

        errorHaptic();

        return;

    }


    const earned =
        Math.round(
            tapPower * 10
        ) / 10;


    energy =
        Math.max(
            0,
            energy - 1
        );


    coins =
        Math.round(
            (coins + earned) * 10
        ) / 10;


    updateUI();

    updateEnergyUI();


    // Анимация

    const monkey =
        document.querySelector(
            ".monkey-container"
        );


    if (monkey) {

        monkey.classList.add(
            "tapped"
        );


        setTimeout(
            () => {

                monkey.classList.remove(
                    "tapped"
                );

            },
            80
        );

    }


    // Вибрация

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback.impactOccurred(
            "medium"
        );

    }


    // +монеты

    let displayEarned;

    if (earned < 1) {

        displayEarned =
            earned.toFixed(1);

    } else {

        displayEarned =
            earned.toString();

    }


    createFloatingText(
        event,
        `+${displayEarned}`,
        "flying-one"
    );


    debounceSave();

}


// ======================================================
// FLOATING TEXT
// ======================================================

function createFloatingText(
    event,
    text,
    className
) {

    const container =
        document.querySelector(
            ".game-container"
        );


    if (!container) return;


    const element =
        document.createElement(
            "div"
        );


    element.className =
        className;


    element.innerText =
        text;


    element.style.zIndex =
        "99999";


    let clientX =
        window.innerWidth / 2;


    let clientY =
        window.innerHeight / 2;


    if (event) {

        if (
            typeof event.clientX === "number" &&
            typeof event.clientY === "number"
        ) {

            clientX =
                event.clientX;

            clientY =
                event.clientY;

        }

        else if (
            event.touches &&
            event.touches.length > 0
        ) {

            clientX =
                event.touches[0].clientX;

            clientY =
                event.touches[0].clientY;

        }

    }


    const rect =
        container.getBoundingClientRect();


    element.style.position =
        "absolute";


    element.style.left =
        `${clientX - rect.left - 15}px`;


    element.style.top =
        `${clientY - rect.top - 20}px`;


    container.appendChild(
        element
    );


    setTimeout(
        () => {

            element.remove();

        },
        700
    );

}


// ======================================================
// UI
// ======================================================

function updateUI() {

    setElemText(
        "coins-display",
        coins.toFixed(1)
    );


    setElemText(
        "multitap-level",
        multitapLevel
    );


    setElemText(
        "multitap-power",
        tapPower.toFixed(1)
    );


    setElemText(
        "multitap-cost",
        multitapCost
    );


    setElemText(
        "passive-income-display",
        passiveIncome.toFixed(1)
    );


    setElemText(
        "ref-count",
        `Приглашено: ${refsCount}`
    );


    setElemText(
        "p1-level",
        p1Level
    );


    setElemText(
        "p1-cost",
        p1Cost
    );


    setElemText(
        "p2-cost",
        p2Cost
    );


    updateProfileDisplay();

    updateEnergyUI();

    updatePassive2();

}


// ======================================================
// ENERGY
// ======================================================

function updateEnergyUI() {

    const display =
        document.getElementById(
            "energy-display"
        );


    const bar =
        document.getElementById(
            "energy-bar-fill"
        );


    if (display) {

        display.innerText =
            Math.floor(energy);

    }


    if (bar) {

        const percent =
            (energy / maxEnergy) * 100;


        bar.style.width =
            `${percent}%`;

    }

}


// ======================================================
// PROFILE
// ======================================================

function updateProfileDisplay() {

    const savedName =
        localStorage.getItem(
            `monkey_name_${userId}`
        );


    setElemText(
        "profile-username",
        savedName || defaultUsername
    );


    setElemText(
        "profile-userid",
        userId
    );


    setElemText(
        "prof-coins",
        coins.toFixed(1)
    );


    setElemText(
        "prof-tap",
        tapPower.toFixed(1)
    );


    setElemText(
        "prof-passive",
        passiveIncome.toFixed(1)
    );


    setElemText(
        "prof-energy",
        `${Math.floor(energy)} / ${maxEnergy}`
    );


    setElemText(
        "prof-refs",
        refsCount
    );

}


// ======================================================
// PASSIVE 2
// ======================================================

function updatePassive2() {

    const card =
        document.getElementById(
            "card-passive-2"
        );


    const button =
        document.getElementById(
            "passive-2-btn"
        );


    const icon =
        document.getElementById(
            "p2-icon"
        );


    const title =
        document.getElementById(
            "p2-title"
        );


    const description =
        document.getElementById(
            "p2-desc"
        );


    if (!card || !button) {
        return;
    }


    if (p1Level >= 1) {

        card.classList.remove(
            "locked"
        );


        button.disabled =
            false;


        if (icon) {
            icon.innerText = "🌴";
        }


        if (title) {
            title.innerText =
                "Большая плантация";
        }


        if (description) {

            description.innerText =
                `Уровень: ${p2Level} (+2.0 🍌/сек)`;

        }

    }

    else {

        card.classList.add(
            "locked"
        );


        button.disabled =
            true;


        if (icon) {
            icon.innerText = "🔒";
        }


        if (title) {
            title.innerText =
                "Заблокировано";
        }


        if (description) {

            description.innerText =
                "+2.0 🍌/сек (Треб: 1 куст)";

        }

    }

}


// ======================================================
// SAVE
// ======================================================

function debounceSave() {

    clearTimeout(
        saveTimeout
    );


    saveTimeout =
        setTimeout(
            () => {

                try {

                    localStorage.setItem(
                        `monkey_coins_${userId}`,
                        coins
                    );


                    localStorage.setItem(
                        `monkey_mlevel_${userId}`,
                        multitapLevel
                    );


                    localStorage.setItem(
                        `monkey_mcost_${userId}`,
                        multitapCost
                    );


                    localStorage.setItem(
                        `monkey_energy_${userId}`,
                        energy
                    );


                    localStorage.setItem(
                        `monkey_passive_${userId}`,
                        passiveIncome
                    );


                    localStorage.setItem(
                        `monkey_refs_${userId}`,
                        refsCount
                    );


                    localStorage.setItem(
                        `monkey_p1_${userId}`,
                        p1Level
                    );


                    localStorage.setItem(
                        `monkey_p1cost_${userId}`,
                        p1Cost
                    );


                    localStorage.setItem(
                        `monkey_p2_${userId}`,
                        p2Level
                    );


                    localStorage.setItem(
                        `monkey_p2cost_${userId}`,
                        p2Cost
                    );

                }

                catch (error) {

                    console.error(
                        "Ошибка сохранения:",
                        error
                    );

                }

            },
            500
        );

}


// ======================================================
// MULTITAP
// ======================================================

function buyMultitap() {

    if (coins < multitapCost) {

        errorHaptic();

        return;

    }


    coins =
        Math.round(
            (coins - multitapCost) * 10
        ) / 10;


    multitapLevel++;


    tapPower =
        Math.round(
            (
                0.2 +
                (multitapLevel - 1) * 0.2
            ) * 10
        ) / 10;


    multitapCost =
        Math.floor(
            multitapCost * 1.7
        );


    updateUI();

    debounceSave();

    successHaptic();

}


// ======================================================
// PASSIVE
// ======================================================

function buyPassive(id) {

    // Куст

    if (id === 1) {

        if (coins < p1Cost) {

            errorHaptic();

            return;

        }


        coins =
            Math.round(
                (coins - p1Cost) * 10
            ) / 10;


        p1Level++;


        passiveIncome =
            Math.round(
                (passiveIncome + 0.5) * 10
            ) / 10;


        p1Cost =
            Math.floor(
                p1Cost * 1.8
            );


        updateUI();

        debounceSave();

        successHaptic();

        return;

    }


    // Большая плантация

    if (id === 2) {

        if (p1Level < 1) {

            errorHaptic();

            return;

        }


        if (coins < p2Cost) {

            errorHaptic();

            return;

        }


        coins =
            Math.round(
                (coins - p2Cost) * 10
            ) / 10;


        p2Level++;


        passiveIncome =
            Math.round(
                (passiveIncome + 2) * 10
            ) / 10;


        p2Cost =
            Math.floor(
                p2Cost * 2
            );


        updateUI();

        debounceSave();

        successHaptic();

    }

}


// ======================================================
// HAPTIC
// ======================================================

function successHaptic() {

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback.notificationOccurred(
            "success"
        );

    }

}


function errorHaptic() {

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback.notificationOccurred(
            "error"
        );

    }

}


// ======================================================
// BACKGROUND BANANAS
// ======================================================

function initBackgroundBananas() {

    const container =
        document.getElementById(
            "background-effects"
        );


    if (!container) return;


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        createBanana(
            container
        );

    }

}


function createBanana(container) {

    const banana =
        document.createElement(
            "div"
        );


    banana.className =
        "falling-banana";


    banana.innerText =
        "🍌";


    banana.style.left =
        `${Math.random() * 100}%`;


    banana.style.fontSize =
        `${Math.floor(
            Math.random() * 16
        ) + 14}px`;


    banana.style.animationDuration =
        `${Math.random() * 6 + 4}s`;


    banana.style.animationDelay =
        `${Math.random() * 5}s`;


    container.appendChild(
        banana
    );


    banana.addEventListener(
        "animationiteration",
        () => {

            banana.style.left =
                `${Math.random() * 100}%`;

        }
    );

}


// ======================================================
// TABS
// ======================================================

function switchTab(
    screenId,
    btnElement
) {

    document
        .querySelectorAll(".screen")
        .forEach(
            screen => {

                screen.classList.remove(
                    "active"
                );

            }
        );


    const target =
        document.getElementById(
            screenId
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    document
        .querySelectorAll(".nav-item")
        .forEach(
            item => {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (btnElement) {

        btnElement.classList.add(
            "active"
        );

    }

}


// ======================================================
// RENAME
// ======================================================

function openRenameModal() {

    const modal =
        document.getElementById(
            "rename-modal"
        );


    const input =
        document.getElementById(
            "username-input"
        );


    if (!modal || !input) {
        return;
    }


    input.value =
        document.getElementById(
            "profile-username"
        ).innerText;


    modal.style.display =
        "flex";


    input.focus();

}


function closeRenameModal() {

    const modal =
        document.getElementById(
            "rename-modal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


function saveUsername() {

    const input =
        document.getElementById(
            "username-input"
        );


    if (!input) {
        return;
    }


    const newName =
        input.value.trim();


    if (!newName) {
        return;
    }


    localStorage.setItem(
        `monkey_name_${userId}`,
        newName
    );


    updateProfileDisplay();

    closeRenameModal();

}


// ======================================================
// REFERRAL
// ======================================================

function shareReferralLink() {

    const botUsername =
        "your_bot_username";


    const refLink =
        `https://t.me/share/url?url=${
            encodeURIComponent(
                "https://t.me/" +
                botUsername +
                "?start=" +
                userId
            )
        }&text=${
            encodeURIComponent(
                "🐒 Зарабатывай бананы вместе со мной в Monkey Tapper!"
            )
        }`;


    if (
        tg &&
        tg.openTelegramLink
    ) {

        tg.openTelegramLink(
            refLink
        );

    }

    else {

        window.open(
            refLink,
            "_blank"
        );

    }

}


// ======================================================
// CHANNEL REWARD
// ======================================================

function claimChannelReward() {

    const key =
        `monkey_channel_claimed_${userId}`;


    const claimed =
        localStorage.getItem(
            key
        );


    if (claimed) {

        alert(
            "Вы уже получили награду за подписку!"
        );

        return;

    }


    coins =
        Math.round(
            (coins + 250) * 10
        ) / 10;


    localStorage.setItem(
        key,
        "true"
    );


    updateUI();

    debounceSave();

    successHaptic();


    alert(
        "Успешно! Начислено +250 монет 🍌"
    );

}


// ======================================================
// LEADERBOARD
// ======================================================

function openLeaderboard() {

    const modal =
        document.getElementById(
            "leaderboard-modal"
        );


    if (!modal) {
        return;
    }


    modal.style.display =
        "flex";


    loadLeaderboard();

}


function closeLeaderboard() {

    const modal =
        document.getElementById(
            "leaderboard-modal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


function loadLeaderboard() {

    const list =
        document.getElementById(
            "leaderboard-list"
        );


    if (!list) {
        return;
    }


    const currentName =
        localStorage.getItem(
            `monkey_name_${userId}`
        ) ||
        defaultUsername;


    /*
     * Настоящего общего рейтинга пока нет.
     *
     * Поэтому НЕ показываем выдуманных игроков.
     * Показываем только текущего пользователя.
     */


    list.innerHTML = `

        <div
            class="leaderboard-row current-player">

            <span>
                📍 <b>${escapeHTML(currentName)}</b>
            </span>

            <span>
                ${coins.toFixed(1)} 🍌
            </span>

        </div>

        <div class="leaderboard-empty">

            Общий рейтинг появится после
            подключения сервера.

        </div>

    `;

}


// ======================================================
// PLAYER PROFILE
// ======================================================

function closePlayerProfile() {

    const modal =
        document.getElementById(
            "view-profile-modal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ======================================================
// HTML SECURITY
// ======================================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}


// ======================================================
// MODAL CLICK OUTSIDE
// ======================================================

window.addEventListener(
    "click",
    event => {

        const leaderboard =
            document.getElementById(
                "leaderboard-modal"
            );


        const rename =
            document.getElementById(
                "rename-modal"
            );


        const profile =
            document.getElementById(
                "view-profile-modal"
            );


        if (
            event.target === leaderboard
        ) {

            closeLeaderboard();

        }


        if (
            event.target === rename
        ) {

            closeRenameModal();

        }


        if (
            event.target === profile
        ) {

            closePlayerProfile();

        }

    }
);


// ======================================================
// УДОБСТВО: ESC ЗАКРЫВАЕТ ОКНО
// ======================================================

window.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }


        closeLeaderboard();

        closeRenameModal();

        closePlayerProfile();

    }
);
```
