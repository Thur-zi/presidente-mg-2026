/* Presidente 2022 × 2026 em Minas Gerais — quadro comparativo por região, zona e cidade, cruzado com deputados 2026.
   Unidade básica dos dados: município + zona eleitoral ("mun-zona"); tudo é somado aqui no navegador. */
"use strict";
const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat("pt-BR");
const int = v => v == null || !isFinite(v) ? "–" : nf.format(Math.round(v));
const pct = (v, d = 1) => v == null || !isFinite(v) ? "–" : (v * 100).toLocaleString("pt-BR", {minimumFractionDigits: d, maximumFractionDigits: d}) + "%";
const pp = (v, d = 1) => v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : "") + (v * 100).toLocaleString("pt-BR", {minimumFractionDigits: d, maximumFractionDigits: d}) + " p.p.";
const dec = (v, d = 2) => v == null || !isFinite(v) ? "–" : v.toLocaleString("pt-BR", {minimumFractionDigits: d, maximumFractionDigits: d});
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const semAc = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const LULA = "Lula", JB = "Jair Bolsonaro", FB = "Flavio Bolsonaro";
const NOME_EXIBE = n => n === FB ? "Flávio Bolsonaro" : n;
const COR = {lula: "#e0533d", bolso: "#3d8fd6", outro: "#7a7f86", dep: "#3ec6a8", brand: "#55b8e6"};
const corCand = n => n === LULA ? COR.lula : (n === JB || n === FB) ? COR.bolso : COR.outro;
const familia = n => n === LULA ? "lula" : (n === JB || n === FB) ? "bolso" : "outro";
Chart.defaults.color = "#a7adb4"; Chart.defaults.font.family = "Inter Tight, system-ui, sans-serif";

const E = {B: null, nivel: "mg", turno: "1", dep: null, depVotos: null, filtroCargo: 0, unidades: [], sel: null, modo: "venc26", mapa: null, camada: null, geo: null, graficos: []};

/* ---------------- agregação */
function somar(mzs) {
  const B = E.B, t = E.turno, o = {v22: {}, v26: {}, d22: [0, 0, 0, 0, 0], d26: [0, 0, 0, 0, 0], val6: 0, val7: 0, dep: 0};
  for (const k of mzs) {
    const a = B.v22[t][k]; if (a) for (const n in a) o.v22[n] = (o.v22[n] || 0) + a[n];
    const b = B.v26[k]; if (b) for (const n in b) o.v26[n] = (o.v26[n] || 0) + b[n];
    const c = B.d22[t][k]; if (c) for (let i = 0; i < 5; i++) o.d22[i] += c[i];
    const d = B.d26[k]; if (d) for (let i = 0; i < 5; i++) o.d26[i] += d[i];
    o.val6 += B.val6[k] || 0; o.val7 += B.val7[k] || 0;
    if (E.depVotos) o.dep += E.depVotos[k] || 0;
  }
  const tot = v => Object.values(v).reduce((x, y) => x + y, 0);
  o.t22 = tot(o.v22); o.t26 = tot(o.v26);
  const venc = v => Object.entries(v).sort((a, b) => b[1] - a[1])[0]?.[0];
  o.venc22 = venc(o.v22); o.venc26 = venc(o.v26);
  o.lula22 = (o.v22[LULA] || 0) / o.t22; o.lula26 = (o.v26[LULA] || 0) / o.t26;
  o.bol22 = (o.v22[JB] || 0) / o.t22; o.bol26 = (o.v26[FB] || 0) / o.t26;
  o.dLula = o.lula26 - o.lula22; o.dBol = o.bol26 - o.bol22;
  o.abst22 = o.d22[0] ? o.d22[2] / o.d22[0] : null; o.abst26 = o.d26[0] ? o.d26[2] / o.d26[0] : null;
  o.bn22 = o.d22[1] ? (o.d22[3] + o.d22[4]) / o.d22[1] : null; o.bn26 = o.d26[1] ? (o.d26[3] + o.d26[4]) / o.d26[1] : null;
  o.aptos = o.d26[0];
  o.virou = familia(o.venc22) !== familia(o.venc26);
  if (E.dep) { const val = E.dep.cargo === 6 ? o.val6 : o.val7; o.depP = val ? o.dep / val : null; }
  return o;
}
function agrupar(nivel) {
  const B = E.B, grupos = new Map();
  const todas = new Set([...Object.keys(B.v26), ...Object.keys(B.v22[E.turno])]);
  for (const k of todas) {
    const [m, z] = k.split("-"), mun = B.municipios[m];
    let chave, nome;
    if (nivel === "mg") { chave = "mg"; nome = "Minas Gerais"; }
    else if (nivel === "ri") { chave = mun?.ri || "?"; nome = `Região de ${mun?.ri}`; }
    else if (nivel === "rm") { chave = mun?.rm || "?"; nome = `Região de ${mun?.rm}`; }
    else if (nivel === "zona") { chave = z; nome = B.zonas[z]?.nome || `Zona ${z}`; }
    else { chave = m; nome = mun?.nome || m; }
    if (!grupos.has(chave)) grupos.set(chave, {chave, nome, mzs: []});
    grupos.get(chave).mzs.push(k);
  }
  return [...grupos.values()].map(g => Object.assign(g, somar(g.mzs)));
}

/* ---------------- quadro geral */
function listaCand(v, tot, fotos, n = 8) {
  const ord = Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, n), mx = ord[0]?.[1] || 1;
  return ord.map(([nome, q]) => {
    const f = fotos?.get(nome);
    const av = f ? `<img class="av" src="${esc(f)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'av',textContent:'${esc(NOME_EXIBE(nome)[0])}',style:'background:${corCand(nome)}'}))">`
      : `<span class="av" style="background:${corCand(nome)}">${esc(NOME_EXIBE(nome)[0])}</span>`;
    return `<div class="cand">${av}<div><div class="n">${esc(NOME_EXIBE(nome))}<small>${esc(E.partidos.get(nome) || "")}</small></div><div class="b"><i style="width:${q / mx * 100}%;background:${corCand(nome)}"></i></div></div>
      <div class="v"><b>${pct(q / tot)}</b><small>${int(q)} votos</small></div></div>`;
  }).join("");
}
function quadro(u, alvo) {
  const t = E.turno === "1" ? "2022 · 1º turno" : "2022 · 2º turno";
  const cls = v => v > 0 ? "pos" : v < 0 ? "neg" : "";
  alvo.innerHTML = `<div class="anos"><div class="card ano"><h4>${t}</h4>${listaCand(u.v22, u.t22, E.fotos)}</div>
    <div class="card ano"><h4>2026 · 1º turno</h4>${listaCand(u.v26, u.t26, E.fotos)}</div></div>
    <div class="delta">
      <div class="card"><div class="l">Lula</div><div class="v ${cls(u.dLula)}">${pp(u.dLula)}</div><div class="s">${pct(u.lula22)} → ${pct(u.lula26)} · ${int(u.v22[LULA])} → ${int(u.v26[LULA])} votos</div></div>
      <div class="card"><div class="l">Jair Bolsonaro (2022) → Flávio Bolsonaro (2026)</div><div class="v ${cls(u.dBol)}">${pp(u.dBol)}</div><div class="s">${pct(u.bol22)} → ${pct(u.bol26)} · ${int(u.v22[JB])} → ${int(u.v26[FB])} votos</div></div>
      <div class="card"><div class="l">Vencedor</div><div class="v txt">${esc(NOME_EXIBE(u.venc22))} → ${esc(NOME_EXIBE(u.venc26))}</div><div class="s">${u.virou ? "mudou de lado" : "manteve o lado"}</div></div>
      <div class="card"><div class="l">Abstenção</div><div class="v txt">${pct(u.abst22)} → ${pct(u.abst26)}</div><div class="s">dos eleitores aptos</div></div>
      <div class="card"><div class="l">Brancos e nulos</div><div class="v txt">${pct(u.bn22)} → ${pct(u.bn26)}</div><div class="s">dos votos</div></div>
      <div class="card"><div class="l">Votos válidos</div><div class="v txt">${int(u.t22)} → ${int(u.t26)}</div><div class="s">para Presidente</div></div>
    </div>`;
}

/* ---------------- tabela */
let ord = {k: "aptos", dir: -1}, filtroTab = "";
const COLS = () => [
  {t: "Unidade", k: "nome", f: u => esc(u.nome)},
  {t: "Eleitores", k: "aptos", f: u => int(u.aptos)},
  {t: "Lula 22", k: "lula22", f: u => pct(u.lula22)}, {t: "Bolsonaro 22", k: "bol22", f: u => pct(u.bol22)},
  {t: "Lula 26", k: "lula26", f: u => pct(u.lula26)}, {t: "Flávio 26", k: "bol26", f: u => pct(u.bol26)},
  {t: "Δ Lula", k: "dLula", f: u => `<span class="${u.dLula > 0 ? "pos" : "neg"}">${pp(u.dLula)}</span>`},
  {t: "Δ Bolsonaro", k: "dBol", f: u => `<span class="${u.dBol > 0 ? "pos" : "neg"}">${pp(u.dBol)}</span>`},
  {t: "Vencedor 22", k: "venc22", f: u => `<span class="venc"><i style="background:${corCand(u.venc22)}"></i>${esc(NOME_EXIBE(u.venc22))}</span>`},
  {t: "Vencedor 26", k: "venc26", f: u => `<span class="venc"><i style="background:${corCand(u.venc26)}"></i>${esc(NOME_EXIBE(u.venc26))}</span>${u.virou ? '<span class="virou">virou</span>' : ""}`},
  {t: "Abstenção 22", k: "abst22", f: u => pct(u.abst22)}, {t: "Abstenção 26", k: "abst26", f: u => pct(u.abst26)},
  {t: "Brancos+nulos 26", k: "bn26", f: u => pct(u.bn26)},
].concat(E.dep ? [{t: `${E.dep.nome}: votos`, k: "dep", f: u => int(u.dep)}, {t: `${E.dep.nome}: %`, k: "depP", f: u => pct(u.depP, 2)}] : []);
function tabela() {
  const cols = COLS(), linhas = E.unidades.filter(u => !filtroTab || semAc(u.nome).includes(filtroTab))
    .sort((a, b) => { const x = a[ord.k], y = b[ord.k]; return (typeof x === "string" ? x.localeCompare(y) : ((x ?? -1e9) - (y ?? -1e9))) * ord.dir; });
  $("#tabela").innerHTML = `<table><thead><tr>${cols.map(c => `<th data-k="${c.k}" ${c.k === ord.k ? `aria-sort="${ord.dir < 0 ? "descending" : "ascending"}"` : ""}>${esc(c.t)}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map(u => `<tr data-ch="${esc(u.chave)}">${cols.map(c => `<td>${c.f(u)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const nomes = {mg: "Minas Gerais", ri: "Regiões intermediárias", rm: "Regiões imediatas", zona: "Zonas eleitorais", mun: "Cidades"};
  $("#tabTitulo").textContent = `${nomes[E.nivel]} (${int(E.unidades.length)})`;
  const viraram = E.unidades.filter(u => u.virou).length;
  $("#tabNota").textContent = E.nivel === "mg" ? "" : `${int(viraram)} de ${int(E.unidades.length)} mudaram de lado entre ${E.turno === "1" ? "o 1º turno de 2022" : "o 2º turno de 2022"} e 2026. Clique numa linha para ver o detalhe.`;
}
$("#tabela").addEventListener("click", e => {
  const th = e.target.closest("th[data-k]");
  if (th) { if (ord.k === th.dataset.k) ord.dir = -ord.dir; else ord = {k: th.dataset.k, dir: -1}; return tabela(); }
  const tr = e.target.closest("tr[data-ch]"); if (tr) abrir(tr.dataset.ch);
});
$("#qTab").addEventListener("input", e => { filtroTab = semAc(e.target.value); tabela(); });
$("#csv").addEventListener("click", () => {
  const cols = COLS(), txt = c => String(c).replace(/<[^>]+>/g, "").replace(/"/g, '""');
  const linhas = [cols.map(c => `"${txt(c.t)}"`).join(";")].concat(E.unidades.map(u => cols.map(c => `"${txt(c.f(u))}"`).join(";")));
  const a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(new Blob(["﻿" + linhas.join("\n")], {type: "text/csv"})), download: `presidente-mg-${E.nivel}.csv`});
  a.click();
});

/* ---------------- mapa */
const MODOS = () => [["venc26", "Vencedor 2026"], ["venc22", "Vencedor 2022"], ["virou", "Mudou de lado"], ["dLula", "Δ Lula"], ["dBol", "Δ Bolsonaro"], ["lula26", "Lula 2026"], ["bol26", "Flávio 2026"], ["abst26", "Abstenção 2026"]]
  .concat(E.dep ? [["depP", E.dep.nome]] : []);
const RAMPAS = {lula: ["#2a1614", "#5a2620", "#8f3a2e", "#c4503e", "#f07a62"], bolso: ["#121e2b", "#183a5a", "#215c8c", "#2f80c0", "#64a9e6"], dep: ["#10241f", "#14473d", "#1c6e5d", "#2a9d83", "#5fd3b8"], cinza: ["#1a2129", "#2a333d", "#3d4855", "#566270", "#7a8794"]};
const DIV = ["#215c8c", "#4f93cc", "#8a96a3", "#e48a76", "#c4503e"];
function quebras(vals) { const v = vals.filter(x => x != null && isFinite(x)).sort((a, b) => a - b); return [0.2, 0.4, 0.6, 0.8].map(q => v[Math.floor(q * (v.length - 1))]); }
function corValor(u, modo, q) {
  if (!u) return "#1a2129";
  if (modo === "venc26") return corCand(u.venc26);
  if (modo === "venc22") return corCand(u.venc22);
  if (modo === "virou") return u.virou ? "#fab219" : "#2a333d";
  const x = u[modo]; if (x == null || !isFinite(x)) return "#1a2129";
  if (modo === "dLula" || modo === "dBol") { const i = q.filter(t => x > t).length; return modo === "dLula" ? DIV[i] : DIV[4 - i]; }
  const r = modo === "lula26" ? RAMPAS.lula : modo === "bol26" ? RAMPAS.bolso : modo === "depP" ? RAMPAS.dep : RAMPAS.cinza;
  return r[q.filter(t => x > t).length];
}
function legenda(modo, q) {
  const f = x => pct(x, modo === "depP" ? 2 : 1);
  if (modo === "venc26" || modo === "venc22") return `<span><b style="background:${COR.lula}"></b>Lula</span><span><b style="background:${COR.bolso}"></b>${modo === "venc22" ? "Jair Bolsonaro" : "Flávio Bolsonaro"}</span><span><b style="background:${COR.outro}"></b>outro</span>`;
  if (modo === "virou") return `<span><b style="background:#fab219"></b>mudou de lado</span><span><b style="background:#2a333d"></b>manteve</span>`;
  if (modo === "dLula" || modo === "dBol") { const c = modo === "dLula" ? DIV : DIV.slice().reverse(); return c.map((cor, i) => `<span><b style="background:${cor}"></b>${i === 0 ? "até " + pp(q[0]) : i === 4 ? "acima de " + pp(q[3]) : pp(q[i - 1]) + " a " + pp(q[i])}</span>`).join("") + `<span class="nota">(cinco faixas com o mesmo número de ${E.nivel === "zona" ? "zonas" : "unidades"})</span>`; }
  const r = modo === "lula26" ? RAMPAS.lula : modo === "bol26" ? RAMPAS.bolso : modo === "depP" ? RAMPAS.dep : RAMPAS.cinza;
  return r.map((c, i) => `<span><b style="background:${c}"></b>${i === 0 ? "até " + f(q[0]) : i === 4 ? "acima de " + f(q[3]) : f(q[i - 1]) + " – " + f(q[i])}</span>`).join("");
}
function dica(u) {
  return `<b>${esc(u.nome)}</b><br>2022: Lula ${pct(u.lula22)} · Bolsonaro ${pct(u.bol22)}<br>2026: Lula ${pct(u.lula26)} · Flávio ${pct(u.bol26)}<br>Δ Lula ${pp(u.dLula)} · Δ Bolsonaro ${pp(u.dBol)}${E.dep ? `<br>${esc(E.dep.nome)}: ${int(u.dep)} votos (${pct(u.depP, 2)})` : ""}`;
}
function desenharMapa() {
  if (!E.mapa) {
    E.mapa = L.map("mapa", {scrollWheelZoom: false, zoomSnap: .25, preferCanvas: true});
    L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {attribution: "Esri · IBGE · TSE", maxZoom: 14}).addTo(E.mapa);
    E.mapa.on("click focus", () => E.mapa.scrollWheelZoom.enable());
    E.mapa.setView([-18.6, -44.6], 6);
    // o mapa pode nascer com largura zero (aba escondida); reenquadra quando ganhar tamanho
    let larg = 0;
    new ResizeObserver(() => { const w = $("#mapa").clientWidth; if (w && Math.abs(w - larg) > 40) { larg = w; E.mapa.invalidateSize(); if (E.limites) E.mapa.fitBounds(E.limites); } }).observe($("#mapa"));
  }
  if (E.camada) E.camada.remove();
  const modos = MODOS(); if (!modos.some(m => m[0] === E.modo)) E.modo = "venc26";
  $("#modoMapa").innerHTML = modos.map(([k, n]) => `<button data-m="${k}" aria-pressed="${E.modo === k}">${esc(n)}</button>`).join("");
  // valor de cada município: o da unidade que o contém (cidade, região) ou o da própria cidade
  const unidadeDe = new Map();
  const nivelMapa = E.nivel === "mg" || E.nivel === "zona" ? "mun" : E.nivel;
  const lista = nivelMapa === E.nivel ? E.unidades : agrupar(nivelMapa);
  for (const u of lista) for (const k of u.mzs) unidadeDe.set(k.split("-")[0], u);
  const porIbge = new Map(Object.entries(E.B.municipios).map(([m, x]) => [x.ibge, unidadeDe.get(m)]));
  const q = quebras(lista.map(u => u[E.modo]));
  const grupo = L.featureGroup();
  L.geoJSON(E.geo, {style: f => ({color: "#0b1015", weight: .4, fillOpacity: E.nivel === "zona" ? .25 : .9, fillColor: corValor(porIbge.get(f.properties.ibge), E.modo, q)}),
    onEachFeature: (f, l) => { const u = porIbge.get(f.properties.ibge); if (!u) return; l.bindTooltip(dica(u), {sticky: true}); l.on("click", () => abrir(u.chave)); }}).addTo(grupo);
  if (E.nivel === "zona") {
    const qz = quebras(E.unidades.map(u => u[E.modo]));
    const mx = Math.max(...E.unidades.map(u => u.aptos));
    for (const u of E.unidades) {
      const z = E.B.zonas[u.chave]; if (!z?.lat) continue;
      L.circleMarker([z.lat, z.lng], {radius: 4 + 14 * Math.sqrt(u.aptos / mx), color: "#0b1015", weight: 1, fillOpacity: .9, fillColor: corValor(u, E.modo, qz)})
        .bindTooltip(dica(u), {sticky: true}).on("click", () => abrir(u.chave)).addTo(grupo);
    }
  }
  E.camada = grupo.addTo(E.mapa);
  if (!E.limites) { E.limites = grupo.getBounds(); if ($("#mapa").clientWidth) E.mapa.fitBounds(E.limites); }
  $("#legenda").innerHTML = legenda(E.modo, q);
  $("#mapaTitulo").textContent = E.nivel === "zona" ? "Mapa das zonas eleitorais (círculos) sobre as cidades" : E.nivel === "ri" || E.nivel === "rm" ? "Mapa das regiões" : "Mapa das cidades";
}
$("#modoMapa").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { E.modo = b.dataset.m; desenharMapa(); } });

/* ---------------- detalhe de uma unidade */
function linhaSub(c) {
  return `<tr><td>${esc(c.nome)}</td><td>${int(c.aptos)}</td><td>${pct(c.lula22)}</td><td>${pct(c.lula26)}</td><td class="${c.dLula > 0 ? "pos" : "neg"}">${pp(c.dLula)}</td><td>${pct(c.bol22)}</td><td>${pct(c.bol26)}</td><td class="${c.dBol > 0 ? "pos" : "neg"}">${pp(c.dBol)}</td><td>${pct(c.abst26)}</td><td><span class="venc"><i style="background:${corCand(c.venc26)}"></i>${esc(NOME_EXIBE(c.venc26))}</span>${c.virou ? '<span class="virou">virou</span>' : ""}</td>${E.dep ? `<td>${int(c.dep)}</td><td>${pct(c.depP, 2)}</td>` : ""}</tr>`;
}
function tabelaSub(titulo, lista) {
  if (lista.length < 2) return "";
  return `<h4 class="sub">${esc(titulo)} (${lista.length})</h4><div class="tab-wrap" style="max-height:380px"><table><thead><tr><th>${E.nivel === "mun" ? "Zona" : "Cidade"}</th><th>Eleitores</th><th>Lula 22</th><th>Lula 26</th><th>Δ Lula</th><th>Bolsonaro 22</th><th>Flávio 26</th><th>Δ Bolsonaro</th><th>Abstenção 26</th><th>Vencedor 26</th>${E.dep ? `<th>${esc(E.dep.nome)}</th><th>%</th>` : ""}</tr></thead>
    <tbody>${lista.sort((a, b) => b.aptos - a.aptos).map(linhaSub).join("")}</tbody></table></div>`;
}
async function topDeps(id) {
  if (!E.top) E.top = await fetch("dados/top.json").then(r => r.json());
  const g = E.top[id]; if (!g) return "";
  const col = (cg, t) => `<div class="card"><h4 class="sub" style="margin-top:0">${t}</h4><ol class="top">${(g[cg] || []).slice(0, 15).map(([i, q]) => { const d = E.B.deputados[i]; return `<li><button data-dep="${i}" title="Comparar com o Presidente"><span>${esc(d.nome)} <small>${esc(d.partido)}${d.eleito ? " · eleito(a)" : ""}</small></span><b>${int(q)}</b></button></li>`; }).join("")}</ol></div>`;
  return `<h4 class="sub">Deputados mais votados aqui <small>clique para cruzar com o Presidente</small></h4><div class="grid2">${col(6, "Deputado federal")}${col(7, "Deputado estadual")}</div>`;
}
async function abrir(chave) {
  const u = E.unidades.find(x => x.chave === chave); if (!u) return;
  E.sel = chave;
  $("#detalhe").hidden = false;
  $("#detTitulo").textContent = u.nome;
  const box = document.createElement("div"); quadro(u, box);
  const B = E.B;
  let extra = "";
  if (E.nivel === "mun") extra = tabelaSub("Zonas eleitorais da cidade", u.mzs.map(k => Object.assign(somar([k]), {nome: `Zona ${k.split("-")[1]}`})));
  else if (E.nivel === "zona") extra = tabelaSub("Cidades da zona", u.mzs.map(k => Object.assign(somar([k]), {nome: B.municipios[k.split("-")[0]]?.nome || k})));
  else if (E.nivel === "ri" || E.nivel === "rm") { const s = new Set(u.mzs); extra = tabelaSub("Cidades da região", agrupar("mun").filter(c => c.mzs.some(k => s.has(k)))); }
  const dep = E.dep ? `<div class="kpis" style="margin-top:12px"><div class="card"><b>${int(u.dep)}</b><span>votos de ${esc(E.dep.nome)} aqui</span></div><div class="card"><b>${pct(u.depP, 2)}</b><span>dos válidos para ${E.dep.cargo === 6 ? "deputado federal" : "deputado estadual"}</span></div><div class="card"><b>${pct(u.dep / (E.depTotal || 1), 1)}</b><span>de toda a votação dele(a) em MG</span></div></div>` : "";
  $("#detCorpo").innerHTML = ""; $("#detCorpo").append(box); $("#detCorpo").insertAdjacentHTML("beforeend", dep + extra + '<div id="detTop"></div>');
  $("#detalhe").scrollIntoView({behavior: "smooth", block: "start"});
  const html = await topDeps(E.nivel === "mg" ? "mg" : `${E.nivel}:${chave}`); if (E.sel === chave) $("#detTop").innerHTML = html;
}
document.addEventListener("click", e => { const b = e.target.closest("#geralTop [data-dep]"); if (b) escolherDep(E.B.deputados[+b.dataset.dep]); });
$("#detCorpo").addEventListener("click", e => { const b = e.target.closest("[data-dep]"); if (b) escolherDep(E.B.deputados[+b.dataset.dep]); });

/* ---------------- deputado × presidente */
function correl(xs, ys, ws) {
  let sw = 0, mx = 0, my = 0; for (let i = 0; i < xs.length; i++) { sw += ws[i]; mx += ws[i] * xs[i]; my += ws[i] * ys[i]; }
  mx /= sw; my /= sw; let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += ws[i] * dx * dy; sxx += ws[i] * dx * dx; syy += ws[i] * dy * dy; }
  return sxy / Math.sqrt(sxx * syy);
}
function secaoDeputado() {
  E.graficos.forEach(g => g.destroy()); E.graficos = [];
  if (!E.dep) { $("#depSec").hidden = true; return; }
  const d = E.dep, cid = agrupar("mun").filter(c => c.t26 > 0 && c.depP != null);
  const xs = cid.map(c => c.lula26), ys = cid.map(c => c.depP), ws = cid.map(c => c.aptos);
  const rL = correl(xs, ys, ws), rF = correl(cid.map(c => c.bol26), ys, ws), rD = correl(cid.map(c => c.dLula), ys, ws);
  // quintos das cidades pelo voto no Lula em 2026 (do menos ao mais lulista), com o mesmo número de eleitores
  const ordC = cid.slice().sort((a, b) => a.lula26 - b.lula26), totE = ordC.reduce((t, c) => t + c.aptos, 0);
  const quint = [0, 1, 2, 3, 4].map(() => ({dep: 0, val: 0, lula: 0, t: 0, n: 0}));
  let acc = 0;
  for (const c of ordC) { const q = Math.min(4, Math.floor(acc / totE * 5)); acc += c.aptos; const o = quint[q]; o.dep += c.dep; o.val += d.cargo === 6 ? c.val6 : c.val7; o.lula += c.v26[LULA] || 0; o.t += c.t26; o.n++; }
  const mg = E.unidades.length && E.nivel === "mg" ? E.unidades[0] : somar(Object.keys(E.B.v26));
  const top = cid.slice().sort((a, b) => b.dep - a.dep).slice(0, 15);
  const leitura = Math.abs(rL) < .15 ? "não tem relação clara com o voto em Lula ou em Flávio: o voto dele(a) atravessa os dois campos" : rL > 0 ? "é mais forte nas cidades onde Lula foi melhor" : "é mais forte nas cidades onde Flávio Bolsonaro foi melhor";
  $("#depSec").hidden = false;
  $("#depTitulo").textContent = `${d.nome} (${d.partido}) × Presidente`;
  $("#depCorpo").innerHTML = `<div class="kpis">
      <div class="card"><b>${int(d.votos)}</b><span>votos em MG · ${d.cargo === 6 ? "Dep. Federal" : "Dep. Estadual"} · ${esc(d.situacao || (d.eleito ? "eleito(a)" : ""))}</span></div>
      <div class="card"><b>${dec(rL)}</b><span>correlação com o % do Lula nas cidades</span></div>
      <div class="card"><b>${dec(rF)}</b><span>correlação com o % do Flávio nas cidades</span></div>
      <div class="card"><b>${dec(rD)}</b><span>correlação com a variação do Lula (22 → 26)</span></div>
    </div>
    <p class="nota">Leitura: a votação de ${esc(d.nome)} ${leitura}. Correlação vai de −1 a +1; perto de zero indica pouca relação. Cada cidade pesa pelo número de eleitores.</p>
    <div class="grid2">
      <div class="card"><h3 style="margin:0 0 8px;font-size:16px">Cidades: % do Lula em 2026 × % de ${esc(d.nome)}</h3><canvas id="gDisp" height="260"></canvas></div>
      <div class="card"><h3 style="margin:0 0 8px;font-size:16px">Do menos ao mais lulista: % de ${esc(d.nome)}</h3><canvas id="gQuint" height="260"></canvas>
        <p class="nota">As cidades foram divididas em 5 grupos com o mesmo número de eleitores, do menor para o maior % do Lula em 2026.</p></div>
    </div>
    <div class="card" style="margin-top:14px"><h3 style="margin:0 0 8px;font-size:16px">Onde ${esc(d.nome)} teve mais votos</h3><div class="tab-wrap" style="max-height:420px"><table><thead><tr><th>Cidade</th><th>Votos</th><th>% válidos</th><th>% do total dele(a)</th><th>Lula 26</th><th>Flávio 26</th><th>Δ Lula</th><th>Vencedor 26</th></tr></thead>
      <tbody>${top.map(c => `<tr data-ch="${esc(c.chave)}"><td>${esc(c.nome)}</td><td>${int(c.dep)}</td><td>${pct(c.depP, 2)}</td><td>${pct(c.dep / d.votos)}</td><td>${pct(c.lula26)}</td><td>${pct(c.bol26)}</td><td class="${c.dLula > 0 ? "pos" : "neg"}">${pp(c.dLula)}</td><td>${esc(NOME_EXIBE(c.venc26))}</td></tr>`).join("")}</tbody></table></div></div>`;
  const mxA = Math.max(...ws);
  E.graficos.push(new Chart($("#gDisp"), {type: "bubble", data: {datasets: [{data: cid.map(c => ({x: c.lula26 * 100, y: c.depP * 100, r: 2 + 12 * Math.sqrt(c.aptos / mxA), nome: c.nome})), backgroundColor: "rgba(62,198,168,.45)", borderColor: "rgba(62,198,168,.9)"}]},
    options: {plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `${c.raw.nome}: Lula ${dec(c.raw.x, 1)}% · ${d.nome} ${dec(c.raw.y, 2)}%`}}},
      scales: {x: {title: {display: true, text: "% do Lula em 2026"}, grid: {color: "rgba(255,255,255,.06)"}}, y: {title: {display: true, text: `% de ${d.nome}`}, grid: {color: "rgba(255,255,255,.06)"}}}}}));
  E.graficos.push(new Chart($("#gQuint"), {type: "bar", data: {labels: quint.map((q, i) => [`${["Menos", "Pouco", "Médio", "Mais", "Muito mais"][i]} lulista`, `Lula ${dec(q.lula / q.t * 100, 0)}%`]),
    datasets: [{label: d.nome, data: quint.map(q => q.val ? q.dep / q.val * 100 : 0), backgroundColor: COR.dep}]},
    options: {plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `${dec(c.raw, 2)}% dos válidos`}}}, scales: {y: {title: {display: true, text: "% dos válidos"}, grid: {color: "rgba(255,255,255,.06)"}}, x: {grid: {display: false}}}}}));
  $("#depCorpo").querySelector("tbody").addEventListener("click", e => { const tr = e.target.closest("tr[data-ch]"); if (tr) { mudarNivel("mun"); abrir(tr.dataset.ch); } });
}

/* ---------------- buscas (dropdown com digitação) */
function preencherBuscas() {
  const B = E.B, opts = [];
  for (const [m, x] of Object.entries(B.municipios)) opts.push(`Cidade · ${x.nome}`);
  for (const [z, x] of Object.entries(B.zonas)) opts.push(x.nome);
  for (const r of new Set(Object.values(B.municipios).map(x => x.ri))) opts.push(`Região intermediária · ${r}`);
  for (const r of new Set(Object.values(B.municipios).map(x => x.rm))) opts.push(`Região imediata · ${r}`);
  $("#lUnidades").innerHTML = opts.sort((a, b) => a.localeCompare(b)).map(o => `<option value="${esc(o)}">`).join("");
  preencherDeps();
}
function preencherDeps() {
  const l = E.B.deputados.filter(d => !E.filtroCargo || d.cargo === E.filtroCargo);
  $("#lDeps").innerHTML = l.map(d => `<option value="${esc(`${d.nome} · ${d.partido} · ${d.cargo === 6 ? "Dep. Federal" : "Dep. Estadual"}`)}">`).join("");
}
$("#qUnidade").addEventListener("change", e => {
  const v = e.target.value, B = E.B;
  let nivel, chave;
  if (v.startsWith("Cidade · ")) { nivel = "mun"; chave = Object.keys(B.municipios).find(m => B.municipios[m].nome === v.slice(9)); }
  else if (v.startsWith("Zona ")) { nivel = "zona"; chave = Object.keys(B.zonas).find(z => B.zonas[z].nome === v); }
  else if (v.startsWith("Região intermediária · ")) { nivel = "ri"; chave = v.split(" · ")[1]; }
  else if (v.startsWith("Região imediata · ")) { nivel = "rm"; chave = v.split(" · ")[1]; }
  if (!nivel || !chave) return;
  mudarNivel(nivel); abrir(chave); e.target.value = "";
});
$("#qDep").addEventListener("change", e => {
  const v = e.target.value;
  const d = E.B.deputados.find(x => `${x.nome} · ${x.partido} · ${x.cargo === 6 ? "Dep. Federal" : "Dep. Estadual"}` === v);
  if (d) { e.target.value = ""; escolherDep(d); }
});
async function escolherDep(d) {
  E.dep = d; E.depVotos = await fetch(`dados/dep/${d.id}.json`).then(r => r.json());
  E.depTotal = Object.values(E.depVotos).reduce((t, x) => t + x, 0);
  $("#depChip").innerHTML = `<span class="chip-dep">${esc(d.nome)} · ${esc(d.partido)}<button aria-label="Remover deputado">×</button></span>`;
  E.modo = "depP";
  recalcular(); secaoDeputado(); $("#depSec").scrollIntoView({behavior: "smooth"});
}
$("#depChip").addEventListener("click", e => { if (e.target.closest("button")) { E.dep = null; E.depVotos = null; $("#depChip").innerHTML = ""; recalcular(); secaoDeputado(); } });
$("#filtroCargo").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (!b) return; E.filtroCargo = +b.dataset.c; $("#filtroCargo").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); preencherDeps(); });

/* ---------------- controles */
function mudarNivel(n) { E.nivel = n; $("#nivel").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.n === n)); recalcular(); }
$("#nivel").addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (b) { mudarNivel(b.dataset.n); $("#detalhe").hidden = true; } });
$("#turno").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b) return; E.turno = b.dataset.t; $("#turno").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); recalcular(); secaoDeputado(); if (E.sel && !$("#detalhe").hidden) abrir(E.sel); });
function recalcular() {
  E.unidades = agrupar(E.nivel);
  quadro(somar(Object.keys(E.B.v26).concat(Object.keys(E.B.v22[E.turno]).filter(k => !E.B.v26[k]))), $("#quadro"));
  tabela(); desenharMapa();
}

/* ---------------- início */
(async function () {
  const [B, geo] = await Promise.all([fetch("dados/base.json").then(r => r.json()), fetch("dados/mg.geojson").then(r => r.json())]);
  E.B = B; E.geo = geo;
  E.partidos = new Map([...B.cand22["1"], ...B.cand22["2"], ...B.cand26].map(c => [c[0], c[1]]));
  E.fotos = new Map(B.cand26.filter(c => c[3]).map(c => [c[0], c[3]]));
  preencherBuscas(); recalcular();
  topDeps("mg").then(h => $("#geralTop").innerHTML = h.replace("mais votados aqui", "mais votados em Minas"));
  $("#fontesTexto").innerHTML = `<p><b>2022:</b> TSE, dados abertos (votação por candidato e detalhe da votação por município e zona eleitoral), Presidente, 1º e 2º turnos, Minas Gerais.</p>
    <p><b>2026:</b> boletins de urna publicados pelo TSE, somados por município e zona e conferidos com o arquivo oficial de detalhe por seção. Os totais por candidato podem ficar alguns votos abaixo do total oficial por causa de poucas seções sem boletim publicado.</p>
    <p><b>Regiões:</b> regiões geográficas intermediárias e imediatas do IBGE. <b>Zonas:</b> zonas eleitorais do TSE, posicionadas no mapa pelo centro dos seus locais de votação.</p>
    <p><b>Deputados:</b> votação nominal de cada candidato a deputado federal e estadual em 2026, por município e zona, e o % sobre os votos válidos do respectivo cargo.</p>`;
})();
