/**
 * ═══════════════════════════════════════════════════════════════════
 * CardioTrack — Patient Health Tracking Dashboard
 * Application Logic
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Model weights (loaded from JSON) ──
let MODEL_WEIGHTS = null;

// ── App State ──
const STATE = {
  patients: [],
  selectedPatientId: null,
  charts: {},
  formCollapsed: false,
};

// ── Constants ──
const STORAGE_KEY = "cardiotrack_patients";
const AVATAR_COLORS = [
  "linear-gradient(135deg, #38bdf8, #2dd4bf)",
  "linear-gradient(135deg, #a78bfa, #f472b6)",
  "linear-gradient(135deg, #fb923c, #f87171)",
  "linear-gradient(135deg, #4ade80, #2dd4bf)",
  "linear-gradient(135deg, #fbbf24, #fb923c)",
  "linear-gradient(135deg, #f472b6, #a78bfa)",
  "linear-gradient(135deg, #38bdf8, #a78bfa)",
  "linear-gradient(135deg, #2dd4bf, #4ade80)",
];

const CP_LABELS = ["Typical Angina", "Atypical Angina", "Non-Anginal", "Asymptomatic"];
const SLOPE_LABELS = ["Upsloping", "Flat", "Downsloping"];
const THAL_LABELS = ["Normal", "Fixed Defect", "Reversible", "Unknown"];

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  await loadModelWeights();
  loadPatients();
  renderPatientList();
  setDefaultDate();

  // If patients exist but none selected, show welcome
  if (STATE.patients.length === 0) {
    showWelcome();
  }
});

async function loadModelWeights() {
  try {
    const resp = await fetch("model_weights.json");
    MODEL_WEIGHTS = await resp.json();
    console.log("Model weights loaded:", MODEL_WEIGHTS.model_name);
  } catch (e) {
    console.warn("Could not load model weights, using fallback:", e);
    // Fallback hardcoded weights (from the exported JSON)
    MODEL_WEIGHTS = {
      model: {
        type: "logistic",
        coefficients: [0.004, -0.772, 1.572, -0.227, -0.499, 0.073, 0.214, 0.693, -1.109, -1.157, 0.570, -1.005, -0.779],
        intercept: 0.373,
      },
      scaler: {
        mean: [54.42, 0.682, 0.964, 131.6, 246.5, 0.149, 0.526, 149.57, 0.328, 1.043, 1.397, 0.719, 2.315],
        scale: [9.033, 0.466, 1.030, 17.534, 51.668, 0.356, 0.525, 22.866, 0.469, 1.160, 0.615, 1.005, 0.612],
      },
      features: ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"],
    };
  }
}

function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("recordDate").value = today;
}

// ═══════════════════════════════════════════════════════════════
// ML PREDICTION (Client-side)
// ═══════════════════════════════════════════════════════════════
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function predictRisk(features) {
  /**
   * features: object with keys: age, sex, cp, trestbps, chol, fbs, restecg,
   *           thalach, exang, oldpeak, slope, ca, thal
   * Returns: { probability: 0-100, label: 0|1, prediction: string }
   */
  if (!MODEL_WEIGHTS) return { probability: 50, label: 0, prediction: "Unknown" };

  const { coefficients, intercept } = MODEL_WEIGHTS.model;
  const { mean, scale } = MODEL_WEIGHTS.scaler;
  const featureNames = MODEL_WEIGHTS.features;

  // Scale features
  const scaled = featureNames.map((name, i) => {
    return (features[name] - mean[i]) / scale[i];
  });

  // Logistic regression: z = w·x + b
  let z = intercept;
  for (let i = 0; i < scaled.length; i++) {
    z += coefficients[i] * scaled[i];
  }

  const prob = sigmoid(z);
  const label = prob >= 0.5 ? 1 : 0;

  return {
    probability: Math.round(prob * 1000) / 10, // 1 decimal
    probabilityRaw: prob,
    label,
    prediction: label === 1 ? "Heart Disease Risk" : "Low Risk",
    probHealthy: Math.round((1 - prob) * 1000) / 10,
    probDisease: Math.round(prob * 1000) / 10,
  };
}

// ═══════════════════════════════════════════════════════════════
// DATA PERSISTENCE (localStorage)
// ═══════════════════════════════════════════════════════════════
function loadPatients() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    STATE.patients = data ? JSON.parse(data) : [];
  } catch (e) {
    STATE.patients = [];
  }
}

function savePatients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.patients));
}

function getSelectedPatient() {
  return STATE.patients.find((p) => p.id === STATE.selectedPatientId);
}

// ═══════════════════════════════════════════════════════════════
// PATIENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function saveNewPatient() {
  const name = document.getElementById("patientNameInput").value.trim();
  const pid = document.getElementById("patientIdInput").value.trim();
  const dob = document.getElementById("patientDobInput").value;
  const gender = document.querySelector('input[name="patientGender"]:checked').value;

  if (!name) {
    showToast("Please enter a patient name", "error");
    return;
  }

  const patient = {
    id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name,
    patientId: pid || `PAT-${String(STATE.patients.length + 1).padStart(3, "0")}`,
    dob: dob || null,
    gender: parseInt(gender),
    records: [],
    createdAt: new Date().toISOString(),
    colorIndex: STATE.patients.length % AVATAR_COLORS.length,
  };

  STATE.patients.push(patient);
  savePatients();
  renderPatientList();
  closeModal("addPatientModal");
  selectPatient(patient.id);

  // Clear form
  document.getElementById("patientNameInput").value = "";
  document.getElementById("patientIdInput").value = "";
  document.getElementById("patientDobInput").value = "";

  showToast(`Patient "${name}" added successfully`, "success");
}

function deletePatient(patientId) {
  STATE.patients = STATE.patients.filter((p) => p.id !== patientId);
  savePatients();
  STATE.selectedPatientId = null;
  renderPatientList();
  showWelcome();
  closeModal("confirmModal");
  showToast("Patient deleted", "info");
}

function confirmDeletePatient() {
  const patient = getSelectedPatient();
  if (!patient) return;

  document.getElementById("confirmMessage").textContent =
    `Delete patient "${patient.name}" and all ${patient.records.length} record(s)? This cannot be undone.`;

  document.getElementById("confirmDeleteBtn").onclick = () => deletePatient(patient.id);
  openModal("confirmModal");
}

function selectPatient(patientId) {
  STATE.selectedPatientId = patientId;

  // Update UI
  document.querySelectorAll(".patient-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.patientId === patientId);
  });

  const patient = getSelectedPatient();
  if (!patient) return;

  // Set gender default on form
  const genderRadio = document.getElementById(patient.gender === 0 ? "genderFemale" : "genderMale");
  if (genderRadio) genderRadio.checked = true;

  // Update age based on DOB if available
  if (patient.dob) {
    const age = calculateAge(patient.dob);
    const ageSlider = document.getElementById("inputAge");
    ageSlider.value = age;
    updateRangeDisplay(ageSlider);
  }

  showDashboard();
  renderDashboard();
}

function filterPatients() {
  const query = document.getElementById("patientSearch").value.toLowerCase();
  document.querySelectorAll(".patient-item").forEach((el) => {
    const name = el.dataset.patientName?.toLowerCase() || "";
    el.style.display = name.includes(query) ? "" : "none";
  });
}

function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(20, Math.min(100, age));
}

// ═══════════════════════════════════════════════════════════════
// RECORD MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function getFormValues() {
  const gender = getSelectedPatient()?.gender ?? 1;
  return {
    age: parseInt(document.getElementById("inputAge").value),
    sex: gender,
    cp: parseInt(document.getElementById("inputCp").value),
    trestbps: parseInt(document.getElementById("inputTrestbps").value),
    chol: parseInt(document.getElementById("inputChol").value),
    fbs: parseInt(document.querySelector('input[name="inputFbs"]:checked').value),
    restecg: parseInt(document.getElementById("inputRestecg").value),
    thalach: parseInt(document.getElementById("inputThalach").value),
    exang: parseInt(document.querySelector('input[name="inputExang"]:checked').value),
    oldpeak: parseFloat(document.getElementById("inputOldpeak").value),
    slope: parseInt(document.getElementById("inputSlope").value),
    ca: parseInt(document.getElementById("inputCa").value),
    thal: parseInt(document.getElementById("inputThal").value),
  };
}

function previewPrediction() {
  const features = getFormValues();
  const result = predictRisk(features);
  showPredictionPreview(result);
}

function showPredictionPreview(result) {
  const preview = document.getElementById("predictionPreview");
  preview.classList.remove("hidden");

  const statusEl = document.getElementById("predictionStatus");
  if (result.label === 1) {
    statusEl.textContent = `Heart Disease Risk (${result.probDisease}%)`;
    statusEl.style.color = "#f87171";
  } else {
    statusEl.textContent = `Low Risk (${result.probHealthy}%)`;
    statusEl.style.color = "#4ade80";
  }

  document.getElementById("predBarHealthy").style.width = result.probHealthy + "%";
  document.getElementById("predValHealthy").textContent = result.probHealthy + "%";
  document.getElementById("predBarDisease").style.width = result.probDisease + "%";
  document.getElementById("predValDisease").textContent = result.probDisease + "%";
}

function saveRecord() {
  const patient = getSelectedPatient();
  if (!patient) {
    showToast("Please select a patient first", "error");
    return;
  }

  const date = document.getElementById("recordDate").value;
  if (!date) {
    showToast("Please select a record date", "error");
    return;
  }

  const features = getFormValues();
  const prediction = predictRisk(features);

  const record = {
    id: "r_" + Date.now(),
    date,
    timestamp: new Date().toISOString(),
    features,
    prediction,
  };

  patient.records.push(record);
  // Sort records by date
  patient.records.sort((a, b) => new Date(a.date) - new Date(b.date));
  savePatients();

  renderDashboard();
  renderPatientList(); // Update record count
  showPredictionPreview(prediction);

  showToast(
    `Record saved — Risk: ${prediction.probDisease}% (${prediction.prediction})`,
    prediction.label === 1 ? "error" : "success"
  );
}

function deleteRecord(recordId) {
  const patient = getSelectedPatient();
  if (!patient) return;

  patient.records = patient.records.filter((r) => r.id !== recordId);
  savePatients();
  renderDashboard();
  renderPatientList();
  showToast("Record deleted", "info");
}

// ═══════════════════════════════════════════════════════════════
// UI RENDERING
// ═══════════════════════════════════════════════════════════════

// ── Patient List ──
function renderPatientList() {
  const list = document.getElementById("patientList");

  if (STATE.patients.length === 0) {
    list.innerHTML = `
      <div class="patient-list-empty">
        <div class="empty-icon">👥</div>
        <p>No patients yet.<br/>Click "Add New" to get started.</p>
      </div>`;
    return;
  }

  list.innerHTML = STATE.patients
    .map((p) => {
      const initials = p.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const isActive = p.id === STATE.selectedPatientId;
      const lastRecord = p.records.length > 0 ? p.records[p.records.length - 1] : null;
      const lastDate = lastRecord ? formatDate(lastRecord.date) : "No records";

      return `
        <div class="patient-item ${isActive ? "active" : ""}"
             data-patient-id="${p.id}"
             data-patient-name="${p.name}"
             onclick="selectPatient('${p.id}')">
          <div class="patient-avatar" style="background: ${AVATAR_COLORS[p.colorIndex]}">${initials}</div>
          <div class="patient-info">
            <div class="patient-name">${escapeHtml(p.name)}</div>
            <div class="patient-meta">
              <span>${p.patientId}</span>
              <span>${lastDate}</span>
            </div>
          </div>
          <span class="patient-records-count">${p.records.length}</span>
        </div>`;
    })
    .join("");
}

// ── Show / Hide States ──
function showWelcome() {
  document.getElementById("welcomeState").classList.remove("hidden");
  document.getElementById("patientDashboard").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("welcomeState").classList.add("hidden");
  document.getElementById("patientDashboard").classList.remove("hidden");
}

// ── Dashboard Rendering ──
function renderDashboard() {
  const patient = getSelectedPatient();
  if (!patient) return;

  // Header
  document.getElementById("dashboardTitle").textContent = patient.name;
  document.getElementById("dashboardBreadcrumb").textContent =
    `${patient.patientId} · ${patient.gender === 0 ? "Female" : "Male"}${patient.dob ? " · DOB: " + formatDate(patient.dob) : ""}`;

  // Summary cards
  renderSummaryCards(patient);

  // Charts
  renderCharts(patient);

  // Records table
  renderRecordsTable(patient);
}

function renderSummaryCards(patient) {
  const records = patient.records;
  const n = records.length;

  if (n === 0) {
    document.getElementById("summaryRisk").textContent = "—";
    document.getElementById("summaryRiskChange").textContent = "";
    document.getElementById("summaryBP").textContent = "—";
    document.getElementById("summaryBPChange").textContent = "";
    document.getElementById("summaryChol").textContent = "—";
    document.getElementById("summaryCholChange").textContent = "";
    document.getElementById("summaryHR").textContent = "—";
    document.getElementById("summaryHRChange").textContent = "";
    document.getElementById("summaryRecords").textContent = "0";
    return;
  }

  const latest = records[n - 1];
  const prev = n >= 2 ? records[n - 2] : null;

  // Risk
  const riskEl = document.getElementById("summaryRisk");
  riskEl.textContent = latest.prediction.probDisease + "%";
  riskEl.style.color = getRiskColor(latest.prediction.probDisease);

  if (prev) {
    const riskDiff = latest.prediction.probDisease - prev.prediction.probDisease;
    renderChange("summaryRiskChange", riskDiff, "%", true); // higher = bad
  } else {
    document.getElementById("summaryRiskChange").innerHTML =
      `<span class="text-muted">First record</span>`;
  }

  // BP
  document.getElementById("summaryBP").textContent = latest.features.trestbps;
  if (prev) {
    renderChange("summaryBPChange", latest.features.trestbps - prev.features.trestbps, " mmHg", true);
  } else {
    document.getElementById("summaryBPChange").innerHTML = `<span class="text-muted">mmHg</span>`;
  }

  // Cholesterol
  document.getElementById("summaryChol").textContent = latest.features.chol;
  if (prev) {
    renderChange("summaryCholChange", latest.features.chol - prev.features.chol, " mg/dL", true);
  } else {
    document.getElementById("summaryCholChange").innerHTML = `<span class="text-muted">mg/dL</span>`;
  }

  // Heart Rate
  document.getElementById("summaryHR").textContent = latest.features.thalach;
  if (prev) {
    renderChange("summaryHRChange", latest.features.thalach - prev.features.thalach, " bpm", false); // higher = good
  } else {
    document.getElementById("summaryHRChange").innerHTML = `<span class="text-muted">bpm</span>`;
  }

  // Records count
  document.getElementById("summaryRecords").textContent = n;
}

function renderChange(elementId, diff, unit, higherIsBad) {
  const el = document.getElementById(elementId);
  if (Math.abs(diff) < 0.01) {
    el.innerHTML = `<span class="change-stable">— No change</span>`;
    return;
  }

  const isUp = diff > 0;
  const arrow = isUp ? "↑" : "↓";
  const absVal = Math.abs(Math.round(diff * 10) / 10);

  let className;
  if (higherIsBad) {
    className = isUp ? "change-up" : "change-down"; // up = red, down = green
  } else {
    className = isUp ? "change-good-up" : "change-bad-down"; // up = green, down = red
  }

  el.innerHTML = `<span class="${className}">${arrow} ${absVal}${unit} from last visit</span>`;
}

// ── Records Table ──
function renderRecordsTable(patient) {
  const tbody = document.getElementById("recordsTableBody");
  const noRecords = document.getElementById("noRecordsState");
  const countEl = document.getElementById("recordsCount");

  if (patient.records.length === 0) {
    tbody.innerHTML = "";
    noRecords.classList.remove("hidden");
    countEl.textContent = "";
    return;
  }

  noRecords.classList.add("hidden");
  countEl.textContent = `${patient.records.length} record(s)`;

  // Show most recent first in table
  const sorted = [...patient.records].reverse();
  tbody.innerHTML = sorted
    .map((r) => {
      const f = r.features;
      const p = r.prediction;
      const riskClass = p.probDisease >= 60 ? "high" : p.probDisease >= 35 ? "medium" : "low";
      const riskIcon = p.label === 1 ? "⚠️" : "✅";

      return `
        <tr>
          <td style="font-weight:600;">${formatDate(r.date)}</td>
          <td>${f.age}</td>
          <td>${f.trestbps}</td>
          <td>${f.chol}</td>
          <td>${f.thalach}</td>
          <td>${f.oldpeak}</td>
          <td style="font-size:0.72rem;">${CP_LABELS[f.cp] || f.cp}</td>
          <td><span class="risk-badge ${riskClass}">${p.probDisease}%</span></td>
          <td>${riskIcon} ${p.prediction}</td>
          <td>
            <button class="btn-delete-record" onclick="deleteRecord('${r.id}')" title="Delete record">✕</button>
          </td>
        </tr>`;
    })
    .join("");
}

// ═══════════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════════
function renderCharts(patient) {
  renderRiskChart(patient);
  renderVitalsChart(patient);
  renderHeartChart(patient);
}

function destroyChart(name) {
  if (STATE.charts[name]) {
    STATE.charts[name].destroy();
    STATE.charts[name] = null;
  }
}

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: {
      labels: {
        color: "#94a3b8",
        font: { family: "'Inter', sans-serif", size: 11 },
        usePointStyle: true,
        pointStyle: "circle",
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: "rgba(17, 24, 39, 0.95)",
      titleColor: "#f1f5f9",
      bodyColor: "#94a3b8",
      borderColor: "rgba(56, 189, 248, 0.2)",
      borderWidth: 1,
      cornerRadius: 8,
      titleFont: { family: "'Inter', sans-serif", weight: "600" },
      bodyFont: { family: "'Inter', sans-serif" },
      padding: 12,
      displayColors: true,
    },
  },
  scales: {
    x: {
      type: "time",
      time: { unit: "day", tooltipFormat: "MMM dd, yyyy" },
      grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
      ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0 },
    },
    y: {
      grid: { color: "rgba(255,255,255,0.04)", drawBorder: false },
      ticks: { color: "#64748b", font: { size: 10 } },
    },
  },
};

function getChartData(patient) {
  return patient.records.map((r) => ({
    x: new Date(r.date),
    risk: r.prediction.probDisease,
    bp: r.features.trestbps,
    chol: r.features.chol,
    hr: r.features.thalach,
    oldpeak: r.features.oldpeak,
  }));
}

function renderRiskChart(patient) {
  destroyChart("risk");
  const ctx = document.getElementById("riskChart").getContext("2d");
  const data = getChartData(patient);

  if (data.length === 0) {
    STATE.charts.risk = new Chart(ctx, {
      type: "line",
      data: { datasets: [] },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          legend: { display: false },
        },
      },
    });
    return;
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "rgba(248, 113, 113, 0.3)");
  gradient.addColorStop(0.5, "rgba(251, 191, 36, 0.1)");
  gradient.addColorStop(1, "rgba(74, 222, 128, 0.05)");

  STATE.charts.risk = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Heart Disease Risk %",
          data: data.map((d) => ({ x: d.x, y: d.risk })),
          borderColor: (ctx) => {
            const value = ctx.raw?.y ?? 50;
            if (value >= 60) return "#f87171";
            if (value >= 35) return "#fbbf24";
            return "#4ade80";
          },
          segment: {
            borderColor: (ctx) => {
              const v = ctx.p1.parsed.y;
              if (v >= 60) return "#f87171";
              if (v >= 35) return "#fbbf24";
              return "#4ade80";
            },
          },
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: 6,
          pointHoverRadius: 9,
          pointBackgroundColor: data.map((d) => getRiskColor(d.risk)),
          pointBorderColor: "#111827",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
        {
          label: "Warning Threshold (50%)",
          data: data.map((d) => ({ x: d.x, y: 50 })),
          borderColor: "rgba(248, 113, 113, 0.3)",
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          min: 0,
          max: 100,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: (v) => v + "%",
          },
        },
      },
    },
  });
}

function renderVitalsChart(patient) {
  destroyChart("vitals");
  const ctx = document.getElementById("vitalsChart").getContext("2d");
  const data = getChartData(patient);

  STATE.charts.vitals = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Blood Pressure (mmHg)",
          data: data.map((d) => ({ x: d.x, y: d.bp })),
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.1)",
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#38bdf8",
          pointBorderColor: "#111827",
          pointBorderWidth: 2,
          borderWidth: 2.5,
          yAxisID: "y",
        },
        {
          label: "Cholesterol (mg/dL)",
          data: data.map((d) => ({ x: d.x, y: d.chol })),
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.1)",
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#a78bfa",
          pointBorderColor: "#111827",
          pointBorderWidth: 2,
          borderWidth: 2.5,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          position: "left",
          title: { display: true, text: "BP (mmHg)", color: "#38bdf8", font: { size: 10 } },
        },
        y1: {
          ...CHART_DEFAULTS.scales.y,
          position: "right",
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Chol (mg/dL)", color: "#a78bfa", font: { size: 10 } },
        },
      },
    },
  });
}

function renderHeartChart(patient) {
  destroyChart("heart");
  const ctx = document.getElementById("heartChart").getContext("2d");
  const data = getChartData(patient);

  STATE.charts.heart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Max Heart Rate (bpm)",
          data: data.map((d) => ({ x: d.x, y: d.hr })),
          borderColor: "#4ade80",
          backgroundColor: "rgba(74, 222, 128, 0.1)",
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#4ade80",
          pointBorderColor: "#111827",
          pointBorderWidth: 2,
          borderWidth: 2.5,
          yAxisID: "y",
        },
        {
          label: "ST Depression (mm)",
          data: data.map((d) => ({ x: d.x, y: d.oldpeak })),
          borderColor: "#fb923c",
          backgroundColor: "rgba(251, 146, 60, 0.1)",
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#fb923c",
          pointBorderColor: "#111827",
          pointBorderWidth: 2,
          borderWidth: 2.5,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          position: "left",
          title: { display: true, text: "HR (bpm)", color: "#4ade80", font: { size: 10 } },
        },
        y1: {
          ...CHART_DEFAULTS.scales.y,
          position: "right",
          grid: { drawOnChartArea: false },
          title: { display: true, text: "ST Dep. (mm)", color: "#fb923c", font: { size: 10 } },
        },
      },
    },
  });
}

function setChartRange(range) {
  // Update tab active state
  document.querySelectorAll("#riskChartTabs .tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.range === range);
  });

  // Re-render risk chart with filtered data
  const patient = getSelectedPatient();
  if (!patient) return;

  // This is a simple implementation — for a real app, we'd filter data by date range
  renderRiskChart(patient);
}

// ═══════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════
function exportPatientCSV() {
  const patient = getSelectedPatient();
  if (!patient || patient.records.length === 0) {
    showToast("No records to export", "error");
    return;
  }

  const headers = [
    "Date",
    "Age",
    "Sex",
    "Chest Pain Type",
    "Resting BP",
    "Cholesterol",
    "Fasting BS",
    "ECG",
    "Max Heart Rate",
    "Exercise Angina",
    "ST Depression",
    "ST Slope",
    "Major Vessels",
    "Thalassemia",
    "Risk Score %",
    "Prediction",
  ];

  const rows = patient.records.map((r) => {
    const f = r.features;
    return [
      r.date,
      f.age, f.sex, f.cp, f.trestbps, f.chol, f.fbs, f.restecg,
      f.thalach, f.exang, f.oldpeak, f.slope, f.ca, f.thal,
      r.prediction.probDisease,
      r.prediction.prediction,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${patient.name.replace(/\s+/g, "_")}_health_records.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast("CSV exported successfully", "success");
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════
function updateRangeDisplay(input) {
  const display = document.getElementById(input.id + "_val");
  if (display) {
    display.textContent = input.step && input.step < 1
      ? parseFloat(input.value).toFixed(1)
      : input.value;
  }
}

function toggleRecordForm() {
  STATE.formCollapsed = !STATE.formCollapsed;
  const body = document.getElementById("recordFormBody");
  const btn = document.getElementById("toggleFormBtn");
  if (STATE.formCollapsed) {
    body.style.display = "none";
    btn.textContent = "▶ Expand";
  } else {
    body.style.display = "";
    btn.textContent = "▼ Collapse";
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function getRiskColor(pct) {
  if (pct >= 60) return "#f87171";
  if (pct >= 35) return "#fbbf24";
  return "#4ade80";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ── Toast Notifications ──
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ""}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Keyboard shortcut ──
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.active").forEach((m) => {
      m.classList.remove("active");
    });
  }
});
