const tg =
    window.Telegram &&
    window.Telegram.WebApp
        ? window.Telegram.WebApp
        : null;


if (tg) {
    tg.ready();
    tg.expand();
}


/* ================= НАСТРОЙКИ ================= */

const MAX_ENERGY = 1000;
const ENERGY_REGEN = 1;
const ENERGY_REGEN_TIME = 3000;


/* ================= ПОЛЬЗОВАТЕЛЬ ================= */

let userId = "local";

if (
    tg &&
    tg.initDataUnsafe &&
    tg.initDataUnsafe.user
) {
    userId = String(
        tg.initDataUnsafe.user.id
    );
}


/* ================= ЭНЕРГИЯ ================= */

let energyVersion =
    localStorage.getItem("energy-version");

let energy;

if (energyVersion !== "1000") {

    energy = MAX_ENERGY;

    localStorage.setItem(
        "energy-version",
        "1000"
    );

    localStorage.setItem(
        "energy",
        String(MAX_ENERGY)
    );

} else {

    energy = Number(
        localStorage.getItem("energy")
    );

    if (!Number.isFinite(energy)) {
        energy = MAX_ENERGY;
    }

    energy = Math.max(
        0,
        Math.min(
            energy,
            MAX_ENERGY
        )
    );
}


/* ================= ИГРОВЫЕ ДАННЫЕ ================= */

let coins = Number(
    localStorage.getItem("coins")
);

if (!Number.isFinite(coins)) {
    coins = 0;
}


let tapPower = Number(
    localStorage.getItem("tapPower")
);

if (!Number.isFinite(tapPower)) {
    tapPower = 0.1;
}


/*
    Перевод старого значения 1
    в новую систему 0.1
*/

if (tapPower === 1) {
    tapPower = 0.1;
}


let passiveIncome = Number(
    localStorage.getItem("passiveIncome")
);

if (!Number.isFinite(passiveIncome)) {
    passiveIncome = 0;
}


let tapLevel = Number(
    localStorage.getItem("tapLevel")
);

if (!Number.isFinite(tapLevel)) {
    tapLevel = 1;
}


let bushLevel = Number(
    localStorage.getItem("bushLevel")
);

if (!Number.isFinite(bushLevel)) {
    bushLevel = 0;
}


let plantationLevel = Number(
    localStorage.getItem("plantationLevel")
);

if (!Number.isFinite(plantationLevel)) {
    plantationLevel = 0;
}


let refs = Number(
    localStorage.getItem("refs")
);

if (!Number.isFinite(refs)) {
    refs = 0;
}


let playerName =
    localStorage.getItem("playerName") ||
    "Игрок";


/* ================= ЦЕНЫ БУСТОВ ================= */

let tapCost = 50;
let bushCost = 250;
let plantationCost = 1000;


/* ================= ЭЛЕМЕНТЫ ================= */

const coinsElement =
    document.getElementById("coins");

const energyElement =
    document.getElementById("energy");

const energyFill =
    document.getElementById("energy-fill");

const tapPowerElement =
    document.getElementById("tap-power");

const passiveElement =
    document.getElementById("passive");

const tapLevelElement =
    document.getElementById("tap-level");

const bushLevelElement =
    document.getElementById("bush-level");

const plantationLevelElement =
    document.getElementById("plantation-level");

const tapCostElement =
    document.getElementById("tap-cost");

const bushCostElement =
    document.getElementById("bush-cost");

const plantationCostElement =
    document.getElementById(
        "plantation-cost"
    );

const profileNameElement =
    document.getElementById(
        "profile-name"
    );

const profileCoinsElement =
    document.getElementById(
        "profile-coins"
    );

const profilePassiveElement =
    document.getElementById(
        "profile-passive"
    );

const refsElement =
    document.getElementById("refs");


/* ================= СОХРАНЕНИЕ ================= */

function saveGame() {

    localStorage.setItem(
        "coins",
        String(coins)
    );

    localStorage.setItem(
        "energy",
        String(energy)
    );

    localStorage.setItem(
        "tapPower",
        String(tapPower)
    );

    localStorage.setItem(
        "passiveIncome",
        String(passiveIncome)
    );

    localStorage.setItem(
        "tapLevel",
        String(tapLevel)
    );

    localStorage.setItem(
        "bushLevel",
        String(bushLevel)
    );

    localStorage.setItem(
        "plantationLevel",
        String(plantationLevel)
    );

    localStorage.setItem(
        "refs",
        String(refs)
    );

    localStorage.setItem(
        "playerName",
        playerName
    );
}


/* ================= ФОРМАТ МОНЕТ ================= */

function formatCoins(value) {

    return Number(value)
        .toFixed(1);

}


/* ================= ОБНОВЛЕНИЕ ================= */

function updateUI() {

    coinsElement.textContent =
        formatCoins(coins);


    energyElement.textContent =
        Math.floor(energy);


    const energyPercent =
        (energy / MAX_ENERGY) * 100;

    energyFill.style.width =
        energyPercent + "%";


    tapPowerElement.textContent =
        tapPower.toFixed(1);


    passiveElement.textContent =
        passiveIncome.toFixed(1);


    tapLevelElement.textContent =
        tapLevel;


    bushLevelElement.textContent =
        bushLevel;


    plantationLevelElement.textContent =
        plantationLevel;


    tapCostElement.textContent =
        tapCost;


    bushCostElement.textContent =
        bushCost;


    plantationCostElement.textContent =
        plantationCost;


    profileNameElement.textContent =
        playerName;


    profileCoinsElement.textContent =
        formatCoins(coins);


    profilePassiveElement.textContent =
        passiveIncome.toFixed(1) +
        "/сек";


    refsElement.textContent =
        refs;
}


/* ================= ВИБРАЦИЯ ================= */

function vibrateTap() {

    if (
        tg &&
        tg.HapticFeedback &&
        typeof tg.HapticFeedback
            .impactOccurred === "function"
    ) {

        tg.HapticFeedback
            .impactOccurred("light");

    }

}


/* ================= ТАП ОБЕЗЬЯНЫ ================= */

const monkeyButton =
    document.getElementById(
        "monkey-button"
    );


monkeyButton.addEventListener(
    "click",
    function () {

        if (energy <= 0) {

            if (
                tg &&
                tg.HapticFeedback &&
                typeof tg.HapticFeedback
                    .notificationOccurred ===
                    "function"
            ) {

                tg.HapticFeedback
                    .notificationOccurred(
                        "warning"
                    );

            }

            return;
        }


        /*
            Сейчас базовый тап = 0.1 монеты.
        */

        coins += tapPower;

        coins =
            Math.round(
                coins * 10
            ) / 10;


        energy -= 1;

        energy =
            Math.max(
                0,
                Math.min(
                    energy,
                    MAX_ENERGY
                )
            );


        vibrateTap();

        updateUI();

        saveGame();

    }
);


/* ================= ЭНЕРГИЯ ================= */

setInterval(
    function () {

        if (energy < MAX_ENERGY) {

            energy += ENERGY_REGEN;

            energy =
                Math.min(
                    energy,
                    MAX_ENERGY
                );

            updateUI();

            saveGame();

        }

    },
    ENERGY_REGEN_TIME
);


/* ================= ПАССИВНЫЙ ДОХОД ================= */

setInterval(
    function () {

        if (passiveIncome > 0) {

            coins += passiveIncome;

            coins =
                Math.round(
                    coins * 10
                ) / 10;

            updateUI();

            saveGame();

        }

    },
    1000
);


/* ================= СИЛА ТАПА ================= */

document
    .getElementById("buy-tap")
    .addEventListener(
        "click",
        function () {

            if (coins < tapCost) {
                return;
            }


            coins -= tapCost;

            tapLevel += 1;

            tapPower += 0.1;

            tapPower =
                Math.round(
                    tapPower * 10
                ) / 10;


            tapCost =
                Math.floor(
                    tapCost * 1.7
                );


            updateUI();

            saveGame();

        }
    );


/* ================= КУСТ ================= */

document
    .getElementById("buy-bush")
    .addEventListener(
        "click",
        function () {

            if (coins < bushCost) {
                return;
            }


            coins -= bushCost;

            bushLevel += 1;

            passiveIncome += 0.1;

            passiveIncome =
                Math.round(
                    passiveIncome * 10
                ) / 10;


            bushCost =
                Math.floor(
                    bushCost * 1.8
                );


            updateUI();

            saveGame();

        }
    );


/* ================= ПЛАНТАЦИЯ ================= */

document
    .getElementById("buy-plantation")
    .addEventListener(
        "click",
        function () {

            if (coins < plantationCost) {
                return;
            }


            coins -= plantationCost;

            plantationLevel += 1;

            passiveIncome += 1;

            passiveIncome =
                Math.round(
                    passiveIncome * 10
                ) / 10;


            plantationCost =
                Math.floor(
                    plantationCost * 2
                );


            updateUI();

            saveGame();

        }
    );


/* ================= НАВИГАЦИЯ ================= */

const navButtons =
    document.querySelectorAll(
        ".nav-button"
    );

const screens =
    document.querySelectorAll(
        ".screen"
    );


navButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const target =
                    button.dataset.screen;


                screens.forEach(
                    function (screen) {

                        screen.classList.remove(
                            "active"
                        );

                    }
                );


                navButtons.forEach(
                    function (nav) {

                        nav.classList.remove(
                            "active"
                        );

                    }
                );


                const targetScreen =
                    document.getElementById(
                        target
                    );


                if (targetScreen) {

                    targetScreen.classList.add(
                        "active"
                    );

                }


                button.classList.add(
                    "active"
                );


                closeAllModals();

            }
        );

    }
);


/* ================= МОДАЛКИ ================= */

const renameModal =
    document.getElementById(
        "rename-modal"
    );

const leaderboardModal =
    document.getElementById(
        "leaderboard-modal"
    );


function openModal(modal) {

    modal.classList.add(
        "active"
    );

}


function closeModal(modal) {

    modal.classList.remove(
        "active"
    );

}


function closeAllModals() {

    closeModal(renameModal);

    closeModal(leaderboardModal);

}


/* ================= ИМЯ ================= */

document
    .getElementById("rename-button")
    .addEventListener(
        "click",
        function () {

            const input =
                document.getElementById(
                    "name-input"
                );


            input.value =
                playerName === "Игрок"
                    ? ""
                    : playerName;


            openModal(renameModal);


            setTimeout(
                function () {

                    input.focus();

                },
                100
            );

        }
    );


document
    .getElementById("rename-cancel")
    .addEventListener(
        "click",
        function () {

            closeModal(
                renameModal
            );

        }
    );


document
    .getElementById("rename-save")
    .addEventListener(
        "click",
        function () {

            const input =
                document.getElementById(
                    "name-input"
                );


            const newName =
                input.value.trim();


            if (newName.length === 0) {
                return;
            }


            playerName =
                newName.substring(
                    0,
                    20
                );


            updateUI();

            saveGame();

            closeModal(
                renameModal
            );

        }
    );


/* ================= ТАБЛИЦА ЛИДЕРОВ ================= */

document
    .getElementById(
        "leaderboard-button"
    )
    .addEventListener(
        "click",
        function () {

            openModal(
                leaderboardModal
            );

        }
    );


document
    .getElementById(
        "close-leaderboard"
    )
    .addEventListener(
        "click",
        function () {

            closeModal(
                leaderboardModal
            );

        }
    );


/* ================= ЗАКРЫТИЕ МОДАЛОК ================= */

renameModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            renameModal
        ) {

            closeModal(
                renameModal
            );

        }

    }
);


leaderboardModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            leaderboardModal
        ) {

            closeModal(
                leaderboardModal
            );

        }

    }
);


/* ================= ПРИГЛАСИТЬ ДРУГА ================= */

document
    .getElementById("ref-button")
    .addEventListener(
        "click",
        function () {

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


            if (
                tg &&
                typeof tg.openTelegramLink ===
                    "function"
            ) {

                tg.openTelegramLink(
                    share
                );

            } else {

                window.open(
                    share,
                    "_blank"
                );

            }

        }
    );


/* ================= НАШ КАНАЛ ================= */

document
    .getElementById("channel-button")
    .addEventListener(
        "click",
        function () {

            /*
                Замени ссылку на свой канал.
            */

            const channelLink =
                "https://t.me/MonkeyTapperTG";


            if (
                tg &&
                typeof tg.openTelegramLink ===
                    "function"
            ) {

                tg.openTelegramLink(
                    channelLink
                );

            } else {

                window.open(
                    channelLink,
                    "_blank"
                );

            }

        }
    );


/* ================= ЗАПУСК ================= */

updateUI();

closeAllModals();
