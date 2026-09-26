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

```
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
```

}

// =========================
// UI
// =========================

function updateAllUI() {

```
if ($("coins"))
    $("coins").textContent = Math.floor(coins);

if ($("energy"))
    $("energy").textContent = Math.floor(energy);

if ($("tap-power"))
    $("tap-power").textContent = tapPower;

if ($("passive"))
    $("passive").textContent = passiveIncome;

if ($("tap-level"))
    $("tap-level").textContent = tapLevel;

if ($("tap-cost"))
    $("tap-cost").textContent = tapCost;

if ($("bush-level"))
    $("bush-level").textContent = bushLevel;

if ($("bush-cost"))
    $("bush-cost").textContent = bushCost;

if ($("plantation-level"))
    $("plantation-level").textContent =
        plantationLevel;

if ($("plantation-cost"))
    $("plantation-cost").textContent =
        plantationCost;

if ($("refs"))
    $("refs").textContent = refs;

if ($("username"))
    $("username").textContent = playerName;

if ($("profile-name"))
    $("profile-name").textContent = playerName;

if ($("profile-coins"))
    $("profile-coins").textContent =
        Math.floor(coins);

if ($("profile-passive"))
    $("profile-passive").textContent =
        passiveIncome + "/сек";
```

}

// =========================
// TAP
// =========================

function setupTap() {

```
const button = $("monkey-button");

if (!button) return;

button.addEventListener("click", () => {

    if (energy <= 0) return;

    coins += tapPower;
    energy--;

    animateMonkey();
    createFloatingCoin(tapPower);

    updateAllUI();
    saveGame();

    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred("light");
    }
});
```

}

function animateMonkey() {

```
const button = $("monkey-button");

if (!button) return;

button.classList.remove("tapped");

void button.offsetWidth;

button.classList.add("tapped");

setTimeout(() => {
    button.classList.remove("tapped");
}, 100);
```

}

// =========================
// FLOATING COIN
// =========================

function createFloatingCoin(amount) {

```
const app = $("app");

if (!app) return;

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

setTimeout(() => {
    coin.remove();
}, 800);
```

}

// =========================
// UPGRADES
// =========================

function buyTapUpgrade() {

```
if (coins < tapCost) return;

coins -= tapCost;

tapLevel++;
tapPower++;

tapCost =
    Math.floor(tapCost * 1.55);

updateAllUI();
saveGame();
```

}

function buyBush() {

```
if (coins < bushCost) return;

coins -= bushCost;

bushLevel++;
passiveIncome += 1;

bushCost =
    Math.floor(bushCost * 1.7);

updateAllUI();
saveGame();
```

}

function buyPlantation() {

```
if (coins < plantationCost) return;

coins -= plantationCost;

plantationLevel++;
passiveIncome += 5;

plantationCost =
    Math.floor(plantationCost * 1.8);

updateAllUI();
saveGame();
```

}

// =========================
// NAVIGATION
// =========================

function setupNavigation() {

```
const buttons =
    document.querySelectorAll(".nav-button");

buttons.forEach(button => {

    button.addEventListener("click", () => {

        const screenId =
            button.dataset.screen;

        document
            .querySelectorAll(".screen")
            .forEach(screen => {
                screen.classList.remove("active");
            });

        const screen = $(screenId);

        if (screen) {
            screen.classList.add("active");
        }

        buttons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
    });
});
```

}

// =========================
// BUTTONS
// =========================

function setupButtons() {

```
$("buy-tap")?.addEventListener(
    "click",
    buyTapUpgrade
);

$("buy-bush")?.addEventListener(
    "click",
    buyBush
);

$("buy-plantation")?.addEventListener(
    "click",
    buyPlantation
);


$("leaderboard-button")?.addEventListener(
    "click",
    () => {
        $("leaderboard-modal")
            ?.classList.add("active");
    }
);


$("close-leaderboard")?.addEventListener(
    "click",
    () => {
        $("leaderboard-modal")
            ?.classList.remove("active");
    }
);


$("rename-button")?.addEventListener(
    "click",
    () => {

        const input = $("name-input");

        if (input) {
            input.value = playerName;
        }

        $("rename-modal")
            ?.classList.add("active");
    }
);


$("rename-cancel")?.addEventListener(
    "click",
    () => {
        $("rename-modal")
            ?.classList.remove("active");
    }
);


$("rename-save")?.addEventListener(
    "click",
    () => {

        const input = $("name-input");

        if (!input) return;

        const name =
            input.value.trim();

        if (!name) return;

        playerName = name;

        saveGame();
        updateAllUI();

        $("rename-modal")
            ?.classList.remove("active");
    }
);


$("ref-button")?.addEventListener(
    "click",
    shareReferral
);


$("channel-button")?.addEventListener(
    "click",
    () => {

        const channel =
            "https://t.me/MonkeyTapper";

        if (tg?.openTelegramLink) {
            tg.openTelegramLink(channel);
        } else {
            window.open(channel, "_blank");
        }
    }
);
```

}

// =========================
// REFERRAL
// =========================

function shareReferral() {

```
const botUsername =
    "MonkeyTapperTGbot";

const link =
    `https://t.me/${botUsername}?start=${userId}`;

const share =
    `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("🐒 Заходи в Monkey Tapper!")}`;

if (tg?.openTelegramLink) {
    tg.openTelegramLink(share);
} else {
    window.open(share, "_blank");
}
```

}

// =========================
// PASSIVE INCOME
// =========================

setInterval(() => {

```
if (passiveIncome > 0) {

    coins += passiveIncome;

    updateAllUI();
    saveGame();
}
```

}, 1000);

// =========================
// ENERGY
// =========================

setInterval(() => {

```
if (energy < 100) {

    energy++;

    updateAllUI();
    saveGame();
}
```

}, 3000);

// =========================
// START
// =========================

function init() {

```
updateAllUI();

setupTap();
setupButtons();
setupNavigation();
```

}

init();

```
```
