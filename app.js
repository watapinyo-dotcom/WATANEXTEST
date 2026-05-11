// ============================================================
//  🔧 CONFIG — แก้ตรงนี้อย่างเดียว!
// ============================================================

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmptKiROoXtoAsl1ZgySVn11jLlr3lxsvV6ou5dCiyZog6Xbt_GojizBt3XQNnNMJrAeVOJSstEigy/pub?gid=1104057053&single=true&output=csv";

// Wrap URL ผ่าน CORS proxy
function getProxiedUrl(url) {
  return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
}
//                                         ↑ แทน YOUR_SHEET_ID ด้วย ID ของ Sheet คุณ
//
// วิธีหา SHEET_ID: เปิด Google Sheet แล้วดู URL
//   https://docs.google.com/spreadsheets/d/  <<ID อยู่ตรงนี้>>  /edit
//
// วิธี Publish Sheet เป็น CSV:
//   File → Share → Publish to web
//   เลือก Sheet ที่ต้องการ → เลือกฟอร์แมต CSV → Publish
//   แล้วเอา ID จาก URL ปกติมาใส่ด้านบน (ไม่ต้องใช้ URL จาก Publish)

// ============================================================
//  💡 รูปแบบ Google Sheet (row แรกต้องเป็น header)
// ============================================================
//
//  name        | partner
//  ------------|----------
//  สมชาย       | สมหญิง
//  สมหญิง      | สมศักดิ์
//  สมศักดิ์    | สมชาย
//
// ❗ ชื่อคอลัมน์ต้องเป็น "name" และ "partner" (ตัวเล็กทั้งหมด)

// ============================================================
//  optional: ข้อความพิเศษที่แสดงหลังเจอคู่
// ============================================================
const SUCCESS_MESSAGE = "เก็บเป็นความลับนะ! 🤫 ห้ามบอกใคร";

// ============================================================
//  CODE — ไม่ต้องแก้ด้านล่าง
// ============================================================

let pairingData = null; // cache ข้อมูลไว้ใน memory

async function fetchPairingData() {
  if (pairingData) return pairingData; // ใช้ cache ถ้ามีแล้ว

  const res = await fetch(getProxiedUrl(SHEET_CSV_URL));
  if (!res.ok) throw new Error(`ดึงข้อมูลไม่ได้ (HTTP ${res.status})`);

  const text = await res.text();
  const rows = parseCSV(text);

  if (rows.length === 0) throw new Error("Sheet ว่างเปล่า หรือ format ไม่ถูกต้อง");

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const partnerIdx = headers.indexOf("partner");

  if (nameIdx === -1 || partnerIdx === -1) {
    throw new Error(
      `ไม่เจอคอลัมน์ที่ถูกต้อง\nต้องมีคอลัมน์ "name" และ "partner"\nเจอ: ${headers.join(", ")}`
    );
  }

  const map = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[nameIdx]) continue;
    const name = row[nameIdx].trim();
    const partner = (row[partnerIdx] || "").trim();
    if (name) map[name.toLowerCase()] = { name, partner };
  }

  pairingData = map;
  return map;
}

// Simple CSV parser (handles quoted fields)
function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cols.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

// ============================================================
//  UI Functions
// ============================================================

async function lookupName() {
  const input = document.getElementById("nameInput");
  const query = input.value.trim();

  if (!query) {
    showError("กรุณากรอกชื่อก่อนนะ 😊");
    input.focus();
    return;
  }

  clearError();
  setLoading(true);

  try {
    const data = await fetchPairingData();
    const entry = data[query.toLowerCase()];

    if (!entry) {
      // ลอง fuzzy: หาชื่อที่มีคำนั้นอยู่
      const suggestions = Object.values(data)
        .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
        .map((e) => e.name)
        .slice(0, 3);

      let msg = `ไม่เจอชื่อ "${query}" ในรายการ`;
      if (suggestions.length > 0) {
        msg += `\nหมายถึง: ${suggestions.join(", ")} ไหม?`;
      } else {
        msg += `\nลองตรวจสอบการสะกดอีกครั้ง`;
      }
      showError(msg);
      setLoading(false);
      return;
    }

    if (!entry.partner) {
      showError(`พบชื่อ "${entry.name}" แต่ยังไม่ได้รับการจับคู่`);
      setLoading(false);
      return;
    }

    showResult(entry.name, entry.partner);
  } catch (err) {
    showError(`❌ ${err.message}`);
  }

  setLoading(false);
}

function showResult(you, partner) {
  document.getElementById("searchForm").style.display = "none";
  document.getElementById("resultYou").textContent = you;
  document.getElementById("resultPartner").textContent = partner;
  document.getElementById("resultMsg").textContent = SUCCESS_MESSAGE;

  const rc = document.getElementById("resultCard");
  rc.classList.add("show");
}

function resetForm() {
  document.getElementById("resultCard").classList.remove("show");
  document.getElementById("searchForm").style.display = "block";
  document.getElementById("nameInput").value = "";
  clearError();
  document.getElementById("nameInput").focus();
}

function setLoading(on) {
  document.getElementById("loader").style.display = on ? "flex" : "none";
  document.getElementById("searchBtn").disabled = on;
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  box.innerHTML = `<div class="error-box">${msg.replace(/\n/g, "<br/>")}</div>`;
}

function clearError() {
  document.getElementById("errorBox").innerHTML = "";
}

// Enter key support
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupName();
  });
});
  const input = document.getElementById("nameInput");
  const query = input.value.trim();

  if (!query) {
    showError("กรุณากรอกชื่อก่อนนะ 😊");
    input.focus();
    return;
  }

  clearError();
  setLoading(true);

  try {
    const data = await fetchPairingData();
    const entry = data[query.toLowerCase()];

    if (!entry) {
      // ลอง fuzzy: หาชื่อที่มีคำนั้นอยู่
      const suggestions = Object.values(data)
        .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
        .map((e) => e.name)
        .slice(0, 3);

      let msg = `ไม่เจอชื่อ "${query}" ในรายการ`;
      if (suggestions.length > 0) {
        msg += `\nหมายถึง: ${suggestions.join(", ")} ไหม?`;
      } else {
        msg += `\nลองตรวจสอบการสะกดอีกครั้ง`;
      }
      showError(msg);
      setLoading(false);
      return;
    }

    if (!entry.partner) {
      showError(`พบชื่อ "${entry.name}" แต่ยังไม่ได้รับการจับคู่`);
      setLoading(false);
      return;
    }

    showResult(entry.name, entry.partner);
  } catch (err) {
    showError(`❌ ${err.message}`);
  }

  setLoading(false);
}

function showResult(you, partner) {
  document.getElementById("searchForm").style.display = "none";
  document.getElementById("resultYou").textContent = you;
  document.getElementById("resultPartner").textContent = partner;
  document.getElementById("resultMsg").textContent = SUCCESS_MESSAGE;

  const rc = document.getElementById("resultCard");
  rc.classList.add("show");
}

function resetForm() {
  document.getElementById("resultCard").classList.remove("show");
  document.getElementById("searchForm").style.display = "block";
  document.getElementById("nameInput").value = "";
  clearError();
  document.getElementById("nameInput").focus();
}

function setLoading(on) {
  document.getElementById("loader").style.display = on ? "flex" : "none";
  document.getElementById("searchBtn").disabled = on;
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  box.innerHTML = `<div class="error-box">${msg.replace(/\n/g, "<br/>")}</div>`;
}

function clearError() {
  document.getElementById("errorBox").innerHTML = "";
}

// Enter key support
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupName();
  });
});

