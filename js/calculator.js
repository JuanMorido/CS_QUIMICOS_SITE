/**
 * CS Químicos — Calculadora de Piscina
 * =====================================
 * Drop-in: <div id="pool-calculator"></div>
 * Requires: styles/10-calculator.css
 *
 * FÓRMULAS VALIDADAS:
 *   Rectangular: V = Largo × Ancho × ((Pmax + Pmin) / 2)   [m³]
 *   Circular:    V = π × (D/2)² × Prof                     [m³]
 *   Cloro (g)  = (ΔCl_ppm × V_L) / (Conc × 1,000)
 *   Cloro (mL) = g / densidad_kg_L
 *   pH↑ NaOH 99%: Henderson-Hasselbalch, pKa1 = 6.35
 *   Floculante: factor[g/m³] × V_m³
 */

(function () {
  const root = document.getElementById("pool-calculator");
  if (!root) return;

  // ── PRODUCTOS ─────────────────────────────────────────────
  const CLORO_PRODS = [
    {
      id: "cl91",
      label: "Cloro Granulado 91%",
      conc: 0.91,
      liquid: false,
    },
    {
      id: "cl70",
      label: "Cloro Granulado 70%",
      conc: 0.7,
      liquid: false,
    },

    {
      id: "liq15",
      label: "Cloro líquido 15%",
      conc: 0.15,
      liquid: true,
      density: 1.2,
    },
    {
      id: "liq5",
      label: "Cloro líquido 5%",
      conc: 0.05,
      liquid: true,
      density: 1.05,
    },
  ];
  const FLOC_FACTORS = { leve: 15, turbia: 40, muy: 70, verde: 90 };
  const FLOC_LABELS = {
    leve: "Ligeramente turbia",
    turbia: "Turbia",
    muy: "Muy turbia",
    verde: "Verde con algas",
  };

  // ── RESUMEN ───────────────────────────────────────────────
  const summary = {}; // { cloro: {param,rango,producto,cantidad}, ph: {...}, floc: {...} }

  // ── HELPERS ───────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  function fmtG(v) {
    if (v >= 1000) return (v / 1000).toFixed(2) + " kg";
    if (v >= 100) return Math.round(v) + " g";
    return v.toFixed(1) + " g";
  }
  function fmtL(v) {
    if (v >= 1) return v.toFixed(2) + " L";
    return (v * 1000).toFixed(0) + " mL";
  }
  function fmtML(ml) {
    if (ml >= 1000) return (ml / 1000).toFixed(2) + " L";
    return Math.round(ml) + " mL";
  }

  // ── VOLUMEN ───────────────────────────────────────────────
  function calcVol() {
    const tipo = $("vol-tipo").value;
    if (tipo === "rect") {
      const l = +$("vol-largo").value || 0;
      const a = +$("vol-ancho").value || 0;
      const pmax = +$("vol-pmax").value || 0;
      const pmin = +$("vol-pmin").value || pmax;
      return l * a * ((pmax + pmin) / 2);
    } else if (tipo === "circ") {
      const d = +$("vol-diam").value || 0;
      const p = +$("vol-pcirc").value || 0;
      return Math.PI * Math.pow(d / 2, 2) * p;
    } else {
      return +$("vol-manual").value || 0;
    }
  }

  function updateVolBanner() {
    const v = calcVol();
    $("vol-display").textContent = v > 0 ? v.toFixed(1) + " m³" : "—";
  }

  // ── α1 (Henderson-Hasselbalch, pKa1 = 6.35) ──────────────
  function alpha1(pH) {
    const ratio = Math.pow(10, pH - 6.35);
    return ratio / (1 + ratio);
  }

  // ── HTML TEMPLATE ─────────────────────────────────────────
  root.innerHTML = `

<!-- VOLUMEN -->
<div class="cq-vol">
  <div class="cq-vol-top">
    <div class="cq-vol-inputs">
      <span class="cq-vol-label">Volumen de la piscina</span>
      <div class="cq-vol-fields">
    <div class="cq-f">
      <label>Tipo</label>
      <select id="vol-tipo" onchange="pqVolToggle()">
        <option value="rect">Rectangular</option>
        <option value="circ">Circular</option>
        <option value="manual">Sin medidas</option>
      </select>
    </div>
    <div id="vf-rect" style="display:contents">
      <div class="cq-f"><label>Largo (m)</label><input type="number" id="vol-largo" min="0" step="0.1" oninput="pqVolUpdate()"></div>
      <div class="cq-f"><label>Ancho (m)</label><input type="number" id="vol-ancho" min="0" step="0.1" oninput="pqVolUpdate()"></div>
      <div class="cq-f"><label>Prof. máxima (m)</label><input type="number" id="vol-pmax" min="0" step="0.1" oninput="pqVolUpdate()"></div>
      <div class="cq-f"><label>Prof. mínima (m)</label><input type="number" id="vol-pmin" min="0" step="0.1" oninput="pqVolUpdate()"></div>
    </div>
    <div class="cq-f" id="vf-circ-diam" style="display:none"><label>Diámetro (m)</label><input type="number" id="vol-diam" min="0" step="0.1" oninput="pqVolUpdate()"></div>
    <div class="cq-f" id="vf-circ-prof" style="display:none"><label>Profundidad (m)</label><input type="number" id="vol-pcirc" min="0" step="0.1" oninput="pqVolUpdate()"></div>
    <div class="cq-f" id="vf-manual" style="display:none"><label>Volumen (m³)</label><input type="number" id="vol-manual" min="0" step="0.1" oninput="pqVolUpdate()"></div>
      </div>
    </div>
    <div class="cq-vol-display">
      <span class="cq-vol-m3" id="vol-display">75.0 m³</span>
    </div>
  </div>
</div>

<!-- TABS -->
<div class="cq-tabs">
  <button class="cq-tab" onclick="pqTab(0)">Cloro</button>
  <button class="cq-tab" onclick="pqTab(1)">pH</button>
  <button class="cq-tab" onclick="pqTab(2)">Floculante</button>
</div>

<!-- TAB 0: CLORO -->
<div class="cq-panel" id="tab0">
  <div class="cq-form">
    <p style="font-size:1.05rem;font-weight:700;margin-bottom:0.25rem;color:#222;">Dosificación de Cloro</p>
    <p style="font-size:0.78rem;color:#888;margin-bottom:1rem;line-height:1.55;">Calcula la cantidad de cloro a añadir para alcanzar la concentración deseada.</p>

    <div class="cq-fg">
      <div class="cq-f"><label>Concentración actual (ppm)</label><input type="number" id="cl-ini" min="0" max="30" step="0.1" oninput="pqClRestrict()"></div>
      <div class="cq-f"><label>Concentración deseada (ppm)</label><input type="number" id="cl-des" min="0" max="30" step="0.1" oninput="pqClRestrict()"></div>
    </div>
    <div class="cq-fg col1">
      <div class="cq-f">
        <label>Producto</label>
        <select id="cl-prod" onchange="pqClProdChange()">
          ${CLORO_PRODS.map((p) => `<option value="${p.id}">${p.label}</option>`).join("\n          ")}
        </select>
      </div>
    </div>
    <div id="cl-liq-wrap" style="display:none">
      <div class="cq-fg">
        <div class="cq-f"><label>Concentración (%)</label><input type="number" id="cl-liq-conc" value="10" min="1" max="20" step="0.1"></div>
        <div class="cq-f"><label>Densidad (kg/L)</label><input type="number" id="cl-liq-dens" value="1.10" min="0.9" max="1.4" step="0.01"></div>
      </div>
    </div>

    <button class="cq-btn" onclick="pqCalcCloro()">Calcular</button>
    <div class="cq-result" id="cl-res">
      <div class="cq-result-head">Resumen de dosificación</div>
      <div id="cl-res-body"></div>
    </div>
  </div>

</div>

<!-- TAB 1: pH -->
<div class="cq-panel" id="tab1">
  <div class="cq-form">
    <p style="font-size:1.05rem;font-weight:700;margin-bottom:0.25rem;color:#222;">Ajuste de pH</p>
    <p style="font-size:0.78rem;color:#888;margin-bottom:1rem;line-height:1.55;">Rango ideal 7,2–7,6. pH alto reduce la eficacia del cloro. pH bajo irrita ojos y piel.</p>

    <div class="cq-fg">
      <div class="cq-f"><label>pH actual</label><input type="number" id="ph-ini" min="6" max="9" step="0.1"></div>
      <div class="cq-f"><label>pH objetivo</label><input type="number" id="ph-obj" min="6.5" max="8.5" step="0.1"></div>
    </div>
    <div class="cq-ph-alk-toggle">
      <label class="cq-radio-label">
        <input type="radio" name="ph-alk-mode" value="std" checked onchange="pqPhAlkToggle()">
        Alcalinidad estándar (80 ppm)
      </label>
      <label class="cq-radio-label">
        <input type="radio" name="ph-alk-mode" value="custom" onchange="pqPhAlkToggle()">
        Especificar alcalinidad (ppm)
      </label>
    </div>
    <div class="cq-fg col1" id="ph-alk-wrap" style="display:none">
      <div class="cq-f"><label>Alcalinidad (ppm)</label><input type="number" id="ph-alk" min="10" max="300" step="5"></div>
    </div>

    <button class="cq-btn" onclick="pqCalcPH()">Calcular</button>
    <div class="cq-result" id="ph-res">
      <div class="cq-result-head">Resumen de dosificación</div>
      <div id="ph-res-body"></div>
    </div>
  </div>

</div>

<!-- TAB 2: FLOCULANTE -->
<div class="cq-panel" id="tab2">
  <div class="cq-form">
    <p style="font-size:1.05rem;font-weight:700;margin-bottom:0.25rem;color:#222;">Floculante / Clarificante</p>
    <p style="font-size:0.78rem;color:#888;margin-bottom:1rem;line-height:1.55;">Aglomera partículas en suspensión para que decanten al fondo y se aspiren fácilmente.</p>

    <div class="cq-fg">
      <div class="cq-f">
        <label>Nivel de turbidez</label>
        <select id="floc-nivel">
          <option value="leve">Ligeramente turbia — fondo visible pero opaco</option>
          <option value="turbia" selected>Turbia — fondo no visible</option>
          <option value="muy">Muy turbia — agua lechosa o verde claro</option>
          <option value="verde">Verde con algas — verde intenso</option>
        </select>
      </div>
      <div class="cq-f">
        <label>Producto</label>
        <select id="floc-prod" onchange="pqFlocProdChange()">
          <option value="sulf">Sulfato de Aluminio Tipo A</option>
          <option value="clarin-csq">Clarín — CSQ</option>
          <option value="clarin-otro">Clarín — Otro</option>
        </select>
      </div>
    </div>

    <button class="cq-btn" onclick="pqCalcFloc()">Calcular</button>
    <div class="cq-result" id="floc-res">
      <div class="cq-result-head">Resumen de dosificación</div>
      <div id="floc-res-body"></div>
    </div>
  </div>

</div>

<!-- RESUMEN -->
<div class="cq-summary">
  <div class="cq-summary-head">
    <span class="cq-summary-label">Resumen de dosificación</span>
    <div class="cq-summary-actions">
      <button class="cq-summary-copy" onclick="pqCopySummary()">Copiar resumen</button>
      <button class="cq-summary-reset" onclick="pqResetAll()">Reiniciar todo</button>
    </div>
  </div>
  <div class="cq-summary-scroll">
    <table class="cq-summary-table">
      <thead>
        <tr><th>Parámetro</th><th>Rango</th><th>Producto</th><th>Cantidad</th></tr>
      </thead>
      <tbody id="summary-body">
        <tr><td colspan="4" class="cq-summary-empty">Ningún cálculo realizado todavía.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="cq-toast" id="cq-toast" aria-live="polite"></div>
`;

  // ── VOLUME TOGGLE ──────────────────────────────────────────
  window.pqVolToggle = function () {
    const tipo = $("vol-tipo").value;
    $("vf-rect").style.display      = tipo === "rect"   ? "contents" : "none";
    $("vf-circ-diam").style.display = tipo === "circ"   ? ""         : "none";
    $("vf-circ-prof").style.display = tipo === "circ"   ? ""         : "none";
    $("vf-manual").style.display    = tipo === "manual" ? ""         : "none";
    updateVolBanner();
  };
  window.pqVolUpdate = updateVolBanner;

  // ── TABS (toggle: click activo lo cierra) ──────────────────
  window.pqTab = function (i) {
    const tabs = document.querySelectorAll("#pool-calculator .cq-tab");
    const panels = document.querySelectorAll("#pool-calculator .cq-panel");
    const isOpen = tabs[i].classList.contains("active");
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    if (!isOpen) {
      tabs[i].classList.add("active");
      panels[i].classList.add("active");
    }
  };

  // ── FLOC UI ────────────────────────────────────────────────
  window.pqFlocProdChange = function () {};

  // ── CLORO UI ───────────────────────────────────────────────
  window.pqClRestrict = function () {
    const ini = +$("cl-ini").value || 0;
    const des = +$("cl-des").value || 0;
    const opt = $("cl-prod").querySelector('option[value="cl91"]');
    if (!opt) return;
    const restrict = ini < 1 || des > 3;
    opt.disabled = restrict;
    if (restrict && $("cl-prod").value === "cl91") {
      $("cl-prod").value = "cl70";
      pqClProdChange();
    }
  };

  window.pqClProdChange = function () {
    const prod = CLORO_PRODS.find((p) => p.id === $("cl-prod").value);
    $("cl-liq-wrap").style.display = prod && prod.id === "liqcus" ? "" : "none";
  };

  // ── CALC: CLORO ────────────────────────────────────────────
  window.pqCalcCloro = function () {
    const vol = calcVol();
    if (!vol) {
      alert("Ingrese dimensiones válidas.");
      return;
    }
    const litros = vol * 1000;

    const ppmIni = +$("cl-ini").value || 0;
    const ppmDes = +$("cl-des").value || 0;
    const prodId = $("cl-prod").value;
    const prod = CLORO_PRODS.find((p) => p.id === prodId);

    let conc, density, isLiquid;
    if (prodId === "liqcus") {
      conc = (+$("cl-liq-conc").value || 10) / 100;
      density = +$("cl-liq-dens").value || 1.1;
      isLiquid = true;
    } else {
      conc = prod.conc;
      density = prod.density || null;
      isLiquid = prod.liquid;
    }

    const delta = ppmDes - ppmIni;

    if (delta <= 0) {
      showResult("cl-res", [
        {
          n: "El cloro ya está en el nivel deseado o superior",
          o: "Actual: " + ppmIni + " ppm — Objetivo: " + ppmDes + " ppm",
          v: "✓",
          c: "g",
        },
      ]);
      updateSummary(
        "cloro",
        "Cloro",
        ppmIni + " → " + ppmDes + " ppm",
        "—",
        "Ya en rango",
      );
      return;
    }

    const gProducto = (delta * litros) / (conc * 1000);
    let doseStr =
      isLiquid && density ? fmtML(gProducto / density) : fmtG(gProducto);

    const rows = [
      {
        n: prod.label,
        o: ppmIni + " ppm → " + ppmDes + " ppm  ·  " + vol.toFixed(1) + " m³",
        v: doseStr,
        c: "g",
      },
    ];
    if (ppmDes >= 10)
      rows.push({
        n: "⚠  Super-cloración activa",
        o: "No bañarse hasta que el nivel de cloro baje de 3 ppm",
        v: "",
        c: "w",
      });
    if (ppmDes >= 20)
      rows.push({
        n: "⚠  Agua verde",
        o: "Combine con floculante. Aspire algas muertas a las 24 h",
        v: "",
        c: "w",
      });

    showResult("cl-res", rows);
    updateSummary(
      "cloro",
      "Cloro",
      ppmIni + " → " + ppmDes + " ppm",
      prod.label,
      doseStr,
    );
  };

  window.pqPhAlkToggle = function () {
    const isCustom =
      document.querySelector('input[name="ph-alk-mode"]:checked').value ===
      "custom";
    $("ph-alk-wrap").style.display = isCustom ? "" : "none";
  };

  // ── CALC: pH ───────────────────────────────────────────────
  window.pqCalcPH = function () {
    const vol = calcVol();
    if (!vol) {
      alert("Ingrese dimensiones válidas.");
      return;
    }

    const phIni = +$("ph-ini").value || 7.0;
    const phObj = +$("ph-obj").value || 7.4;
    const alkMode = document.querySelector(
      'input[name="ph-alk-mode"]:checked',
    ).value;
    const alk = alkMode === "custom" ? +$("ph-alk").value || 80 : 80;
    const delta = phObj - phIni;

    if (Math.abs(delta) < 0.05) {
      showResult("ph-res", [
        {
          n: "El pH ya está en el rango objetivo",
          o: "pH actual: " + phIni.toFixed(1),
          v: "✓",
          c: "g",
        },
      ]);
      updateSummary(
        "ph",
        "pH",
        phIni.toFixed(1) + " → " + phObj.toFixed(1),
        "—",
        "Ya en rango",
      );
      return;
    }

    if (delta > 0) {
      const a1ini = alpha1(phIni);
      const a1fin = alpha1(phObj);
      const CT = alk / 50000 / a1ini;
      const gPerM3 = (CT * (a1fin - a1ini) * 1000 * 40) / 0.99;
      const gTotal = gPerM3 * vol;
      const dose = fmtG(gTotal);
      showResult("ph-res", [
        {
          n: "Soda Cáustica en escamas",
          o:
            "pH " +
            phIni.toFixed(1) +
            " → " +
            phObj.toFixed(1) +
            "  ·  alcalinidad " +
            alk +
            " ppm  ·  " +
            vol.toFixed(1) +
            " m³",
          v: dose,
          c: "g",
        },
      ]);
      updateSummary(
        "ph",
        "pH",
        phIni.toFixed(1) + " → " + phObj.toFixed(1),
        "NaOH 99%",
        dose,
      );
    } else {
      const ml = (Math.abs(delta) / 0.1) * (alk / 80) * vol * 12;
      const dose = fmtL(ml / 1000);
      showResult("ph-res", [
        {
          n: "Ácido muriático / bisulfato de sodio (referencia)",
          o:
            "pH " +
            phIni.toFixed(1) +
            " → " +
            phObj.toFixed(1) +
            "  ·  alcalinidad " +
            alk +
            " ppm",
          v: dose,
          c: "w",
        },
        {
          n: "⚠  Nota",
          o: "Reductor de pH no está en el catálogo CS Químicos actualmente",
          v: "",
          c: "w",
        },
      ]);
      updateSummary(
        "ph",
        "pH",
        phIni.toFixed(1) + " → " + phObj.toFixed(1),
        "Reductor (ref.)",
        dose,
      );
    }
  };

  // ── CALC: FLOCULANTE ───────────────────────────────────────
  const CLARIN_CSQ_CONC = 18;
  const CLARIN_OTRO_CONC = 12;

  window.pqCalcFloc = function () {
    const vol = calcVol();
    if (!vol) {
      alert("Ingrese dimensiones válidas.");
      return;
    }

    const nivel = $("floc-nivel").value;
    const prod = $("floc-prod").value;
    const factor = FLOC_FACTORS[nivel];

    let rows = [];
    let prodLabel, doseStr;

    if (prod === "sulf") {
      const gSulf = factor * vol;
      doseStr = fmtG(gSulf);
      prodLabel = "Sulfato de Aluminio Tipo A";
      rows.push({
        n: "Sulfato de Aluminio Tipo A (99% p/p)",
        o:
          FLOC_LABELS[nivel] +
          "  ·  factor " +
          factor +
          " g/m³  ·  " +
          vol.toFixed(1) +
          " m³",
        v: doseStr,
        c: "g",
      });
    } else {
      const clarinConc =
        prod === "clarin-csq" ? CLARIN_CSQ_CONC : CLARIN_OTRO_CONC;
      const mlClarin = factor * vol * 0.3125 * (18 / clarinConc);
      doseStr = fmtML(mlClarin);
      prodLabel =
        prod === "clarin-csq" ? "Clarín — CSQ" : "Clarín " + clarinConc + "%";
      rows.push({
        n: prodLabel + " (" + clarinConc + "%)",
        o:
          FLOC_LABELS[nivel] +
          "  ·  factor " +
          factor +
          " g/m³  ·  " +
          vol.toFixed(1) +
          " m³",
        v: doseStr,
        c: "g",
      });
    }

    if (nivel === "verde")
      rows.push({
        n: "⚠  Agua verde con algas",
        o: "Aplique choque de cloro a 20–25 ppm ANTES del floculante",
        v: "",
        c: "w",
      });

    showResult("floc-res", rows);
    updateSummary("floc", "Floculante", FLOC_LABELS[nivel], prodLabel, doseStr);
  };

  // ── SHOW RESULT ────────────────────────────────────────────
  function showResult(boxId, rows) {
    const box = $(boxId);
    const body = $(boxId + "-body");
    body.innerHTML = rows
      .map(
        (r) => `
      <div class="cq-rrow">
        <div>
          <div class="cq-rn">${r.n}</div>
          ${r.o ? `<div class="cq-ro">${r.o}</div>` : ""}
        </div>
        ${r.v ? `<span class="cq-rv ${r.c || ""}">${r.v}</span>` : ""}
      </div>`,
      )
      .join("");
    box.classList.add("show");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── SUMMARY ────────────────────────────────────────────────
  function updateSummary(key, param, rango, producto, cantidad) {
    summary[key] = { param, rango, producto, cantidad };
    renderSummary();
  }

  function renderSummary() {
    const tbody = $("summary-body");
    const keys = Object.keys(summary);
    if (!keys.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="cq-summary-empty">Ningún cálculo realizado todavía.</td></tr>';
      return;
    }
    tbody.innerHTML = keys
      .map((k) => {
        const r = summary[k];
        return `<tr>
        <td>${r.param}</td>
        <td>${r.rango}</td>
        <td>${r.producto}</td>
        <td><strong>${r.cantidad}</strong></td>
      </tr>`;
      })
      .join("");
  }

  function showToast(message, isError = false) {
    const toast = $("cq-toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.remove("error");
    }, 2200);
  }

  window.pqCopySummary = function () {
    const keys = Object.keys(summary);
    if (!keys.length) {
      showToast("No hay calculos para copiar.", true);
      return;
    }
    const vol = calcVol();
    const lines = [
      "Resumen de dosificación para la piscina:",
      "Volumen de agua: " + (vol > 0 ? vol.toFixed(1) + " m³" : "—"),
    ];
    keys.forEach((k) => {
      const r = summary[k];
      lines.push(
        r.param + ": " + r.cantidad + " (" + r.producto + " | " + r.rango + ")",
      );
    });
    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => showToast("Resumen copiado al portapapeles."))
      .catch(() =>
        showToast("No se pudo copiar. Copie manualmente desde la tabla.", true),
      );
  };

  window.pqResetAll = function () {
    Object.keys(summary).forEach((k) => delete summary[k]);
    renderSummary();
    ["cl-res", "ph-res", "floc-res"].forEach((id) => {
      const el = $(id);
      if (el) el.classList.remove("show");
    });
  };

  // Init
  updateVolBanner();
})();
