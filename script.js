"use strict";

/* =====================================================
   TELEGRAM
===================================================== */

const tg =
    window.Telegram &&
    window.Telegram.WebApp
        ? window.Telegram.WebApp
        : null;

if (tg) {
    tg.ready();
    tg.expand();
}


/* =====================================================
   ИГРОК
===================================================== */

const telegramUser =
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
    String(telegramUser.id);

const storagePrefix =
    `monkey_${userId}_`;


/* =====================================================
   ИГРОВЫЕ ДАННЫЕ
===================================================== */

let coins = 0;
let energy = 1000;

const MAX_ENERGY = 1000;

let tapPower = 0.2;
let tapLevel = 1;
let tapCost = 50;

let passiveIncome = 0;

let bushLevel = 0;
let bushCost = 100;

let plantationLevel = 0;
let plantationCost = 1000;

let refs = 0;

let saveTimer = null;


/* =====================================================
   DOM
===================================================== */

const $ = id =>
    document.getElementById(id);


/* =====================================================
   ЗАПУСК
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadGame();

        setupNavigation();

        setupTap();

        setupButtons();

        updateAllUI();

        startEnergyRegeneration();

        startPassiveIncome();

    }
);


/* =====================================================
   ЗАГРУЗКА
===================================================== */

function loadGame() {

    coins =
        numberFromStorage(
            "coins",
            0
        );

    energy =
        numberFromStorage(
            "energy",
            MAX_ENERGY
        );

    tapLevel =
        numberFromStorage(
            "tapLevel",
            1
        );

    tapCost =
        numberFromStorage(
            "tapCost",
            50
        );

    bushLevel =
        numberFromStorage(
            "bushLevel",
            0
        );

    bushCost =
        numberFromStorage(
            "bushCost",
            100
        );

    plantationLevel =
        numberFromStorage(
            "plantationLevel",
            0
        );

    plantationCost =
        numberFromStorage(
            "plantationCost",
            1000
        );

    refs =
        numberFromStorage(
            "refs",
            0
        );

    energy =
        Math.max(
            0,
            Math.min(
                MAX_ENERGY,
                energy
            )
        );

    calculateStats();
}


/* =====================================================
   СТАТИСТИКИ
===================================================== */

function calculateStats() {

    tapPower =
        Math.round(
            (
                0.2 +
                (tapLevel - 1) * 0.2
            ) * 10
        ) / 10;

    passiveIncome =
        Math.round(
            (
                bushLevel * 0.5 +
                plantationLevel * 2
            ) * 10
        ) / 10;
}


/* =====================================================
   TAP
===================================================== */

function setupTap() {

    const tapButton =
        $("tap-button");

    if (!tapButton) {
        return;
    }

    tapButton.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();

            tap(event);

        }
    );
}


function tap(event) {

    if (energy < 1) {

        hapticError();

        return;
    }

    energy -= 1;

    coins =
        Math.round(
            (
                coins +
                tapPower
            ) * 10
        ) / 10;

    updateAllUI();

    saveGame();

    animateMonkey();

    createFloatingCoin(
        event,
        `+${tapPower.toFixed(1)}`
    );

    hapticTap();
}


/* =====================================================
   АНИМАЦИЯ
===================================================== */

function animateMonkey() {

    const monkey =
        $("tap-button");

    if (!monkey) {
        return;
    }

    monkey.classList.remove(
        "tap-effect"
    );

    void monkey.offsetWidth;

    monkey.classList.add(
        "tap-effect"
    );

    setTimeout(
        () => {

            monkey.classList.remove(
                "tap-effect"
            );

        },
        130
    );
}


/* =====================================================
   ЛЕТЯЩИЕ МОНЕТЫ
===================================================== */

function createFloatingCoin(
    event,
    text
) {

    const app =
        document.querySelector(
            ".app"
        );

    if (!app) {
        return;
    }

    const element =
        document.createElement(
            "div"
        );

    element.className =
        "floating-coin";

    element.textContent =
        text;

    const rect =
        app.getBoundingClientRect();

    let x =
        rect.width / 2;

    let y =
        rect.height / 2;

    if (
        event &&
        typeof event.clientX === "number"
    ) {

        x =
            event.clientX -
            rect.left;

        y =
            event.clientY -
            rect.top;
    }

    element.style.left =
        `${x - 15}px`;

    element.style.top =
        `${y - 20}px`;

    app.appendChild(
        element
    );

    setTimeout(
        () => {
            element.remove();
        },
        750
    );
}


/* =====================================================
   НАВИГАЦИЯ
===================================================== */

function setupNavigation() {

    const buttons =
        document.querySelectorAll(
            ".nav-button"
        );

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const screenId =
                        button.dataset.screen;

                    showScreen(
                        screenId
                    );

                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );

                    button.classList.add(
                        "active"
                    );

                }
            );

        }
    );
}


function showScreen(
    screenId
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

    const screen =
        $(screenId);

    if (screen) {

        screen.classList.add(
            "active"
        );

    }
}


/* =====================================================
   КНОПКИ
===================================================== */

function setupButtons() {

    $("tap-upgrade")?.addEventListener(
        "click",
        buyTapUpgrade
    );

    $("bush-upgrade")?.addEventListener(
        "click",
        buyBush
    );

    $("bush-upgrade-2")?.addEventListener(
        "click",
        buyBush
    );

    $("plantation-upgrade")?.addEventListener(
        "click",
        buyPlantation
    );

    $("plantation-upgrade-2")?.addEventListener(
        "click",
        buyPlantation
    );

    $("leaderboard-open")?.addEventListener(
        "click",
        openLeaderboard
    );

    $("leaderboard-close")?.addEventListener(
        "click",
        closeLeaderboard
    );

    $("rename-button")?.addEventListener(
        "click",
        openRename
    );

    $("rename-save")?.addEventListener(
        "click",
        saveName
    );

    $("rename-cancel")?.addEventListener(
        "click",
        closeRename
    );

    $("rename-cancel-2")?.addEventListener(
        "click",
        closeRename
    );

    $("ref-button")?.addEventListener(
        "click",
        shareReferral
    );

    $("channel-button")?.addEventListener(
        "click",
        claimChannel
    );

    $("leaderboard-modal")?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("leaderboard-modal")
            ) {

                closeLeaderboard();

            }

        }
    );

    $("rename-modal")?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("rename-modal")
            ) {

                closeRename();

            }

        }
    );
}


/* =====================================================
   СИЛА ТАПА
===================================================== */

function buyTapUpgrade() {

    if (coins < tapCost) {

        hapticError();

        return;
    }

    coins =
        Math.round(
            (
                coins -
                tapCost
            ) * 10
        ) / 10;

    tapLevel++;

    tapCost =
        Math.floor(
            tapCost * 1.7
        );

    calculateStats();

    updateAllUI();

    saveGame();

    hapticSuccess();
}


/* =====================================================
   КУСТ
===================================================== */

function buyBush() {

    if (coins < bushCost) {

        hapticError();

        return;
    }

    coins =
        Math.round(
            (
                coins -
                bushCost
            ) * 10
        ) / 10;

    bushLevel++;

    bushCost =
        Math.floor(
            bushCost * 1.8
        );

    calculateStats();

    updateAllUI();

    saveGame();

    hapticSuccess();
}


/* =====================================================
   ПЛАНТАЦИЯ
===================================================== */

function buyPlantation() {

    if (bushLevel < 1) {

        hapticError();

        return;
    }

    if (coins < plantationCost) {

        hapticError();

        return;
    }

    coins =
        Math.round(
            (
                coins -
                plantationCost
            ) * 10
        ) / 10;

    plantationLevel++;

    plantationCost =
        Math.floor(
            plantationCost * 2
        );

    calculateStats();

    updateAllUI();

    saveGame();

    hapticSuccess();
}


/* =====================================================
   ПАССИВНЫЙ ДОХОД
===================================================== */

function startPassiveIncome() {

    setInterval(
        () => {

            if (
                passiveIncome <= 0
            ) {
                return;
            }

            coins =
                Math.round(
                    (
                        coins +
                        passiveIncome
                    ) * 10
                ) / 10;

            updateAllUI();

            saveGame();

        },
        1000
    );
}


/* =====================================================
   ЭНЕРГИЯ
===================================================== */

function startEnergyRegeneration() {

    setInterval(
        () => {

            if (
                energy >= MAX_ENERGY
            ) {
                return;
            }

            energy =
                Math.min(
                    MAX_ENERGY,
                    energy + 1
                );

            updateAllUI();

            saveGame();

        },
        1000
    );
}


/* =====================================================
   UI
===================================================== */

function updateAllUI() {

    calculateStats();

    setText(
        "coins",
        coins.toFixed(1)
    );

    setText(
        "energy",
        Math.floor(energy)
    );

    const energyFill =
        $("energy-fill");

    if (energyFill) {

        energyFill.style.width =
            `${energy / MAX_ENERGY * 100}%`;

    }

    setText(
        "profile-refs",
        refs
    );

    setText(
        "tap-level",
        tapLevel
    );

    setText(
        "tap-power",
        tapPower.toFixed(1)
    );

    setText(
        "tap-cost",
        tapCost
    );

    setText(
        "bush-level",
        bushLevel
    );

    setText(
        "bush-cost",
        bushCost
    );

    setText(
        "plantation-level",
        plantationLevel
    );

    setText(
        "plantation-cost",
        plantationCost
    );

    setText(
        "plantation-cost-2",
        plantationCost
    );

    setText(
        "bush-cost-2",
        bushCost
    );

    updatePlantationUI();

    updateProfile();
}


/* =====================================================
   ПЛАНТАЦИЯ UI
===================================================== */

function updatePlantationUI() {

    const card =
        $("plantation-card");

    const card2 =
        $("plantation-upgrade-card");

    const button =
        $("plantation-upgrade");

    const button2 =
        $("plantation-upgrade-2");

    if (bushLevel >= 1) {

        card?.classList.remove(
            "locked"
        );

        card2?.classList.remove(
            "locked"
        );

        if (button) {
            button.disabled = false;
        }

        if (button2) {
            button2.disabled = false;
        }

        setText(
            "plantation-icon",
            "🌴"
        );

        setText(
            "plantation-description",
            `Уровень: ${plantationLevel} · +2.0 🍌/сек`
        );

    }

    else {

        card?.classList.add(
            "locked"
        );

        card2?.classList.add(
            "locked"
        );

        if (button) {
            button.disabled = true;
        }

        if (button2) {
            button2.disabled = true;
        }

        setText(
            "plantation-icon",
            "🔒"
        );

        setText(
            "plantation-description",
            "Требуется 1 уровень куста"
        );

    }
}


/* =====================================================
   ПРОФИЛЬ
===================================================== */

function updateProfile() {

    const savedName =
        localStorage.getItem(
            storagePrefix + "name"
        );

    const name =
        savedName ||
        telegramUser.first_name ||
        telegramUser.username ||
        "Игрок";

    setText(
        "profile-name",
        name
    );

    setText(
        "profile-id",
        `ID: ${userId}`
    );

    setText(
        "profile-coins",
        coins.toFixed(1)
    );

    setText(
        "profile-tap",
        tapPower.toFixed(1)
    );

    setText(
        "profile-passive",
        passiveIncome.toFixed(1)
    );

    setText(
        "profile-energy",
        `${Math.floor(energy)} / ${MAX_ENERGY}`
    );

    setText(
        "profile-refs",
        refs
    );
}


/* =====================================================
   СОХРАНЕНИЕ
===================================================== */

function saveGame() {

    clearTimeout(
        saveTimer
    );

    saveTimer =
        setTimeout(
            () => {

                try {

                    localStorage.setItem(
                        storagePrefix + "coins",
                        coins
                    );

                    localStorage.setItem(
                        storagePrefix + "energy",
                        energy
                    );

                    localStorage.setItem(
                        storagePrefix + "tapLevel",
                        tapLevel
                    );

                    localStorage.setItem(
                        storagePrefix + "tapCost",
                        tapCost
                    );

                    localStorage.setItem(
                        storagePrefix + "bushLevel",
                        bushLevel
                    );

                    localStorage.setItem(
                        storagePrefix + "bushCost",
                        bushCost
                    );

                    localStorage.setItem(
                        storagePrefix + "plantationLevel",
                        plantationLevel
                    );

                    localStorage.setItem(
                        storagePrefix + "plantationCost",
                        plantationCost
                    );

                    localStorage.setItem(
                        storagePrefix + "refs",
                        refs
                    );

                }

                catch (error) {

                    console.error(
                        "Ошибка сохранения:",
                        error
                    );

                }

            },
            250
        );
}


/* =====================================================
   НИК
===================================================== */

function openRename() {

    const modal =
        $("rename-modal");

    const input =
        $("rename-input");

    if (!modal || !input) {
        return;
    }

    input.value =
        $("profile-name").textContent;

    modal.classList.remove(
        "hidden"
    );

    setTimeout(
        () => input.focus(),
        50
    );
}


function closeRename() {

    $("rename-modal")?.classList.add(
        "hidden"
    );
}


function saveName() {

    const input =
        $("rename-input");

    if (!input) {
        return;
    }

    const name =
        input.value.trim();

    if (
        name.length < 1
    ) {
        return;
    }

    localStorage.setItem(
        storagePrefix + "name",
        name
    );

    updateProfile();

    updateLeaderboard();

    closeRename();
}


/* =====================================================
   РЕЙТИНГ
===================================================== */

function openLeaderboard() {

    updateLeaderboard();

    $("leaderboard-modal")?.classList.remove(
        "hidden"
    );
}


function closeLeaderboard() {

    $("leaderboard-modal")?.classList.add(
        "hidden"
    );
}


function updateLeaderboard() {

    const name =
        localStorage.getItem(
            storagePrefix + "name"
        ) ||
        telegramUser.first_name ||
        telegramUser.username ||
        "Игрок";

    setText(
        "leaderboard-name",
        name
    );

    setText(
        "leaderboard-coins",
        coins.toFixed(1)
    );
}


/* =====================================================
   РЕФЕРАЛ
===================================================== */

function shareReferral() {

    const botUsername =
        "MonkeyTapperTGbot";

    const link =
        `https://t.me/${botUsername}?start=${userId}`;

    const share =
        `https://t.me/share/url?url=${
            encodeURIComponent(link)
        }&text=${
            encodeURIComponent(
                "🐒 Заходи в Monkey Tapper!"
            )
        }`;

    if (
        tg &&
        tg.openTelegramLink
    ) {

        tg.openTelegramLink(
            share
        );

    }

    else {

        window.open(
            share,
            "_blank"
        );

    }
}


/* =====================================================
   КАНАЛ
===================================================== */

function claimChannel() {

    const key =
        storagePrefix +
        "channelClaimed";

    if (
        localStorage.getItem(key)
    ) {

        alert(
            "Ты уже получил эту награду."
        );

        return;
    }

    coins =
        Math.round(
            (
                coins +
                250
            ) * 10
        ) / 10;

    localStorage.setItem(
        key,
        "true"
    );

    updateAllUI();

    saveGame();

    hapticSuccess();

    alert(
        "+250 🍌"
    );
}


/* =====================================================
   ВИБРАЦИЯ
===================================================== */

function hapticTap() {

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback.impactOccurred(
            "light"
        );

    }
}


function hapticSuccess() {

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback.notificationOccurred(
            "success"
        );

    }
}


function hapticError() {

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback.notificationOccurred(
            "error"
        );

    }
}


/* =====================================================
   HELPERS
===================================================== */

function setText(
    id,
    value
) {

    const element =
        $(id);

    if (element) {

        element.textContent =
            String(value);

    }
}


function numberFromStorage(
    key,
    fallback
) {

    const value =
        localStorage.getItem(
            storagePrefix + key
        );

    if (value === null) {

        return fallback;

    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}
