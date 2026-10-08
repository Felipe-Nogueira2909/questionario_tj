"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const byId = (id) => document.getElementById(id);

const INFRA_ITEMS = ["Tubulação", "Abraçadeiras / fixação", "Curvas", "Luva / união", "Caixa / condulete", "Tampa", "Box / Nip"];
const CABLING = [
  { item: "Cabo", verification: "CAT. 6", options: ["Existente", "Novo"] },
  { item: "Separação", verification: "Distância de circuitos elétricos", options: ["Adequada", "Inadequada", "N/A"] },
  { item: "Passagem", verification: "Proteção mecânica", options: ["Adequada", "Inadequada"] },
  { item: "Reserva técnica", verification: "Nas extremidades", options: ["Sim", "Não"] },
  { item: "Identificação", verification: "Nas duas extremidades", options: ["Sim", "Não"] },
  { item: "Conectorização", verification: "Padrão definido", options: ["Sim", "Não"] },
];
const EQUIPMENT = ["Rack", "Bandeja", "Organizador de cabos", "Patch panel 24 portas", "Filtro/PDU de linha", "Switch", "NVR"];
const RACK_CONDITIONS = ["Local adequado e acessível", "Ventilação adequada", "Espaço para manutenção", "Organização/identificação possível"];
const ELECTRIC = ["Infraestrutura elétrica disponível", "Tomada próxima ao rack", "Tomada adequada à carga", "Circuito identificado", "Aterramento disponível", "Necessita novo ponto elétrico"];
const CERTIFICATION = ["Cabos serão certificados", "Certificação realizada", "Cabos identificados nas duas pontas", "Patch panel identificado", "Portas do switch identificadas"];

let units = [];
let selectedUnit = null;
let activeRecordId = null;

function textInput(className, value = "", attrs = {}) {
  const input = document.createElement(attrs.multiline ? "textarea" : "input");
  input.className = className;
  if (attrs.type) input.type = attrs.type;
  if (attrs.maxlength) input.maxLength = attrs.maxlength;
  if (attrs.min !== undefined) input.min = attrs.min;
  if (attrs.step !== undefined) input.step = attrs.step;
  input.value = value ?? "";
  input.setAttribute("aria-label", attrs.label || className);
  return input;
}

function checkbox(className, checked = false, label = "") {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = className;
  input.checked = Boolean(checked);
  input.setAttribute("aria-label", label);
  return input;
}

function radioOptions(name, options, selected = null) {
  const wrapper = document.createElement("div");
  wrapper.className = "radio-options";
  options.forEach((option) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = option;
    input.checked = selected === option;
    label.append(input, document.createTextNode(option));
    wrapper.append(label);
  });
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "clear-radio";
  clear.textContent = "Limpar";
  clear.title = "Deixar esta resposta não informada";
  clear.addEventListener("click", () => $$(`input[name="${name}"]`, wrapper).forEach((item) => { item.checked = false; }));
  wrapper.append(clear);
  return wrapper;
}

function cellWith(node, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.append(node);
  return td;
}

function removeButton(row) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = "×";
  button.title = "Remover linha";
  button.setAttribute("aria-label", "Remover linha");
  button.addEventListener("click", () => {
    row.remove();
    renumber(row.parentElement);
  });
  return button;
}

function renumber(tbody) {
  $$("tr", tbody).forEach((row, index) => {
    const number = $(".row-number", row);
    if (number) number.textContent = String(index + 1).padStart(2, "0");
  });
}

function addPoint(data = {}) {
  const tbody = byId("camera-points");
  const row = document.createElement("tr");
  row.append(
    cellWith(Object.assign(document.createElement("span"), { className: "row-number" }), "number-cell"),
    cellWith(textInput("point-location", data.local_ambiente, { maxlength: 200, label: "Local ou ambiente" })),
    cellWith(textInput("point-type", data.tipo, { maxlength: 100, label: "Tipo" })),
    cellWith(textInput("point-asset", data.tombamento, { maxlength: 100, label: "Tombamento" })),
    cellWith(textInput("point-height", data.altura_aproximada, { type: "number", min: 0, step: "0.01", label: "Altura aproximada em metros" })),
    cellWith(checkbox("point-infra", data.infra, "Infra disponível"), "check-cell"),
    cellWith(checkbox("point-cable", data.cabo, "Cabo disponível"), "check-cell"),
    cellWith(checkbox("point-power", data.energia, "Energia disponível"), "check-cell"),
    cellWith(textInput("point-notes", data.observacoes, { maxlength: 1000, label: "Observações" })),
    cellWith(removeButton(row), "check-cell")
  );
  tbody.append(row);
  renumber(tbody);
}

function renderInfrastructure(data = {}) {
  const tbody = byId("infrastructure-items");
  tbody.replaceChildren();
  const saved = new Map((data.itens || []).map((item) => [item.item, item]));
  INFRA_ITEMS.forEach((item) => {
    const value = saved.get(item) || {};
    const row = document.createElement("tr");
    row.dataset.item = item;
    const label = document.createElement("strong");
    label.textContent = item;
    row.append(
      cellWith(label),
      cellWith(checkbox("infra-black", value.pvc_preto, `${item}: PVC preto`), "check-cell"),
      cellWith(checkbox("infra-galvanized", value.galvanizado, `${item}: galvanizado`), "check-cell"),
      cellWith(checkbox("infra-white", value.pvc_branco, `${item}: PVC branco`), "check-cell")
    );
    tbody.append(row);
  });
  $$("#application-patterns input").forEach((input) => { input.checked = Boolean(data[input.dataset.key]); });
}

function renderChecks(tbodyId, definitions, saved = [], type = "standard") {
  const tbody = byId(tbodyId);
  tbody.replaceChildren();
  const savedMap = new Map(saved.map((item) => [item.item, item]));
  definitions.forEach((definition, index) => {
    const config = typeof definition === "string" ? { item: definition, verification: "", options: ["Sim", "Não", "N/A"] } : definition;
    const value = savedMap.get(config.item) || {};
    const row = document.createElement("tr");
    row.dataset.item = config.item;
    if (type === "cabling") {
      const item = document.createElement("strong"); item.textContent = config.item;
      const verification = document.createTextNode(config.verification);
      row.append(cellWith(item), cellWith(verification), cellWith(radioOptions(`${tbodyId}-${index}`, config.options, value.resposta)));
    } else {
      const item = document.createElement("strong"); item.textContent = config.item;
      row.append(
        cellWith(item),
        cellWith(radioOptions(`${tbodyId}-${index}`, config.options, value.resposta)),
      );
      if (type === "observed") row.append(cellWith(textInput("check-observation", value.observacao, { maxlength: 1000, label: `Observação: ${config.item}` })));
    }
    tbody.append(row);
  });
}

function renderEquipment(saved = []) {
  const tbody = byId("equipment-items");
  tbody.replaceChildren();
  const savedMap = new Map(saved.map((item) => [item.item, item]));
  EQUIPMENT.forEach((item, index) => {
    const value = savedMap.get(item) || {};
    const row = document.createElement("tr");
    row.dataset.item = item;
    const name = document.createElement("strong"); name.textContent = item;
    row.append(
      cellWith(name),
      cellWith(radioOptions(`equipment-existing-${index}`, ["Sim", "Não"], value.existente)),
      cellWith(textInput("equipment-quantity", value.quantidade_necessaria, { type: "number", min: 0, label: `Quantidade necessária: ${item}` })),
      cellWith(textInput("equipment-notes", value.condicao_observacao, { maxlength: 1000, label: `Condição ou observação: ${item}` })),
      cellWith(radioOptions(`equipment-fixing-${index}`, ["Sim", "Não"], value.fixacao_adequada)),
      cellWith(radioOptions(`equipment-adjust-${index}`, ["Sim", "Não"], value.necessita_adequacao))
    );
    tbody.append(row);
  });
}

function addIssue(data = {}) {
  const tbody = byId("issues");
  const row = document.createElement("tr");
  row.append(
    cellWith(Object.assign(document.createElement("span"), { className: "row-number" }), "number-cell"),
    cellWith(textInput("issue-description", data.descricao, { maxlength: 1500, label: "Pendência ou não conformidade" })),
    cellWith(textInput("issue-location", data.local, { maxlength: 300, label: "Local da pendência" })),
    cellWith(textInput("issue-impact", data.impacto, { maxlength: 1000, label: "Impacto" })),
    cellWith(textInput("issue-solution", data.solucao_necessaria, { maxlength: 1500, label: "Solução necessária" })),
    cellWith(removeButton(row), "check-cell")
  );
  tbody.append(row); renumber(tbody);
}

function addSolution(data = {}) {
  const tbody = byId("solutions");
  const row = document.createElement("tr");
  row.append(
    cellWith(Object.assign(document.createElement("span"), { className: "row-number" }), "number-cell"),
    cellWith(textInput("solution-description", data.descricao, { maxlength: 1500, label: "Solução proposta" })),
    cellWith(textInput("solution-owner", data.responsavel_dependencia, { maxlength: 500, label: "Responsável ou dependência" })),
    cellWith(textInput("solution-deadline", data.prazo_observacao, { maxlength: 1000, label: "Prazo ou observação" })),
    cellWith(removeButton(row), "check-cell")
  );
  tbody.append(row); renumber(tbody);
}

function radioValue(root) {
  return $("input[type='radio']:checked", root)?.value || null;
}

function nullIfBlank(value) {
  const clean = String(value ?? "").trim();
  return clean === "" ? null : clean;
}

function numericOrNull(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function collectChecks(tbodyId, hasObservation = false) {
  return $$(`#${tbodyId} tr`).map((row) => ({
    item: row.dataset.item,
    resposta: radioValue(row),
    observacao: hasObservation ? nullIfBlank($(".check-observation", row)?.value) : null,
  }));
}

function collectPayload(status) {
  const points = $$("#camera-points tr").map((row) => ({
    local_ambiente: nullIfBlank($(".point-location", row).value),
    tipo: nullIfBlank($(".point-type", row).value),
    tombamento: nullIfBlank($(".point-asset", row).value),
    altura_aproximada: numericOrNull($(".point-height", row).value),
    infra: $(".point-infra", row).checked,
    cabo: $(".point-cable", row).checked,
    energia: $(".point-power", row).checked,
    observacoes: nullIfBlank($(".point-notes", row).value),
  })).filter((point) => Object.values(point).some((value) => value !== null && value !== false));

  const issues = $$("#issues tr").map((row) => ({
    descricao: nullIfBlank($(".issue-description", row).value),
    local: nullIfBlank($(".issue-location", row).value),
    impacto: nullIfBlank($(".issue-impact", row).value),
    solucao_necessaria: nullIfBlank($(".issue-solution", row).value),
  })).filter((item) => Object.values(item).some((value) => value !== null));

  const solutions = $$("#solutions tr").map((row) => ({
    descricao: nullIfBlank($(".solution-description", row).value),
    responsavel_dependencia: nullIfBlank($(".solution-owner", row).value),
    prazo_observacao: nullIfBlank($(".solution-deadline", row).value),
  })).filter((item) => Object.values(item).some((value) => value !== null));

  const people = {};
  ["ipq", "tjce"].forEach((role) => {
    people[role] = {};
    $$(`[data-person="${role}"]`).forEach((input) => { people[role][input.dataset.field] = nullIfBlank(input.value); });
  });

  return {
    unidade_id: byId("unit-id").value,
    status,
    respostas: {
      identificacao: {
        data_vistoria: nullIfBlank(byId("inspection-date").value),
        horario_inicio: nullIfBlank(byId("start-time").value),
        horario_termino: nullIfBlank(byId("end-time").value),
        equipe_ipq: nullIfBlank(byId("ipq-team").value),
        responsavel_local: nullIfBlank(byId("local-responsible").value),
      },
      pontos_camera: points,
      infraestrutura: {
        ...Object.fromEntries($$("#application-patterns input").map((input) => [input.dataset.key, input.checked])),
        itens: $$("#infrastructure-items tr").map((row) => ({
          item: row.dataset.item,
          pvc_preto: $(".infra-black", row).checked,
          galvanizado: $(".infra-galvanized", row).checked,
          pvc_branco: $(".infra-white", row).checked,
        })),
      },
      cabeamento: collectChecks("cabling-checks"),
      equipamentos: $$("#equipment-items tr").map((row) => {
        const groups = $$(".radio-options", row);
        return {
          item: row.dataset.item,
          existente: radioValue(groups[0]),
          quantidade_necessaria: numericOrNull($(".equipment-quantity", row).value),
          condicao_observacao: nullIfBlank($(".equipment-notes", row).value),
          fixacao_adequada: radioValue(groups[1]),
          necessita_adequacao: radioValue(groups[2]),
        };
      }),
      condicoes_rack: collectChecks("rack-conditions"),
      infraestrutura_eletrica: collectChecks("electric-checks", true),
      certificacao: collectChecks("certification-checks", true),
      pendencias: issues,
      solucoes: solutions,
      conclusao: { situacao: radioValue($(".conclusion-options")), observacoes_finais: nullIfBlank(byId("final-notes").value) },
      responsaveis: people,
    },
  };
}

function showMessage(message, type = "success") {
  const box = byId("message");
  box.textContent = message;
  box.className = `message ${type}`;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => { box.hidden = true; }, 7000);
}

function formatApiError(data) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg).join(" ");
  return "Não foi possível salvar a vistoria. Verifique os campos e tente novamente.";
}

async function saveVisit(status) {
  const payload = collectPayload(status);
  if (!payload.unidade_id) {
    showMessage("Selecione uma unidade válida antes de salvar.", "error");
    byId("unit-search").focus();
    return;
  }
  const buttons = [byId("save-draft"), byId("save-complete")];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const url = activeRecordId ? `/api/vistorias/${activeRecordId}` : "/api/vistorias";
    const response = await fetch(url, { method: activeRecordId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(formatApiError(result));
    activeRecordId = result.id;
    byId("record-id").value = result.id;
    byId("form-title").textContent = `Editar vistoria #${result.id}`;
    byId("record-badge").textContent = result.status;
    byId("record-badge").hidden = false;
    showMessage(`Vistoria #${result.id} salva como ${result.status.toLowerCase()}.`);
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function chooseUnit(unit) {
  selectedUnit = unit;
  byId("unit-id").value = unit.id;
  byId("unit-search").value = unit.display_name;
  byId("selected-unit").textContent = `Selecionada: ${unit.display_name}`;
  byId("unit-results").hidden = true;
}

function renderUnitSearch(query = "") {
  const results = byId("unit-results");
  const normalized = query.trim().toLocaleUpperCase("pt-BR");
  const matches = units.filter((unit) => unit.display_name.toLocaleUpperCase("pt-BR").includes(normalized)).slice(0, 60);
  results.replaceChildren();
  matches.forEach((unit) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "unit-option";
    button.setAttribute("role", "option");
    button.textContent = unit.display_name;
    button.addEventListener("mousedown", (event) => { event.preventDefault(); chooseUnit(unit); });
    results.append(button);
  });
  results.hidden = matches.length === 0;
}

function resetForm() {
  activeRecordId = null;
  selectedUnit = null;
  byId("inspection-form").reset();
  byId("record-id").value = "";
  byId("unit-id").value = "";
  byId("selected-unit").textContent = "Nenhuma unidade selecionada";
  byId("form-title").textContent = "Nova vistoria técnica";
  byId("record-badge").hidden = true;
  byId("camera-points").replaceChildren();
  for (let i = 0; i < 12; i += 1) addPoint();
  renderInfrastructure();
  renderChecks("cabling-checks", CABLING, [], "cabling");
  renderEquipment();
  renderChecks("rack-conditions", RACK_CONDITIONS);
  renderChecks("electric-checks", ELECTRIC, [], "observed");
  renderChecks("certification-checks", CERTIFICATION, [], "observed");
  byId("issues").replaceChildren(); for (let i = 0; i < 7; i += 1) addIssue();
  byId("solutions").replaceChildren(); for (let i = 0; i < 6; i += 1) addSolution();
}

function setValue(id, value) { byId(id).value = value ?? ""; }

function fillPeople(data = {}) {
  ["ipq", "tjce"].forEach((role) => {
    $$(`[data-person="${role}"]`).forEach((input) => { input.value = data[role]?.[input.dataset.field] ?? ""; });
  });
}

async function openVisit(id) {
  try {
    const response = await fetch(`/api/vistorias/${id}`);
    if (!response.ok) throw new Error("Vistoria não encontrada.");
    const visit = await response.json();
    resetForm();
    activeRecordId = visit.id;
    const unit = units.find((item) => item.id === visit.unidade_id);
    if (unit) chooseUnit(unit);
    const data = visit.respostas;
    const ident = data.identificacao || {};
    setValue("inspection-date", ident.data_vistoria);
    setValue("start-time", ident.horario_inicio);
    setValue("end-time", ident.horario_termino);
    setValue("ipq-team", ident.equipe_ipq);
    setValue("local-responsible", ident.responsavel_local);
    byId("camera-points").replaceChildren();
    (data.pontos_camera || []).forEach(addPoint);
    if (!(data.pontos_camera || []).length) for (let i = 0; i < 12; i += 1) addPoint();
    renderInfrastructure(data.infraestrutura || {});
    renderChecks("cabling-checks", CABLING, data.cabeamento || [], "cabling");
    renderEquipment(data.equipamentos || []);
    renderChecks("rack-conditions", RACK_CONDITIONS, data.condicoes_rack || []);
    renderChecks("electric-checks", ELECTRIC, data.infraestrutura_eletrica || [], "observed");
    renderChecks("certification-checks", CERTIFICATION, data.certificacao || [], "observed");
    byId("issues").replaceChildren(); (data.pendencias || []).forEach(addIssue); while ($$("#issues tr").length < 7) addIssue();
    byId("solutions").replaceChildren(); (data.solucoes || []).forEach(addSolution); while ($$("#solutions tr").length < 6) addSolution();
    $$('input[name="conclusion"]').forEach((input) => { input.checked = input.value === data.conclusao?.situacao; });
    setValue("final-notes", data.conclusao?.observacoes_finais);
    fillPeople(data.responsaveis || {});
    byId("form-title").textContent = `Editar vistoria #${visit.id}`;
    byId("record-badge").textContent = visit.status;
    byId("record-badge").hidden = false;
    showView("form-view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) { showMessage(error.message, "error"); }
}

function currentFilters() {
  const params = new URLSearchParams();
  if (byId("history-unit").value) params.set("unidade_id", byId("history-unit").value);
  if (byId("history-start").value) params.set("data_inicio", byId("history-start").value);
  if (byId("history-end").value) params.set("data_fim", byId("history-end").value);
  return params;
}

function displayDate(value) {
  if (!value) return "Não informado";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function addHistoryCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "Não informado";
  row.append(cell);
  return cell;
}

async function loadHistory() {
  const tbody = byId("history-rows");
  tbody.replaceChildren();
  try {
    const response = await fetch(`/api/vistorias?${currentFilters()}`);
    const records = await response.json();
    records.forEach((record) => {
      const row = document.createElement("tr");
      addHistoryCell(row, record.id);
      addHistoryCell(row, record.unidade_nome);
      addHistoryCell(row, displayDate(record.data_vistoria));
      addHistoryCell(row, record.equipe_ipq || "Não informado");
      addHistoryCell(row, record.situacao || "Não informado");
      const statusCell = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `status-pill ${record.status === "Concluída" ? "done" : "draft"}`;
      pill.textContent = record.status;
      statusCell.append(pill); row.append(statusCell);
      addHistoryCell(row, new Date(record.atualizado_em).toLocaleString("pt-BR"));
      const actions = document.createElement("td"); actions.className = "table-actions";
      const open = document.createElement("button"); open.type = "button"; open.textContent = "Abrir / Editar"; open.addEventListener("click", () => openVisit(record.id));
      const exportLink = document.createElement("a"); exportLink.href = `/api/vistorias/${record.id}/exportar`; exportLink.textContent = "Excel";
      actions.append(open, exportLink); row.append(actions);
      tbody.append(row);
    });
    byId("history-empty").hidden = records.length !== 0;
  } catch { showMessage("Não foi possível carregar o histórico.", "error"); }
}

function showView(viewId) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  $$(".nav-button[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  if (viewId === "history-view") loadHistory();
}

function exportFiltered() {
  window.location.href = `/api/exportar?${currentFilters()}`;
}

async function initialize() {
  try {
    const response = await fetch("/api/unidades");
    units = await response.json();
    const historySelect = byId("history-unit");
    units.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit.id; option.textContent = unit.display_name;
      historySelect.append(option);
    });
  } catch { showMessage("Não foi possível carregar o catálogo de unidades.", "error"); }
  resetForm();
}

byId("unit-search").addEventListener("input", (event) => {
  if (!selectedUnit || event.target.value !== selectedUnit.display_name) {
    selectedUnit = null; byId("unit-id").value = ""; byId("selected-unit").textContent = "Nenhuma unidade selecionada";
  }
  renderUnitSearch(event.target.value);
});
byId("unit-search").addEventListener("focus", (event) => renderUnitSearch(event.target.value));
byId("unit-search").addEventListener("blur", () => window.setTimeout(() => { byId("unit-results").hidden = true; }, 120));
byId("add-point").addEventListener("click", () => addPoint());
byId("add-issue").addEventListener("click", () => addIssue());
byId("add-solution").addEventListener("click", () => addSolution());
byId("save-draft").addEventListener("click", () => saveVisit("Rascunho"));
byId("save-complete").addEventListener("click", () => saveVisit("Concluída"));
byId("apply-filters").addEventListener("click", loadHistory);
byId("export-filtered").addEventListener("click", exportFiltered);
byId("nav-export").addEventListener("click", () => { window.location.href = "/api/exportar"; });
$$('[data-clear="conclusion"]').forEach((button) => button.addEventListener("click", () => $$('input[name="conclusion"]').forEach((input) => { input.checked = false; })));
$$('.nav-button[data-view]').forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.view === "form-view") resetForm();
  showView(button.dataset.view);
}));

initialize();
