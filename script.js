const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const $ = (id) => document.getElementById(id);

const userId =
    tg?.initDataUnsafe?.user?.id ||
    Math.floor(Math.random() * 1000000000);

const telegramUser =
    tg?.initDataUnsafe?.user || null;


// =========================
// GAME STATE
// =========================

let coins = Number(localStorage.getItem("coins")) || 0;
let energy = Number(localStorage.getItem("energy")) || 100;

let tapPower = Number(localStorage.getItem("tapPower")) || 1;
let tapLevel = Number(localStorage.getItem("tapLevel")) || 1;
let tapCost = Number(localStorage.getItem("tapCost")) || 50;

let passiveIncome =
    Number(localStorage.getItem("passiveIncome")) || 0;

let bushLevel =
    Number(localStorage.getItem("bushLevel")) || 0;

let bushCost =
    Number(localStorage.getItem("bushCost")) || 250;

let plantationLevel =
    Number(localStorage.getItem("plantationLevel")) || 0;

let plantationCost =
    Number(localStorage.getItem("plantationCost")) || 1000;

let refs =
    Number(localStorage.getItem("refs")) || 0;

let playerName =
    localStorage.getItem("playerName") ||
    telegramUser?.first_name ||
    "Игрок";


// =========================
// SAVE
// =========================

function saveGame() {

    localStorage.setItem("coins", coins);
    localStorage.setItem("energy", energy);

    localStorage.setItem("tapPower", tapPower);
    localStorage.setItem("tapLevel", tapLevel);
    localStorage.setItem("tapCost", tapCost);

    localStorage.setItem("passiveIncome", passiveIncome);

    localStorage.setItem("bushLevel", bushLevel);
    localStorage.setItem("bushCost", bushCost);

    localStorage.setItem("plantationLevel", plantationLevel);
    localStorage.setItem("plantationCost", plantationCost);

    localStorage.setItem("refs", refs);
    localStorage.setItem("playerName", playerName);
}


// =========================
// UI
// =========================

function updateAllUI() {

    if ($("coins")) {
        $("coins").textContent = Math.floor(coins);
    }

    if ($("energy")) {
        $("energy").textContent = Math.floor(energy);
    }

    if ($("tap-power")) {
        $("tap-power").textContent = tapPower;
    }

    if ($("passive")) {
        $("passive").textContent = passiveIncome;
    }

    if ($("tap-level")) {
        $("tap-level").textContent = tapLevel;
    }

    if ($("tap-cost")) {
        $("tap-cost").textContent = tapCost;
    }

    if ($("bush-level")) {
        $("bush-level").textContent = bushLevel;
    }

    if ($("bush-cost")) {
        $("bush-cost").textContent = bushCost;
    }

    if ($("plantation-level")) {
        $("plantation-level").textContent = plantationLevel;
    }

    if ($("plantation-cost")) {
        $("plantation-cost").textContent = plantationCost;
    }

    if ($("refs")) {
        $("refs").textContent = refs;
    }

    if ($("profile-name")) {
        $("profile-name").textContent = playerName;
    }

    if ($("profile-coins")) {
        $("profile-coins").textContent = Math.floor(coins);
    }

    if ($("profile-passive")) {
        $("profile-passive").textContent =
            passiveIncome + "/сек";
    }
}


// =========================
// TAP
// =========================

function setupTap() {

    const button = $("monkey-button");

    if (!button) {
        return;
    }

    button.addEventListener("click", function () {

        if (energy <= 0) {
            return;
        }

        coins += tapPower;
        energy--;

        animateMonkey();
        createFloatingCoin(tapPower);

        updateAllUI();
        saveGame();

        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred("light");
        }
    });
}


function animateMonkey() {

    const button = $("monkey-button");

    if (!button) {
        return;
    }

    button.classList.remove("tapped");

    void button.offsetWidth;

    button.classList.add("tapped");

    setTimeout(function () {
        button.classList.remove("tapped");
    }, 100);
}


// =========================
// FLOATING COIN
// =========================

function createFloatingCoin(amount) {

    const app = $("app");

    if (!app) {
        return;
    }

    const coin = document.createElement("div");

    coin.className = "floating-coin";
    coin.textContent = "+" + amount;

    const button = $("monkey-button");

    if (button) {

        const rect = button.getBoundingClientRect();
        const appRect = app.getBoundingClientRect();

        coin.style.left =
            rect.left -
            appRect.left +
            rect.width / 2 +
            "px";

        coin.style.top =
            rect.top -
            appRect.top +
            rect.height / 2 +
            "px";
    }

    app.appendChild(coin);

    setTimeout(function () {
        coin.remove();
    }, 800);
}


// =========================
// UPGRADES
// =========================

function buyTapUpgrade() {

    if (coins < tapCost) {
        return;
    }

    coins -= tapCost;
    tapLevel++;
    tapPower++;

    tapCost = Math.floor(tapCost * 1.55);

    updateAllUI();
    saveGame();
}


function buyBush() {

    if (coins < bushCost) {
        return;
    }

    coins -= bushCost;
    bushLevel++;
    passiveIncome++;

    bushCost = Math.floor(bushCost * 1.7);

    updateAllUI();
    saveGame();
}


function buyPlantation() {

    if (coins < plantationCost) {
        return;
    }

    coins -= plantationCost;
    plantationLevel++;
    passiveIncome += 5;

    plantationCost =
        Math.floor(plantationCost * 1.8);

    updateAllUI();
    saveGame();
}


// =========================
// NAVIGATION
// =========================

function setupNavigation() {

    const buttons =
        document.querySelectorAll(".nav-button");

    buttons.forEach(function (button) {

        button.addEventListener("click", function () {

            const screenId =
                button.dataset.screen;

            document
                .querySelectorAll(".screen")
                .forEach(function (screen) {
                    screen.classList.remove("active");
                });

            const screen = $(screenId);

            if (screen) {
                screen.classList.add("active");
            }

            buttons.forEach(function (btn) {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            closeAllModals();
        });
    });
}


// =========================
// OPEN / CLOSE MODALS
// =========================

function openModal(id) {

    const modal = $(id);

    if (!modal) {
        return;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}


function closeModal(id) {

    const modal = $(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
}


function closeAllModals() {

    closeModal("rename-modal");
    closeModal("leaderboard-modal");
}


// =========================
// BUTTONS
// =========================

function setupButtons() {

    // Сила тапа
    $("buy-tap")?.addEventListener(
        "click",
        buyTapUpgrade
    );


    // Куст
    $("buy-bush")?.addEventListener(
        "click",
        buyBush
    );


    // Плантация
    $("buy-plantation")?.addEventListener(
        "click",
        buyPlantation
    );


    // =========================
    // ИЗМЕНИТЬ ИМЯ
    // =========================

    $("rename-button")?.addEventListener(
        "click",
        function () {

            const input = $("name-input");

            if (input) {
                input.value = playerName;
            }

            openModal("rename-modal");
        }
    );


    // КРЕСТИК ИЗМЕНЕНИЯ ИМЕНИ
    $("rename-cancel")?.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            closeModal("rename-modal");
        }
    );


    // СОХРАНИТЬ ИМЯ
    $("rename-save")?.addEventListener(
        "click",
        function () {

            const input = $("name-input");

            if (!input) {
                return;
            }

            const name =
                input.value.trim();

            if (!name) {
                return;
            }

            playerName = name;

            saveGame();
            updateAllUI();

            closeModal("rename-modal");
        }
    );


    // =========================
    // ЛИДЕРБОРД
    // =========================

    $("leaderboard-button")?.addEventListener(
        "click",
        function () {
            openModal("leaderboard-modal");
        }
    );


    $("close-leaderboard")?.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            closeModal("leaderboard-modal");
        }
    );


    // =========================
    // ПРИГЛАСИТЬ ДРУГА
    // =========================

    $("ref-button")?.addEventListener(
        "click",
        shareReferral
    );


    // =========================
    // НАШ КАНАЛ
    // =========================

    $("channel-button")?.addEventListener(
        "click",
        function () {

            const channel =
                "https://t.me/MonkeyTapper";

            if (tg && tg.openTelegramLink) {

                tg.openTelegramLink(channel);

            } else {

                window.open(
                    channel,
                    "_blank"
                );
            }
        }
    );


    // Закрытие модального окна
    // при нажатии на затемнённую область
    $("rename-modal")?.addEventListener(
        "click",
        function (event) {

            if (event.target === event.currentTarget) {
                closeModal("rename-modal");
            }
        }
    );


    $("leaderboard-modal")?.addEventListener(
        "click",
        function (event) {

            if (event.target === event.currentTarget) {
                closeModal("leaderboard-modal");
            }
        }
    );
}


// =========================
// REFERRAL
// =========================

function shareReferral() {

    const botUsername =
        "MonkeyTapperTGbot";

    const link =
        "https://t.me/" +
        botUsername +
        "?start=" +
        userId;

    const share =
        "https://t.me/share/url?url=" +
        encodeURIComponent(link) +
        "&text=" +
        encodeURIComponent(
            "🐒 Заходи в Monkey Tapper!"
        );

    if (tg && tg.openTelegramLink) {

        tg.openTelegramLink(share);

    } else {

        window.open(
            share,
            "_blank"
        );
    }
}


// =========================
// PASSIVE INCOME
// =========================

setInterval(function () {

    if (passiveIncome > 0) {

        coins += passiveIncome;

        updateAllUI();
        saveGame();
    }

}, 1000);


// =========================
// ENERGY
// =========================

setInterval(function () {

    if (energy < 100) {

        energy++;

        updateAllUI();
        saveGame();
    }

}, 3000);


// =========================
// START
// =========================

function init() {

    // СНАЧАЛА закрываем все окна
    closeAllModals();


    // Показываем только игру
    document
        .querySelectorAll(".screen")
        .forEach(function (screen) {
            screen.classList.remove("active");
        });


    const gameScreen =
        $("game-screen");

    if (gameScreen) {
        gameScreen.classList.add("active");
    }


    // Активируем кнопку "Игра"
    document
        .querySelectorAll(".nav-button")
        .forEach(function (button) {
            button.classList.remove("active");
        });


    const gameButton =
        document.querySelector(
            '[data-screen="game-screen"]'
        );

    if (gameButton) {
        gameButton.classList.add("active");
    }


    updateAllUI();

    setupTap();
    setupButtons();
    setupNavigation();


    // Ещё раз закрываем окна после запуска
    closeAllModals();
}


init();
