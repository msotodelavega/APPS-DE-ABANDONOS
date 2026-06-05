const APP_CONFIG = window.APP_CONFIG ?? {};

const STATES = [
  "En Registro y Control",
  "En Logistica",
  "Rescatado por Legalizado",
  "No Efectivo",
  "Traslado Bodega"
];

const STORAGE_KEYS = {
  abandonos: "abandonos-app-abandonos",
  inspeccionRC: "abandonos-app-inspeccion-rc",
  gestionLogistica: "abandonos-app-gestion-logistica",
  historial: "abandonos-app-history",
  demoVersion: "abandonos-app-demo-version",
  testerUser: "abandonos-app-tester-user"
};

const DEMO_DATA_VERSION = "4";

const statusClassMap = {
  "En Registro y Control": "status-registrado",
  "En Logistica": "status-gestion",
  "Rescatado por Legalizado": "status-legalizado",
  "No Efectivo": "status-no-efectivo",
  "Traslado Bodega": "status-dispuesto"
};

const state = {
  currentView: "registro",
  records: [],
  history: [],
  search: "",
  logisticaFilter: "En Logistica",
  panelRecordId: null,
  panelMode: "view",
  sidebarOpen: false
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
  globalSearch: document.getElementById("globalSearch"),
  roleSelector: document.getElementById("roleSelector"),
  userSelector: document.getElementById("userSelector"),
  dataModeBadge: document.getElementById("dataModeBadge"),
  dataModelButton: document.getElementById("dataModelButton"),
  userPill: document.getElementById("userPill"),
  menuButton: document.getElementById("menuButton"),
  sidebar: document.getElementById("sidebar"),
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
      { name: "Estado", type: "Texto", rule: "Automatica", note: "Solo usa 5 valores: En Registro y Control, En Logistica, Rescatado por Legalizado, No Efectivo y Traslado Bodega" },
      { name: "FechaReporteLogistica", type: "Fecha y hora", rule: "Automatica", note: "Se llena cuando el expediente pasa a En Logistica" },
      { name: "FechaDisposicion", type: "Fecha y hora", rule: "Automatica", note: "Fecha Traslado Bodega" },
      { name: "FechaCierre", type: "Fecha y hora", rule: "Automatica", note: "Se usa para cierres por Rescatado por Legalizado o No Efectivo" },
      { name: "FechaCreacion", type: "Fecha y hora", rule: "Automatica", note: "Auditoria basica" },
      { name: "FechaActualizacion", type: "Fecha y hora", rule: "Automatica", note: "Ultima modificacion" }
    ]
  },
  inspeccionRC: {
    title: "INSPECCION_RC",
    subtitle: "Datos propios de Gestion Registro y Control. Relacion 1:1 opcional con ABANDONOS.",
    fields: [
      { name: "DocumentoTransporte", type: "Texto unico", rule: "Editable", note: "Relacion directa con ABANDONOS" },
      { name: "ResponsableRC", type: "Lista", rule: "Editable", note: "Responsable de Registro y Control" },
      { name: "FechaInspeccionRC", type: "Fecha", rule: "Editable", note: "Fecha de gestion o inspeccion RC" },
      { name: "CantidadMercanciaRC", type: "Numero o texto", rule: "Editable", note: "Cantidad registrada en inspeccion RC" },
      { name: "PesoMercanciaRC", type: "Numero o texto", rule: "Editable", note: "Peso registrado en inspeccion RC" },
      { name: "DescripcionMercanciaRC", type: "Texto largo", rule: "Editable", note: "Descripcion de mercancia validada en inspeccion RC" },
      { name: "ObservacionesRC", type: "Texto largo", rule: "Editable", note: "Hallazgos RC" },
      { name: "FechaActualizacion", type: "Fecha y hora", rule: "Automatica", note: "Ultima modificacion de la inspeccion RC" }
    ]
  },
  gestionLogistica: {
    title: "GESTION_LOGISTICA",
    subtitle: "Datos propios de Gestion Operacion Logistica. Relacion 1:1 opcional con ABANDONOS.",
    fields: [
      { name: "DocumentoTransporte", type: "Texto unico", rule: "Editable", note: "Relacion directa con ABANDONOS" },
      { name: "FuncionarioLogistica", type: "Lista o texto", rule: "Editable", note: "Responsable logistico" },
      { name: "FechaInspeccionLogistica", type: "Fecha", rule: "Editable", note: "Fecha de inspeccion en operacion logistica" },
      { name: "CantidadMercanciaLogistica", type: "Numero o texto", rule: "Editable", note: "Cantidad verificada en logistica" },
      { name: "PesoMercanciaLogistica", type: "Numero o texto", rule: "Editable", note: "Peso verificado en logistica" },
      { name: "DescripcionMercanciaLogistica", type: "Texto largo", rule: "Editable", note: "Descripcion validada en logistica" },
      { name: "AvaluoTemporal", type: "Numero", rule: "Editable", note: "Valor preliminar del avaluo" },
      { name: "AvaluoDefinitivo", type: "Numero", rule: "Editable", note: "Valor final del avaluo" },
      { name: "ObservacionesLogistica", type: "Texto largo", rule: "Editable", note: "Notas de gestion" },
      { name: "FechaActualizacion", type: "Fecha y hora", rule: "Automatica", note: "Ultima modificacion de la gestion logistica" }
    ]
  },
  historial: {
    title: "HISTORIAL",
    subtitle: "Lista de trazabilidad. Cada accion importante crea un movimiento automatico.",
    fields: [
      { name: "DocumentoTransporte", type: "Texto", rule: "Automatica", note: "Relacion funcional con ABANDONOS" },
      { name: "Fecha", type: "Fecha y hora", rule: "Automatica", note: "Momento de la accion" },
      { name: "Usuario", type: "Texto", rule: "Automatica", note: "Quien ejecuta la accion" },
      { name: "Accion", type: "Texto", rule: "Automatica", note: "Ej: Registro creado, Enviado a Logistica" },
      { name: "Observacion", type: "Texto largo", rule: "Automatica", note: "Detalle del cambio" }
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
  els.globalSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderAll();
  });

  els.overlay.addEventListener("click", closePanel);

  els.menuButton.addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    els.sidebar.classList.toggle("open", state.sidebarOpen);
  });

  bindRoleTesterEvents();

  els.dataModelButton.addEventListener("click", () => {
    if (!canViewModeloDatos()) return;
    state.currentView = "modelo";
    closePanel();
    state.sidebarOpen = false;
    els.sidebar.classList.remove("open");
    renderAll();
  });

  els.navItems.forEach((button) => {
    button.addEventListener("click", () => {
      if (!canView(button.dataset.view)) return;
      state.currentView = button.dataset.view;
      state.sidebarOpen = false;
      els.sidebar.classList.remove("open");
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
  state.history = payload.history.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
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

function renderRegistroView() {
  if (!canView("registro")) {
    els.registro.innerHTML = "";
    return;
  }
  const records = getRoleScopedRecords("registro", getFilteredRecords()).filter((record) =>
    record.estado === "En Registro y Control"
  );
  els.registro.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Registro y Control</h1>
        <p class="page-subtitle">Listado general y gestion operativa de expedientes.</p>
      </div>
      <div class="button-row">
        ${canCreateAbandono() ? '<button class="btn btn-primary" data-action="new-record" type="button">Nuevo Abandono</button>' : ""}
      </div>
    </div>
    <div class="card table-card">
      ${renderTable(records, "registro")}
      <div class="footer-bar">
        <span>Mostrando ${records.length} de ${state.records.length} registros</span>
      </div>
    </div>
  `;

  const newRecordButton = els.registro.querySelector('[data-action="new-record"]');
  if (newRecordButton) {
    newRecordButton.addEventListener("click", () => openRegistroPanel());
  }
  bindRowClicks(els.registro, "registro");
}

function renderLogisticaView() {
  if (!canView("logistica")) {
    els.logistica.innerHTML = "";
    return;
  }
  const records = getRoleScopedRecords("logistica", getFilteredRecords()).filter((record) =>
    record.estado === "En Logistica"
  );

  els.logistica.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Operacion Logistica</h1>
        <p class="page-subtitle">Bandeja operativa de logistica para expedientes en gestion logistica.</p>
      </div>
      <div class="button-row">
        <button class="btn btn-secondary" data-action="refresh-logistica" type="button">Actualizar</button>
      </div>
    </div>
    <div class="card table-card">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Documento de Transporte</th>
              <th>Consignatario</th>
              <th>Deposito</th>
              <th>Responsable Logistica</th>
              <th>Fecha Reporte a Logistica</th>
              <th>Fecha Limite Traslado</th>
              <th>Semaforo Logistica</th>
            </tr>
          </thead>
          <tbody>
            ${records.length ? records.map((record) => `
              <tr class="row-clickable" data-scope="logistica" data-record-id="${record.id}">
                <td>${escapeHtml(record.documentoTransporte)}</td>
                <td>${escapeHtml(record.consignatario)}</td>
                <td>${escapeHtml(record.deposito)}</td>
                <td>${escapeHtml(record.funcionarioLogistica || "Sin asignar")}</td>
                <td>${formatDateTime(record.fechaReporteLogistica)}</td>
                <td>${formatDate(getFechaLimiteLogistica(record))}</td>
                <td>${renderSemaforoLogistica(record)}</td>
              </tr>
            `).join("") : `<tr><td colspan="7"><div class="empty-state">No hay expedientes reportados a logistica.</div></td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="footer-bar">
        <span>Casos visibles en logistica: ${records.length}</span>
      </div>
    </div>
  `;

  els.logistica.querySelector('[data-action="refresh-logistica"]').addEventListener("click", async () => {
    await loadData();
    renderAll();
  });
  bindRowClicks(els.logistica, "logistica");
}

function renderAdministracionView() {
  if (!canView("administracion")) {
    els.administracion.innerHTML = "";
    return;
  }
  const records = getFilteredRecords();
  const stats = {
    total: state.records.length,
    rc: state.records.filter((record) => record.estado === "En Registro y Control").length,
    logistica: state.records.filter((record) => record.estado === "En Logistica").length,
    cerrados: state.records.filter((record) => ["Rescatado por Legalizado", "No Efectivo", "Traslado Bodega"].includes(record.estado)).length
  };

  els.administracion.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Administracion</h1>
        <p class="page-subtitle">Consulta general del proceso de abandonos legales.</p>
      </div>
      <div class="button-row">
        <button class="btn btn-secondary" data-action="export-json" type="button">Exportar JSON</button>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="card kpi-card"><div class="kpi-label">Total casos</div><div class="kpi-value">${stats.total}</div></div>
      <div class="card kpi-card"><div class="kpi-label">En Registro y Control</div><div class="kpi-value">${stats.rc}</div></div>
      <div class="card kpi-card"><div class="kpi-label">En Logistica</div><div class="kpi-value">${stats.logistica}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Trasladados</div><div class="kpi-value">${stats.cerrados}</div></div>
    </div>
    <div class="card table-card">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Consignatario</th>
              <th>Deposito</th>
              <th>Fecha abandono</th>
              <th>Fecha a Favor de la Nacion</th>
              <th>Estado</th>
              <th>Fecha Insp. RC</th>
              <th>Fecha Insp. Logistica</th>
              <th>Fecha Traslado Bodega</th>
              <th>Dias Transcurridos</th>
            </tr>
          </thead>
          <tbody>
            ${records.length ? records.map((record) => `
              <tr class="row-clickable" data-open-admin="${record.id}">
                <td>${escapeHtml(record.documentoTransporte)}</td>
                <td>${escapeHtml(record.consignatario)}</td>
                <td>${escapeHtml(record.deposito)}</td>
                <td>${formatDate(record.fechaAbandono)}</td>
                <td>${formatDate(getFechaAFavorNacion(record))}</td>
                <td>${renderStatus(record.estado)}</td>
                <td>${formatDate(record.fechaInspeccionRC)}</td>
                <td>${formatDate(record.fechaInspeccionLogistica)}</td>
                <td>${formatDate(record.fechaDisposicion)}</td>
                <td>${calculateDays(record.fechaAbandono)}</td>
              </tr>
            `).join("") : `<tr><td colspan="9"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  els.administracion.querySelector('[data-action="export-json"]').addEventListener("click", exportData);
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
    <div class="page-header">
      <div>
        <h1 class="page-title">Modelo de Datos</h1>
        <p class="page-subtitle">Vista completa del modelo funcional con 4 tablas relacionadas por DocumentoTransporte.</p>
      </div>
    </div>

    <div class="schema-summary-grid">
      <div class="schema-summary-card">
        <h2 class="schema-summary-title">Plataforma</h2>
        <p class="schema-summary-text">SharePoint Lists con <strong>4 tablas</strong>: ABANDONOS, INSPECCION_RC, GESTION_LOGISTICA e HISTORIAL.</p>
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
        <span>1:1 / 1:N</span>
      </div>

      <div class="schema-box">
        <div class="schema-box-header">
          <h2 class="schema-box-title">TABLAS RELACIONADAS</h2>
          <p class="schema-box-subtitle">Capas operativas y trazabilidad</p>
        </div>
        <div class="schema-box-body">
          <div class="schema-key-list">
            <div class="schema-key-item">
              <div class="schema-key-name">INSPECCION_RC</div>
              <div class="schema-key-note">Relacion 1:1 opcional por DocumentoTransporte para Gestion Registro y Control.</div>
            </div>
            <div class="schema-key-item">
              <div class="schema-key-name">GESTION_LOGISTICA</div>
              <div class="schema-key-note">Relacion 1:1 opcional por DocumentoTransporte para Gestion Operacion Logistica.</div>
            </div>
            <div class="schema-key-item">
              <div class="schema-key-name">HISTORIAL</div>
              <div class="schema-key-note">Relacion 1:N por DocumentoTransporte para movimientos de auditoria y seguimiento.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${renderDataModelTable(DATA_MODEL.abandono)}
    ${renderDataModelTable(DATA_MODEL.inspeccionRC)}
    ${renderDataModelTable(DATA_MODEL.gestionLogistica)}
    ${renderDataModelTable(DATA_MODEL.historial)}
    ${renderDataModelTable(DATA_MODEL.calculados)}
  `;
}

function renderTable(records, scope) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Documento de Transporte</th>
            <th>Consignatario</th>
            <th>Deposito</th>
            <th>Responsable</th>
            <th>Fecha de Abandono</th>
            <th>Fecha a Favor de la Nacion</th>
            <th>Semaforo</th>
          </tr>
        </thead>
        <tbody>
          ${records.length ? records.map((record) => `
            <tr class="row-clickable" data-scope="${scope}" data-record-id="${record.id}">
              <td>${escapeHtml(record.documentoTransporte)}</td>
              <td>${escapeHtml(record.consignatario)}</td>
              <td>${escapeHtml(record.deposito)}</td>
              <td>${escapeHtml(getCurrentOwner(record))}</td>
              <td>${formatDate(record.fechaAbandono)}</td>
              <td>${formatDate(getFechaAFavorNacion(record))}</td>
              <td>${renderSemaforo(record)}</td>
            </tr>
          `).join("") : `<tr><td colspan="7"><div class="empty-state">No hay expedientes disponibles.</div></td></tr>`}
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
  const canEditGeneral = canEditRegistroGeneral(record);
  const canAssignRC = canAssignResponsableRC(record);
  const canEditInspection = canEditRegistroInspection(record);
  const canSave = canEditGeneral || canEditInspection;
  const canReportToLogistica = isExisting && record.estado === "En Registro y Control" && canManageRegistroWorkflow();
  const canLegalize = isExisting && record.estado === "En Registro y Control" && canManageRegistroWorkflow();
  const canMarkNoEfectivo = isExisting && record.estado === "En Registro y Control" && canManageRegistroWorkflow();
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">${isExisting ? "Detalle de Registro" : "Nuevo Abandono"}</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <form id="registroForm" class="panel-body">
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
        <div class="field"><label>Fecha de Inspeccion RC</label><input name="fechaInspeccionRC" ${canEditInspection ? "" : "readonly"} type="date" value="${escapeAttr(record.fechaInspeccionRC)}" /></div>
        <div class="field-grid">
          <div class="field"><label>Cantidad</label><input name="cantidadMercanciaRC" ${canEditInspection ? "" : "readonly"} value="${escapeAttr(record.cantidadMercanciaRC)}" /></div>
          <div class="field"><label>Peso</label><input name="pesoMercanciaRC" ${canEditInspection ? "" : "readonly"} value="${escapeAttr(record.pesoMercanciaRC)}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia</label><textarea name="descripcionMercanciaRC" ${canEditInspection ? "" : "readonly"}>${escapeHtml(record.descripcionMercanciaRC)}</textarea></div>
        <div class="field"><label>Observaciones RC</label><textarea name="observacionesRC" ${canEditInspection ? "" : "readonly"}>${escapeHtml(record.observacionesRC)}</textarea></div>
      </div>
      <div class="panel-section">
        <h3>Historial</h3>
        ${renderHistory(record.id)}
      </div>
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
  els.sidePanel.querySelector('[data-action="save-registro"]').addEventListener("click", saveRegistroForm);
  const oficioButton = els.sidePanel.querySelector('[data-action="oficio"]');
  const reportarButton = els.sidePanel.querySelector('[data-action="reportar"]');
  const legalizarButton = els.sidePanel.querySelector('[data-action="legalizar"]');
  const noEfectivoButton = els.sidePanel.querySelector('[data-action="no-efectivo"]');
  if (oficioButton) oficioButton.addEventListener("click", () => generateOficio(record.id));
  if (reportarButton) reportarButton.addEventListener("click", () => reportToLogistica(record.id));
  if (legalizarButton) legalizarButton.addEventListener("click", () => legalizeCaso(record.id));
  if (noEfectivoButton) noEfectivoButton.addEventListener("click", () => markNoEfectivo(record.id));
}

function renderPanelLogistica(record) {
  if (!canView("logistica")) return;
  const canAssignLogistica = canAssignResponsableLogistica(record);
  const canEditGestion = canEditLogisticaInspection(record);
  const canSave = canAssignLogistica || canEditGestion;
  const canTraslado = canMarkTrasladoBodega(record);
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Gestion Logistica</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <form id="logisticaForm" class="panel-body">
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
        <div class="field"><label>Fecha de Inspeccion RC</label><input readonly value="${escapeAttr(formatDate(record.fechaInspeccionRC))}" /></div>
        <div class="field-grid">
          <div class="field"><label>Cantidad RC</label><input readonly value="${escapeAttr(record.cantidadMercanciaRC || "")}" /></div>
          <div class="field"><label>Peso RC</label><input readonly value="${escapeAttr(record.pesoMercanciaRC || "")}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia RC</label><textarea readonly>${escapeHtml(record.descripcionMercanciaRC)}</textarea></div>
        <div class="field"><label>Observaciones RC</label><textarea readonly>${escapeHtml(record.observacionesRC)}</textarea></div>
      </div>
      <div class="panel-section">
        <h3>Gestion Operacion Logistica</h3>
        <div class="field"><label>Responsable Logistica</label><select name="funcionarioLogistica" ${canAssignLogistica ? "" : "disabled"}>${renderResponsableLogisticaOptions(record.funcionarioLogistica)}</select></div>
        <div class="field"><label>Fecha de Inspeccion Logistica</label><input name="fechaInspeccionLogistica" ${canEditGestion ? "" : "readonly"} type="date" value="${escapeAttr(record.fechaInspeccionLogistica)}" /></div>
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
      <div class="panel-section">
        <h3>Historial</h3>
        ${renderHistory(record.id)}
      </div>
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
}

function renderPanelAdmin(record) {
  els.sidePanel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Consulta de Expediente</h2>
      <button class="icon-button" data-close-panel type="button">X</button>
    </div>
    <div class="panel-body">
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
        <div class="field"><label>Fecha de Inspeccion RC</label><input readonly value="${escapeAttr(formatDate(record.fechaInspeccionRC))}" /></div>
        <div class="field-grid">
          <div class="field"><label>Cantidad RC</label><input readonly value="${escapeAttr(record.cantidadMercanciaRC || "")}" /></div>
          <div class="field"><label>Peso RC</label><input readonly value="${escapeAttr(record.pesoMercanciaRC || "")}" /></div>
        </div>
        <div class="field"><label>Descripcion de Mercancia RC</label><textarea readonly>${escapeHtml(record.descripcionMercanciaRC)}</textarea></div>
        <div class="field"><label>Observaciones RC</label><textarea readonly>${escapeHtml(record.observacionesRC)}</textarea></div>
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
        <div class="field"><label>Fecha de Inspeccion Logistica</label><input readonly value="${escapeAttr(formatDate(record.fechaInspeccionLogistica))}" /></div>
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
      </div>
      <div class="panel-section">
        <h3>Historial</h3>
        ${renderHistory(record.id)}
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
          La aplicacion usa <strong>4 listas</strong> sobre SharePoint Lists: ABANDONOS, INSPECCION_RC, GESTION_LOGISTICA e HISTORIAL.
        </div>
      </div>
      ${renderDataModelCard(DATA_MODEL.abandono)}
      ${renderDataModelCard(DATA_MODEL.inspeccionRC)}
      ${renderDataModelCard(DATA_MODEL.gestionLogistica)}
      ${renderDataModelCard(DATA_MODEL.historial)}
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
  if (!canEditRegistroGeneral(baseRecord) && !canEditRegistroInspection(baseRecord)) {
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

  const action = baseRecord.id ? "Registro actualizado" : "Registro creado";
  await dataService.saveRegistro(payload, action, "Gestion desde Registro y Control", state.panelRecordId || "");
  await loadData();
  renderAll();
  closePanel();
}

async function reportToLogistica(recordId) {
  const record = getRecord(recordId);
  if (!record || !canManageRegistroWorkflow()) return;
  const updated = {
    ...record,
    estado: "En Logistica",
    fechaReporteLogistica: todayIsoDateTime()
  };
  await dataService.updateAbandono(recordId, updated, "Enviado a Logistica", record.observacionesRC || "");
  await loadData();
  renderAll();
  openRegistroPanel(recordId);
}

async function legalizeCaso(recordId) {
  const record = getRecord(recordId);
  if (!record || ["Rescatado por Legalizado", "No Efectivo", "Traslado Bodega"].includes(record.estado) || !canManageRegistroWorkflow()) return;

  const confirmed = window.confirm("Este expediente se marcara como legalizado desde Registro y Control y no sera enviado a Logistica. Deseas continuar?");
  if (!confirmed) return;

  await dataService.updateAbandono(
    recordId,
    {
      estado: "Rescatado por Legalizado",
      fechaReporteLogistica: "",
      fechaCierre: todayIsoDateTime()
    },
    "Caso legalizado",
    "Rescatado por legalizado desde Registro y Control sin envio a Logistica",
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
    "Abandono no efectivo",
    "Caso retirado desde Registro y Control por abandono no efectivo",
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
  if (!record || (!canAssignResponsableLogistica() && !canEditLogisticaInspection(record))) {
    throw new Error("No tienes permisos para modificar este abandono en Operacion Logistica.");
  }

  const nextState = "En Logistica";
  const updated = {
    ...record,
    funcionarioLogistica: formData.get("funcionarioLogistica")?.toString().trim() ?? record.funcionarioLogistica ?? "",
    fechaInspeccionLogistica: formData.get("fechaInspeccionLogistica")?.toString() ?? record.fechaInspeccionLogistica ?? "",
    cantidadMercanciaLogistica: formData.get("cantidadMercanciaLogistica")?.toString().trim() ?? record.cantidadMercanciaLogistica ?? "",
    pesoMercanciaLogistica: formData.get("pesoMercanciaLogistica")?.toString().trim() ?? record.pesoMercanciaLogistica ?? "",
    descripcionMercanciaLogistica: formData.get("descripcionMercanciaLogistica")?.toString().trim() ?? record.descripcionMercanciaLogistica ?? "",
    avaluoTemporal: formData.get("avaluoTemporal")?.toString().trim() ?? record.avaluoTemporal ?? "",
    avaluoDefinitivo: formData.get("avaluoDefinitivo")?.toString().trim() ?? record.avaluoDefinitivo ?? "",
    observacionesLogistica: formData.get("observacionesLogistica")?.toString().trim() ?? record.observacionesLogistica ?? "",
    estado: nextState
  };

  await dataService.saveLogistica(updated, "Gestion logistica actualizada", updated.observacionesLogistica);
  await loadData();
  renderAll();
  openLogisticaPanel(recordId);
}

async function markDispuesto(recordId) {
  const record = getRecord(recordId);
  if (!record || !canMarkTrasladoBodega(record)) return;
  await dataService.updateAbandono(
    recordId,
    {
      estado: "Traslado Bodega",
      fechaDisposicion: todayIsoDateTime()
    },
    "Traslado a Bodega",
    record.observacionesLogistica || "Mercancia trasladada a bodega"
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

  dataService.addHistory(recordId, "Oficio persuasivo generado", "Documento listo para impresion o PDF");
  loadData().then(renderAll);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ records: state.records, history: state.history }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "abandonos-legales.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderHistory(recordId) {
  const history = state.history.filter((item) => item.documentoTransporte === recordId);
  if (!recordId || !history.length) {
    return `<div class="empty-state">Sin movimientos registrados.</div>`;
  }

  return `
    <div class="history-list">
      ${history.map((item) => `
        <div class="history-item">
          <div class="history-action">${escapeHtml(item.accion)}</div>
          <div class="history-meta">${formatDateTime(item.fecha)} - ${escapeHtml(item.usuario)}</div>
          <div class="history-meta">${escapeHtml(item.observacion || "Sin observacion")}</div>
        </div>
      `).join("")}
    </div>
  `;
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
  if (["Rescatado por Legalizado", "No Efectivo", "Traslado Bodega"].includes(record.estado)) {
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
    return { tone: "amarillo", label: "Proximo" };
  }
  return { tone: "verde", label: "Al dia" };
}

function getSemaforoLogistica(record) {
  if (["Rescatado por Legalizado", "No Efectivo", "Traslado Bodega"].includes(record.estado)) {
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
    return { tone: "amarillo", label: "Proximo" };
  }
  return { tone: "verde", label: "Al dia" };
}

function getSemaforoLabel(record) {
  return getSemaforo(record).label;
}

function getSemaforoLogisticaLabel(record) {
  return getSemaforoLogistica(record).label;
}

function renderSemaforo(record) {
  const semaforo = getSemaforo(record);
  return `<span class="semaforo-pill semaforo-${semaforo.tone}"><span class="semaforo-dot"></span>${escapeHtml(semaforo.label)}</span>`;
}

function renderSemaforoLogistica(record) {
  const semaforo = getSemaforoLogistica(record);
  return `<span class="semaforo-pill semaforo-${semaforo.tone}"><span class="semaforo-dot"></span>${escapeHtml(semaforo.label)}</span>`;
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

function renderStatus(status) {
  const className = statusClassMap[status] ?? "status-registrado";
  return `<span class="status-pill ${className}"><span class="status-dot"></span>${escapeHtml(status)}</span>`;
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
    case "Rescatado por Legalizado":
      return "Rescatado por Legalizado";
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
    fechaInspeccionRC: "",
    cantidadMercanciaRC: "",
    pesoMercanciaRC: "",
    descripcionMercanciaRC: "",
    observacionesRC: "",
    fechaReporteLogistica: "",
    funcionarioLogistica: "",
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
    fechaActualizacion: ""
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
    async saveRegistro(record, action, observation, originalDocumentoTransporte = "") {
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

      const inspeccionRC = {
        documentoTransporte: record.documentoTransporte,
        responsableRC: record.responsableRC,
        fechaInspeccionRC: record.fechaInspeccionRC,
        cantidadMercanciaRC: record.cantidadMercanciaRC,
        pesoMercanciaRC: record.pesoMercanciaRC,
        descripcionMercanciaRC: record.descripcionMercanciaRC,
        observacionesRC: record.observacionesRC,
        fechaActualizacion: now
      };

      model.abandonos = upsertByDocumentoTransporte(model.abandonos, abandono);
      model.inspeccionRC = upsertByDocumentoTransporte(model.inspeccionRC, inspeccionRC);
      addHistoryToModel(model, record.documentoTransporte, action, observation);
      writeLocalModel(model);
      return createViewRecord(
        abandono,
        inspeccionRC,
        model.gestionLogistica.find((item) => item.documentoTransporte === record.documentoTransporte)
      );
    },
    async updateAbandono(documentoTransporte, fields, action, observation, options = {}) {
      const model = readLocalModel();
      const now = todayIsoDateTime();
      const existing = model.abandonos.find((item) => item.documentoTransporte === documentoTransporte);
      if (!existing) {
        throw new Error("No se encontro el expediente para actualizar.");
      }

      const allowedFields = {
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
      };

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
      addHistoryToModel(model, documentoTransporte, action, observation);
      writeLocalModel(model);
      return buildViewRecordFromModel(model, documentoTransporte);
    },
    async saveLogistica(record, action, observation) {
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
        fechaInspeccionLogistica: record.fechaInspeccionLogistica,
        cantidadMercanciaLogistica: record.cantidadMercanciaLogistica,
        pesoMercanciaLogistica: record.pesoMercanciaLogistica,
        descripcionMercanciaLogistica: record.descripcionMercanciaLogistica,
        avaluoTemporal: record.avaluoTemporal,
        avaluoDefinitivo: record.avaluoDefinitivo,
        observacionesLogistica: record.observacionesLogistica,
        fechaActualizacion: now
      };

      model.abandonos = upsertByDocumentoTransporte(model.abandonos, abandono);
      model.gestionLogistica = upsertByDocumentoTransporte(model.gestionLogistica, gestionLogistica);
      addHistoryToModel(model, record.documentoTransporte, action, observation);
      writeLocalModel(model);
      return createViewRecord(
        abandono,
        model.inspeccionRC.find((item) => item.documentoTransporte === record.documentoTransporte),
        gestionLogistica
      );
    },
    async addHistory(documentoTransporte, accion, observacion) {
      const model = readLocalModel();
      addHistoryToModel(model, documentoTransporte, accion, observacion);
      writeLocalModel(model);
    }
  };
}

function createSharePointService() {
  const siteUrl = APP_CONFIG.sharePoint?.siteUrl?.replace(/\/$/, "");
  const listAbandonos = APP_CONFIG.sharePoint?.listAbandonos || "ABANDONOS";
  const listInspeccionRC = APP_CONFIG.sharePoint?.listInspeccionRC || "INSPECCION_RC";
  const listGestionLogistica = APP_CONFIG.sharePoint?.listGestionLogistica || "GESTION_LOGISTICA";
  const listHistorial = APP_CONFIG.sharePoint?.listHistorial || "HISTORIAL";
  const mockService = createMockService();

  return {
    async getAll() {
      if (!siteUrl) {
        return mockService.getAll();
      }
      const [abandonosResponse, inspeccionRCResponse, gestionLogisticaResponse, historyResponse] = await Promise.all([
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listAbandonos)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        }),
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listInspeccionRC)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        }),
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listGestionLogistica)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        }),
        fetch(`${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listHistorial)}')/items?$top=5000`, {
          headers: { Accept: "application/json;odata=nometadata" }
        })
      ]);

      const abandonosJson = await abandonosResponse.json();
      const inspeccionRCJson = await inspeccionRCResponse.json();
      const gestionLogisticaJson = await gestionLogisticaResponse.json();
      const historyJson = await historyResponse.json();
      const model = {
        abandonos: (abandonosJson.value || []).map(mapSharePointAbandono),
        inspeccionRC: (inspeccionRCJson.value || []).map(mapSharePointInspeccionRC),
        gestionLogistica: (gestionLogisticaJson.value || []).map(mapSharePointGestionLogistica),
        historial: (historyJson.value || []).map(mapSharePointHistory)
      };

      return createPayloadFromModel(model);
    },
    async saveRegistro(record, action, observation, originalDocumentoTransporte = "") {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.saveRegistro(record, action, observation, originalDocumentoTransporte);
    },
    async updateAbandono(documentoTransporte, fields, action, observation, options = {}) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.updateAbandono(documentoTransporte, fields, action, observation, options);
    },
    async saveLogistica(record, action, observation) {
      console.warn("Modo SharePoint requiere ajuste de escritura segun tu tenant. Se usa almacenamiento local como respaldo.");
      return mockService.saveLogistica(record, action, observation);
    },
    async addHistory(documentoTransporte, accion, observacion) {
      return mockService.addHistory(documentoTransporte, accion, observacion);
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
    estado: item.Estado || "En Registro y Control",
    fechaReporteLogistica: item.FechaReporteLogistica || "",
    fechaDisposicion: item.FechaDisposicion || "",
    fechaCierre: item.FechaCierre || "",
    fechaCreacion: item.Created || "",
    fechaActualizacion: item.FechaActualizacion || item.Modified || ""
  };
}

function mapSharePointInspeccionRC(item) {
  return {
    documentoTransporte: item.DocumentoTransporte || item.Title || "",
    responsableRC: item.ResponsableRC?.Title || item.ResponsableRC || "",
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

function mapSharePointHistory(item) {
  return {
    id: String(item.Id),
    documentoTransporte: item.DocumentoTransporte || "",
    fecha: item.Fecha || item.Created || "",
    usuario: item.Usuario?.Title || item.Usuario || "",
    accion: item.Accion || "",
    observacion: item.Observacion || ""
  };
}

function readLocal(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readLocalModel() {
  return {
    abandonos: readLocal(STORAGE_KEYS.abandonos),
    inspeccionRC: readLocal(STORAGE_KEYS.inspeccionRC),
    gestionLogistica: readLocal(STORAGE_KEYS.gestionLogistica),
    historial: readLocal(STORAGE_KEYS.historial)
  };
}

function writeLocalModel(model) {
  writeLocal(STORAGE_KEYS.abandonos, model.abandonos);
  writeLocal(STORAGE_KEYS.inspeccionRC, model.inspeccionRC);
  writeLocal(STORAGE_KEYS.gestionLogistica, model.gestionLogistica);
  writeLocal(STORAGE_KEYS.historial, model.historial);
}

function createPayloadFromModel(model) {
  return {
    records: composeRecordsFromModel(model),
    history: [...model.historial]
  };
}

function composeRecordsFromModel(model) {
  const abandonoMap = new Map(model.abandonos.map((item) => [item.documentoTransporte, item]));
  const rcMap = new Map(model.inspeccionRC.map((item) => [item.documentoTransporte, item]));
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

function createViewRecord(abandono = {}, inspeccionRC = {}, gestionLogistica = {}) {
  const documentoTransporte =
    abandono.documentoTransporte
    || inspeccionRC.documentoTransporte
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
    responsableRC: inspeccionRC.responsableRC || "",
    fechaInspeccionRC: inspeccionRC.fechaInspeccionRC || "",
    cantidadMercanciaRC: inspeccionRC.cantidadMercanciaRC || "",
    pesoMercanciaRC: inspeccionRC.pesoMercanciaRC || "",
    descripcionMercanciaRC: inspeccionRC.descripcionMercanciaRC || "",
    observacionesRC: inspeccionRC.observacionesRC || "",
    fechaReporteLogistica: abandono.fechaReporteLogistica || "",
    funcionarioLogistica: gestionLogistica.funcionarioLogistica || "",
    fechaInspeccionLogistica: gestionLogistica.fechaInspeccionLogistica || "",
    cantidadMercanciaLogistica: gestionLogistica.cantidadMercanciaLogistica || "",
    pesoMercanciaLogistica: gestionLogistica.pesoMercanciaLogistica || "",
    descripcionMercanciaLogistica: gestionLogistica.descripcionMercanciaLogistica || "",
    avaluoTemporal: gestionLogistica.avaluoTemporal || "",
    avaluoDefinitivo: gestionLogistica.avaluoDefinitivo || "",
    observacionesLogistica: gestionLogistica.observacionesLogistica || "",
    estado: abandono.estado || "En Registro y Control",
    fechaDisposicion: abandono.fechaDisposicion || "",
    fechaCierre: abandono.fechaCierre || "",
    fechaCreacion: abandono.fechaCreacion || "",
    fechaActualizacion:
      abandono.fechaActualizacion
      || inspeccionRC.fechaActualizacion
      || gestionLogistica.fechaActualizacion
      || ""
  };
}

function buildViewRecordFromModel(model, documentoTransporte) {
  return createViewRecord(
    model.abandonos.find((item) => item.documentoTransporte === documentoTransporte),
    model.inspeccionRC.find((item) => item.documentoTransporte === documentoTransporte),
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

function addHistoryToModel(model, documentoTransporte, accion, observacion) {
  model.historial.unshift({
    id: crypto.randomUUID(),
    documentoTransporte,
    fecha: todayIsoDateTime(),
    usuario: currentUser.name,
    accion,
    observacion
  });
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
  model.inspeccionRC = renameList(model.inspeccionRC);
  model.gestionLogistica = renameList(model.gestionLogistica);
  model.historial = model.historial.map((item) =>
    item.documentoTransporte === oldKey ? { ...item, documentoTransporte: newKey } : item
  );
}

function seedMockData() {
  if (localStorage.getItem(STORAGE_KEYS.demoVersion) === DEMO_DATA_VERSION) return;

  const now = todayIsoDateTime();
  const abandonos = [
    {
      documentoTransporte: "HBL-CO2408912",
      manifiesto: "MNF-2026-0081",
      consignatario: "Logistica Internacional S.A.",
      deposito: "Terminal Maritimo A1",
      fechaAbandono: "2026-05-14",
      descripcionMercancia: "Lote textil y accesorios",
      observacionesGenerales: "Pendiente validacion de documentos.",
      estado: "En Registro y Control",
      fechaReporteLogistica: "",
      fechaDisposicion: "",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now
    },
    {
      documentoTransporte: "TGHU-1002456",
      manifiesto: "MNF-2026-0094",
      consignatario: "Aduanas del Caribe S.A.S.",
      deposito: "Deposito Norte",
      fechaAbandono: "2026-05-02",
      descripcionMercancia: "Repuestos automotrices",
      observacionesGenerales: "Pendiente revision final de expediente.",
      estado: "En Registro y Control",
      fechaReporteLogistica: "",
      fechaDisposicion: "",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now
    },
    {
      documentoTransporte: "COSU-7845120",
      manifiesto: "MNF-2026-0108",
      consignatario: "Comercializadora Andina Ltda.",
      deposito: "Terminal Maritimo B2",
      fechaAbandono: "2026-04-30",
      descripcionMercancia: "Equipos electronicos",
      observacionesGenerales: "Caso escalado a operacion logistica.",
      estado: "En Logistica",
      fechaReporteLogistica: "2026-05-06T09:20:00.000Z",
      fechaDisposicion: "",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now
    },
    {
      documentoTransporte: "MAEU-8472910",
      manifiesto: "MNF-2026-0115",
      consignatario: "Importadora Global S.A.S.",
      deposito: "DPA World - Terminal 1",
      fechaAbandono: "2026-04-28",
      descripcionMercancia: "Mercancia mixta de consumo",
      observacionesGenerales: "Expediente listo para traslado.",
      estado: "En Logistica",
      fechaReporteLogistica: "2026-05-05T10:15:00.000Z",
      fechaDisposicion: "",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now
    },
    {
      documentoTransporte: "SUDU-1122334",
      manifiesto: "MNF-2026-0127",
      consignatario: "Retail Nacional S.A.",
      deposito: "Bodega Centro Occidente",
      fechaAbandono: "2026-04-11",
      descripcionMercancia: "Textiles y accesorios",
      observacionesGenerales: "Pendiente definicion de cierre logistico.",
      estado: "Traslado Bodega",
      fechaReporteLogistica: "2026-04-16T11:00:00.000Z",
      fechaDisposicion: "2026-05-03T16:10:00.000Z",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now
    },
    {
      documentoTransporte: "BL-4422933",
      manifiesto: "MNF-2026-0034",
      consignatario: "Importadora Fenix",
      deposito: "Puerto Central",
      fechaAbandono: "2026-03-10",
      descripcionMercancia: "Electrodomesticos y embalajes",
      observacionesGenerales: "Expediente finalizado.",
      estado: "Rescatado por Legalizado",
      fechaReporteLogistica: "2026-03-20T08:00:00.000Z",
      fechaDisposicion: "2026-04-05T15:45:00.000Z",
      fechaCierre: "2026-04-09T09:30:00.000Z",
      fechaCreacion: now,
      fechaActualizacion: now
    },
    {
      documentoTransporte: "OOLU-5509123",
      manifiesto: "MNF-2026-0133",
      consignatario: "Consorcio Energetico S.A.",
      deposito: "Deposito Aduanero Este",
      fechaAbandono: "2026-05-18",
      descripcionMercancia: "Equipos industriales",
      observacionesGenerales: "Expediente recien abierto.",
      estado: "En Registro y Control",
      fechaReporteLogistica: "",
      fechaDisposicion: "",
      fechaCierre: "",
      fechaCreacion: now,
      fechaActualizacion: now
    }
  ];

  const inspeccionRC = [
    {
      documentoTransporte: "HBL-CO2408912",
      responsableRC: "Carlos Restrepo",
      fechaInspeccionRC: "2026-05-20",
      cantidadMercanciaRC: "48 cajas",
      pesoMercanciaRC: "1,250 kg",
      descripcionMercanciaRC: "Textiles, accesorios y material de empaque",
      observacionesRC: "Inspeccion realizada sin novedad.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "TGHU-1002456",
      responsableRC: "Sandra Vega",
      fechaInspeccionRC: "2026-05-09",
      cantidadMercanciaRC: "16 unidades",
      pesoMercanciaRC: "420 kg",
      descripcionMercanciaRC: "Repuestos automotrices clasificados por referencia",
      observacionesRC: "Listo para oficio persuasivo.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "COSU-7845120",
      responsableRC: "Carlos Restrepo",
      fechaInspeccionRC: "2026-05-04",
      cantidadMercanciaRC: "22 pallets",
      pesoMercanciaRC: "3,800 kg",
      descripcionMercanciaRC: "Equipos electronicos y componentes",
      observacionesRC: "Se reporta a logistica para gestion de disposicion.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "MAEU-8472910",
      responsableRC: "Marta Gomez",
      fechaInspeccionRC: "2026-05-02",
      cantidadMercanciaRC: "34 bultos",
      pesoMercanciaRC: "2,100 kg",
      descripcionMercanciaRC: "Mercancia mixta de consumo en embalaje secundario",
      observacionesRC: "Oficio generado y remitido.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "SUDU-1122334",
      responsableRC: "R. Mendez",
      fechaInspeccionRC: "2026-04-15",
      cantidadMercanciaRC: "27 cajas",
      pesoMercanciaRC: "960 kg",
      descripcionMercanciaRC: "Textiles y accesorios de retail",
      observacionesRC: "Caso remitido en termino.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "BL-4422933",
      responsableRC: "R. Mendez",
      fechaInspeccionRC: "2026-03-18",
      cantidadMercanciaRC: "12 equipos",
      pesoMercanciaRC: "2,750 kg",
      descripcionMercanciaRC: "Electrodomesticos y embalajes en contenedor parcial",
      observacionesRC: "Traslado autorizado.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "OOLU-5509123",
      responsableRC: "Sandra Vega",
      fechaInspeccionRC: "",
      cantidadMercanciaRC: "",
      pesoMercanciaRC: "",
      descripcionMercanciaRC: "",
      observacionesRC: "",
      fechaActualizacion: now
    }
  ];

  const gestionLogistica = [
    {
      documentoTransporte: "MAEU-8472910",
      funcionarioLogistica: "Maria Giraldo",
      fechaInspeccionLogistica: "2026-05-08",
      cantidadMercanciaLogistica: "34 bultos",
      pesoMercanciaLogistica: "2,050 kg",
      descripcionMercanciaLogistica: "Mercancia mixta revisada para traslado a bodega",
      avaluoTemporal: "12450",
      avaluoDefinitivo: "13800",
      observacionesLogistica: "Caso en curso para gestion logistica.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "SUDU-1122334",
      funcionarioLogistica: "Luis Herrera",
      fechaInspeccionLogistica: "2026-04-20",
      cantidadMercanciaLogistica: "27 cajas",
      pesoMercanciaLogistica: "955 kg",
      descripcionMercanciaLogistica: "Textiles y accesorios recibidos y verificados en bodega",
      avaluoTemporal: "18600",
      avaluoDefinitivo: "19250",
      observacionesLogistica: "Mercancia trasladada a bodega.",
      fechaActualizacion: now
    },
    {
      documentoTransporte: "BL-4422933",
      funcionarioLogistica: "J. Herrera",
      fechaInspeccionLogistica: "2026-03-24",
      cantidadMercanciaLogistica: "12 equipos",
      pesoMercanciaLogistica: "2,740 kg",
      descripcionMercanciaLogistica: "Electrodomesticos inspeccionados y listos para disposicion",
      avaluoTemporal: "32100",
      avaluoDefinitivo: "32950",
      observacionesLogistica: "Expediente finalizado despues de la gestion logistica.",
      fechaActualizacion: now
    }
  ];

  const history = [
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[0].documentoTransporte,
      fecha: now,
      usuario: "Carlos Restrepo",
      accion: "Registro creado",
      observacion: "Gestion desde Registro y Control"
    },
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[1].documentoTransporte,
      fecha: "2026-05-09T08:30:00.000Z",
      usuario: "Sandra Vega",
      accion: "Registro actualizado",
      observacion: "Se deja listo para decision de oficio o legalizacion"
    },
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[2].documentoTransporte,
      fecha: "2026-05-06T09:20:00.000Z",
      usuario: "Carlos Restrepo",
      accion: "Enviado a Logistica",
      observacion: "Caso enviado a operacion logistica"
    },
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[3].documentoTransporte,
      fecha: "2026-05-05T10:15:00.000Z",
      usuario: "Marta Gomez",
      accion: "Enviado a Logistica",
      observacion: "Caso enviado a operacion logistica"
    },
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[3].documentoTransporte,
      fecha: "2026-05-08T14:00:00.000Z",
      usuario: "Maria Giraldo",
      accion: "Gestion logistica actualizada",
      observacion: "Inspeccion logistica y avaluo temporal registrados"
    },
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[4].documentoTransporte,
      fecha: "2026-05-03T16:10:00.000Z",
      usuario: "Luis Herrera",
      accion: "Traslado a Bodega",
      observacion: "Mercancia trasladada a bodega"
    },
    {
      id: crypto.randomUUID(),
      documentoTransporte: abandonos[5].documentoTransporte,
      fecha: "2026-04-09T09:30:00.000Z",
      usuario: "J. Herrera",
      accion: "Caso legalizado",
      observacion: "Caso finalizado como rescatado por legalizado"
    }
  ];

  writeLocal(STORAGE_KEYS.abandonos, abandonos);
  writeLocal(STORAGE_KEYS.inspeccionRC, inspeccionRC);
  writeLocal(STORAGE_KEYS.gestionLogistica, gestionLogistica);
  writeLocal(STORAGE_KEYS.historial, history);
  localStorage.setItem(STORAGE_KEYS.demoVersion, DEMO_DATA_VERSION);
}

window.addEventListener("error", (event) => {
  alert(event.error?.message || "Ocurrio un error en la aplicacion.");
});
