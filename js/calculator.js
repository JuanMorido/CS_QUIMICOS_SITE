/**
 * CS Químicos — Calculadora de Piscina v3
 *
 * Mount point: <div id="pool-calculator"></div>
 *
 * FORMULAS (all quantities in SI-compatible units):
 *
 * VOLUME
 *   Rectangular : L × A × ((Pmax + Pmin) / 2)
 *   Ovalada     : L × A × 0.89 × ((Pmax + Pmin) / 2)
 *   Circular    : π × (D/2)² × ((Pmax + Pmin) / 2)
 *   Irregular   : L × A × coef × ((Pmax + Pmin) / 2)
 *
 * CLORO
 *   g   = (Δppm × vol_L) / (conc_decimal × 1000)
 *   mL  = (Δppm × vol_L) / (conc_decimal × 1000)   [same formula, liquid unit]
 *
 * pH BAJAR (ácido muriático 33%)
 *   mL  = (Δpph × vol_m3 × 1000) / 330
 *
 * pH SUBIR (carbonato de sodio)
 *   g   = Δpph × vol_m3 × 180
 *
 * ALCALINIDAD SUBIR (bicarbonato de sodio)
 *   g   = (Δppm × vol_L × 1.4) / 1000
 *
 * ALCALINIDAD BAJAR (ácido muriático)
 *   mL  = (Δppm × vol_L × 1.2) / 1000
 *
 * FLOCULANTE (sulfato de aluminio)
 *   g   = dosis_g_m3 × vol_m3
 *   where dosis: ligera=30, turbia=60, muy_turbia=100, verde=150
 *
 * CLORAMINAS shock (super-cloración 10×)
 *   ppm_shock = cloraminas × 10
 *   g = ((ppm_shock - cloro_libre) × vol_L) / (conc_decimal × 1000)
 *
 * REDUCIR CLORO (tiosulfato de sodio)
 *   g   = (Δppm × vol_L × 0.7) / 1000
 */

(function () {
  'use strict';

  const root = document.getElementById('pool-calculator');
  if (!root) return;

  // ── CHEMICAL CONSTANTS ───────────────────────────────────────────────────

  const CLORO_PRODUCTOS = [
    { id: 'tri91',   label: 'Cloro Granulado 91% (tricloro)',  conc: 0.91, unit: 'g'  },
    { id: 'cal65',   label: 'Hipoclorito Cálcico 65%',         conc: 0.65, unit: 'g'  },
    { id: 'past90',  label: 'Pastillas Tricloro 90%',           conc: 0.90, unit: 'g'  },
    { id: 'sodio12', label: 'Hipoclorito Sódico 12%',           conc: 0.12, unit: 'mL' },
  ];

  const SHOCK_PRODUCTOS = [
    { id: 'shock_tri91', label: 'Cloro Granulado Shock (tricloro 91%)', conc: 0.91 },
    { id: 'shock_diclo', label: 'Dicloroisocianurato 56%',              conc: 0.56 },
  ];

  // Flocculant dose by turbidity level
  const FLOC_DOSIS_G   = { ligera: 30,  turbia: 60, muy_turbia: 100, verde: 150 }; // g/m³ sulfato
  const FLOC_DOSIS_ML  = { ligera: 15,  turbia: 30, muy_turbia:  50, verde:  75 }; // mL/m³ líquido

  const TURB_LABELS = {
    ligera:     'Ligeramente turbia',
    turbia:     'Turbia',
    muy_turbia: 'Muy turbia',
    verde:      'Verde (algas)',
  };

  // Pool shape coefficient
  const OVAL_COEF = 0.89;

  // pH formula constants
  const PH_ACID_ML_NUM  = 1000;  // numerator for acid formula: mL = Δph×vol_m3×1000 / 330
  const PH_ACID_ML_DEN  = 330;   // 33% muriatic acid denominator
  const PH_SODA_G_COEF  = 180;   // g = Δph × vol_m3 × 180

  // Alkalinity formula constants
  const ALK_RAISE_COEF  = 1.4;   // g = (Δppm × vol_L × 1.4) / 1000
  const ALK_LOWER_COEF  = 1.2;   // mL = (Δppm × vol_L × 1.2) / 1000

  // Chlorine reducer constant
  const REDCL_COEF      = 0.7;   // g = (Δppm × vol_L × 0.7) / 1000

  // ── STATE ────────────────────────────────────────────────────────────────
  const summary = {}; // keyed by parameter id

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /** Colombian locale number: 1.234,56 */
  function fmtCO(n, dec) {
    if (!isFinite(n)) return '—';
    dec = dec === undefined ? 2 : dec;
    const str  = Math.abs(n).toFixed(dec);
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const result = parts.length > 1 ? parts[0] + ',' + parts[1] : parts[0];
    return n < 0 ? '-' + result : result;
  }

  function fmtDose(g) {
    if (g >= 1000) return fmtCO(g / 1000, 2) + ' kg';
    if (g >= 100)  return fmtCO(Math.round(g), 0) + ' g';
    return fmtCO(g, 1) + ' g';
  }

  function fmtLiq(ml) {
    if (ml >= 1000) return fmtCO(ml / 1000, 2) + ' L';
    return fmtCO(Math.round(ml), 0) + ' mL';
  }

  const $   = id  => document.getElementById(id);
  const num = id  => parseFloat($(id)?.value) || 0;

  // ── INLINE VALIDATION ────────────────────────────────────────────────────

  function setError(inputId, msg) {
    const el = $(inputId);
    if (!el) return;
    const wrap = el.closest('.f');
    if (!wrap) return;
    let err = wrap.querySelector('.f__error');
    if (msg) {
      el.classList.add('f--invalid');
      if (!err) {
        err = document.createElement('span');
        err.className = 'f__error';
        wrap.appendChild(err);
      }
      err.textContent = msg;
    } else {
      el.classList.remove('f--invalid');
      if (err) err.remove();
    }
  }

  function clearErrors() {
    Array.from(arguments).forEach(id => setError(id, ''));
  }

  // ── VOLUME ───────────────────────────────────────────────────────────────

  function calcVol() {
    const tipo     = $('vol-tipo').value;
    const largo    = num('vol-largo');
    const ancho    = num('vol-ancho');
    const pmax     = num('vol-pmax');
    const pmin     = num('vol-pmin');
    const avgDepth = (pmax + pmin) / 2;

    if (tipo === 'rect') return largo * ancho * avgDepth;
    if (tipo === 'oval') return largo * ancho * OVAL_COEF * avgDepth;
    if (tipo === 'circ') return Math.PI * Math.pow(largo / 2, 2) * avgDepth;
    if (tipo === 'irreg') return largo * ancho * num('vol-coef') * avgDepth;
    return 0;
  }

  function updateVolumeDisplay() {
    const v   = calcVol();
    const box = $('vol-display');
    if (!box) return;

    if (v > 0) {
      box.innerHTML =
        '<span class="vol-m3">' + fmtCO(v, 1) + ' m³</span>' +
        '<span class="vol-sep">·</span>' +
        '<span class="vol-l">' + fmtCO(v * 1000, 0) + ' L</span>';
      box.classList.remove('vol-display--empty');
    } else {
      box.innerHTML = '<span class="vol-placeholder">Ingrese las dimensiones</span>';
      box.classList.add('vol-display--empty');
    }

    // Enable/disable all calculate buttons
    document.querySelectorAll('#pool-calculator .calc-btn').forEach(btn => {
      btn.disabled = v <= 0;
    });

    // Keep cloraminas display in sync
    updateCloraminas();
  }

  function togglePoolType() {
    const tipo = $('vol-tipo').value;
    $('vol-ancho-row').style.display = tipo === 'circ' ? 'none' : '';
    $('vol-coef-row').style.display  = tipo === 'irreg' ? '' : 'none';
    $('vol-largo-label').textContent = tipo === 'circ' ? 'Diámetro (m)' : 'Largo (m)';
    updateVolumeDisplay();
  }

  // ── TABS ─────────────────────────────────────────────────────────────────

  function activateTab(i) {
    document.querySelectorAll('#pool-calculator .pq-tab').forEach(
      (t, j) => t.classList.toggle('pq-tab--active', i === j)
    );
    document.querySelectorAll('#pool-calculator .pq-panel').forEach(
      (p, j) => { p.hidden = i !== j; }
    );
  }

  // ── CLORAMINAS LIVE DISPLAY ──────────────────────────────────────────────

  function updateCloraminas() {
    const disp = $('clam-display');
    if (!disp) return;
    const clam = Math.max(0, num('clam-tot') - num('clam-lib'));
    disp.textContent = fmtCO(clam, 2) + ' ppm';
    disp.className = 'clam-value' + (
      clam > 0.5 ? ' clam-value--danger' :
      clam > 0.2 ? ' clam-value--warn'   : ' clam-value--ok'
    );
  }

  // ── RESULT RENDERER ──────────────────────────────────────────────────────
  /**
   * rows: [{ label, sub?, qty?, type: 'ok'|'warn'|'danger'|'tip' }]
   * The qty field is shown right-aligned in a large display font.
   */
  function showResult(panelKey, rows) {
    const box = $(panelKey + '-result');
    if (!box) return;
    box.innerHTML = rows.map(function (r) {
      return '<div class="res-row res-row--' + (r.type || 'ok') + '">' +
        '<div class="res-row__text">' +
          '<span class="res-row__label">' + r.label + '</span>' +
          (r.sub ? '<span class="res-row__sub">' + r.sub + '</span>' : '') +
        '</div>' +
        (r.qty ? '<span class="res-row__qty">' + r.qty + '</span>' : '') +
      '</div>';
    }).join('');
    box.classList.add('result-box--show');
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────

  function setSummaryRow(key, data) {
    summary[key] = data;
    renderSummary();
  }

  function renderSummary() {
    const tbody = $('summary-body');
    const card  = $('summary-card');
    if (!tbody || !card) return;
    const keys = Object.keys(summary);
    if (keys.length === 0) {
      card.classList.add('summary-card--empty');
      tbody.innerHTML = '<tr><td colspan="4" class="summary-empty">Ningún cálculo realizado todavía.</td></tr>';
      return;
    }
    card.classList.remove('summary-card--empty');
    tbody.innerHTML = keys.map(function (k) {
      var r = summary[k];
      return '<tr>' +
        '<td class="sum-param">' + r.param   + '</td>' +
        '<td class="sum-range">' + r.range   + '</td>' +
        '<td class="sum-prod">'  + r.product + '</td>' +
        '<td class="sum-qty">'   + r.qty     + '</td>' +
      '</tr>';
    }).join('');
  }

  function clearSummary() {
    Object.keys(summary).forEach(function (k) { delete summary[k]; });
    document.querySelectorAll('#pool-calculator .result-box').forEach(function (b) {
      b.classList.remove('result-box--show');
      b.innerHTML = '';
    });
    renderSummary();
  }

  function copySummary() {
    const keys = Object.keys(summary);
    if (!keys.length) return;
    const lines = ['RESUMEN DE DOSIFICACIÓN — CS Químicos', '─'.repeat(42)].concat(
      keys.map(function (k) {
        var r = summary[k];
        return r.param + ': ' + r.range + ' → ' + r.product + ': ' + r.qty;
      }),
      ['─'.repeat(42), 'csquimicos.com']
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n')).then(function () {
        var btn = $('summary-copy-btn');
        if (btn) { btn.textContent = '¡Copiado!'; setTimeout(function () { btn.textContent = 'Copiar resumen'; }, 2000); }
      });
    }
  }

  // ── CALC: CLORO ──────────────────────────────────────────────────────────

  function calcCloro() {
    const vol    = calcVol();
    const litros = vol * 1000;
    const actual = num('cl-actual');
    const desSel = $('cl-deseado').value;
    const deseado = desSel === 'custom'
      ? (parseFloat($('cl-deseado-num')?.value) || 0)
      : parseFloat(desSel) || 0;
    const prod = CLORO_PRODUCTOS.find(function (p) { return p.id === $('cl-prod').value; });

    clearErrors('cl-actual');
    if (actual < 0 || actual > 10) { setError('cl-actual', 'Ingrese un valor entre 0 y 10 ppm'); return; }

    const delta = deseado - actual;

    if (delta <= 0) {
      showResult('cl', [
        { label: 'El cloro actual ya está en el nivel deseado o por encima', sub: 'Actual: ' + fmtCO(actual, 1) + ' ppm · Objetivo: ' + fmtCO(deseado, 1) + ' ppm', type: 'warn' },
        { label: 'Si necesita bajar el nivel, use la pestaña Reducir Cl', type: 'tip' },
      ]);
      return;
    }

    // g (or mL) = (Δppm × vol_L) / (conc_decimal × 1000)
    const dose = (delta * litros) / (prod.conc * 1000);
    const qtyStr = prod.unit === 'mL' ? fmtLiq(dose) : fmtDose(dose);

    const rows = [
      { label: prod.label, sub: 'Elevar de ' + fmtCO(actual, 1) + ' a ' + fmtCO(deseado, 1) + ' ppm · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr },
    ];
    if (deseado >= 10) rows.push({ label: 'Choque activo — no bañarse hasta que el cloro baje de 5 ppm', type: 'danger' });
    rows.push({ label: 'Añadir con la bomba encendida. Distribuir por el perímetro.', type: 'tip' });

    showResult('cl', rows);
    setSummaryRow('cloro', { param: 'Cloro', range: fmtCO(actual, 1) + ' → ' + fmtCO(deseado, 1) + ' ppm', product: prod.label, qty: qtyStr });
  }

  // ── CALC: pH ─────────────────────────────────────────────────────────────

  function calcPH() {
    const vol     = calcVol();
    const actual  = num('ph-actual');
    const deseado = num('ph-deseado');

    clearErrors('ph-actual', 'ph-deseado');
    if (actual < 4 || actual > 9)       { setError('ph-actual',  'pH entre 4,0 y 9,0'); return; }
    if (deseado < 6.5 || deseado > 8.5) { setError('ph-deseado', 'pH entre 6,5 y 8,5'); return; }

    const delta = deseado - actual;
    if (Math.abs(delta) < 0.05) {
      showResult('ph', [{ label: 'El pH ya está en el rango deseado', type: 'ok' }]);
      return;
    }

    const rows = [];
    let qtyStr, prodLabel;

    if (delta < 0) {
      // Lower pH — ácido muriático 33%
      // mL = (Δph × vol_m3 × 1000) / 330
      const ml = (Math.abs(delta) * vol * PH_ACID_ML_NUM) / PH_ACID_ML_DEN;
      qtyStr    = fmtLiq(ml);
      prodLabel = 'Ácido Muriático 33%';
      rows.push({ label: prodLabel, sub: 'pH ' + fmtCO(actual, 1) + ' → ' + fmtCO(deseado, 1) + ' · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr });
      rows.push({ label: 'Alternativa equivalente: Bisulfato de Sodio (misma dosis en gramos)', type: 'tip' });
    } else {
      // Raise pH — carbonato de sodio
      // g = Δph × vol_m3 × 180
      const g   = delta * vol * PH_SODA_G_COEF;
      qtyStr    = fmtDose(g);
      prodLabel = 'Carbonato de Sodio';
      rows.push({ label: prodLabel, sub: 'pH ' + fmtCO(actual, 1) + ' → ' + fmtCO(deseado, 1) + ' · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr });
    }

    if (actual < 7.0 || deseado < 7.0)   rows.push({ label: 'pH inferior a 7,0 — agua corrosiva, daña equipos e irrita la piel', type: 'danger' });
    else if (actual > 8.0 || deseado > 8.0) rows.push({ label: 'pH superior a 8,0 — el cloro pierde más del 80% de efectividad', type: 'danger' });
    else if (deseado < 7.2 || deseado > 7.6) rows.push({ label: 'Rango ideal: 7,2 – 7,6', type: 'warn' });
    rows.push({ label: 'Re-medir el pH después de 4 horas de circulación.', type: 'tip' });

    showResult('ph', rows);
    setSummaryRow('ph', { param: 'pH', range: fmtCO(actual, 1) + ' → ' + fmtCO(deseado, 1), product: prodLabel, qty: qtyStr });
  }

  // ── CALC: ALCALINIDAD ────────────────────────────────────────────────────

  function calcAlcalinidad() {
    const vol    = calcVol();
    const litros = vol * 1000;
    const actual  = num('alk-actual');
    const deseado = num('alk-deseado');

    clearErrors('alk-actual', 'alk-deseado');
    if (actual < 0 || actual > 300)   { setError('alk-actual',  '0 – 300 ppm'); return; }
    if (deseado < 20 || deseado > 300){ setError('alk-deseado', '20 – 300 ppm'); return; }

    const delta = deseado - actual;
    if (Math.abs(delta) < 1) {
      showResult('alk', [{ label: 'La alcalinidad ya está en el nivel deseado', type: 'ok' }]);
      return;
    }

    const rows = [];
    let qtyStr, prodLabel;

    if (delta > 0) {
      // Raise — bicarbonato de sodio
      // g = (Δppm × vol_L × 1.4) / 1000
      const g   = (delta * litros * ALK_RAISE_COEF) / 1000;
      qtyStr    = fmtDose(g);
      prodLabel = 'Bicarbonato de Sodio';
      rows.push({ label: prodLabel, sub: actual + ' → ' + deseado + ' ppm · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr });
    } else {
      // Lower — ácido muriático
      // mL = (Δppm × vol_L × 1.2) / 1000
      const ml  = (Math.abs(delta) * litros * ALK_LOWER_COEF) / 1000;
      qtyStr    = fmtLiq(ml);
      prodLabel = 'Ácido Muriático 33%';
      rows.push({ label: prodLabel, sub: actual + ' → ' + deseado + ' ppm · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr });
      rows.push({ label: 'Añadir en partes: cada adición también baja el pH', type: 'warn' });
    }

    if (deseado < 80 || deseado > 120) rows.push({ label: 'Rango ideal: 80 – 120 ppm', type: 'warn' });
    rows.push({ label: 'Distribuir por el perímetro con la bomba encendida. Esperar 4 horas.', type: 'tip' });

    showResult('alk', rows);
    setSummaryRow('alcalinidad', { param: 'Alcalinidad', range: actual + ' → ' + deseado + ' ppm', product: prodLabel, qty: qtyStr });
  }

  // ── CALC: FLOCULANTE ─────────────────────────────────────────────────────

  function calcFloculante() {
    const vol    = calcVol();
    const turbId = $('floc-turb').value;
    const prodId = $('floc-prod').value;
    const rows   = [];
    let qtyStr, prodLabel;

    if (prodId === 'liquido') {
      // mL total = dosis_mL_m3 × vol_m3
      const ml  = FLOC_DOSIS_ML[turbId] * vol;
      qtyStr    = fmtLiq(ml);
      prodLabel = 'Floculante Líquido';
    } else {
      // g total = dosis_g_m3 × vol_m3  (×1.5 for super)
      const factor = prodId === 'super' ? 1.5 : 1.0;
      const g   = FLOC_DOSIS_G[turbId] * vol * factor;
      qtyStr    = fmtDose(g);
      prodLabel = prodId === 'super' ? 'Super Floculante' : 'Sulfato de Aluminio';
    }

    rows.push({ label: prodLabel, sub: TURB_LABELS[turbId] + ' · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr });
    rows.push({ label: 'Disolver en un balde con agua antes de verter a la piscina', type: 'tip' });
    rows.push({ label: 'Apagar el filtro 24 h para que las partículas decanten. Aspirar el fondo al día siguiente.', type: 'tip' });

    showResult('floc', rows);
    setSummaryRow('floculante', { param: 'Floculante', range: TURB_LABELS[turbId], product: prodLabel, qty: qtyStr });
  }

  // ── CALC: CLORAMINAS ─────────────────────────────────────────────────────

  function calcCloraminas() {
    const vol      = calcVol();
    const litros   = vol * 1000;
    const cloTotal = num('clam-tot');
    const cloLibre = num('clam-lib');

    clearErrors('clam-tot', 'clam-lib');
    if (cloTotal < cloLibre) { setError('clam-tot', 'El cloro total no puede ser menor que el libre'); return; }

    const cloraminas = Math.max(0, cloTotal - cloLibre);
    const prod = SHOCK_PRODUCTOS.find(function (p) { return p.id === $('clam-prod').value; });
    const rows = [
      { label: 'Cloraminas presentes', sub: 'Cloro total − cloro libre', qty: fmtCO(cloraminas, 2) + ' ppm',
        type: cloraminas > 0.5 ? 'danger' : cloraminas > 0.2 ? 'warn' : 'ok' },
    ];

    if (cloraminas <= 0.2) {
      rows.push({ label: 'Nivel aceptable — no se requiere acción', type: 'ok' });
    } else if (cloraminas <= 0.5) {
      rows.push({ label: 'Nivel bajo-moderado — vigilar y re-medir mañana', type: 'warn' });
    } else {
      // Super-cloración: cloro necesario = 10 × cloraminas
      const ppmShock = cloraminas * 10;
      const deltaPpm = Math.max(0, ppmShock - cloLibre);
      // g = (Δppm × vol_L) / (conc × 1000)
      const g      = (deltaPpm * litros) / (prod.conc * 1000);
      const qtyStr = fmtDose(g);
      rows.push({ label: 'Choque necesario: ' + fmtCO(ppmShock, 1) + ' ppm de cloro libre', sub: '10 × cloraminas (' + fmtCO(cloraminas, 2) + ' ppm)', type: 'danger' });
      rows.push({ label: prod.label, sub: 'Elevar de ' + fmtCO(cloLibre, 1) + ' a ' + fmtCO(ppmShock, 1) + ' ppm', type: 'ok', qty: qtyStr });
      rows.push({ label: 'No bañarse hasta que el cloro libre baje de 5 ppm', type: 'danger' });
      setSummaryRow('cloraminas', { param: 'Cloraminas', range: fmtCO(cloraminas, 2) + ' ppm', product: prod.label, qty: qtyStr });
    }

    showResult('clam', rows);
  }

  // ── CALC: REDUCIR CLORO ──────────────────────────────────────────────────

  function calcReducirCL() {
    const vol    = calcVol();
    const litros = vol * 1000;
    const actual  = num('red-actual');
    const deseado = num('red-deseado');

    clearErrors('red-actual', 'red-deseado');
    if (actual <= 0)             { setError('red-actual',  'Ingrese el nivel actual'); return; }
    if (deseado < 0)             { setError('red-deseado', 'Ingrese un valor positivo'); return; }
    if (deseado >= actual) {
      showResult('red', [{ label: 'El cloro ya está en el nivel deseado o inferior', type: 'ok' }]);
      return;
    }

    const delta  = actual - deseado;
    const rows   = [];

    if (actual <= 5) {
      rows.push({ label: 'Cloro ≤ 5 ppm — se recomienda dilución con agua limpia en lugar de químicos', sub: 'Drene parte del agua y rellene con agua limpia', type: 'warn' });
    }

    // Tiosulfato de sodio: g = (Δppm × vol_L × 0.7) / 1000
    const g      = (delta * litros * REDCL_COEF) / 1000;
    const qtyStr = fmtDose(g);
    rows.push({ label: 'Tiosulfato de Sodio', sub: 'Reducir de ' + fmtCO(actual, 1) + ' a ' + fmtCO(deseado, 1) + ' ppm · ' + fmtCO(vol, 1) + ' m³', type: 'ok', qty: qtyStr });
    rows.push({ label: 'Medir el cloro 2 horas después. Añadir más si es necesario.', type: 'tip' });

    showResult('red', rows);
    setSummaryRow('reducir_cl', { param: 'Reducir Cl', range: fmtCO(actual, 1) + ' → ' + fmtCO(deseado, 1) + ' ppm', product: 'Tiosulfato de Sodio', qty: qtyStr });
  }

  // ── HTML TEMPLATE ────────────────────────────────────────────────────────

  root.innerHTML = [
    // ─ VOLUME SECTION ────────────────────────────────────────────────────
    '<div class="pq-wrap">',

    '<div class="pq-vol">',
      '<div class="pq-vol__controls">',
        '<div class="pq-section-label">Volumen de la piscina</div>',
        '<div class="pq-vol__row">',
          '<div class="f f--inline">',
            '<label for="vol-tipo">Tipo</label>',
            '<select id="vol-tipo" onchange="pqVolToggle()">',
              '<option value="rect">Rectangular</option>',
              '<option value="oval">Ovalada</option>',
              '<option value="circ">Circular</option>',
              '<option value="irreg">Irregular</option>',
            '</select>',
          '</div>',
          '<div class="f" id="vol-largo-wrap">',
            '<label id="vol-largo-label" for="vol-largo">Largo (m)</label>',
            '<input type="number" id="vol-largo" value="10" min="0" step="0.1" oninput="pqVolUpdate()">',
          '</div>',
          '<div class="f" id="vol-ancho-row">',
            '<label for="vol-ancho">Ancho (m)</label>',
            '<input type="number" id="vol-ancho" value="5" min="0" step="0.1" oninput="pqVolUpdate()">',
          '</div>',
          '<div class="f">',
            '<label for="vol-pmax">Prof. máxima (m)</label>',
            '<input type="number" id="vol-pmax" value="1.8" min="0" step="0.1" oninput="pqVolUpdate()">',
          '</div>',
          '<div class="f">',
            '<label for="vol-pmin">Prof. mínima (m)</label>',
            '<input type="number" id="vol-pmin" value="1.2" min="0" step="0.1" oninput="pqVolUpdate()">',
          '</div>',
          '<div class="f" id="vol-coef-row" style="display:none">',
            '<label for="vol-coef">Coeficiente</label>',
            '<input type="number" id="vol-coef" value="0.85" min="0.5" max="1" step="0.01" oninput="pqVolUpdate()">',
          '</div>',
        '</div>',
      '</div>',
      '<div class="pq-vol__display" id="vol-display">',
        '<span class="vol-placeholder">Ingrese las dimensiones</span>',
      '</div>',
    '</div>',

    // ─ TABS ──────────────────────────────────────────────────────────────
    '<div class="pq-tabs" role="tablist">',
      '<button class="pq-tab pq-tab--active" role="tab" onclick="pqTab(0)">Cloro</button>',
      '<button class="pq-tab" role="tab" onclick="pqTab(1)">pH</button>',
      '<button class="pq-tab" role="tab" onclick="pqTab(2)">Floculante</button>',
    '</div>',

    // ─ PANEL 0: CLORO ────────────────────────────────────────────────────
    '<div class="pq-panel" id="pq-panel-0" role="tabpanel">',
      '<div class="pq-panel__form">',
        '<h3 class="pq-panel__title">Dosificación de Cloro</h3>',
        '<p class="pq-panel__desc">Calcula la cantidad de cloro a añadir para alcanzar la concentración deseada.</p>',
        '<div class="fg fg--2">',
          '<div class="f"><label for="cl-actual">Concentración actual (ppm)</label>',
            '<input type="number" id="cl-actual" value="0.5" min="0" max="10" step="0.1"></div>',
          '<div class="f"><label for="cl-deseado">Concentración deseada</label>',
            '<select id="cl-deseado" onchange="pqClDeseadoChange()">',
              '<option value="1">1 ppm — mínimo residencial</option>',
              '<option value="2">2 ppm — mantenimiento</option>',
              '<option value="3" selected>3 ppm — mantenimiento óptimo</option>',
              '<option value="5">5 ppm — piscina pública</option>',
              '<option value="10">10 ppm — choque suave</option>',
              '<option value="15">15 ppm — agua turbia</option>',
              '<option value="22">22 ppm — agua verde</option>',
              '<option value="custom">Otro valor…</option>',
            '</select></div>',
        '</div>',
        '<div class="fg fg--2" id="cl-custom-row" style="display:none">',
          '<div class="f"><label for="cl-deseado-num">Valor personalizado (ppm)</label>',
            '<input type="number" id="cl-deseado-num" value="5" min="0" max="25" step="0.1"></div>',
        '</div>',
        '<div class="fg fg--1">',
          '<div class="f"><label for="cl-prod">Producto</label>',
            '<select id="cl-prod">',
              CLORO_PRODUCTOS.map(function (p) { return '<option value="' + p.id + '">' + p.label + '</option>'; }).join(''),
            '</select></div>',
        '</div>',
        '<button class="calc-btn" onclick="pqCalcCloro()">Calcular</button>',
        '<div class="result-box" id="cl-result"></div>',
      '</div>',
      '<div class="pq-panel__info">',
        '<div class="info-card">',
          '<div class="info-card__title">Cloro libre en piscinas</div>',
          '<p class="info-card__desc">El cloro libre es el desinfectante activo. El nivel correcto depende del pH del agua.</p>',
          '<div class="range-badges">',
            '<span class="range-badge rb--danger">Bajo · &lt;1 ppm — riesgo sanitario</span>',
            '<span class="range-badge rb--ok">Ideal · 1–3 ppm (residencial)</span>',
            '<span class="range-badge rb--ok">Ideal · 3–5 ppm (pública)</span>',
            '<span class="range-badge rb--warn">Alto · 5–10 ppm — no bañarse</span>',
            '<span class="range-badge rb--danger">Choque · &gt;10 ppm — no bañarse</span>',
          '</div>',
          '<ul class="info-tips">',
            '<li>A mayor pH, se necesita más cloro para el mismo efecto.</li>',
            '<li>La luz solar destruye hasta el 50% del cloro en 2 horas.</li>',
            '<li>Mida siempre antes del mediodía para una lectura precisa.</li>',
            '<li>Con más de 6 bañistas, sume 0,5 ppm adicional.</li>',
          '</ul>',
          '<div class="ref-table"><div class="ref-table__title">pH vs cloro recomendado</div>',
            '<table><tr><th>pH</th><th>Cloro libre</th></tr>',
              '<tr><td>7,2 – 7,4</td><td>1 – 2 ppm</td></tr>',
              '<tr><td>7,4 – 7,6</td><td>2 – 3 ppm</td></tr>',
              '<tr><td>7,6 – 7,8</td><td>3 – 4 ppm</td></tr>',
              '<tr><td>7,8 – 8,0</td><td>4 – 5 ppm</td></tr>',
            '</table></div>',
          '<div class="tip-box">Añada siempre los químicos con la bomba en marcha. Nunca mezcle dos productos entre sí.</div>',
        '</div>',
      '</div>',
    '</div>',

    // ─ PANEL 1: pH ───────────────────────────────────────────────────────
    '<div class="pq-panel" id="pq-panel-1" role="tabpanel" hidden>',
      '<div class="pq-panel__form">',
        '<h3 class="pq-panel__title">Ajuste de pH</h3>',
        '<p class="pq-panel__desc">El pH ideal es 7,2–7,6. Un pH alto reduce la efectividad del cloro; uno bajo irrita piel y daña equipos.</p>',
        '<div class="fg fg--2">',
          '<div class="f"><label for="ph-actual">pH actual</label>',
            '<input type="number" id="ph-actual" value="7.0" min="4" max="9" step="0.1"></div>',
          '<div class="f"><label for="ph-deseado">pH objetivo</label>',
            '<input type="number" id="ph-deseado" value="7.4" min="6.5" max="8.5" step="0.1"></div>',
        '</div>',
        '<button class="calc-btn" onclick="pqCalcPH()">Calcular</button>',
        '<div class="result-box" id="ph-result"></div>',
      '</div>',
      '<div class="pq-panel__info">',
        '<div class="info-card">',
          '<div class="info-card__title">pH del agua</div>',
          '<p class="info-card__desc">El pH mide la acidez o alcalinidad en escala 0–14. Es el parámetro más crítico de la piscina.</p>',
          '<div class="range-badges">',
            '<span class="range-badge rb--danger">Ácido · &lt;7,0 — corrosivo</span>',
            '<span class="range-badge rb--warn">Bajo · 7,0–7,2</span>',
            '<span class="range-badge rb--ok">Ideal · 7,2–7,6</span>',
            '<span class="range-badge rb--warn">Alto · 7,6–8,0</span>',
            '<span class="range-badge rb--danger">Alcalino · &gt;8,0 — cloro ineficaz</span>',
          '</div>',
          '<ul class="info-tips">',
            '<li>A pH 8,0, el cloro pierde el 80% de su capacidad desinfectante.</li>',
            '<li>El pH sube naturalmente con el tiempo por aireación.</li>',
            '<li>La lluvia puede bajar el pH bruscamente.</li>',
            '<li>Ajuste siempre el pH antes de añadir cloro.</li>',
          '</ul>',
          '<div class="ref-table"><div class="ref-table__title">Cloro activo (HOCl) según pH</div>',
            '<table><tr><th>pH</th><th>Cloro activo</th></tr>',
              '<tr><td>7,0</td><td>73%</td></tr>',
              '<tr><td>7,2</td><td>63%</td></tr>',
              '<tr><td>7,5</td><td>49%</td></tr>',
              '<tr><td>8,0</td><td>21%</td></tr>',
            '</table></div>',
          '<div class="tip-box">Ajuste el pH antes de añadir cloro. Añada el ácido lentamente y nunca de golpe.</div>',
        '</div>',
      '</div>',
    '</div>',

    // ─ PANEL 2: FLOCULANTE ───────────────────────────────────────────────
    '<div class="pq-panel" id="pq-panel-2" role="tabpanel" hidden>',
      '<div class="pq-panel__form">',
        '<h3 class="pq-panel__title">Floculante / Clarificante</h3>',
        '<p class="pq-panel__desc">Elimina la turbidez aglomerando partículas en suspensión para que decanten al fondo.</p>',
        '<div class="fg fg--1">',
          '<div class="f"><label for="floc-turb">Nivel de turbidez</label>',
            '<select id="floc-turb">',
              '<option value="ligera">Ligeramente turbia — agua opaca pero se ve el fondo</option>',
              '<option value="turbia" selected>Turbia — no se ve el fondo con claridad</option>',
              '<option value="muy_turbia">Muy turbia — no se ve el fondo</option>',
              '<option value="verde">Verde — agua con algas</option>',
            '</select></div>',
        '</div>',
        '<div class="fg fg--1">',
          '<div class="f"><label for="floc-prod">Producto</label>',
            '<select id="floc-prod">',
              '<option value="sulfato">Sulfato de Aluminio</option>',
              '<option value="liquido">Floculante Líquido</option>',
              '<option value="super">Super Floculante</option>',
            '</select></div>',
        '</div>',
        '<button class="calc-btn" onclick="pqCalcFloculante()">Calcular</button>',
        '<div class="result-box" id="floc-result"></div>',
      '</div>',
      '<div class="pq-panel__info">',
        '<div class="info-card">',
          '<div class="info-card__title">Floculantes y clarificantes</div>',
          '<p class="info-card__desc">Los floculantes unen partículas microscópicas en grumos que se hunden al fondo para aspirarse.</p>',
          '<div class="range-badges">',
            '<span class="range-badge rb--ok">Clara — no se necesita</span>',
            '<span class="range-badge rb--warn">Ligeramente turbia — dosis baja</span>',
            '<span class="range-badge rb--warn">Turbia — dosis media</span>',
            '<span class="range-badge rb--danger">Verde / muy turbia — dosis máxima + choque</span>',
          '</div>',
          '<ul class="info-tips">',
            '<li>Disuelva el floculante en un balde antes de verterlo.</li>',
            '<li>Apague el filtro 24 h para permitir la decantación.</li>',
            '<li>Aspire el fondo al día siguiente sin remover el agua.</li>',
            '<li>Para agua verde, realice choque de cloro primero.</li>',
          '</ul>',
          '<div class="ref-table"><div class="ref-table__title">Dosis de referencia (Sulfato Al.)</div>',
            '<table><tr><th>Turbidez</th><th>Dosis</th></tr>',
              '<tr><td>Ligera</td><td>30 g/m³</td></tr>',
              '<tr><td>Media</td><td>60 g/m³</td></tr>',
              '<tr><td>Alta</td><td>100 g/m³</td></tr>',
              '<tr><td>Verde</td><td>150 g/m³</td></tr>',
            '</table></div>',
          '<div class="tip-box">Para agua verde: choque de cloro el día 1, floculante el día 2, aspirar el día 3.</div>',
        '</div>',
      '</div>',
    '</div>',

    // ─ SUMMARY CARD ──────────────────────────────────────────────────────
    '<div class="summary-card summary-card--empty" id="summary-card">',
      '<div class="summary-card__header">',
        '<span class="summary-card__title">Resumen de dosificación</span>',
        '<div class="summary-card__actions">',
          '<button class="summary-btn" id="summary-copy-btn" onclick="pqCopySummary()">Copiar resumen</button>',
          '<button class="summary-btn summary-btn--reset" onclick="pqClearSummary()">Reiniciar todo</button>',
        '</div>',
      '</div>',
      '<div class="summary-card__body">',
        '<table class="summary-table">',
          '<thead><tr>',
            '<th>Parámetro</th>',
            '<th>Rango</th>',
            '<th>Producto</th>',
            '<th>Cantidad</th>',
          '</tr></thead>',
          '<tbody id="summary-body">',
            '<tr><td colspan="4" class="summary-empty">Ningún cálculo realizado todavía.</td></tr>',
          '</tbody>',
        '</table>',
      '</div>',
    '</div>',

    '</div>',// /.pq-wrap
  ].join('');

  // ── GLOBAL HANDLERS ──────────────────────────────────────────────────────

  window.pqVolToggle        = togglePoolType;
  window.pqVolUpdate        = updateVolumeDisplay;
  window.pqTab              = activateTab;
  window.pqClamUpdate       = updateCloraminas;
  window.pqCalcCloro        = calcCloro;
  window.pqCalcPH           = calcPH;
  window.pqCalcAlcalinidad  = calcAlcalinidad;
  window.pqCalcFloculante   = calcFloculante;
  window.pqCalcCloraminas   = calcCloraminas;
  window.pqCalcReducirCL    = calcReducirCL;
  window.pqClearSummary     = clearSummary;
  window.pqCopySummary      = copySummary;

  window.pqClDeseadoChange = function () {
    const row = $('cl-custom-row');
    if (row) row.style.display = $('cl-deseado').value === 'custom' ? 'grid' : 'none';
  };

  // ── INIT ─────────────────────────────────────────────────────────────────
  updateVolumeDisplay();
  updateCloraminas();
  renderSummary();

})();
