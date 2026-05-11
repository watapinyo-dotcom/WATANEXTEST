// ============================================================
// 🔧 CONFIG
// ============================================================

const SHEET_CSV_URL =
  "https://api.allorigins.win/raw?url=" +
  encodeURIComponent(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmptKiROoXtoAsl1ZgySVn11jLlr3lxsvV6ou5dCiyZog6Xbt_GojizBt3XQNnNMJrAeVOJSstEigy/pub?gid=0&single=true&output=csv"
  );

const SUCCESS_MESSAGE = "เก็บเป็นความลับนะ! 🤫 ห้ามบอกใคร";

let pairingData = null;

// ============================================================
// FETCH DATA
// ============================================================

async function fetchPairingData() {
  if (pairingData) return pairingData;

  console.log("🔄 Fetching CSV...");

  const res = await fetch(SHEET_CSV_URL);

  console.log("📡 Status:", res.status);

  if (!res.ok) {
    throw new Error(`โหลดข้อมูลไม่ได้ (HTTP ${res.status})`);
  }

  const text = await res.text();

  console.log("📄 CSV:", text.substring(0, 100));

  const rows = parseCSV(text);

  if (rows.length === 0) {
    throw new Error("Google Sheet ว่าง หรืออ่านไม่ได้");
  }

  const headers = rows[0].map((h) =>
    h.trim().toLowerCase()
  );

  const nameIdx = headers.indexOf("name");
  const partnerIdx = headers.indexOf("partner");

  if (nameIdx === -1 || partnerIdx === -1) {
    throw new Error(
      `ต้องมีคอลัมน์ name และ partner\nเจอ: ${headers.join(", ")}`
    );
  }

  const map = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const name = (row[nameIdx] || "").trim();
    const partner = (row[partnerIdx] || "").trim();

    if (!name) continue;

    map[name.toLowerCase()] = {
      name,
      partner,
    };
  }

  pairingData = map;

  console.log("✅ Loaded:", Object.keys(map).length);

  return map;
}

// ============================================================
// CSV PARSER
// ============================================================

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
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cols.push(cur);
        cur = "";
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
// SEARCH
// ============================================================

async function lookupName() {
  const input = document.getElementById("nameInput");

  const query = input.value.trim();

  if (!query) {
    showError("กรุณากรอกชื่อก่อน 😊");
    input.focus();
    return;
  }

  clearError();

  setLoading(true);

  try {
    const data = await fetchPairingData();

    const entry = data[query.toLowerCase()];

    if (!entry) {
      const suggestions = Object.values(data)
        .filter((e) =>
          e.name.toLowerCase().includes(query.toLowerCase())
        )
        .map((e) => e.name)
        .slice(0, 3);

      let msg = `ไม่เจอชื่อ "${query}"`;

      if (suggestions.length > 0) {
        msg += `<br><br>หรือหมายถึง:<br>${suggestions.join("<br>")}`;
      }

      showError(msg);

      setLoading(false);

      return;
    }

    if (!entry.partner) {
      showError(`"${entry.name}" ยังไม่มีคู่`);
      setLoading(false);
      return;
    }

    showResult(entry.name, entry.partner);

  } catch (err) {
    console.error(err);

    showError(`❌ ${err.message}`);
  }

  setLoading(false);
}

// ============================================================
// UI
// ============================================================

function showResult(you, partner) {
  document.getElementById("searchForm").style.display = "none";

  document.getElementById("resultYou").textContent = you;

  document.getElementById("resultPartner").textContent = partner;

  document.getElementById("resultMsg").textContent =
    SUCCESS_MESSAGE;

  document.getElementById("resultCard").classList.add("show");
}

function resetForm() {
  document
    .getElementById("resultCard")
    .classList.remove("show");

  document.getElementById("searchForm").style.display =
    "block";

  document.getElementById("nameInput").value = "";

  clearError();

  document.getElementById("nameInput").focus();
}

function setLoading(on) {
  document.getElementById("loader").style.display =
    on ? "flex" : "none";

  document.getElementById("searchBtn").disabled = on;
}

function showError(msg) {
  const box = document.getElementById("errorBox");

  box.innerHTML = `
    <div class="error-box">
      ${msg}
    </div>
  `;
}

function clearError() {
  document.getElementById("errorBox").innerHTML = "";
}

// ============================================================
// ENTER KEY
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("nameInput");

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      lookupName();
    }
  });
});
