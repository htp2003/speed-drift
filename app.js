const COSTS = [60, 60, 180, 500, 1000, 2500, 5800, 7200, 7200];
const rewards = [
  "",
  "1 XU",
  "3 XU",
  "Umbrella",
  "Pan",
  "AWM",
  "Mythic",
  "1 Ticket",
  "2 Tickets",
];
const savedData = JSON.parse(localStorage.getItem("speedDrift_save")) || {};
let speed = savedData.speed || 0;
let uc = savedData.uc || 0;
let tickets = savedData.tickets || 0;
let failStreak = savedData.failStreak || 0;
let soundEnabled =
  savedData.soundEnabled !== undefined ? savedData.soundEnabled : true;
let animEnabled =
  savedData.animEnabled !== undefined ? savedData.animEnabled : true;
let logs = savedData.logs || [];
let busy = false;
const msg = {
  accel: "🏎️ Accelerating...",
  success: "⚡ SUCCESS: +{jump} Speed!",
  fail: "💥 FAILED: Reset to 0",
  miss: "❌ MISS: Secured ({streak}/3)",
  max: "🏁 MAX LEVEL REACHED!",
  shopSuccess: "✅ REDEEMED: {item}!",
  shopFail: "❌ NOT ENOUGH TICKETS!",
};
function saveGame() {
  localStorage.setItem(
    "speedDrift_save",
    JSON.stringify({
      speed,
      uc,
      tickets,
      failStreak,
      soundEnabled,
      animEnabled,
      logs,
    })
  );
}
async function play(mode) {
  if (busy) return;
  busy = true;
  const scene = document.getElementById("gameScene");
  const btns = document.querySelectorAll(".action-btn");
  btns.forEach((b) => (b.disabled = true));
  let delay = 200;
  if (animEnabled) {
    delay = 1500;
    scene.className = "game-scene accelerating";
    updateLogDisplay(msg.accel, "#fff", false);
    playSound("accelSound");
  } else {
    updateLogDisplay("⚡ Instant Roll...", "#555", false);
  }
  await new Promise((r) => setTimeout(r, delay));
  let win = false,
    jump = 0;
  if (mode === "start") {
    uc += 60;
    jump = rollJump();
    speed = jump;
    win = true;
  } else {
    if (mode === "safe") uc += COSTS[speed];
    win = Math.random() < 0.22;
    if (mode === "safe") {
      failStreak++;
      if (failStreak >= 3) win = true;
    }
    if (win) {
      failStreak = 0;
      jump = rollJump();
      speed = Math.min(8, speed + jump);
    } else if (mode === "free") {
      speed = 0;
      failStreak = 0;
    }
  }
  scene.classList.remove("accelerating");
  if (win) {
    scene.classList.add(jump === 1 ? "res-blue" : "res-gold");
    addLog(
      msg.success.replace("{jump}", jump),
      jump === 1 ? "#06b6d4" : "#eab308"
    );
    playSound("successSound");
  } else {
    scene.classList.add("res-red");
    addLog(
      mode === "free" ? msg.fail : msg.miss.replace("{streak}", failStreak),
      "#ef4444"
    );
    playSound("failureSound");
  }
  update();
  saveGame();
  if (speed === 8) {
    addLog(msg.max, "#eab308");
    setTimeout(collect, animEnabled ? 800 : 300);
  }
  setTimeout(
    () => {
      scene.classList.remove("res-blue", "res-gold", "res-red");
      busy = false;
      btns.forEach((b) => (b.disabled = false));
    },
    animEnabled ? 1000 : 300
  );
}
function redeemItem(cost, itemName) {
  if (tickets >= cost) {
    tickets -= cost;
    closeShop();
    if (animEnabled) {
      triggerGachaAnimation(itemName, cost === 3);
    } else {
      addLog(msg.shopSuccess.replace("{item}", itemName), "#eab308");
      playSound("successSound");
    }
    update();
    saveGame();
  } else {
    addLog(msg.shopFail, "#ef4444");
    const btns = document.querySelectorAll(".shop-btn-action");
    btns.forEach((b) => {
      b.style.transform = "translateX(5px)";
      setTimeout(() => (b.style.transform = "translateX(0)"), 100);
    });
  }
}
function toggleAnimation() {
  animEnabled = !animEnabled;
  updateToggleUI();
  saveGame();
}
function updateToggleUI() {
  const btn = document.getElementById("animToggle");
  btn.style.opacity = animEnabled ? "1" : "0.3";
  btn.style.color = animEnabled ? "#fcd34d" : "#9ca3af";
}
function rollJump() {
  let r = Math.random() * 100;
  return r <= 1 ? 3 : r <= 19 ? 2 : 1;
}
function update() {
  document.getElementById("speed-txt").innerText = speed;
  document.getElementById("uc-val").innerText = uc.toLocaleString();
  document.getElementById("ticket-val").innerText = tickets;
  document.getElementById("fill").style.width = (speed / 8) * 100 + "%";
  document
    .querySelectorAll(".dot")
    .forEach((d, i) =>
      i < speed ? d.classList.add("active") : d.classList.remove("active")
    );
  const startPanel = document.getElementById("start-panel");
  const playPanel = document.getElementById("play-panel");
  if (speed === 0) {
    startPanel.style.display = "block";
    playPanel.style.display = "none";
  } else {
    startPanel.style.display = "none";
    playPanel.style.display = "flex";
    document.getElementById(
      "btn-safe"
    ).innerText = `SAFE ACCEL (${COSTS[speed]} UC)`;
  }
}
function collect() {
  const reward = rewards[speed];
  if (reward === "1 Ticket") tickets += 1;
  if (reward === "2 Tickets") tickets += 2;
  document.getElementById("rewardName").innerText = reward;
  document.getElementById("rewardModal").setAttribute("aria-hidden", "false");
}
function closeRewardModal() {
  document.getElementById("rewardModal").setAttribute("aria-hidden", "true");
  speed = 0;
  uc = 0;
  failStreak = 0;
  update();
  saveGame();
}
function openShop() {
  document.getElementById("shopModal").setAttribute("aria-hidden", "false");
}
function closeShop() {
  document.getElementById("shopModal").setAttribute("aria-hidden", "true");
}
function triggerGachaAnimation(itemName, isGold) {
  const overlay = document.getElementById("gachaOverlay");
  const title = document.getElementById("gachaTitle");
  const car = document.getElementById("gachaCar");
  title.innerText = itemName.toUpperCase();
  title.style.color = isGold ? "#fcd34d" : "#06b6d4";
  title.style.textShadow = isGold ? "0 0 20px #fcd34d" : "0 0 20px #06b6d4";
  car.style.background = isGold
    ? "linear-gradient(135deg, #fcd34d, #b45309)"
    : "linear-gradient(135deg, #06b6d4, #1e3a8a)";
  car.style.boxShadow = isGold
    ? "0 0 60px rgba(234, 179, 8, 0.6)"
    : "0 0 60px rgba(6, 182, 212, 0.6)";
  overlay.classList.add("active");
  setTimeout(() => overlay.classList.add("animate"), 10);
  playSound("successSound");
  setTimeout(() => playSound("accelSound"), 200);
}
function closeGacha() {
  document.getElementById("gachaOverlay").classList.remove("active", "animate");
}
function addLog(txt, col) {
  const time = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  logs.unshift({ time, txt, col });
  if (logs.length > 50) logs.pop();
  renderLogs();
}
function updateLogDisplay(txt, col, isTemp = true) {
  if (isTemp) {
    const b = document.getElementById("logs");
    b.innerHTML =
      `<div class="log-entry" style="color:${col}; opacity: 0.7"> ▶ ${txt}</div>` +
      generateLogHTML();
  }
}
function renderLogs() {
  document.getElementById("logs").innerHTML = generateLogHTML();
}
function generateLogHTML() {
  return logs
    .map(
      (l) =>
        `<div class="log-entry" style="color:${l.col}"><span style="opacity:0.5; font-size:0.8em">[${l.time}]</span> ${l.txt}</div>`
    )
    .join("");
}
function playSound(id) {
  if (!soundEnabled) return;
  const s = document.getElementById(id);
  if (s) {
    s.currentTime = 0;
    s.play().catch(() => {});
  }
}
function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById("soundToggle").style.opacity = soundEnabled
    ? "1"
    : "0.3";
  saveGame();
}
function showInfo() {
  document.getElementById("infoModal").setAttribute("aria-hidden", "false");
}
function hideInfo() {
  document.getElementById("infoModal").setAttribute("aria-hidden", "true");
}
update();
renderLogs();
document.getElementById("soundToggle").style.opacity = soundEnabled
  ? "1"
  : "0.3";
updateToggleUI();
