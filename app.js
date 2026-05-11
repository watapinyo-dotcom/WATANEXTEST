// ============================================================
// 🔧 FAST + STABLE VERSION
// ใช้ได้กับ GitHub Pages + มือถือ
// ============================================================

// ✅ ใช้ Google Sheet CSV ตรง ๆ (เร็วกว่า allorigins มาก)
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmptKiROoXtoAsl1ZgySVn11jLlr3lxsvV6ou5dCiyZog6Xbt_GojizBt3XQNnNMJrAeVOJSstEigy/pub?gid=0&single=true&output=csv";

const SUCCESS_MESSAGE = "เก็บเป็นความลับนะ! 🤫 ห้ามบอกใคร";

let pairingData = null;

// ============================================================
// FETCH DATA
// ============================================================

async function fetchPairingData() {
  // ใช้ cache ถ้าโหลดแล้ว
  if (pairingData) return pairingData;

  console.log("🔄 Loading CSV...");

  // กันโหลดค้าง
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  let res;

  try {
    res = await fetch(SHEET_CSV_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }

  console.log("📡 Status:", res.status);

  if (!res.ok) {
    throw new Error(`โหลดข้อมูลไม่ได้ (HTTP ${res.status})`);
  }

  const text = await res.text();

  if (!text.trim()) {
    throw new Error("Google Sheet ว่าง");
  }

  console.log("📄 CSV Preview:", text.substring(0, 100));

  const rows = parseCSV(text);

  if (rows.length === 0) {
    throw new Error("อ่าน CSV ไม่สำเร็จ");
  }

  // header
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

    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // escaped quote
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cols.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    cols.push(current);

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

    // ไม่เจอชื่อ
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

    // ยังไม่มีคู่
    if (!entry.partner) {
      showError(`"${entry.name}" ยังไม่มีคู่`);
      setLoading(false);
      return;
    }

    // สำเร็จ
    showResult(entry.name, entry.partner);

  } catch (err) {
    console.error(err);

    if (err.name === "AbortError") {
      showError("โหลดข้อมูลช้าเกินไป ลองใหม่อีกครั้ง 😭");
    } else {
      showError(`❌ ${err.message}`);
    }
  }

  setLoading(false);
}

// ============================================================
// UI
// ============================================================

function showResult(you, partner) {
  document.getElementById("searchForm").style.display =
    "none";

  document.getElementById("resultYou").textContent = you;

  document.getElementById("resultPartner").textContent =
    partner;

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
// ENTER KEY SUPPORT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("nameInput");

  if (!input) {
    console.error("❌ ไม่เจอ #nameInput");
    return;
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      lookupName();
    }
  });

  console.log("✅ Ready");
});
