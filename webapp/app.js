const APP_CONFIG = window.APP_CONFIG ?? {};

const STATES = [
  "En Registro y Control",
  "En Logistica",
  "Rescatado",
  "No Efectivo",
  "Traslado Bodega"
];

const STORAGE_KEYS = {
  abandonos: "abandonos-app-abandonos",
  gestionRegistro: "abandonos-app-inspeccion-rc",
  gestionLogistica: "abandonos-app-gestion-logistica",
  demoVersion: "abandonos-app-demo-version",
  testerUser: "abandonos-app-tester-user"
};

const DEMO_DATA_VERSION = "6";

const state = {
  currentView: "registro",
  records: [],
  search: "",
  searchRaw: "",
  filters: { registro: "todos", logistica: "todos", administracion: "todos" },
  logisticaFilter: "En Logistica",
  panelRecordId: null,
  panelMode: "view"
};

const DEFAULT_USER = APP_CONFIG.currentUser ?? {
  initials: "JD",
  name: "Juan Diaz",
  role: "ADMINISTRADOR"
};

const ROLE_KEYS = {
  ADMIN: "ADMINISTRADOR",
  COORD_RC: "COORDINADOR_RC",
  RECON_RC: "RECONOCEDOR_RC",
  COORD_LOG: "COORDINADOR_LOGISTICA",
  RECON_LOG: "RECONOCEDOR_LOGISTICA"
};

const ROLE_LABELS = {
  [ROLE_KEYS.ADMIN]: "Administrador",
  [ROLE_KEYS.COORD_RC]: "Coordinador Registro y Control",
  [ROLE_KEYS.RECON_RC]: "Reconocedor Registro y Control",
  [ROLE_KEYS.COORD_LOG]: "Coordinador Logistica",
  [ROLE_KEYS.RECON_LOG]: "Reconocedor Logistica"
};

const TEST_ROLE_ORDER = [
  ROLE_KEYS.ADMIN,
  ROLE_KEYS.COORD_RC,
  ROLE_KEYS.RECON_RC,
  ROLE_KEYS.COORD_LOG,
  ROLE_KEYS.RECON_LOG
];

let currentUser = loadCurrentUser();
let currentRoleKey = getRoleKey(currentUser.role);

function normalizeRoleValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getRoleKey(role) {
  const normalized = normalizeRoleValue(role);
  if (normalized.includes("ADMINISTRADOR")) return ROLE_KEYS.ADMIN;
  if (normalized.includes("COORDINADOR REGISTRO")) return ROLE_KEYS.COORD_RC;
  if (normalized.includes("RECONOCEDOR REGISTRO")) return ROLE_KEYS.RECON_RC;
  if (normalized.includes("COORDINADOR LOGISTICA")) return ROLE_KEYS.COORD_LOG;
  if (normalized.includes("RECONOCEDOR LOGISTICA")) return ROLE_KEYS.RECON_LOG;
  return ROLE_KEYS.ADMIN;
}

function normalizeEstadoValue(value) {
  const estado = String(value || "").trim();
  if (!estado) return "En Registro y Control";
  if (estado === "Rescatado por Legalizado") return "Rescatado";
  return estado;
}

function getRoleLabel(roleKey) {
  return ROLE_LABELS[roleKey] ?? ROLE_LABELS[ROLE_KEYS.ADMIN];
}

function getUsersForRole(roleKey) {
  const configuredUsers = normalizeResponsablesRC(
    APP_CONFIG.roleProfiles?.[roleKey] ?? [],
    ""
  );

  if (configuredUsers.length) {
    return configuredUsers;
  }

  if (roleKey === ROLE_KEYS.RECON_RC) {
    return normalizeResponsablesRC(APP_CONFIG.responsablesRC ?? [], "");
  }

  if (roleKey === ROLE_KEYS.RECON_LOG) {
    return normalizeResponsablesRC(APP_CONFIG.responsablesLogistica ?? [], "");
  }

  return [DEFAULT_USER.name];
}

function buildInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "JD";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function loadCurrentUser() {
  const fallbackRoleKey = getRoleKey(DEFAULT_USER.role);
  const fallbackName = String(DEFAULT_USER.name || "").trim() || "Juan Diaz";
  const fallbackUser = {
    name: fallbackName,
    role: getRoleLabel(fallbackRoleKey),
    initials: DEFAULT_USER.initials || buildInitials(fallbackName)
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.testerUser);
    if (!raw) {
      return fallbackUser;
    }

    const storedUser = JSON.parse(raw);
    const roleKey = getRoleKey(storedUser?.role);
    const allowedUsers = getUsersForRole(roleKey);
    const candidateName = String(storedUser?.name || "").trim();
    const resolvedName = candidateName || allowedUsers[0] || fallbackName;

    return {
      name: resolvedName,
      role: getRoleLabel(roleKey),
      initials: buildInitials(resolvedName)
    };
  } catch (_error) {
    return fallbackUser;
  }
}

function isAdmin() {
  return currentRoleKey === ROLE_KEYS.ADMIN;
}

function isCoordinatorRC() {
  return currentRoleKey === ROLE_KEYS.COORD_RC;
}

function isRecognizerRC() {
  return currentRoleKey === ROLE_KEYS.RECON_RC;
}

function isCoordinatorLogistica() {
  return currentRoleKey === ROLE_KEYS.COORD_LOG;
}

function isRecognizerLogistica() {
  return currentRoleKey === ROLE_KEYS.RECON_LOG;
}

function canView(viewKey) {
  if (isAdmin()) return true;
  if (viewKey === "registro") return isCoordinatorRC() || isRecognizerRC();
  if (viewKey === "logistica") return isCoordinatorLogistica() || isRecognizerLogistica();
  if (viewKey === "administracion") return false;
  if (viewKey === "modelo") return false;
  return false;
}

function canViewModeloDatos() {
  return isAdmin();
}

function ensureAllowedCurrentView() {
  if (state.currentView === "modelo" && canViewModeloDatos()) return;
  if (canView(state.currentView)) return;
  if (canView("registro")) {
    state.currentView = "registro";
    return;
  }
  if (canView("logistica")) {
    state.currentView = "logistica";
    return;
  }
  if (canView("administracion")) {
    state.currentView = "administracion";
    return;
  }
  if (canViewModeloDatos()) {
    state.currentView = "modelo";
  }
}

function canCreateAbandono() {
  return isAdmin() || isCoordinatorRC();
}

function canManageRegistroWorkflow() {
  return isAdmin() || isCoordinatorRC();
}

function canReportRegistroToLogistica(record) {
  return isAdmin() || isCoordinatorRC() || isAssignedRecognizerRC(record);
}

function canManageLogisticaWorkflow() {
  return isAdmin() || isCoordinatorLogistica();
}

function isAssignedRecognizerRC(record) {
  return isRecognizerRC() && record?.responsableRC === currentUser.name;
}

function isAssignedRecognizerLogistica(record) {
  return isRecognizerLogistica() && record?.funcionarioLogistica === currentUser.name;
}

function canEditRegistroGeneral(record) {
  if (!record?.id) return canCreateAbandono();
  return isAdmin() || isCoordinatorRC();
}

function canAssignResponsableRC() {
  return isAdmin() || isCoordinatorRC();
}

function canEditRegistroInspection(record) {
  return isAdmin() || isCoordinatorRC() || isAssignedRecognizerRC(record);
}

function canAssignResponsableLogistica() {
  return isAdmin() || isCoordinatorLogistica();
}

function canEditLogisticaInspection(record) {
  return isAdmin() || isCoordinatorLogistica() || isAssignedRecognizerLogistica(record);
}

function canMarkTrasladoBodega(record) {
  return isAdmin() || isCoordinatorLogistica() || isAssignedRecognizerLogistica(record);
}

function getRoleScopedRecords(scope, records) {
  if (isAdmin()) return records;
  if (scope === "registro" && isRecognizerRC()) {
    return records.filter((record) => record.responsableRC === currentUser.name);
  }
  if (scope === "logistica" && isRecognizerLogistica()) {
    return records.filter((record) => record.funcionarioLogistica === currentUser.name);
  }
  return records;
}

const responsablesRCOptions = normalizeResponsablesRC(APP_CONFIG.responsablesRC ?? [], "");

const responsablesLogisticaOptions = normalizeResponsablesRC(
  APP_CONFIG.responsablesLogistica ?? [],
  ""
);

const els = {
  registro: document.getElementById("view-registro"),
  logistica: document.getElementById("view-logistica"),
  administracion: document.getElementById("view-administracion"),
  modelo: document.getElementById("view-modelo"),
  overlay: document.getElementById("overlay"),
  sidePanel: document.getElementById("sidePanel"),
  roleSelector: document.getElementById("roleSelector"),
  userSelector: document.getElementById("userSelector"),
  dataModeBadge: document.getElementById("dataModeBadge"),
  dataModelButton: document.getElementById("dataModelButton"),
  userPill: document.getElementById("userPill"),
  userAvatar: document.getElementById("userAvatar"),
  userName: document.getElementById("userName"),
  userRole: document.getElementById("userRole"),
  navItems: Array.from(document.querySelectorAll(".nav-item"))
};

const DATA_MODEL = {
  abandono: {
    title: "ABANDONOS",
    subtitle: "Lista maestra del expediente. Usa DocumentoTransporte como clave funcional unica y concentra las fechas del proceso.",
    fields: [
      { name: "DocumentoTransporte", type: "Texto unico", rule: "Editable", note: "Llave principal del proceso" },
      { name: "Manifiesto", type: "Texto", rule: "Editable", note: "Solo informativo" },
      { name: "Consignatario", type: "Texto", rule: "Editable", note: "Dato base del expediente" },
      { name: "Deposito", type: "Texto", rule: "Editable", note: "Ubicacion del caso" },
      { name: "FechaAbandono", type: "Fecha", rule: "Editable", note: "Fecha origen del expediente" },
      { name: "DescripcionMercancia", type: "Texto largo", rule: "Editable", note: "Descripcion general" },
      { name: "ObservacionesGenerales", type: "Texto largo", rule: "Editable", note: "Notas generales" },
      { name: "Estado", type: "Texto", rule: "Automatica", note: "Solo usa 5 valores: En Registro y Control, En Logistica, Rescatado, No Efectivo y Traslado Bodega" },
      { name: "FechaReporteLogistica", type: "Fecha y hora", rule: "Automatica", note: "Se llena cuando el expediente pasa a En Logistica" },
      { name: "FechaDisposicion", type: "Fecha y hora", rule: "Automatica", note: "Fecha Traslado Bodega" },
      { name: "FechaCierre", type: "Fecha y hora", rule: "Automatica", note: "Se usa para cierres por Rescatado o No Efectivo" },
      { name: "FechaCreacion", type: "Fecha y hora", rule: "Automatica", note: "Auditoria basica" },
      { name: "FechaActualizacion", type: "Fecha y hora", rule: "Automatica", note: "Ultima modificacion" }
    ]
  },
  gestionRegistro: {
    title: "GESTION_REGISTRO",
    subtitle: "Datos propios de Gestion Registro y Control. Relacion 1:1 opcional con ABANDONOS.",
    fields: [
      { name: "DocumentoTransporte", type: "Texto unico", rule: "Editable", note: "Relacion directa con ABANDONOS" },
      { name: "ResponsableRC", type: "Lista", rule: "Editable", note: "Responsable de Registro y Control" },
      { name: "NumeroActaInspeccionRC", type: "Texto", rule: "Editable", note: "Consecutivo del acta de inspeccion de Registro y Control" },
      { name: "FechaInspeccionRC", type: "Fecha", rule: "Editable", note: "Fecha de gestion o inspeccion RC" },
      { name: "CantidadMercanciaRC", type: "Numero o texto", rule: "Editable", note: "Cantidad registrada en inspeccion RC" },
      { name: "PesoMercanciaRC", type: "Numero o texto", rule: "Editable", note: "Peso registrado en inspeccion RC" },
      { name: "DescripcionMercanciaRC", type: "Texto largo", rule: "Editable", note: "Descripcion de mercancia validada en inspeccion RC" },
      { name: "ObservacionesRC", type: "Texto largo", rule: "Editable", note: "Hallazgos RC" },
      { name: "AdjuntosRC", type: "Adjuntos (multiple)", rule: "Editable", note: "Archivos subidos por el GIT de Registro y Control. En SharePoint corresponde a los adjuntos nativos del elemento" },
      { name: "FechaActualizacion", type: "Fecha y hora", rule: "Automatica", note: "Ultima modificacion de la inspeccion RC" }
    ]
  },
  gestionLogistica: {
    title: "GESTION_LOGISTICA",
    subtitle: "Datos propios de Gestion Operacion Logistica. Relacion 1:1 opcional con ABANDONOS.",
    fields: [
      { name: "DocumentoTransporte", type: "Texto unico", rule: "Editable", note: "Relacion directa con ABANDONOS" },
      { name: "FuncionarioLogistica", type: "Lista o texto", rule: "Editable", note: "Responsable logistico" },
      { name: "NumeroActaInspeccionLogistica", type: "Texto", rule: "Editable", note: "Consecutivo del acta de inspeccion de Operacion Logistica" },
      { name: "FechaInspeccionLogistica", type: "Fecha", rule: "Editable", note: "Fecha de inspeccion en operacion logistica" },
      { name: "CantidadMercanciaLogistica", type: "Numero o texto", rule: "Editable", note: "Cantidad verificada en logistica" },
      { name: "PesoMercanciaLogistica", type: "Numero o texto", rule: "Editable", note: "Peso verificado en logistica" },
      { name: "DescripcionMercanciaLogistica", type: "Texto largo", rule: "Editable", note: "Descripcion validada en logistica" },
      { name: "AvaluoTemporal", type: "Numero", rule: "Editable", note: "Valor preliminar del avaluo" },
      { name: "AvaluoDefinitivo", type: "Numero", rule: "Editable", note: "Valor final del avaluo" },
      { name: "ObservacionesLogistica", type: "Texto largo", rule: "Editable", note: "Notas de gestion" },
      { name: "AdjuntosLogistica", type: "Adjuntos (multiple)", rule: "Editable", note: "Archivos subidos por el GIT de Operacion Logistica. En SharePoint corresponde a los adjuntos nativos del elemento" },
      { name: "FechaActualizacion", type: "Fecha y hora", rule: "Automatica", note: "Ultima modificacion de la gestion logistica" }
    ]
  },
  calculados: {
    title: "CAMPOS CALCULADOS",
    subtitle: "Estos valores se calculan en la app; no necesitan lista propia ni captura manual.",
    fields: [
      { name: "FechaAFavorNacion", type: "Calculado", rule: "No editable", note: "FechaAbandono + 1 mes" },
      { name: "SemaforoRegistroYControl", type: "Calculado", rule: "No editable", note: "Depende de FechaAFavorNacion y del estado del expediente" },
      { name: "FechaLimiteLogistica", type: "Calculado", rule: "No editable", note: "FechaReporteLogistica + 2 meses" },
      { name: "SemaforoLogistica", type: "Calculado", rule: "No editable", note: "Depende de FechaLimiteLogistica y del estado del expediente" },
      { name: "ResponsableActual", type: "Calculado", rule: "No editable", note: "Depende del estado y la etapa" }
    ]
  }
};

const dataService = createDataService(APP_CONFIG.dataMode);

boot();

async function boot() {
  bindShellEvents();
  syncCurrentUserVisuals();
  await loadData();
  ensureAllowedCurrentView();
  renderAll();
}

function bindShellEvents() {
  els.overlay.addEventListener("click", closePanel);

  bindRoleTesterEvents();

  els.dataModelButton.addEventListener("click", () => {
    if (!canViewModeloDatos()) return;
    state.currentView = "modelo";
    state.search = "";
    state.searchRaw = "";
    closePanel();
    renderAll();
  });

  els.navItems.forEach((button) => {
    button.addEventListener("click", () => {
      if (!canView(button.dataset.view)) return;
      state.currentView = button.dataset.view;
      state.search = "";
      state.searchRaw = "";
      closePanel();
      renderAll();
    });
  });
}

function bindRoleTesterEvents() {
  renderRoleSelector();
  renderUserSelector();

  els.roleSelector.addEventListener("change", (event) => {
    const nextRoleKey = event.target.value;
    const candidates = getUsersForRole(nextRoleKey);
    const nextName = candidates[0] || DEFAULT_USER.name;
    setCurrentUser({
      name: nextName,
      role: getRoleLabel(nextRoleKey)
    });
  });

  els.userSelector.addEventListener("change", (event) => {
    setCurrentUser({
      name: event.target.value,
      role: getRoleLabel(currentRoleKey)
    });
  });
}

function syncCurrentUserVisuals() {
  els.userPill.textContent = currentUser.initials ?? "JD";
  els.userAvatar.textContent = currentUser.initials ?? "JD";
  els.userName.textContent = currentUser.name;
  els.userRole.textContent = getRoleLabel(currentRoleKey);
  els.userPill.title = `${currentUser.name} - ${getRoleLabel(currentRoleKey)}`;
  els.dataModeBadge.textContent = APP_CONFIG.dataMode === "sharepoint" ? "SharePoint" : "Mock local";
  renderRoleSelector();
  renderUserSelector();
}

function renderRoleSelector() {
  els.roleSelector.innerHTML = TEST_ROLE_ORDER
    .map((roleKey) => `<option value="${escapeAttr(roleKey)}" ${roleKey === currentRoleKey ? "selected" : ""}>${escapeHtml(getRoleLabel(roleKey))}</option>`)
    .join("");
}

function renderUserSelector() {
  const users = getUsersForRole(currentRoleKey);
  if (!users.includes(currentUser.name)) {
    users.unshift(currentUser.name);
  }
  els.userSelector.innerHTML = users
    .map((userName) => `<option value="${escapeAttr(userName)}" ${userName === currentUser.name ? "selected" : ""}>${escapeHtml(userName)}</option>`)
    .join("");
}

function setCurrentUser({ name, role }) {
  currentUser = {
    name,
    role,
    initials: buildInitials(name)
  };
  currentRoleKey = getRoleKey(role);
  localStorage.setItem(STORAGE_KEYS.testerUser, JSON.stringify(currentUser));
  closePanel();
  syncCurrentUserVisuals();
  ensureAllowedCurrentView();
  renderAll();
}

async function loadData() {
  const payload = await dataService.getAll();
  state.records = payload.records.sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion));
}

function renderAll() {
  ensureAllowedCurrentView();
  updateActiveView();
  renderRegistroView();
  renderLogisticaView();
  renderAdministracionView();
  renderDataModelView();
}

function updateActiveView() {
  Object.entries({
    registro: els.registro,
    logistica: els.logistica,
    administracion: els.administracion,
    modelo: els.modelo
  }).forEach(([key, element]) => {
    element.classList.toggle("active", state.currentView === key);
  });

  els.navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
    button.style.display = canView(button.dataset.view) ? "" : "none";
  });
  els.dataModelButton.classList.toggle("active", state.currentView === "modelo");
  els.dataModelButton.style.display = canViewModeloDatos() ? "" : "none";
}

function renderSearchBox() {
  return `
    <label class="search-shell">
      <input class="search-input" data-role="search" type="search" placeholder="Buscar abandono..." value="${escapeAttr(state.searchRaw)}" />
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>
    </label>
  `;
}

function bindSearch(root) {
  const input = root.querySelector('[data-role="search"]');
  if (!input) return;
  input.addEventListener("input", (event) => {
    state.searchRaw = event.target.value;
    state.search = state.searchRaw.trim().toLowerCase();
    renderAll();
    const activeInput = document.querySelector(".view.active [data-role='search']");
    if (activeInput) {
      activeInput.focus();
      activeInput.setSelectionRange(state.searchRaw.length, state.searchRaw.length);
    }
  });
}

function renderKpiCards(items) {
  return `
    <div class="kpi-grid">
      ${items.map((item) => {
        return `
        <div class="card kpi-card ${item.tone ? `kpi-${item.tone}` : ""}">
          <div class="kpi-label">${escapeHtml(item.label)}</div>
          <div class="kpi-value">${item.value}</div>
          <div class="kpi-note">${escapeHtml(item.note)}</div>
        </div>`;
      }).join("")}
    </div>
  `;
}

function isPendiente(view, record) {
  // La gestion de cada GIT solo se da por terminada cuando el caso sale de su
  // etapa (trasladado al siguiente GIT o cerrado). Tener la inspeccion
  // registrada no basta: mientras siga en la etapa, sigue pendiente.
  if (view === "registro") return record.estado === "En Registro y Control";
  if (view === "logistica") return record.estado === "En Logistica";
  return !isFinalEstado(record.estado);
}

function matchesFilter(view, filter, record) {
  const semaforo = view === "logistica" ? getSemaforoLogistica : getSemaforo;
  switch (filter) {
    case "pendientes":
      return isPendiente(view, record);
    case "completados":
      return !isFinalEstado(record.estado) && !isPendiente(view, record);
    case "vencidos":
      return semaforo(record).tone === "rojo";
    case "proximos":
      return semaforo(record).tone === "amarillo";
    case "en-rc":
      return record.estado === "En Registro y Control";
    case "en-logistica":
      return record.estado === "En Logistica";
    case "cerrados":
      return isFinalEstado(record.estado);
    default:
      return true;
  }
}

function applyViewFilter(view, records) {
  const filter = state.filters[view];
  return filter === "todos" ? records : records.filter((record) => matchesFilter(view, filter, record));
}

function renderFilterBar(view, base, options) {
  return `
    <div class="filter-bar" role="group" aria-label="Filtrar expedientes">
      ${options.map((option) => {
        const count = option.value === "todos" ? base.length : base.filter((record) => matchesFilter(view, option.value, record)).length;
        const active = state.filters[view] === option.value ? " active" : "";
        return `<button class="filter-chip${active}" type="button" data-filter="${option.value}" data-view-filter="${view}">${escapeHtml(option.label)} <span class="filter-count">${count}</span></button>`;
      }).join("")}
    </div>
  `;
}

function bindFilters(root) {
  Array.from(root.querySelectorAll("[data-filter]")).forEach((element) => {
    const apply = () => {
      const view = element.dataset.viewFilter;
      const value = element.dataset.filter;
      state.filters[view] = state.filters[view] === value && value !== "todos" ? "todos" : value;
      renderAll();
    };
    element.addEventListener("click", apply);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        apply();
      }
    });
  });
}

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Pendientes" }
];

function countBySemaforo(records, getter, tone) {
  return records.filter((record) => getter(record).tone === tone).length;
}

function renderChip(tone, label) {
  return `<span class="chip chip-${tone}">${escapeHtml(label)}</span>`;
}

function getGestionEstado(view, record) {
  if (view === "registro") {
    switch (record.estado) {
      case "En Registro y Control":
        return { tone: "warn", label: "Pendiente" };
      case "En Logistica":
      case "Traslado Bodega":
        return { tone: "ok", label: "Reportado a Logística" };
      case "Rescatado":
        return { tone: "info", label: "Rescatado" };
      case "No Efectivo":
        return { tone: "neutral", label: "No Efectivo" };
      default:
        return { tone: "neutral", label: record.estado };
    }
  }
  if (view === "logistica") {
    switch (record.estado) {
      case "En Logistica":
        return { tone: "warn", label: "Pendiente" };
      case "Traslado Bodega":
        return { tone: "ok", label: "Traslado a Bodega" };
      default:
        return { tone: "neutral", label: record.estado };
    }
  }
  return { tone: "neutral", label: record.estado };
}

function renderGestionChip(view, record) {
  const { tone, label } = getGestionEstado(view, record);
  return renderChip(tone, label);
}

function renderResponsableChip(name) {
  return name ? escapeHtml(name) : renderChip("bad", "Sin asignar");
}

function renderEyeButton(label = "Ver detalle") {
  return `
    <button class="eye-button" type="button" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  `;
}

const MAX_ADJUNTO_BYTES = 5 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsDataURL(file);
  });
}

function renderAdjuntosList(adjuntos, canEdit) {
  if (!adjuntos.length) {
    return `<div class="empty-state">Sin adjuntos.</div>`;
  }
  return `
    <div class="adjuntos-list">
      ${adjuntos.map((adjunto) => `
        <div class="adjunto-item">
          <a class="adjunto-link" href="${escapeAttr(adjunto.contenido)}" download="${escapeAttr(adjunto.nombre)}" target="_blank" rel="noopener">${escapeHtml(adjunto.nombre)}</a>
          <span class="adjunto-meta">${escapeHtml(formatFileSize(adjunto.tamano))} · ${formatDateTime(adjunto.fecha)} · ${escapeHtml(adjunto.usuario)}</span>
          ${canEdit ? `<button class="btn-link adjunto-remove" type="button" data-action="remove-adjunto" data-adjunto-id="${escapeAttr(adjunto.id)}">Quitar</button>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderAdjuntosSection(view, adjuntos, canEdit) {
  const inputId = `adjuntoInput-${view}`;
  return `
    <div class="panel-section">
      <h3>Adjuntos</h3>
      ${renderAdjuntosList(adjuntos, canEdit)}
      ${canEdit ? `
        <div class="adjunto-upload">
          <input type="file" id="${inputId}" data-role="adjunto-input" />
          <button class="btn btn-secondary btn-quiet" type="button" data-action="upload-adjunto">Subir adjunto</button>
        </div>
        <p class="field-hint">Maximo 5 MB por archivo. En modo local el archivo queda guardado en este navegador.</p>
      ` : ""}
    </div>
  `;
}

async function uploadAdjunto(view, recordId) {
  const input = els.sidePanel.querySelector('[data-role="adjunto-input"]');
  const file = input?.files?.[0];
  if (!file) {
    alert("Selecciona un archivo primero.");
    return;
  }
  if (file.size > MAX_ADJUNTO_BYTES) {
    alert("El archivo supera el limite de 5 MB para el modo local.");
    return;
  }
  try {
    const contenido = await readFileAsDataUrl(file);
    const adjunto = {
      id: crypto.randomUUID(),
      nombre: file.name,
      tipo: file.type || "application/octet-stream",
      tamano: file.size,
      contenido,
      fecha: todayIsoDateTime(),
      usuario: currentUser.name
    };
    if (view === "registro") {
      await dataService.addAdjuntoRC(recordId, adjunto);
    } else {
      await dataService.addAdjuntoLogistica(recordId, adjunto);
    }
    await loadData();
    renderAll();
    if (view === "registro") {
      openRegistroPanel(recordId);
    } else {
      openLogisticaPanel(recordId);
    }
  } catch (error) {
    alert(error?.message || "No se pudo subir el adjunto. Puede que el modo local se haya quedado sin espacio.");
  }
}

async function removeAdjunto(view, recordId, adjuntoId) {
  if (!adjuntoId) return;
  if (!window.confirm("Quitar este adjunto?")) return;
  try {
    if (view === "registro") {
      await dataService.removeAdjuntoRC(recordId, adjuntoId);
    } else {
      await dataService.removeAdjuntoLogistica(recordId, adjuntoId);
    }
    await loadData();
    renderAll();
    if (view === "registro") {
      openRegistroPanel(recordId);
    } else {
      openLogisticaPanel(recordId);
    }
  } catch (error) {
    alert(error?.message || "No se pudo quitar el adjunto.");
  }
}

function bindAdjuntosEvents(view, recordId) {
  const uploadButton = els.sidePanel.querySelector('[data-action="upload-adjunto"]');
  if (uploadButton) {
    uploadButton.addEventListener("click", () => uploadAdjunto(view, recordId));
  }
  Array.from(els.sidePanel.querySelectorAll('[data-action="remove-adjunto"]')).forEach((button) => {
    button.addEventListener("click", () => removeAdjunto(view, recordId, button.dataset.adjuntoId));
  });
}

function isFinalEstado(estado) {
  return ["Rescatado", "No Efectivo", "Traslado Bodega"].includes(estado);
}

function renderRegistroView() {
  if (!canView("registro")) {
    els.registro.innerHTML = "";
    return;
  }
  const allRoleRecords = getRoleScopedRecords("registro", state.records);
  const activeBase = allRoleRecords.filter((record) => record.estado === "En Registro y Control");
  const records = applyViewFilter("registro", getRoleScopedRecords("registro", getFilteredRecords()));
  els.registro.innerHTML = `
    <div class="view-card">
      <div class="page-header">
        <div>
          <h2 class="page-title">GIT Registro y Control</h2>
          <p class="page-subtitle">Listado general y gestión operativa de expedientes en Registro y Control. Los casos ya trasladados a otra gestión quedan visibles como no pendientes.</p>
        </div>
        <div class="page-actions">
          ${renderFilterBar("registro", allRoleRecords, FILTERS)}
          ${renderSearchBox()}
          ${canCreateAbandono() ? '<button class="btn btn-primary" data-action="new-record" type="button">Nuevo Abandono</button>' : ""}
        </div>
      </div>
      ${renderKpiCards([
        { label: "Expedientes en GIT", value: activeBase.length, note: "Registros activos en Registro y Control" },
        { label: "Vencidos", value: countBySemaforo(activeBase, getSemaforo, "rojo"), note: "Superaron la fecha a favor de la Nación", tone: "red" },
        { label: "Próximos a vencer", value: countBySemaforo(activeBase, getSemaforo, "amarillo"), note: "Vencen en 15 días o menos", tone: "amber" },
        { label: "Con inspección RC", value: activeBase.filter((record) => record.fechaInspeccionRC).length, note: "Inspección registrada por el GIT", tone: "green" }
      ])}
      <div class="table-card">
        ${renderTable(records, "registro")}
        <div class="footer-bar">
          <span>Mostrando ${records.length} de ${allRoleRecords.length} registros</span>
        </div>
      </div>
    </div>
  `;

  const newRecordButton = els.registro.querySelector('[data-action="new-record"]');
  if (newRecordButton) {
    newRecordButton.addEventListener("click", () => openRegistroPanel());
  }
  bindSearch(els.registro);
  bindFilters(els.registro);
  bindRowClicks(els.registro, "registro");
}

function renderLogisticaView() {
  if (!canView("logistica")) {
    els.logistica.innerHTML = "";
    return;
  }
  const allRoleRecords = getRoleScopedRecords("logistica", state.records).filter((record) =>
    ["En Logistica", "Traslado Bodega"].includes(record.estado)
  );
  const activeBase = allRoleRecords.filter((record) => record.estado === "En Logistica");
  const records = applyViewFilter("logistica", getRoleScopedRecords("logistica", getFilteredRecords()).filter((record) =>
    ["En Logistica", "Traslado Bodega"].includes(record.estado)
  ));
  const trasladados = allRoleRecords.filter((record) =>
    record.estado === "Traslado Bodega"
  ).length;

  els.logistica.innerHTML = `
    <div class="view-card">
      <div class="page-header">
        <div>
          <h2 class="page-title">GIT Operación Logística</h2>
          <p class="page-subtitle">Bandeja operativa de expedientes reportados a gestión logística. Los casos ya trasladados a bodega quedan visibles como no pendientes.</p>
        </div>
        <div class="page-actions">
          ${renderFilterBar("logistica", allRoleRecords, FILTERS)}
          ${renderSearchBox()}
        </div>
      </div>
      ${renderKpiCards([
        { label: "Expedientes en GIT", value: activeBase.length, note: "Activos en Operación Logística" },
        { label: "Vencidos", value: countBySemaforo(activeBase, getSemaforoLogistica, "rojo"), note: "Superaron la fecha límite de traslado", tone: "red" },
        { label: "Próximos a vencer", value: countBySemaforo(activeBase, getSemaforoLogistica, "amarillo"), note: "Vencen en 15 días o menos", tone: "amber" },
        { label: "Trasladados a bodega", value: trasladados, note: "Cierre de gestión logística", tone: "green" }
      ])}
      <div class="table-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha reporte</th>
                <th>Documento de Transporte</th>
                <th>Consignatario</th>
                <th>Depósito</th>
                <th>Responsable Logística</th>
                <th>Fecha límite traslado</th>
                <th>Gestión Logística</th>
                <th>Ver detalle</th>
              </tr>
            </thead>
            <tbody>
              ${records.length ? records.map((record) => `
                <tr class="row-clickable" data-scope="logistica" data-record-id="${record.id}">
                  <td>${formatDate(record.fechaReporteLogistica)}</td>
                  <td>${escapeHtml(record.documentoTransporte)}</td>
                  <td>${escapeHtml(record.consignatario)}</td>
                  <td>${escapeHtml(record.deposito)}</td>
                  <td>${renderResponsableChip(record.funcionarioLogistica)}</td>
                  <td>${formatDate(getFechaLimiteLogistica(record))}</td>
                  <td>${renderGestionChip("logistica", record)}</td>
                  <td>${renderEyeButton()}</td>
                </tr>
              `).join("") : `<tr><td colspan="8"><div class="empty-state">No hay expedientes reportados a logística.</div></td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="footer-bar">
          <span>Mostrando ${records.length} de ${allRoleRecords.length} registros</span>
        </div>
      </div>
    </div>
  `;

  bindSearch(els.logistica);
  bindFilters(els.logistica);
  bindRowClicks(els.logistica, "logistica");
}

function renderAdministracionView() {
  if (!canView("administracion")) {
    els.administracion.innerHTML = "";
    return;
  }
  const records = applyViewFilter("administracion", getFilteredRecords());
  const stats = {
    total: state.records.length,
    rc: state.records.filter((record) => record.estado === "En Registro y Control").length,
    logistica: state.records.filter((record) => record.estado === "En Logistica").length,
    cerrados: state.records.filter((record) => isFinalEstado(record.estado)).length
  };

  els.administracion.innerHTML = `
    <div class="view-card">
      <div class="page-header">
        <div>
          <h2 class="page-title">Todos los Abandonos</h2>
          <p class="page-subtitle">Consulta general del proceso en ambos GIT: Registro y Control y Operación Logística.</p>
        </div>
        <div class="page-actions">
          ${renderFilterBar("administracion", state.records, FILTERS)}
          ${renderSearchBox()}
        </div>
      </div>
      ${renderKpiCards([
        { label: "Total de abandonos", value: stats.total, note: "Registros del proceso" },
        { label: "En Registro y Control", value: stats.rc, note: "En gestión del GIT de Registro y Control", tone: "blue" },
        { label: "En Operación Logística", value: stats.logistica, note: "En gestión del GIT de Logística", tone: "amber" },
        { label: "Cerrados", value: stats.cerrados, note: "Rescatados, no efectivos o trasladados", tone: "green" }
      ])}
      <div class="table-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha abandono</th>
                <th>Documento</th>
                <th>Consignatario</th>
                <th>Depósito</th>
                <th>Gestión RC</th>
                <th>Gestión Logística</th>
                <th>Fecha a favor de la Nación</th>
                <th>Fecha traslado bodega</th>
                <th>Días</th>
                <th>Ver detalle</th>
              </tr>
            </thead>
            <tbody>
              ${records.length ? records.map((record) => `
                <tr class="row-clickable" data-open-admin="${record.id}">
                  <td>${formatDate(record.fechaAbandono)}</td>
                  <td>${escapeHtml(record.documentoTransporte)}</td>
                  <td>${escapeHtml(record.consignatario)}</td>
                  <td>${escapeHtml(record.deposito)}</td>
                  <td>${renderGestionChip("registro", record)}</td>
                  <td>${record.fechaReporteLogistica ? renderGestionChip("logistica", record) : "-"}</td>
                  <td>${formatDate(getFechaAFavorNacion(record))}</td>
                  <td>${formatDate(record.fechaDisposicion)}</td>
                  <td>${calculateDays(record.fechaAbandono)}</td>
                  <td>${renderEyeButton()}</td>
                </tr>
              `).join("") : `<tr><td colspan="10"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="footer-bar">
          <span>Mostrando ${records.length} de ${stats.total} registros</span>
        </div>
      </div>
    </div>
  `;

  bindSearch(els.administracion);
  bindFilters(els.administracion);
  Array.from(els.administracion.querySelectorAll("[data-open-admin]")).forEach((row) => {
    row.addEventListener("click", () => openAdminPanel(row.dataset.openAdmin));
  });
}

function renderDataModelView() {
  if (!canViewModeloDatos()) {
    els.modelo.innerHTML = "";
    return;
  }
  els.modelo.innerHTML = `
    <div class="view-card">
    <div class="page-header">
      <div>
        <h2 class="page-title">Modelo de Datos</h2>
        <p class="page-subtitle">Vista completa del modelo funcional con 3 tablas relacionadas por DocumentoTransporte.</p>
      </div>
    </div>

    <div class="schema-summary-grid">
      <div class="schema-summary-card">
        <h2 class="schema-summary-title">Plataforma</h2>
        <p class="schema-summary-text">SharePoint Lists con <strong>3 tablas</strong>: ABANDONOS, GESTION_REGISTRO y GESTION_LOGISTICA.</p>
      </div>
      <div class="schema-summary-card">
        <h2 class="schema-summary-title">Identificador</h2>
        <p class="schema-summary-text"><strong>DocumentoTransporte</strong> es la clave funcional y de relacion entre las tablas.</p>
      </div>
      <div class="schema-summary-card">
        <h2 class="schema-summary-title">Estados</h2>
        <p class="schema-summary-text">La app usa <strong>5 estados</strong>: 2 temporales y 3 finales cerrados por resultado.</p>
      </div>
    </div>

    <div class="schema-hero">
      <div class="schema-box">
        <div class="schema-box-header">
          <h2 class="schema-box-title">ABANDONOS</h2>
          <p class="schema-box-subtitle">Tabla maestra del expediente</p>
        </div>
        <div class="schema-box-body">
          <div class="schema-key-list">
            <div class="schema-key-item">
              <div class="schema-key-name">PK funcional: DocumentoTransporte</div>
              <div class="schema-key-note">Identifica el expediente y no debe repetirse.</div>
            </div>
            <div class="schema-key-item">
              <div class="schema-key-name">Contiene datos base y control</div>
              <div class="schema-key-note">Datos generales, estado, fecha de reporte a logistica, fecha traslado bodega y cierre del expediente.</div>
            </div>
            <div class="schema-key-item">
              <div class="schema-key-name">No mezcla subetapas</div>
              <div class="schema-key-note">La inspeccion RC y la gestion logistica viven en tablas separadas.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="schema-link">
        <span>1:1</span>
      </div>

      <div class="schema-box">
        <div class="schema-box-header">
          <h2 class="schema-box-title">TABLAS RELACIONADAS</h2>
          <p class="schema-box-subtitle">Capas operativas por GIT</p>
        </div>
        <div class="schema-box-body">
          <div class="schema-key-list">
            <div class="schema-key-item">
              <div class="schema-key-name">GESTION_REGISTRO</div>
              <div class="schema-key-note">Relacion 1:1 opcional por DocumentoTransporte para Gestion Registro y Control.</div>
            </div>
            <div class="schema-key-item">
              <div class="schema-key-name">GESTION_LOGISTICA</div>
              <div class="schema-key-note">Relacion 1:1 opcional por DocumentoTransporte para Gestion Operacion Logistica.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${renderDataModelTable(DATA_MODEL.abandono)}
    ${renderDataModelTable(DATA_MODEL.gestionRegistro)}
    ${renderDataModelTable(DATA_MODEL.gestionLogistica)}
    ${renderDataModelTable(DATA_MODEL.calculados)}
    </div>
  `;
}

function renderTable(records, scope) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha de abandono</th>
            <th>Documento de Transporte</th>
            <th>Consignatario</th>
            <th>Depósito</th>
            <th>Responsable</th>
            <th>Fecha a favor de la Nación</th>
            <th>Gestión RC</th>
            <th>Ver detalle</th>
          </tr>
        </thead>
        <tbody>
          ${records.length ? records.map((record) => `
            <tr class="row-clickable" data-scope="${scope}" data-record-id="${record.id}">
              <td>${formatDate(record.fechaAbandono)}</td>
              <td>${escapeHtml(record.documentoTransporte)}</td>
              <td>${escapeHtml(record.consignatario)}</td>
              <td>${escapeHtml(record.deposito)}</td>
              <td>${renderResponsableChip(getCurrentOwner(record) === "-" ? "" : getCurrentOwner(record))}</td>
              <td>${formatDate(getFechaAFavorNacion(record))}</td>
              <td>${renderGestionChip(scope, record)}</td>
              <td>${renderEyeButton()}</td>
            </tr>
          `).join("") : `<tr><td colspan="8"><div class="empty-state">No hay expedientes disponibles.</div></td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function bindRowClicks(root, scope) {
  Array.from(root.querySelectorAll(`[data-scope="${scope}"]`)).forEach((row) => {
    row.addEventListener("click", () => {
      const recordId = row.dataset.recordId;
      if (scope === "registro") {
        openRegistroPanel(recordId);
      } else {
        openLogisticaPanel(recordId);
      }
    });
  });
}

function openRegistroPanel(recordId = null) {
  const record = state.records.find((item) => item.id === recordId) ?? createEmptyRecord();
  state.panelRecordId = recordId;
  state.panelMode = "registro";
  renderPanelRegistro(record);
  showPanel();
}

function openLogisticaPanel(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record) return;
  state.panelRecordId = recordId;
  state.panelMode = "logistica";
  renderPanelLogistica(record);
  showPanel();
}

function openAdminPanel(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record) return;
  state.panelRecordId = recordId;
  state.panelMode = "administracion";
  renderPanelAdmin(record);
  showPanel();
}

function renderPanelRegistro(record) {
  if (!canView("registro")) return;
  const isExisting = Boolean(record.id);
  const isActiveEnRC = !isExisting || record.estado === "En Registro y Control";
  const canEditGeneral = isActiveEnRC && canEditRegistroGeneral(record);
  const canAssignRC = isActiveEnRC && canAssignResponsableRC(record);
  const canEditInspection = isActiveEnRC && canEditRegistroInspection(record);
  const canSave = canEditGeneral || canEditInspection;
  const canReportToLogistica = isExisting && record.estado === "En Registro y Control" && canReportRegistroToLogistica(record);
  const canLegalize = isExisting && record.estado === "En Registro y Control" && canManageRegistroWorkflow();
  const canMarkNoEfectivo = isExisting && record.estado === "En Registro y Control" && canManageRegistroWorkflow();
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">${isExisting ? "Detalle de Registro" : "Nuevo Abandono"}</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <form id="registroForm" class="panel-body">
      ${isExisting ? renderEtapaTracker(record) : ""}
      ${isExisting ? `
        <div class="meta-caption">
          <span><strong>Documento:</strong> ${escapeHtml(record.documentoTransporte)}</span>
          <span><strong>Estado:</strong> ${escapeHtml(record.estado)}</span>
        </div>
      ` : ""}
      <div class="panel-section">
        <h3>Informacion general</h3>
        <div class="field"><label>Documento de Transporte</label><input name="documentoTransporte" ${canEditGeneral ? "" : "readonly"} required value="${escapeAttr(record.documentoTransporte)}" /></div>
        <div class="field"><label>Manifiesto</label><input name="manifiesto" ${canEditGeneral ? "" : "readonly"} value="${escapeAttr(record.manifiesto)}" /></div>
        <div class="field"><label>Consignatario</label><input name="consignatario" ${canEditGeneral ? "" : "readonly"} required value="${escapeAttr(record.consignatario)}" /></div>
        <div class="field"><label>Deposito</label><input name="deposito" ${canEditGeneral ? "" : "readonly"} required value="${escapeAttr(record.deposito)}" /></div>
        <div class="field-grid">
          <div class="field"><label>Fecha de Abandono</label><input name="fechaAbandono" ${canEditGeneral ? "" : "readonly"} type="date" required value="${escapeAttr(record.fechaAbandono)}" /></div>
          <div class="field"><label>Fecha a Favor de la Nacion</label><input class="calculated-input" type="date" readonly tabindex="-1" value="${escapeAttr(getFechaAFavorNacion(record))}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia</label><textarea name="descripcionMercancia" ${canEditGeneral ? "" : "readonly"}>${escapeHtml(record.descripcionMercancia)}</textarea></div>
        <div class="field"><label>Observaciones</label><textarea name="observacionesGenerales" ${canEditGeneral ? "" : "readonly"}>${escapeHtml(record.observacionesGenerales)}</textarea></div>
      </div>
      <div class="panel-section">
        <h3>Gestion Registro y Control</h3>
        <div class="field"><label>Responsable RC</label><select name="responsableRC" ${canAssignRC ? "" : "disabled"} required>${renderResponsableRCOptions(record.responsableRC)}</select></div>
        <div class="field-grid">
          <div class="field"><label>Numero Acta de Inspeccion RC</label><input name="numeroActaInspeccionRC" ${canEditInspection ? "" : "readonly"} value="${escapeAttr(record.numeroActaInspeccionRC)}" /></div>
          <div class="field"><label>Fecha de Inspeccion RC</label><input name="fechaInspeccionRC" ${canEditInspection ? "" : "readonly"} type="date" value="${escapeAttr(record.fechaInspeccionRC)}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Cantidad</label><input name="cantidadMercanciaRC" ${canEditInspection ? "" : "readonly"} value="${escapeAttr(record.cantidadMercanciaRC)}" /></div>
          <div class="field"><label>Peso</label><input name="pesoMercanciaRC" ${canEditInspection ? "" : "readonly"} value="${escapeAttr(record.pesoMercanciaRC)}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia</label><textarea name="descripcionMercanciaRC" ${canEditInspection ? "" : "readonly"}>${escapeHtml(record.descripcionMercanciaRC)}</textarea></div>
        <div class="field"><label>Observaciones RC</label><textarea name="observacionesRC" ${canEditInspection ? "" : "readonly"}>${escapeHtml(record.observacionesRC)}</textarea></div>
      </div>
      ${isExisting ? renderAdjuntosSection("registro", record.adjuntosRC || [], canEditInspection) : ""}
    </form>
    <div class="panel-footer">
      <div class="panel-footer-actions panel-footer-actions-compact">
        <div class="panel-footer-grid panel-footer-grid-registro">
          ${canSave ? '<button class="btn btn-primary" data-action="save-registro" type="button">Guardar</button>' : '<span class="panel-footer-placeholder"></span>'}
          ${isExisting && canManageRegistroWorkflow() ? '<button class="btn btn-secondary" data-action="oficio" type="button">Generar Persuasivo</button>' : '<span class="panel-footer-placeholder"></span>'}
          ${canReportToLogistica ? '<button class="btn btn-secondary" data-action="reportar" type="button">Reportar a Logistica</button>' : '<span class="panel-footer-placeholder"></span>'}
          ${canLegalize ? '<button class="btn btn-secondary" data-action="legalizar" type="button">Rescatado</button>' : '<span class="panel-footer-placeholder"></span>'}
          ${canMarkNoEfectivo ? '<button class="btn btn-secondary btn-subtle" data-action="no-efectivo" type="button">Abandono No Efectivo</button>' : '<span class="panel-footer-placeholder"></span>'}
          <button class="btn btn-secondary btn-quiet" data-close-panel type="button">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  bindPanelCommonEvents();
  const saveRegistroButton = els.sidePanel.querySelector('[data-action="save-registro"]');
  if (saveRegistroButton) saveRegistroButton.addEventListener("click", saveRegistroForm);
  const oficioButton = els.sidePanel.querySelector('[data-action="oficio"]');
  const reportarButton = els.sidePanel.querySelector('[data-action="reportar"]');
  const legalizarButton = els.sidePanel.querySelector('[data-action="legalizar"]');
  const noEfectivoButton = els.sidePanel.querySelector('[data-action="no-efectivo"]');
  if (oficioButton) oficioButton.addEventListener("click", () => generateOficio(record.id));
  if (reportarButton) reportarButton.addEventListener("click", () => reportToLogistica(record.id));
  if (legalizarButton) legalizarButton.addEventListener("click", () => legalizeCaso(record.id));
  if (noEfectivoButton) noEfectivoButton.addEventListener("click", () => markNoEfectivo(record.id));
  if (isExisting) bindAdjuntosEvents("registro", record.id);
}

function renderPanelLogistica(record) {
  if (!canView("logistica")) return;
  const isActiveEnLogistica = record.estado === "En Logistica";
  const canAssignLogistica = isActiveEnLogistica && canAssignResponsableLogistica(record);
  const canEditGestion = isActiveEnLogistica && canEditLogisticaInspection(record);
  const canSave = canAssignLogistica || canEditGestion;
  const canTraslado = isActiveEnLogistica && canMarkTrasladoBodega(record);
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Gestion Logistica</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <form id="logisticaForm" class="panel-body">
      ${renderEtapaTracker(record)}
      <div class="meta-caption">
        <span><strong>Documento:</strong> ${escapeHtml(record.documentoTransporte)}</span>
        <span><strong>Estado:</strong> ${escapeHtml(record.estado)}</span>
      </div>
      <div class="panel-section">
        <h3>Informacion general</h3>
        <div class="field"><label>Consignatario</label><input readonly value="${escapeAttr(record.consignatario)}" /></div>
        <div class="field"><label>Deposito</label><input readonly value="${escapeAttr(record.deposito)}" /></div>
        <div class="field-grid">
          <div class="field"><label>Fecha de Abandono</label><input readonly value="${escapeAttr(formatDate(record.fechaAbandono))}" /></div>
          <div class="field"><label>Fecha a Favor de la Nacion</label><input readonly value="${escapeAttr(formatDate(getFechaAFavorNacion(record)))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Fecha Reporte a Logistica</label><input readonly value="${escapeAttr(formatDate(record.fechaReporteLogistica))}" /></div>
          <div class="field"><label>Fecha Limite Traslado</label><input readonly value="${escapeAttr(formatDate(getFechaLimiteLogistica(record)))}" /></div>
        </div>
        <div class="field"><label>Semaforo Logistica</label><input readonly value="${escapeAttr(getSemaforoLogisticaLabel(record))}" /></div>
        <div class="field"><label>Descripcion General de Mercancia</label><textarea readonly>${escapeHtml(record.descripcionMercancia)}</textarea></div>
        <div class="field"><label>Observaciones Generales</label><textarea readonly>${escapeHtml(record.observacionesGenerales)}</textarea></div>
      </div>
      <div class="panel-section">
        <h3>Gestion Registro y Control</h3>
        <div class="field"><label>Responsable RC</label><input readonly value="${escapeAttr(record.responsableRC || "")}" /></div>
        <div class="field-grid">
          <div class="field"><label>Numero Acta de Inspeccion RC</label><input readonly value="${escapeAttr(record.numeroActaInspeccionRC || "")}" /></div>
          <div class="field"><label>Fecha de Inspeccion RC</label><input readonly value="${escapeAttr(formatDate(record.fechaInspeccionRC))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Cantidad RC</label><input readonly value="${escapeAttr(record.cantidadMercanciaRC || "")}" /></div>
          <div class="field"><label>Peso RC</label><input readonly value="${escapeAttr(record.pesoMercanciaRC || "")}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia RC</label><textarea readonly>${escapeHtml(record.descripcionMercanciaRC)}</textarea></div>
        <div class="field"><label>Observaciones RC</label><textarea readonly>${escapeHtml(record.observacionesRC)}</textarea></div>
        <div class="field"><label>Adjuntos RC</label>${renderAdjuntosList(record.adjuntosRC || [], false)}</div>
      </div>
      <div class="panel-section">
        <h3>Gestion Operacion Logistica</h3>
        <div class="field"><label>Responsable Logistica</label><select name="funcionarioLogistica" ${canAssignLogistica ? "" : "disabled"}>${renderResponsableLogisticaOptions(record.funcionarioLogistica)}</select></div>
        <div class="field-grid">
          <div class="field"><label>Numero Acta de Inspeccion Logistica</label><input name="numeroActaInspeccionLogistica" ${canEditGestion ? "" : "readonly"} value="${escapeAttr(record.numeroActaInspeccionLogistica)}" /></div>
          <div class="field"><label>Fecha de Inspeccion Logistica</label><input name="fechaInspeccionLogistica" ${canEditGestion ? "" : "readonly"} type="date" value="${escapeAttr(record.fechaInspeccionLogistica)}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Cantidad</label><input name="cantidadMercanciaLogistica" ${canEditGestion ? "" : "readonly"} value="${escapeAttr(record.cantidadMercanciaLogistica)}" /></div>
          <div class="field"><label>Peso</label><input name="pesoMercanciaLogistica" ${canEditGestion ? "" : "readonly"} value="${escapeAttr(record.pesoMercanciaLogistica)}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia</label><textarea name="descripcionMercanciaLogistica" ${canEditGestion ? "" : "readonly"}>${escapeHtml(record.descripcionMercanciaLogistica)}</textarea></div>
        <div class="field-grid">
          <div class="field"><label>Avaluo Temporal</label><input name="avaluoTemporal" ${canEditGestion ? "" : "readonly"} type="number" min="0" step="0.01" value="${escapeAttr(record.avaluoTemporal)}" /></div>
          <div class="field"><label>Avaluo Definitivo</label><input name="avaluoDefinitivo" ${canEditGestion ? "" : "readonly"} type="number" min="0" step="0.01" value="${escapeAttr(record.avaluoDefinitivo)}" /></div>
        </div>
        <div class="field"><label>Observaciones Logistica</label><textarea name="observacionesLogistica" ${canEditGestion ? "" : "readonly"}>${escapeHtml(record.observacionesLogistica)}</textarea></div>
      </div>
      ${renderAdjuntosSection("logistica", record.adjuntosLogistica || [], canEditGestion)}
    </form>
    <div class="panel-footer">
      <div class="panel-footer-actions">
        <div class="panel-footer-row">
          ${canSave ? '<button class="btn btn-primary" data-action="save-logistica" type="button">Guardar</button>' : ""}
          ${canTraslado ? '<button class="btn btn-secondary" data-action="dispuesto" type="button">Traslado a Bodega</button>' : ""}
        </div>
        <div class="panel-footer-row panel-footer-row-cancel">
          <button class="btn btn-secondary" data-close-panel type="button">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  bindPanelCommonEvents();
  const saveLogisticaButton = els.sidePanel.querySelector('[data-action="save-logistica"]');
  const trasladoButton = els.sidePanel.querySelector('[data-action="dispuesto"]');
  if (saveLogisticaButton) {
    saveLogisticaButton.addEventListener("click", () => saveLogisticaForm(record.id));
  }
  if (trasladoButton) {
    trasladoButton.addEventListener("click", () => markDispuesto(record.id));
  }
  bindAdjuntosEvents("logistica", record.id);
}

function renderPanelAdmin(record) {
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Consulta de Expediente</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <div class="panel-body">
      ${renderEtapaTracker(record)}
      <div class="panel-section">
        <h3>Informacion general</h3>
        <div class="field"><label>Documento de Transporte</label><input readonly value="${escapeAttr(record.documentoTransporte)}" /></div>
        <div class="field"><label>Manifiesto</label><input readonly value="${escapeAttr(record.manifiesto)}" /></div>
        <div class="field"><label>Consignatario</label><input readonly value="${escapeAttr(record.consignatario)}" /></div>
        <div class="field"><label>Deposito</label><input readonly value="${escapeAttr(record.deposito)}" /></div>
        <div class="field-grid">
          <div class="field"><label>Estado</label><input readonly value="${escapeAttr(record.estado)}" /></div>
          <div class="field"><label>Responsable actual</label><input readonly value="${escapeAttr(getCurrentOwner(record))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Fecha de Abandono</label><input readonly value="${escapeAttr(formatDate(record.fechaAbandono))}" /></div>
          <div class="field"><label>Fecha a Favor de la Nacion</label><input readonly value="${escapeAttr(formatDate(getFechaAFavorNacion(record)))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Semaforo Registro y Control</label><input readonly value="${escapeAttr(getSemaforoLabel(record))}" /></div>
          <div class="field"><label>Dias Transcurridos</label><input readonly value="${calculateDays(record.fechaAbandono)}" /></div>
        </div>
        <div class="field"><label>Descripcion General de Mercancia</label><textarea readonly>${escapeHtml(record.descripcionMercancia)}</textarea></div>
        <div class="field"><label>Observaciones Generales</label><textarea readonly>${escapeHtml(record.observacionesGenerales)}</textarea></div>
      </div>
      <div class="panel-section">
        <h3>Gestion Registro y Control</h3>
        <div class="field"><label>Responsable RC</label><input readonly value="${escapeAttr(record.responsableRC || "")}" /></div>
        <div class="field-grid">
          <div class="field"><label>Numero Acta de Inspeccion RC</label><input readonly value="${escapeAttr(record.numeroActaInspeccionRC || "")}" /></div>
          <div class="field"><label>Fecha de Inspeccion RC</label><input readonly value="${escapeAttr(formatDate(record.fechaInspeccionRC))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Cantidad RC</label><input readonly value="${escapeAttr(record.cantidadMercanciaRC || "")}" /></div>
          <div class="field"><label>Peso RC</label><input readonly value="${escapeAttr(record.pesoMercanciaRC || "")}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia RC</label><textarea readonly>${escapeHtml(record.descripcionMercanciaRC)}</textarea></div>
        <div class="field"><label>Observaciones RC</label><textarea readonly>${escapeHtml(record.observacionesRC)}</textarea></div>
        <div class="field"><label>Adjuntos RC</label>${renderAdjuntosList(record.adjuntosRC || [], false)}</div>
      </div>
      <div class="panel-section">
        <h3>Gestion Operacion Logistica</h3>
        <div class="field"><label>Responsable Logistica</label><input readonly value="${escapeAttr(record.funcionarioLogistica || "")}" /></div>
        <div class="field-grid">
          <div class="field"><label>Fecha Reporte a Logistica</label><input readonly value="${escapeAttr(formatDate(record.fechaReporteLogistica))}" /></div>
          <div class="field"><label>Fecha Limite Traslado</label><input readonly value="${escapeAttr(formatDate(getFechaLimiteLogistica(record)))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Semaforo Logistica</label><input readonly value="${escapeAttr(getSemaforoLogisticaLabel(record))}" /></div>
          <div class="field"><label>Fecha Traslado Bodega</label><input readonly value="${escapeAttr(formatDate(record.fechaDisposicion))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Numero Acta de Inspeccion Logistica</label><input readonly value="${escapeAttr(record.numeroActaInspeccionLogistica || "")}" /></div>
          <div class="field"><label>Fecha de Inspeccion Logistica</label><input readonly value="${escapeAttr(formatDate(record.fechaInspeccionLogistica))}" /></div>
        </div>
        <div class="field-grid">
          <div class="field"><label>Cantidad Logistica</label><input readonly value="${escapeAttr(record.cantidadMercanciaLogistica || "")}" /></div>
          <div class="field"><label>Peso Logistica</label><input readonly value="${escapeAttr(record.pesoMercanciaLogistica || "")}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia Logistica</label><textarea readonly>${escapeHtml(record.descripcionMercanciaLogistica)}</textarea></div>
        <div class="field-grid">
          <div class="field"><label>Avaluo Temporal</label><input readonly value="${escapeAttr(formatCurrencyValue(record.avaluoTemporal))}" /></div>
          <div class="field"><label>Avaluo Definitivo</label><input readonly value="${escapeAttr(formatCurrencyValue(record.avaluoDefinitivo))}" /></div>
        </div>
        <div class="field"><label>Observaciones Logistica</label><textarea readonly>${escapeHtml(record.observacionesLogistica)}</textarea></div>
        <div class="field"><label>Adjuntos Logistica</label>${renderAdjuntosList(record.adjuntosLogistica || [], false)}</div>
      </div>
    </div>
    <div class="panel-footer">
      <div class="button-row">
        <button class="btn btn-secondary" data-close-panel type="button">Cerrar</button>
      </div>
    </div>
  `;

  bindPanelCommonEvents();
}

function renderDataModelPanel() {
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Modelo de Datos</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <div class="panel-body">
      <div class="panel-section">
        <h3>Resumen</h3>
        <div class="empty-state">
          La aplicacion usa <strong>3 listas</strong> sobre SharePoint Lists: ABANDONOS, GESTION_REGISTRO y GESTION_LOGISTICA.
        </div>
      </div>
      ${renderDataModelCard(DATA_MODEL.abandono)}
      ${renderDataModelCard(DATA_MODEL.gestionRegistro)}
      ${renderDataModelCard(DATA_MODEL.gestionLogistica)}
      ${renderDataModelCard(DATA_MODEL.calculados)}
    </div>
    <div class="panel-footer">
      <div class="button-row">
        <button class="btn btn-secondary" data-close-panel type="button">Cerrar</button>
      </div>
    </div>
  `;

  bindPanelCommonEvents();
}

function bindPanelCommonEvents() {
  Array.from(els.sidePanel.querySelectorAll("[data-close-panel]")).forEach((button) => {
    button.addEventListener("click", closePanel);
  });
}

function showPanel() {
  els.overlay.classList.add("open");
  els.sidePanel.classList.add("open");
  els.sidePanel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  els.overlay.classList.remove("open");
  els.sidePanel.classList.remove("open");
  els.sidePanel.setAttribute("aria-hidden", "true");
}

async function saveRegistroForm() {
  const form = document.getElementById("registroForm");
  const formData = new FormData(form);
  const baseRecord = state.records.find((item) => item.id === state.panelRecordId) ?? createEmptyRecord();
  const isActiveEnRC = !baseRecord.id || baseRecord.estado === "En Registro y Control";
  if (!isActiveEnRC || (!canEditRegistroGeneral(baseRecord) && !canEditRegistroInspection(baseRecord))) {
    throw new Error("No tienes permisos para modificar este abandono en Registro y Control.");
  }
  const payload = {
    ...baseRecord,
    documentoTransporte: formData.get("documentoTransporte")?.toString().trim() ?? "",
    manifiesto: formData.get("manifiesto")?.toString().trim() ?? "",
    consignatario: formData.get("consignatario")?.toString().trim() ?? "",
    deposito: formData.get("deposito")?.toString().trim() ?? "",
    fechaAbandono: formData.get("fechaAbandono")?.toString() ?? "",
    fechaAFavorNacion: addOneMonthToDate(formData.get("fechaAbandono")?.toString() ?? ""),
    descripcionMercancia: formData.get("descripcionMercancia")?.toString().trim() ?? "",
    observacionesGenerales: formData.get("observacionesGenerales")?.toString().trim() ?? "",
    responsableRC: formData.get("responsableRC")?.toString().trim() ?? baseRecord.responsableRC ?? "",
    numeroActaInspeccionRC: formData.get("numeroActaInspeccionRC")?.toString().trim() ?? baseRecord.numeroActaInspeccionRC ?? "",
    fechaInspeccionRC: formData.get("fechaInspeccionRC")?.toString() ?? baseRecord.fechaInspeccionRC ?? "",
    cantidadMercanciaRC: formData.get("cantidadMercanciaRC")?.toString().trim() ?? baseRecord.cantidadMercanciaRC ?? "",
    pesoMercanciaRC: formData.get("pesoMercanciaRC")?.toString().trim() ?? baseRecord.pesoMercanciaRC ?? "",
    descripcionMercanciaRC: formData.get("descripcionMercanciaRC")?.toString().trim() ?? baseRecord.descripcionMercanciaRC ?? "",
    observacionesRC: formData.get("observacionesRC")?.toString().trim() ?? baseRecord.observacionesRC ?? "",
    estado: baseRecord.estado || "En Registro y Control"
  };

  if (canEditRegistroGeneral(baseRecord)) {
    validateRequired(payload.documentoTransporte, "Documento de Transporte");
    validateRequired(payload.consignatario, "Consignatario");
    validateRequired(payload.deposito, "Deposito");
    validateRequired(payload.fechaAbandono, "Fecha de Abandono");
  }
  if (canAssignResponsableRC() || canEditRegistroInspection(baseRecord)) {
    validateRequired(payload.responsableRC, "Responsable RC");
  }

  await dataService.saveRegistro(payload, state.panelRecordId || "");
  await loadData();
  renderAll();
  closePanel();
}

async function reportToLogistica(recordId) {
  const record = getRecord(recordId);
  if (!record || !canReportRegistroToLogistica(record)) return;
  const updated = {
    ...record,
    estado: "En Logistica",
    fechaReporteLogistica: todayIsoDateTime()
  };
  await dataService.updateAbandono(recordId, updated);
  await loadData();
  renderAll();
  openRegistroPanel(recordId);
}

async function legalizeCaso(recordId) {
  const record = getRecord(recordId);
  if (!record || ["Rescatado", "No Efectivo", "Traslado Bodega"].includes(record.estado) || !canManageRegistroWorkflow()) return;

  const confirmed = window.confirm("Este expediente se marcara como legalizado desde Registro y Control y no sera enviado a Logistica. Deseas continuar?");
  if (!confirmed) return;

  await dataService.updateAbandono(
    recordId,
    {
      estado: "Rescatado",
      fechaReporteLogistica: "",
      fechaCierre: todayIsoDateTime()
    },
    { clearGestionLogistica: true }
  );
  await loadData();
  renderAll();
  closePanel();
}

async function markNoEfectivo(recordId) {
  const record = getRecord(recordId);
  if (!record || record.estado !== "En Registro y Control" || !canManageRegistroWorkflow()) return;

  const confirmed = window.confirm("Este expediente se marcara como abandono no efectivo y saldra de la bandeja de Registro y Control. Deseas continuar?");
  if (!confirmed) return;

  await dataService.updateAbandono(
    recordId,
    {
      estado: "No Efectivo",
      fechaReporteLogistica: "",
      fechaCierre: todayIsoDateTime()
    },
    { clearGestionLogistica: true }
  );
  await loadData();
  renderAll();
  closePanel();
}

async function saveLogisticaForm(recordId) {
  const form = document.getElementById("logisticaForm");
  const formData = new FormData(form);
  const record = getRecord(recordId);
  if (!record || record.estado !== "En Logistica" || (!canAssignResponsableLogistica() && !canEditLogisticaInspection(record))) {
    throw new Error("No tienes permisos para modificar este abandono en Operacion Logistica.");
  }

  const nextState = "En Logistica";
  const updated = {
    ...record,
    funcionarioLogistica: formData.get("funcionarioLogistica")?.toString().trim() ?? record.funcionarioLogistica ?? "",
    numeroActaInspeccionLogistica: formData.get("numeroActaInspeccionLogistica")?.toString().trim() ?? record.numeroActaInspeccionLogistica ?? "",
    fechaInspeccionLogistica: formData.get("fechaInspeccionLogistica")?.toString() ?? record.fechaInspeccionLogistica ?? "",
    cantidadMercanciaLogistica: formData.get("cantidadMercanciaLogistica")?.toString().trim() ?? record.cantidadMercanciaLogistica ?? "",
    pesoMercanciaLogistica: formData.get("pesoMercanciaLogistica")?.toString().trim() ?? record.pesoMercanciaLogistica ?? "",
    descripcionMercanciaLogistica: formData.get("descripcionMercanciaLogistica")?.toString().trim() ?? record.descripcionMercanciaLogistica ?? "",
    avaluoTemporal: formData.get("avaluoTemporal")?.toString().trim() ?? record.avaluoTemporal ?? "",
    avaluoDefinitivo: formData.get("avaluoDefinitivo")?.toString().trim() ?? record.avaluoDefinitivo ?? "",
    observacionesLogistica: formData.get("observacionesLogistica")?.toString().trim() ?? record.observacionesLogistica ?? "",
    estado: nextState
  };

  await dataService.saveLogistica(updated);
  await loadData();
  renderAll();
  openLogisticaPanel(recordId);
}

async function markDispuesto(recordId) {
  const record = getRecord(recordId);
  if (!record || record.estado !== "En Logistica" || !canMarkTrasladoBodega(record)) return;
  await dataService.updateAbandono(
    recordId,
    {
      estado: "Traslado Bodega",
      fechaDisposicion: todayIsoDateTime()
    }
  );
  await loadData();
  renderAll();
  openLogisticaPanel(recordId);
}

function generateOficio(recordId) {
  const record = getRecord(recordId);
  if (!record) return;

  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Oficio Persuasivo</title>
      <style>
        body { font-family: "Segoe UI", Arial, sans-serif; margin: 48px; color: #323130; line-height: 1.5; }
        h1 { color: #0078d4; font-size: 20px; margin-bottom: 4px; }
        .meta { color: #605e5c; font-size: 12px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td { border: 1px solid #d2d0ce; padding: 8px; }
        .section { margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Oficio Persuasivo</h1>
      <div class="meta">Generado el ${formatDateTime(todayIsoDateTime())}</div>
      <p>Senores <strong>${escapeHtml(record.consignatario)}</strong>:</p>
      <p>Por medio del presente se invita a rescatar por legalizacion la mercancia en abandono asociada al documento de transporte <strong>${escapeHtml(record.documentoTransporte)}</strong>.</p>
      <table>
        <tr><td><strong>Documento de Transporte</strong></td><td>${escapeHtml(record.documentoTransporte)}</td></tr>
        <tr><td><strong>Manifiesto</strong></td><td>${escapeHtml(record.manifiesto)}</td></tr>
        <tr><td><strong>Deposito</strong></td><td>${escapeHtml(record.deposito)}</td></tr>
        <tr><td><strong>Fecha de Abandono</strong></td><td>${formatDate(record.fechaAbandono)}</td></tr>
        <tr><td><strong>Descripcion de Mercancia</strong></td><td>${escapeHtml(record.descripcionMercancia)}</td></tr>
      </table>
      <div class="section">La presente comunicacion tiene como finalidad promover la legalizacion y rescate oportuno de la mercancia en abandono, conforme al expediente registrado.</div>
      <div class="section"><strong>Observaciones:</strong><br />${escapeHtml(record.observacionesGenerales || "Sin observaciones.")}</div>
      <div class="section"><strong>Responsable Registro y Control:</strong> ${escapeHtml(record.responsableRC)}</div>
    </body>
    </html>
  `);
  printWindow.document.close();

}

function renderDataModelCard(model) {
  return `
    <div class="model-card">
      <div class="model-card-header">
        <div class="model-card-title">${escapeHtml(model.title)}</div>
        <p class="model-card-subtitle">${escapeHtml(model.subtitle)}</p>
      </div>
      <div class="model-grid">
        ${model.fields.map((field) => `
          <div class="model-field">
            <div class="model-field-name">${escapeHtml(field.name)}</div>
            <div class="model-field-meta">${escapeHtml(field.type)} · ${escapeHtml(field.rule)}</div>
            <div class="model-field-meta">${escapeHtml(field.note)}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDataModelTable(model) {
  return `
    <div class="schema-table-card">
      <div class="schema-table-header">
        <div class="model-card-title">${escapeHtml(model.title)}</div>
        <p class="model-card-subtitle">${escapeHtml(model.subtitle)}</p>
      </div>
      <div class="schema-table-grid">
        <table>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Tipo</th>
              <th>Regla</th>
              <th>Uso funcional</th>
            </tr>
          </thead>
          <tbody>
            ${model.fields.map((field) => `
              <tr>
                <td><strong>${escapeHtml(field.name)}</strong></td>
                <td>${escapeHtml(field.type)}</td>
                <td>${escapeHtml(field.rule)}</td>
                <td>${escapeHtml(field.note)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getEtapaTrackerSteps(record) {
  const hasGeneralInfo = Boolean(record?.documentoTransporte || record?.fechaAbandono);
  const estado = record?.estado || "";
  const isNoEfectivo = estado === "No Efectivo";
  const isRescatado = estado === "Rescatado";
  const isTrasladoBodega = estado === "Traslado Bodega";
  const hasGestionRCReal = Boolean(
    record?.fechaInspeccionRC
    || record?.cantidadMercanciaRC
    || record?.pesoMercanciaRC
    || record?.descripcionMercanciaRC
    || record?.observacionesRC
    || record?.responsableRC
  );
  const hasGestionLogisticaReal = Boolean(
    record?.fechaReporteLogistica
    || record?.fechaInspeccionLogistica
    || record?.funcionarioLogistica
    || record?.cantidadMercanciaLogistica
    || record?.pesoMercanciaLogistica
    || record?.descripcionMercanciaLogistica
    || record?.avaluoTemporal
    || record?.avaluoDefinitivo
    || record?.observacionesLogistica
    || ["En Logistica", "Traslado Bodega"].includes(record?.estado)
  );
  const hasAbandono = !isNoEfectivo && Boolean(record?.fechaAbandono);
  const hasGestionRC = !isNoEfectivo && (hasGestionRCReal || isRescatado || hasGestionLogisticaReal || isTrasladoBodega);
  const hasGestionLogistica = !isRescatado && !isNoEfectivo && hasGestionLogisticaReal;
  const isFinalizado = isRescatado || isNoEfectivo || isTrasladoBodega;

  const steps = [
    { key: "cargado", label: "Cargado", complete: hasGeneralInfo, skipped: false },
    { key: "abandono", label: "Abandono", complete: hasAbandono, skipped: isNoEfectivo },
    { key: "gestion-rc", label: "Gestion R. y C.", complete: hasGestionRC, skipped: isNoEfectivo },
    { key: "gestion-ol", label: "Gestion O. L.", complete: hasGestionLogistica, skipped: isNoEfectivo || isRescatado },
    { key: "finalizado", label: "Finalizado", complete: isFinalizado, skipped: false }
  ];

  let currentIndex = 0;
  if (isFinalizado) {
    currentIndex = steps.length - 1;
  } else if (hasGestionLogistica) {
    currentIndex = steps.findIndex((step) => step.key === "gestion-ol");
  } else if (hasGestionRC) {
    currentIndex = steps.findIndex((step) => step.key === "gestion-rc");
  } else if (hasAbandono) {
    currentIndex = steps.findIndex((step) => step.key === "abandono");
  }

  if (currentIndex < 0) {
    currentIndex = 0;
  }

  return steps.map((step, index) => ({
    ...step,
    current: index === currentIndex
  }));
}

function renderEtapaTrackerLegacy(record) {
  const steps = getEtapaTrackerSteps(record);

  return `
    <div class="etapa-tracker">
      <div class="etapa-tracker-title">Etapa del expediente</div>
      <div class="etapa-track">
        ${steps.map((step, index) => `
          <div class="etapa-item">
            <div class="etapa-marker etapa-marker-${step.skipped ? "skipped" : step.current ? "current" : step.complete ? "complete" : "pending"}">
              ${step.skipped ? "–" : step.complete && !step.current ? "✓" : index + 1}
            </div>
            <div class="etapa-label">${escapeHtml(step.label)}</div>
          </div>
          ${index < steps.length - 1 ? `<div class="etapa-connector ${(steps[index].complete || steps[index].skipped) && (steps[index + 1].complete || steps[index + 1].current || steps[index + 1].skipped) ? "complete" : "pending"}"></div>` : ""}
        `).join("")}
      </div>
    </div>
  `;
}

function renderEtapaTracker(record) {
  const steps = getEtapaTrackerSteps(record);

  return `
    <div class="etapa-tracker">
      <div class="etapa-tracker-title">Etapa del expediente</div>
      <div class="etapa-track">
        ${steps.map((step, index) => `
          <div class="etapa-item">
            <div class="etapa-marker etapa-marker-${step.skipped ? "skipped" : step.current ? "current" : step.complete ? "complete" : "pending"}">
              ${step.skipped ? "&ndash;" : step.complete && !step.current ? "&#10003;" : index + 1}
            </div>
            <div class="etapa-label">${escapeHtml(step.label)}</div>
          </div>
          ${index < steps.length - 1 ? `<div class="etapa-connector ${steps[index].skipped || steps[index + 1].skipped ? "skipped" : (steps[index].complete || steps[index].current) && (steps[index + 1].complete || steps[index + 1].current) ? "complete" : "pending"}"></div>` : ""}
        `).join("")}
      </div>
    </div>
  `;
}

function getFilteredRecords() {
  const needle = state.search;
  if (!needle) return [...state.records];
  return state.records.filter((record) => {
    return [
      record.documentoTransporte,
      record.consignatario,
      record.deposito,
      record.estado,
      record.responsableRC,
      record.funcionarioLogistica
    ].some((field) => String(field || "").toLowerCase().includes(needle));
  });
}

function getCurrentOwner(record) {
  if (["En Logistica", "Traslado Bodega"].includes(record.estado) && record.funcionarioLogistica) {
    return record.funcionarioLogistica;
  }
  return record.responsableRC || "-";
}

function getFechaAFavorNacion(record) {
  if (!record?.fechaAbandono) return "";
  return addOneMonthToDate(record.fechaAbandono);
}

function getFechaLimiteLogistica(record) {
  if (!record?.fechaReporteLogistica) return "";
  return addMonthsToDate(record.fechaReporteLogistica, 2);
}

function getSemaforo(record) {
  if (["Rescatado", "No Efectivo", "Traslado Bodega"].includes(record.estado)) {
    return { tone: "gris", label: "Finalizado" };
  }

  const fechaAFavorNacion = getFechaAFavorNacion(record);

  if (!fechaAFavorNacion) {
    return { tone: "gris", label: "Sin fecha" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateValue(fechaAFavorNacion);
  if (!target) {
    return { tone: "gris", label: "Sin fecha" };
  }
  target.setHours(0, 0, 0, 0);
  const days = Math.floor((target - today) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { tone: "rojo", label: "Vencido" };
  }
  if (days <= 15) {
    return { tone: "amarillo", label: "Próximo" };
  }
  return { tone: "verde", label: "Al día" };
}

function getSemaforoLogistica(record) {
  if (["Rescatado", "No Efectivo", "Traslado Bodega"].includes(record.estado)) {
    return { tone: "gris", label: "Finalizado" };
  }

  const fechaLimiteLogistica = getFechaLimiteLogistica(record);
  if (!fechaLimiteLogistica) {
    return { tone: "gris", label: "Sin fecha" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateValue(fechaLimiteLogistica);
  if (!target) {
    return { tone: "gris", label: "Sin fecha" };
  }
  target.setHours(0, 0, 0, 0);
  const days = Math.floor((target - today) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { tone: "rojo", label: "Vencido" };
  }
  if (days <= 15) {
    return { tone: "amarillo", label: "Próximo" };
  }
  return { tone: "verde", label: "Al día" };
}

function getSemaforoLabel(record) {
  return getSemaforo(record).label;
}

function getSemaforoLogisticaLabel(record) {
  return getSemaforoLogistica(record).label;
}

function calculateDays(dateValue) {
  if (!dateValue) return "-";
  const start = parseDateValue(dateValue);
  if (!start) return "-";
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return String(Math.max(diff, 0));
}

function renderStateOptions(selected) {
  return STATES.map((item) => `<option ${item === selected ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");
}

function getLogisticaFilterLabel(value) {
  switch (value) {
    case "En Registro y Control":
      return "En Registro y Control";
    case "En Logistica":
      return "En Logistica";
    case "Rescatado":
      return "Rescatado";
    case "No Efectivo":
      return "No Efectivo";
    case "Traslado Bodega":
      return "Traslado Bodega";
    case "Todos":
      return "Todos";
    default:
      return value;
  }
}

function renderResponsableRCOptions(selected) {
  const normalizedSelected = selected || responsablesRCOptions[0] || currentUser.name;
  return responsablesRCOptions
    .map((item) => `<option value="${escapeAttr(item)}" ${item === normalizedSelected ? "selected" : ""}>${escapeHtml(item)}</option>`)
    .join("");
}

function renderResponsableLogisticaOptions(selected) {
  const options = ["", ...responsablesLogisticaOptions];
  const normalizedSelected = selected || "";
  return options
    .map((item) => {
      const label = item || "Sin asignar";
      return `<option value="${escapeAttr(item)}" ${item === normalizedSelected ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function createEmptyRecord() {
  return {
    id: "",
    documentoTransporte: "",
    manifiesto: "",
    consignatario: "",
    deposito: "",
    fechaAbandono: "",
    fechaAFavorNacion: "",
    descripcionMercancia: "",
    observacionesGenerales: "",
    responsableRC: currentUser.name,
    numeroActaInspeccionRC: "",
    fechaInspeccionRC: "",
    cantidadMercanciaRC: "",
    pesoMercanciaRC: "",
    descripcionMercanciaRC: "",
    observacionesRC: "",
    fechaReporteLogistica: "",
    funcionarioLogistica: "",
    numeroActaInspeccionLogistica: "",
    fechaInspeccionLogistica: "",
    cantidadMercanciaLogistica: "",
    pesoMercanciaLogistica: "",
    descripcionMercanciaLogistica: "",
    avaluoTemporal: "",
    avaluoDefinitivo: "",
    observacionesLogistica: "",
    estado: "En Registro y Control",
    fechaDisposicion: "",
    fechaCierre: "",
    fechaCreacion: "",
    fechaActualizacion: "",
    adjuntosRC: [],
    adjuntosLogistica: []
  };
}

function normalizeResponsablesRC(items, fallbackName) {
  const unique = new Set(
    items
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );

  if (fallbackName) {
    unique.add(fallbackName);
  }

  return Array.from(unique);
}

function getRecord(recordId) {
  return state.records.find((item) => item.id === recordId);
}

function validateRequired(value, label) {
  if (!value) {
    throw new Error(`El campo ${label} es obligatorio.`);
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const parsed = parseDateValue(dateValue);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(parsed);
}

function formatDateTime(dateValue) {
  if (!dateValue) return "-";
  const parsed = parseDateValue(dateValue);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function formatCurrencyValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(String(value).replaceAll(",", ""));
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numeric);
}

function todayIsoDateTime() {
  return new Date().toISOString();
}

function addMonthsToDate(dateValue, monthsToAdd) {
  if (!dateValue) return "";
  const baseDate = parseDateValue(dateValue);
  if (!baseDate) return "";

  const target = new Date(baseDate);
  target.setMonth(target.getMonth() + monthsToAdd);

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addOneMonthToDate(dateValue) {
  return addMonthsToDate(dateValue, 1);
}

function parseDateValue(dateValue) {
  if (!dateValue) return null;
  const normalized = String(dateValue).trim();
  if (!normalized) return null;

  const localDateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (localDateOnlyMatch) {
    const [, year, month, day] = localDateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function createDataService(mode) {
  if (mode === "sharepoint") {
    return createSharePointService();
  }
  return createMockService();
}

function createMockService() {
  return {
    async getAll() {
      seedMockData();
      const model = readLocalModel();
      return createPayloadFromModel(model);
    },
    async saveRegistro(record, originalDocumentoTransporte = "") {
      const model = readLocalModel();
      const now = todayIsoDateTime();
      const oldKey = originalDocumentoTransporte || record.documentoTransporte;
      if (originalDocumentoTransporte && originalDocumentoTransporte !== record.documentoTransporte) {
        renameDocumentoTransporteInModel(model, originalDocumentoTransporte, record.documentoTransporte);
      } else if (!originalDocumentoTransporte && model.abandonos.some((item) => item.documentoTransporte === record.documentoTransporte)) {
        throw new Error("Ya existe un expediente con ese Documento de Transporte.");
      }

      const existingAbandono = model.abandonos.find((item) => item.documentoTransporte === record.documentoTransporte);
      const abandono = {
        documentoTransporte: record.documentoTransporte,
        manifiesto: record.manifiesto,
        consignatario: record.consignatario,
        deposito: record.deposito,
        fechaAbandono: record.fechaAbandono,
        descripcionMercancia: record.descripcionMercancia,
        observacionesGenerales: record.observacionesGenerales,
        estado: existingAbandono?.estado || record.estado || "En Registro y Control",
        fechaReporteLogistica: existingAbandono?.fechaReporteLogistica || "",
        fechaDisposicion: existingAbandono?.fechaDisposicion || "",
        fechaCierre: existingAbandono?.fechaCierre || "",
        fechaCreacion: existingAbandono?.fechaCreacion || now,
        fechaActualizacion: now
      };

      const gestionRegistro = {
        documentoTransporte: record.documentoTransporte,
        responsableRC: record.responsableRC,
        numeroActaInspeccionRC: record.numeroActaInspeccionRC,
        fechaInspeccionRC: record.fechaInspeccionRC,
        cantidadMercanciaRC: record.cantidadMercanciaRC,
        pesoMercanciaRC: record.pesoMercanciaRC,
        descripcionMercanciaRC: record.descripcionMercanciaRC,
        observacionesRC: record.observacionesRC,
        adjuntosRC: record.adjuntosRC || [],
        fechaActualizacion: now
      };

      model.abandonos = upsertByDocumentoTransporte(model.abandonos, abandono);
      model.gestionRegistro = upsertByDocumentoTransporte(model.gestionRegistro, gestionRegistro);
      writeLocalModel(model);
      return createViewRecord(
        abandono,
        gestionRegistro,
        model.gestionLogistica.find((item) => item.documentoTransporte === record.documentoTransporte)
      );
    },
    async updateAbandono(documentoTransporte, fields, options = {}) {
      const model = readLocalModel();
      const now = todayIsoDateTime();
      const existing = model.abandonos.find((item) => item.documentoTransporte === documentoTransporte);
      if (!existing) {
        throw new Error("No se encontro el expediente para actualizar.");
      }

      const allowedFields = Object.fromEntries(
        Object.entries({
          manifiesto: fields.manifiesto,
          consignatario: fields.consignatario,
          deposito: fields.deposito,
          fechaAbandono: fields.fechaAbandono,
          descripcionMercancia: fields.descripcionMercancia,
          observacionesGenerales: fields.observacionesGenerales,
          estado: fields.estado,
          fechaReporteLogistica: fields.fechaReporteLogistica,
          fechaDisposicion: fields.fechaDisposicion,
          fechaCierre: fields.fechaCierre
        }).filter(([, value]) => value !== undefined)
      );

      const updated = {
        ...existing,
        ...allowedFields,
        documentoTransporte,
        fechaActualizacion: now
      };

      model.abandonos = upsertByDocumentoTransporte(model.abandonos, updated);
      if (options.clearGestionLogistica) {
        model.gestionLogistica = model.gestionLogistica.filter((item) => item.documentoTransporte !== documentoTransporte);
      }
      writeLocalModel(model);
      return buildViewRecordFromModel(model, documentoTransporte);
    },
    async saveLogistica(record) {
      const model = readLocalModel();
      const now = todayIsoDateTime();
      const existingAbandono = model.abandonos.find((item) => item.documentoTransporte === record.documentoTransporte);
      if (!existingAbandono) {
        throw new Error("No se encontro el expediente base para registrar la gestion logistica.");
      }

      const abandono = {
        ...existingAbandono,
        estado: record.estado,
        fechaDisposicion: record.fechaDisposicion || existingAbandono.fechaDisposicion || "",
        fechaCierre: record.fechaCierre || existingAbandono.fechaCierre || "",
        fechaActualizacion: now
      };

      const gestionLogistica = {
        documentoTransporte: record.documentoTransporte,
        funcionarioLogistica: record.funcionarioLogistica,
        numeroActaInspeccionLogistica: record.numeroActaInspeccionLogistica,
        fechaInspeccionLogistica: record.fechaInspeccionLogistica,
        cantidadMercanciaLogistica: record.cantidadMercanciaLogistica,
        pesoMercanciaLogistica: record.pesoMercanciaLogistica,
        descripcionMercanciaLogistica: record.descripcionMercanciaLogistica,
        avaluoTemporal: record.avaluoTemporal,
        avaluoDefinitivo: record.avaluoDefinitivo,
        observacionesLogistica: record.observacionesLogistica,
        adjuntosLogistica: record.adjuntosLogistica || [],
        fechaActualizacion: now
      };

      model.abandonos = upsertByDocumentoTransporte(model.abandonos, abandono);
      model.gestionLogistica = upsertByDocumentoTransporte(model.gestionLogistica, gestionLogistica);
      writeLocalModel(model);
      return createViewRecord(
        abandono,
        model.gestionRegistro.find((item) => item.documentoTransporte === record.documentoTransporte),
        gestionLogistica
      );
    },
    async addAdjuntoRC(documentoTransporte, adjunto) {
      const model = readLocalModel();
      const existing = model.gestionRegistro.find((item) => item.documentoTransporte === documentoTransporte);
      const updated = {
        ...(existing || { documentoTransporte }),
        adjuntosRC: [...(existing?.adjuntosRC || []), adjunto],
        fechaActualizacion: todayIsoDateTime()
      };
      model.gestionRegistro = upsertByDocumentoTransporte(model.gestionRegistro, updated);
      writeLocalModel(model);
      return buildViewRecordFromModel(model, documentoTransporte);
    },
    async removeAdjuntoRC(documentoTransporte, adjuntoId) {
      const model = readLocalModel();
      const existing = model.gestionRegistro.find((item) => item.documentoTransporte === documentoTransporte);
      if (!existing) return buildViewRecordFromModel(model, documentoTransporte);
      const updated = {
        ...existing,
        adjuntosRC: (existing.adjuntosRC || []).filter((item) => item.id !== adjuntoId),
        fechaActualizacion: todayIsoDateTime()
      };
      model.gestionRegistro = upsertByDocumentoTransporte(model.gestionRegistro, updated);
      writeLocalModel(model);
      return buildViewRecordFromModel(model, documentoTransporte);
    },
    async addAdjuntoLogistica(documentoTransporte, adjunto) {
      const model = readLocalModel();
      const existing = model.gestionLogistica.find((item) => item.documentoTransporte === documentoTransporte);
      const updated = {
        ...(existing || { documentoTransporte }),
        adjuntosLogistica: [...(existing?.adjuntosLogistica || []), adjunto],
        fechaActualizacion: todayIsoDateTime()
      };
      model.gestionLogistica = upsertByDocumentoTransporte(model.gestionLogistica, updated);
      writeLocalModel(model);
      return buildViewRecordFromModel(model, documentoTransporte);
    },
    async removeAdjuntoLogistica(documentoTransporte, adjuntoId) {
      const model = readLocalModel();
      const existing = model.gestionLogistica.find((item) => item.documentoTransporte === documentoTransporte);
      if (!existing) return buildViewRecordFromModel(model, documentoTransporte);
      const updated = {
        ...existing,
        adjuntosLogistica: (existing.adjuntosLogistica || []).filter((item) => item.id !== adjuntoId),
        fechaActualizacion: todayIsoDateTime()
      };
      model.gestionLogistica = upsertByDocumentoTransporte(model.gestionLogistica, updated);
      writeLocalModel(model);
      return buildViewRecordFromModel(model, documentoTransporte);
    }
  };
}

function createSharePointService() {
  const siteUrl = APP_CONFIG.sharePoint?.siteUrl?.replace(/\/$/, "");
  const listAbandonos = APP_CONFIG.sharePoint?.listAbandonos || "ABANDONOS";
  const listGestionRegistro = APP_CONFIG.sharePoint?.listGestionRegistro || "GESTION_REGISTRO";
  const listGestionLogistica = APP_CONFIG.sharePoint?.listGestionLogistica || "GESTION_LOGISTICA";
  const mockService = createMockService();

  return {
    async getAll() {
      if (!siteUrl) {
        return mockService.getAll();
      }
      const [abandonosResponse, gestionRegistroResponse, gestionLogisticaResponse] = await Promise.all([
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listAbandonos)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        }),
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listGestionRegistro)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        }),
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listGestionLogistica)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        })
      ]);

      const abandonosJson = await abandonosResponse.json();
      const gestionRegistroJson = await gestionRegistroResponse.json();
      const gestionLogisticaJson = await gestionLogisticaResponse.json();
      const model = {
        abandonos: (abandonosJson.value || []).map(mapSharePointAbandono),
        gestionRegistro: (gestionRegistroJson.value || []).map(mapSharePointGestionRegistro),
        gestionLogistica: (gestionLogisticaJson.value || []).map(mapSharePointGestionLogistica)
      };

      return createPayloadFromModel(model);
    },
    async saveRegistro(record, originalDocumentoTransporte = "") {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.saveRegistro(record, originalDocumentoTransporte);
    },
    async updateAbandono(documentoTransporte, fields, options = {}) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.updateAbandono(documentoTransporte, fields, options);
    },
    async saveLogistica(record) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.saveLogistica(record);
    },
    async addAdjuntoRC(documentoTransporte, adjunto) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.addAdjuntoRC(documentoTransporte, adjunto);
    },
    async removeAdjuntoRC(documentoTransporte, adjuntoId) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.removeAdjuntoRC(documentoTransporte, adjuntoId);
    },
    async addAdjuntoLogistica(documentoTransporte, adjunto) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.addAdjuntoLogistica(documentoTransporte, adjunto);
    },
    async removeAdjuntoLogistica(documentoTransporte, adjuntoId) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.removeAdjuntoLogistica(documentoTransporte, adjuntoId);
    }
  };
}

function mapSharePointAbandono(item) {
  return {
    documentoTransporte: item.DocumentoTransporte || item.Title || "",
    manifiesto: item.Manifiesto || "",
    consignatario: item.Consignatario || "",
    deposito: item.Deposito || "",
    fechaAbandono: item.FechaAbandono || "",
    descripcionMercancia: item.DescripcionMercancia || "",
    observacionesGenerales: item.ObservacionesGenerales || "",
    estado: normalizeEstadoValue(item.Estado),
    fechaReporteLogistica: item.FechaReporteLogistica || "",
    fechaDisposicion: item.FechaDisposicion || "",
    fechaCierre: item.FechaCierre || "",
    fechaCreacion: item.Created || "",
    fechaActualizacion: item.FechaActualizacion || item.Modified || ""
  };
}

function mapSharePointGestionRegistro(item) {
  return {
    documentoTransporte: item.DocumentoTransporte || item.Title || "",
    responsableRC: item.ResponsableRC?.Title || item.ResponsableRC || "",
    numeroActaInspeccionRC: item.NumeroActaInspeccionRC || "",
    fechaInspeccionRC: item.FechaInspeccionRC || "",
    cantidadMercanciaRC: item.CantidadMercanciaRC || "",
    pesoMercanciaRC: item.PesoMercanciaRC || "",
    descripcionMercanciaRC: item.DescripcionMercanciaRC || "",
    observacionesRC: item.ObservacionesRC || "",
    fechaActualizacion: item.FechaActualizacion || item.Modified || ""
  };
}

function mapSharePointGestionLogistica(item) {
  return {
    documentoTransporte: item.DocumentoTransporte || item.Title || "",
    funcionarioLogistica: item.FuncionarioLogistica?.Title || item.FuncionarioLogistica || "",
    numeroActaInspeccionLogistica: item.NumeroActaInspeccionLogistica || "",
    fechaInspeccionLogistica: item.FechaInspeccionLogistica || "",
    cantidadMercanciaLogistica: item.CantidadMercanciaLogistica || "",
    pesoMercanciaLogistica: item.PesoMercanciaLogistica || "",
    descripcionMercanciaLogistica: item.DescripcionMercanciaLogistica || "",
    avaluoTemporal: item.AvaluoTemporal || item.Avaluo || "",
    avaluoDefinitivo: item.AvaluoDefinitivo || "",
    observacionesLogistica: item.ObservacionesLogistica || "",
    fechaActualizacion: item.FechaActualizacion || item.Modified || ""
  };
}

function readLocal(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readLocalModel() {
  const abandonos = readLocal(STORAGE_KEYS.abandonos).map((item) => ({
    ...item,
    estado: normalizeEstadoValue(item.estado)
  }));
  return {
    abandonos,
    gestionRegistro: readLocal(STORAGE_KEYS.gestionRegistro),
    gestionLogistica: readLocal(STORAGE_KEYS.gestionLogistica)
  };
}

function writeLocalModel(model) {
  writeLocal(STORAGE_KEYS.abandonos, model.abandonos);
  writeLocal(STORAGE_KEYS.gestionRegistro, model.gestionRegistro);
  writeLocal(STORAGE_KEYS.gestionLogistica, model.gestionLogistica);
}

function createPayloadFromModel(model) {
  return {
    records: composeRecordsFromModel(model)
  };
}

function composeRecordsFromModel(model) {
  const abandonoMap = new Map(model.abandonos.map((item) => [item.documentoTransporte, item]));
  const rcMap = new Map(model.gestionRegistro.map((item) => [item.documentoTransporte, item]));
  const logisticaMap = new Map(model.gestionLogistica.map((item) => [item.documentoTransporte, item]));
  const keys = new Set([
    ...abandonoMap.keys(),
    ...rcMap.keys(),
    ...logisticaMap.keys()
  ]);

  return Array.from(keys)
    .map((key) => createViewRecord(abandonoMap.get(key), rcMap.get(key), logisticaMap.get(key)))
    .filter((item) => item.documentoTransporte);
}

function createViewRecord(abandono = {}, gestionRegistro = {}, gestionLogistica = {}) {
  const documentoTransporte =
    abandono.documentoTransporte
    || gestionRegistro.documentoTransporte
    || gestionLogistica.documentoTransporte
    || "";

    return {
      id: documentoTransporte,
      documentoTransporte,
      manifiesto: abandono.manifiesto || "",
      consignatario: abandono.consignatario || "",
    deposito: abandono.deposito || "",
    fechaAbandono: abandono.fechaAbandono || "",
    fechaAFavorNacion: "",
    descripcionMercancia: abandono.descripcionMercancia || "",
    observacionesGenerales: abandono.observacionesGenerales || "",
    responsableRC: gestionRegistro.responsableRC || "",
    numeroActaInspeccionRC: gestionRegistro.numeroActaInspeccionRC || "",
    fechaInspeccionRC: gestionRegistro.fechaInspeccionRC || "",
    cantidadMercanciaRC: gestionRegistro.cantidadMercanciaRC || "",
    pesoMercanciaRC: gestionRegistro.pesoMercanciaRC || "",
    descripcionMercanciaRC: gestionRegistro.descripcionMercanciaRC || "",
    observacionesRC: gestionRegistro.observacionesRC || "",
    fechaReporteLogistica: abandono.fechaReporteLogistica || "",
    funcionarioLogistica: gestionLogistica.funcionarioLogistica || "",
    numeroActaInspeccionLogistica: gestionLogistica.numeroActaInspeccionLogistica || "",
    fechaInspeccionLogistica: gestionLogistica.fechaInspeccionLogistica || "",
    cantidadMercanciaLogistica: gestionLogistica.cantidadMercanciaLogistica || "",
    pesoMercanciaLogistica: gestionLogistica.pesoMercanciaLogistica || "",
    descripcionMercanciaLogistica: gestionLogistica.descripcionMercanciaLogistica || "",
    avaluoTemporal: gestionLogistica.avaluoTemporal || "",
    avaluoDefinitivo: gestionLogistica.avaluoDefinitivo || "",
    observacionesLogistica: gestionLogistica.observacionesLogistica || "",
    adjuntosRC: gestionRegistro.adjuntosRC || [],
    adjuntosLogistica: gestionLogistica.adjuntosLogistica || [],
      estado: normalizeEstadoValue(abandono.estado),
      fechaDisposicion: abandono.fechaDisposicion || "",
      fechaCierre: abandono.fechaCierre || "",
      fechaCreacion: abandono.fechaCreacion || "",
      fechaActualizacion:
      abandono.fechaActualizacion
      || gestionRegistro.fechaActualizacion
      || gestionLogistica.fechaActualizacion
      || ""
  };
}

function buildViewRecordFromModel(model, documentoTransporte) {
  return createViewRecord(
    model.abandonos.find((item) => item.documentoTransporte === documentoTransporte),
    model.gestionRegistro.find((item) => item.documentoTransporte === documentoTransporte),
    model.gestionLogistica.find((item) => item.documentoTransporte === documentoTransporte)
  );
}

function upsertByDocumentoTransporte(list, item) {
  const next = [...list];
  const index = next.findIndex((current) => current.documentoTransporte === item.documentoTransporte);
  if (index >= 0) {
    next[index] = item;
  } else {
    next.unshift(item);
  }
  return next;
}

function renameDocumentoTransporteInModel(model, oldKey, newKey) {
  if (!oldKey || oldKey === newKey) return;
  if (model.abandonos.some((item) => item.documentoTransporte === newKey)) {
    throw new Error("Ya existe un expediente con ese Documento de Transporte.");
  }

  const renameList = (list) => list.map((item) =>
    item.documentoTransporte === oldKey ? { ...item, documentoTransporte: newKey } : item
  );

  model.abandonos = renameList(model.abandonos);
  model.gestionRegistro = renameList(model.gestionRegistro);
  model.gestionLogistica = renameList(model.gestionLogistica);
}

function seedMockData() {
  localStorage.removeItem("abandonos-app-history");
  if (localStorage.getItem(STORAGE_KEYS.demoVersion) === DEMO_DATA_VERSION) return;

  const now = todayIsoDateTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysFromToday = (days) => new Date(Date.now() + days * dayMs);
  const monthsBack = (date, months) => {
    const shifted = new Date(date);
    shifted.setMonth(shifted.getMonth() - months);
    return shifted;
  };
  const ymd = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const dateTime = (date) => `${ymd(date)}T15:00:00.000Z`;

  // Casos en Registro y Control: dias que faltan para la fecha a favor de la Nacion (negativo = vencido).
  const specsRC = [
    ["HBL-CO2408912", "Logistica Internacional S.A.", "Terminal Maritimo A1", "Lote textil y accesorios", 40, false],
    ["TGHU-1002456", "Aduanas del Caribe S.A.S.", "Deposito Norte", "Repuestos automotrices", 28, true],
    ["OOLU-5509123", "Consorcio Energetico S.A.", "Deposito Aduanero Este", "Equipos industriales", 22, true],
    ["MSCU-6677881", "Almacenadora del Pacifico S.A.", "Zona Franca Industrial 3", "Insumos medicos y cajas esteriles", 35, false],
    ["TEMU-4410287", "Quimicos del Litoral S.A.S.", "Terminal Maritimo A1", "Reactivos y envases plasticos", 12, false],
    ["FCIU-7201938", "Supermercados Regionales S.A.", "Deposito Norte", "Alimentos no perecederos", 8, true],
    ["TRHU-3388120", "Textiles del Caribe Ltda.", "Deposito Occidente", "Rollos de tela sintetica", 4, false],
    ["CAIU-4754280", "Vinci Coatings S.A.S.", "Zona Franca Industrial 3", "Pinturas y recubrimientos industriales", -9, true],
    ["MRKU-7009410", "Comercial Mar y Sol S.A.S.", "Deposito Aduanero Este", "Articulos de ferreteria", -20, false]
  ];

  // Casos en Operacion Logistica: dias que faltan para la fecha limite de traslado (reporte + 2 meses).
  const specsLogistica = [
    ["COSU-7845120", "Comercializadora Andina Ltda.", "Terminal Maritimo B2", "Equipos electronicos", 45, false],
    ["MAEU-8472910", "Importadora Global S.A.S.", "DPA World - Terminal 1", "Mercancia mixta de consumo", 30, true],
    ["CMAU-9081726", "Distribuciones Andinas S.A.S.", "Terminal Multiproposito Sur", "Mercancia seca de hogar", 11, false],
    ["SEGU-3102459", "Tecnologia Portuaria Ltda.", "Deposito Occidente", "Accesorios de cableado y gabinetes", 6, true],
    ["KOSU-4926410", "Verosa Group S.A.S.", "Terminal Maritimo B2", "Insumos de construccion", -7, true],
    ["EGSU-1792125", "Byrichh S.A.S.", "DPA World - Terminal 1", "Maquinaria liviana y repuestos", -18, false]
  ];

  // Casos cerrados: estado, dias de abandono atras, dias de reporte atras, dias de traslado atras, dias de cierre atras.
  const specsCerrados = [
    ["SUDU-1122334", "Retail Nacional S.A.", "Bodega Centro Occidente", "Textiles y accesorios", "Traslado Bodega", 95, 85, 30, 0],
    ["HLCU-5544332", "Comercializadora del Norte S.A.", "Bodega Fiscal Caribe", "Calzado y accesorios de vestir", "Traslado Bodega", 70, 60, 12, 0],
    ["BL-4422933", "Importadora Fenix", "Puerto Central", "Electrodomesticos y embalajes", "Rescatado", 80, 0, 0, 20],
    ["ZIMU-2290371", "Agroinsumos del Sinu S.A.S.", "Deposito Norte", "Fertilizantes y bolsas de empaque", "Rescatado", 75, 65, 0, 25],
    ["NYKU-8830412", "Ferreteria Central Ltda.", "Deposito Occidente", "Herramientas manuales", "No Efectivo", 60, 0, 0, 40],
    ["CSNU-5127763", "Muebles del Valle S.A.S.", "Terminal Maritimo B2", "Muebles desarmados", "No Efectivo", 45, 0, 0, 30]
  ];

  const abandonos = [];
  const gestionRegistro = [];
  const gestionLogistica = [];
  const responsablesRC = responsablesRCOptions;
  const responsablesLog = responsablesLogisticaOptions;
  let consecutivo = 0;

  const baseAbandono = (doc, consignatario, deposito, mercancia, extra) => {
    consecutivo += 1;
    return {
      documentoTransporte: doc,
      manifiesto: `MNF-2026-${String(80 + consecutivo).padStart(4, "0")}`,
      consignatario,
      deposito,
      descripcionMercancia: mercancia,
      observacionesGenerales: "",
      fechaReporteLogistica: "",
      fechaDisposicion: "",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now,
      ...extra
    };
  };

  const registroDe = (doc, index, fechaInspeccion) => ({
    documentoTransporte: doc,
    responsableRC: responsablesRC[index % responsablesRC.length],
    numeroActaInspeccionRC: fechaInspeccion ? `ACTA-RC-2026-${String(index + 1).padStart(3, "0")}` : "",
    fechaInspeccionRC: fechaInspeccion,
    cantidadMercanciaRC: fechaInspeccion ? `${12 + index * 3} cajas` : "",
    pesoMercanciaRC: fechaInspeccion ? `${420 + index * 137} kg` : "",
    descripcionMercanciaRC: fechaInspeccion ? "Mercancia inspeccionada y clasificada por referencia" : "",
    observacionesRC: fechaInspeccion ? "Inspeccion realizada sin novedad." : "",
    fechaActualizacion: now
  });

  const logisticaDe = (doc, index, fechaInspeccion, responsable, traslado = false) => ({
    documentoTransporte: doc,
    funcionarioLogistica: responsable,
    numeroActaInspeccionLogistica: fechaInspeccion ? `ACTA-OL-2026-${String(index + 1).padStart(3, "0")}` : "",
    fechaInspeccionLogistica: fechaInspeccion,
    cantidadMercanciaLogistica: fechaInspeccion ? `${10 + index * 4} bultos` : "",
    pesoMercanciaLogistica: fechaInspeccion ? `${380 + index * 151} kg` : "",
    descripcionMercanciaLogistica: fechaInspeccion ? "Mercancia verificada para traslado a bodega" : "",
    avaluoTemporal: fechaInspeccion ? String(9000 + index * 2350) : "",
    avaluoDefinitivo: fechaInspeccion && traslado ? String(9800 + index * 2350) : "",
    observacionesLogistica: fechaInspeccion ? (traslado ? "Traslado a bodega ejecutado sin novedad." : "Gestion logistica en curso.") : "",
    fechaActualizacion: now
  });

  specsRC.forEach(([doc, consignatario, deposito, mercancia, dias, inspeccionado], index) => {
    const abandono = monthsBack(daysFromToday(dias), 1);
    abandonos.push(baseAbandono(doc, consignatario, deposito, mercancia, {
      fechaAbandono: ymd(abandono),
      observacionesGenerales: inspeccionado ? "Inspeccion registrada, pendiente decision del caso." : "Pendiente inspeccion de Registro y Control.",
      estado: "En Registro y Control"
    }));
    gestionRegistro.push(registroDe(doc, index, inspeccionado ? ymd(new Date(abandono.getTime() + dayMs)) : ""));
  });

  specsLogistica.forEach(([doc, consignatario, deposito, mercancia, dias, inspeccionado], index) => {
    const reporte = monthsBack(daysFromToday(dias), 2);
    const rcIndex = specsRC.length + index;
    const abandono = new Date(reporte.getTime() - 12 * dayMs);
    abandonos.push(baseAbandono(doc, consignatario, deposito, mercancia, {
      fechaAbandono: ymd(abandono),
      observacionesGenerales: "Caso reportado a Operacion Logistica.",
      estado: "En Logistica",
      fechaReporteLogistica: dateTime(reporte)
    }));
    gestionRegistro.push(registroDe(doc, rcIndex, ymd(new Date(abandono.getTime() + 2 * dayMs))));
    gestionLogistica.push(logisticaDe(doc, index, inspeccionado ? ymd(new Date(reporte.getTime() + 2 * dayMs)) : "", index === 0 ? "" : responsablesLog[index % responsablesLog.length]));
  });

  specsCerrados.forEach(([doc, consignatario, deposito, mercancia, estado, abandono, reporte, traslado, cierre], index) => {
    const rcIndex = specsRC.length + specsLogistica.length + index;
    abandonos.push(baseAbandono(doc, consignatario, deposito, mercancia, {
      fechaAbandono: ymd(daysFromToday(-abandono)),
      observacionesGenerales: estado === "Traslado Bodega" ? "Mercancia trasladada a bodega." : estado === "Rescatado" ? "Mercancia legalizada por el consignatario." : "Caso retirado por regularizacion previa.",
      estado,
      fechaReporteLogistica: reporte ? dateTime(daysFromToday(-reporte)) : "",
      fechaDisposicion: traslado ? dateTime(daysFromToday(-traslado)) : "",
      fechaCierre: cierre ? dateTime(daysFromToday(-cierre)) : ""
    }));
    gestionRegistro.push(registroDe(doc, rcIndex, ymd(daysFromToday(-(abandono - 3)))));
    if (reporte) {
      gestionLogistica.push(logisticaDe(doc, specsLogistica.length + index, ymd(daysFromToday(-(reporte - 3))), responsablesLog[index % responsablesLog.length], true));
    }
  });

  writeLocal(STORAGE_KEYS.abandonos, abandonos);
  writeLocal(STORAGE_KEYS.gestionRegistro, gestionRegistro);
  writeLocal(STORAGE_KEYS.gestionLogistica, gestionLogistica);
  localStorage.setItem(STORAGE_KEYS.demoVersion, DEMO_DATA_VERSION);
}

window.addEventListener("error", (event) => {
  alert(event.error?.message || "Ocurrio un error en la aplicacion.");
});
