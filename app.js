const COSTS = [60, 60, 180, 500, 1000, 2500, 5800, 7200, 7200];
const rewards = ["", "1 XU", "3 XU", "Umbrella", "Pan", "AWM", "Mythic", "1 Ticket", "2 Tickets"];

// Load dữ liệu cũ nếu có, không thì lấy mặc định
const savedData = JSON.parse(localStorage.getItem("speedDrift_save")) || {};

let speed = savedData.speed || 0;
let uc = savedData.uc || 0;
let failStreak = savedData.failStreak || 0;
let soundEnabled = savedData.soundEnabled !== undefined ? savedData.soundEnabled : true;
let logs = savedData.logs || []; // Lưu danh sách log

let busy = false;

const msg = {
  accel: "🏎️ Accelerating...",
  success: "⚡ SUCCESS: +{jump} Speed!",
  fail: "💥 FAILED: Reset to 0",
  miss: "❌ MISS: Secured ({streak}/3)",
  max: "🏁 MAX LEVEL REACHED!"
};

// --- HÀM LƯU DỮ LIỆU ---
function saveGame() {
  const data = {
    speed: speed,
    uc: uc,
    failStreak: failStreak,
    soundEnabled: soundEnabled,
    logs: logs // Lưu luôn cả lịch sử đấu
  };
  localStorage.setItem("speedDrift_save", JSON.stringify(data));
}

async function play(mode) {
  if (busy) return;
  busy = true;

  const scene = document.getElementById("gameScene");
  const btns = document.querySelectorAll(".action-btn");

  btns.forEach(b => b.disabled = true);
  scene.className = "game-scene accelerating";
  
  // Không lưu log "Accelerating" vào history để đỡ rác, chỉ hiện tạm thời
  updateLogDisplay(msg.accel, "#fff", false); 
  playSound("accelSound");

  await new Promise(r => setTimeout(r, 1500));

  let win = false, jump = 0;
  if (mode === 'start') { 
    uc += 60; jump = rollJump(); speed = jump; win = true; 
  } else {
    if (mode === 'safe') uc += COSTS[speed];
    win = Math.random() < 0.22;
    if (mode === 'safe') { failStreak++; if (failStreak >= 3) win = true; }
    if (win) { failStreak = 0; jump = rollJump(); speed = Math.min(8, speed + jump); } 
    else if (mode === 'free') { speed = 0; failStreak = 0; }
  }

  scene.classList.remove("accelerating");
  
  if (win) {
    scene.classList.add(jump === 1 ? "res-blue" : "res-gold");
    // Lưu log kết quả
    addLog(msg.success.replace("{jump}", jump), jump === 1 ? "#06b6d4" : "#eab308");
    playSound("successSound");
  } else {
    scene.classList.add("res-red");
    addLog(mode === 'free' ? msg.fail : msg.miss.replace("{streak}", failStreak), "#ef4444");
    playSound("failureSound");
  }

  update();
  saveGame(); // <--- LƯU NGAY SAU KHI CÓ KẾT QUẢ

  if (speed === 8) {
    addLog(msg.max, "#eab308");
    setTimeout(collect, 800);
  }

  setTimeout(() => {
    scene.classList.remove("res-blue", "res-gold", "res-red");
    busy = false;
    btns.forEach(b => b.disabled = false);
  }, 1000);
}

function rollJump() { let r = Math.random() * 100; return r <= 1 ? 3 : r <= 19 ? 2 : 1; }

function update() {
  document.getElementById("speed-txt").innerText = speed;
  document.getElementById("uc-val").innerText = uc.toLocaleString();
  document.getElementById("fill").style.width = (speed / 8) * 100 + "%";
  
  document.querySelectorAll(".dot").forEach((d, i) => {
    i < speed ? d.classList.add("active") : d.classList.remove("active");
  });

  const startPanel = document.getElementById("start-panel");
  const playPanel = document.getElementById("play-panel");
  
  if (speed === 0) {
    startPanel.style.display = "block";
    playPanel.style.display = "none";
  } else {
    startPanel.style.display = "none";
    playPanel.style.display = "flex";
    document.getElementById("btn-safe").innerText = `SAFE ACCEL (${COSTS[speed]} UC)`;
  }
}

// Hàm thêm log vào mảng và lưu lại
function addLog(txt, col) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
  // Thêm vào đầu mảng
  logs.unshift({ time, txt, col });
  // Giới hạn chỉ lưu 50 dòng log gần nhất cho nhẹ
  if (logs.length > 50) logs.pop();
  
  renderLogs();
  saveGame();
}

// Hàm chỉ hiển thị log (dùng cho loading hoặc log tạm)
function updateLogDisplay(txt, col, isTemp = true) {
  if (isTemp) {
    const b = document.getElementById("logs");
    const tempHTML = `<div class="log-entry" style="color:${col}; opacity: 0.7"> ▶ ${txt}</div>`;
    // Giữ lại log cũ, chỉ chèn tạm log mới lên đầu
    b.innerHTML = tempHTML + generateLogHTML(); 
  }
}

// Render lại toàn bộ log từ mảng dữ liệu
function renderLogs() {
  document.getElementById("logs").innerHTML = generateLogHTML();
}

function generateLogHTML() {
  return logs.map(l => 
    `<div class="log-entry" style="color:${l.col}">
       <span style="opacity:0.5; font-size:0.8em">[${l.time}]</span> ${l.txt}
     </div>`
  ).join("");
}

function playSound(id) {
  if (!soundEnabled) return;
  const s = document.getElementById(id);
  if (s) { s.currentTime = 0; s.play().catch(() => {}); }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("soundToggle");
  btn.style.opacity = soundEnabled ? "1" : "0.3"; 
  saveGame(); // <--- LƯU CÀI ĐẶT ÂM THANH
}

function collect() {
  document.getElementById("rewardName").innerText = rewards[speed];
  document.getElementById("rewardModal").setAttribute("aria-hidden", "false");
}

function closeRewardModal() {
  document.getElementById("rewardModal").setAttribute("aria-hidden", "true");
  speed = 0; uc = 0; failStreak = 0; 
  update(); 
  saveGame(); // <--- LƯU SAU KHI NHẬN THƯỞNG
}

function showInfo() { document.getElementById("infoModal").setAttribute("aria-hidden", "false"); }
function hideInfo() { document.getElementById("infoModal").setAttribute("aria-hidden", "true"); }

// --- KHỞI TẠO LẦN ĐẦU ---
// Cập nhật giao diện từ dữ liệu đã load
update();
renderLogs(); // Vẽ lại log cũ
document.getElementById("soundToggle").style.opacity = soundEnabled ? "1" : "0.3";