import { initAuth, login, getCurrentUser, setCurrentUser, logout } from "./auth.js";
import { SHEET_TABS } from "./config.js";
import { getSheetRows, appendRow } from "./sheets-api.js";
import { getCache, setCache, addToQueue, getQueue, removeFromQueue, getLastUser } from "./store.js";
import { loadView, setActiveNav } from "./router.js";
import { formatCurrency, parseDate, daysSince, debounce, uuid } from "./utils.js";

const viewContainer = document.getElementById("view-container");
const pageTitle = document.getElementById("page-title");
const loginButton = document.getElementById("login-button");
const networkStatus = document.getElementById("network-status");

const state = {
  oportunidades: [],
  clientes: [],
  propostas: [],
  atividades: [],
  catalogo: []
};

const setNetworkBadge = () => {
  const online = navigator.onLine;
  networkStatus.textContent = online ? "Online" : "Offline";
  networkStatus.className = online
    ? "text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700"
    : "text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700";
};

const setTitle = (hash) => {
  const titles = {
    "#/dashboard-gestao": "Dashboard Gestão",
    "#/dashboard-comercial": "Dashboard Comercial",
    "#/pipeline": "Pipeline / Oportunidades",
    "#/clientes": "Clientes",
    "#/propostas": "Propostas",
    "#/perfil": "Perfil",
    "#/oportunidade": "Detalhe"
  };
  pageTitle.textContent = titles[hash] || "Dashboard";
};

const loadCached = (key) => {
  const cached = getCache(key);
  if (cached?.data) {
    state[key] = cached.data;
  }
};

const syncSheet = async (key, tab) => {
  const rows = await getSheetRows(tab);
  state[key] = rows;
  setCache(key, rows);
};

const loadData = async () => {
  Object.keys(state).forEach((key) => loadCached(key));
  try {
    await Promise.all([
      syncSheet("oportunidades", SHEET_TABS.oportunidades),
      syncSheet("clientes", SHEET_TABS.clientes),
      syncSheet("propostas", SHEET_TABS.propostas),
      syncSheet("atividades", SHEET_TABS.atividades),
      syncSheet("catalogo", SHEET_TABS.catalogo)
    ]);
  } catch (error) {
    console.warn("Offline ou erro no Sheets", error);
  }
};

const filterByRole = (items) => {
  const user = getCurrentUser();
  if (!user || user.role === "gestao") return items;
  return items.filter((item) => item.responsavel?.toLowerCase() === user.email);
};

const calcKPIs = (oportunidades) => {
  const open = oportunidades.filter((item) => item.status !== "Ganho" && item.status !== "Perdido");
  const ganhos = oportunidades.filter((item) => item.status === "Ganho");
  const perdidos = oportunidades.filter((item) => item.status === "Perdido");

  const pipelineAberto = open.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const pipelinePonderado = open.reduce(
    (sum, item) => sum + Number(item.valor || 0) * (Number(item.probabilidade || 0) / 100),
    0
  );
  const vendasGanhas = ganhos.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const taxaFecho = ganhos.length + perdidos.length === 0
    ? 0
    : Math.round((ganhos.length / (ganhos.length + perdidos.length)) * 100);

  const funil = open.reduce((acc, item) => {
    const etapa = item.etapa || "Sem etapa";
    acc[etapa] = (acc[etapa] || 0) + Number(item.valor || 0);
    return acc;
  }, {});

  const evolucao = oportunidades.reduce((acc, item) => {
    const date = parseDate(item.data_ultimo_contacto || item.data_followup || "");
    if (!date) return acc;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + Number(item.valor || 0);
    return acc;
  }, {});

  return { pipelineAberto, pipelinePonderado, vendasGanhas, taxaFecho, funil, evolucao };
};

const renderDashboardGestao = () => {
  const oportunidades = filterByRole(state.oportunidades);
  const { pipelineAberto, pipelinePonderado, vendasGanhas, taxaFecho, funil, evolucao } = calcKPIs(oportunidades);

  document.getElementById("kpi-aberto").textContent = formatCurrency(pipelineAberto);
  document.getElementById("kpi-ponderado").textContent = formatCurrency(pipelinePonderado);
  document.getElementById("kpi-ganho").textContent = formatCurrency(vendasGanhas);
  document.getElementById("kpi-fecho").textContent = `${taxaFecho}%`;

  const funilContainer = document.getElementById("funil-container");
  funilContainer.innerHTML = Object.entries(funil)
    .map(([etapa, valor]) => `
      <div class="flex items-center justify-between border-b border-slate-200 py-2">
        <span class="font-medium">${etapa}</span>
        <span class="text-slate-600">${formatCurrency(valor)}</span>
      </div>
    `)
    .join("") || "<p class=\"text-slate-500\">Sem dados.</p>";

  const evolucaoContainer = document.getElementById("evolucao-container");
  evolucaoContainer.innerHTML = Object.entries(evolucao)
    .slice(-6)
    .map(([mes, valor]) => `
      <div class="flex items-center justify-between border-b border-slate-200 py-2">
        <span class="font-medium">${mes}</span>
        <span class="text-slate-600">${formatCurrency(valor)}</span>
      </div>
    `)
    .join("") || "<p class=\"text-slate-500\">Sem dados.</p>";

  const alertas = document.getElementById("alertas-container");
  const parados = oportunidades.filter((item) => {
    const days = daysSince(item.data_ultimo_contacto);
    return days !== null && days >= 15;
  });

  const grandes = oportunidades.filter((item) => Number(item.valor || 0) >= 50000 && daysSince(item.data_ultimo_contacto) >= 10);
  const longas = oportunidades.filter((item) => daysSince(item.data_ultimo_contacto) >= 30);

  alertas.innerHTML = `
    <div class="space-y-2">
      <div class="p-3 rounded-lg bg-amber-50">Negócios parados: <strong>${parados.length}</strong></div>
      <div class="p-3 rounded-lg bg-amber-50">Negócios grandes sem contacto: <strong>${grandes.length}</strong></div>
      <div class="p-3 rounded-lg bg-amber-50">Negociação longa: <strong>${longas.length}</strong></div>
    </div>
  `;
};

const renderDashboardComercial = () => {
  const oportunidades = filterByRole(state.oportunidades);
  const propostas = filterByRole(state.propostas);

  document.getElementById("kpi-ativas").textContent = oportunidades.filter((item) => item.status === "Aberto").length;
  document.getElementById("kpi-atrasados").textContent = oportunidades.filter((item) => daysSince(item.data_followup) >= 1).length;
  document.getElementById("kpi-propostas").textContent = propostas.filter((item) => daysSince(item.data_envio) <= 30).length;

  const table = document.getElementById("pipeline-table");
  table.innerHTML = oportunidades
    .slice(0, 20)
    .map((item) => `
      <button data-id="${item.id}" class="w-full text-left border-b border-slate-200 py-3">
        <div class="flex justify-between text-sm font-medium">
          <span>${item.empresa}</span>
          <span>${formatCurrency(item.valor)}</span>
        </div>
        <div class="text-xs text-slate-500">${item.etapa || "Sem etapa"} · Próxima: ${item.proxima_acao || "-"} · ${item.data_followup || ""}</div>
      </button>
    `)
    .join("") || "<p class=\"text-slate-500\">Sem oportunidades.</p>";

  table.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.hash = `#/oportunidade?id=${button.dataset.id}`;
    });
  });
};

const renderOportunidades = () => {
  const oportunidades = filterByRole(state.oportunidades);
  const list = document.getElementById("oportunidades-list");
  const searchInput = document.getElementById("oportunidades-search");
  const etapaFilter = document.getElementById("oportunidades-etapa");

  const renderList = () => {
    const term = searchInput.value.toLowerCase();
    const etapa = etapaFilter.value;
    const filtered = oportunidades.filter((item) => {
      const matchTerm = item.empresa?.toLowerCase().includes(term);
      const matchEtapa = etapa === "" || item.etapa === etapa;
      return matchTerm && matchEtapa;
    });

    list.innerHTML = filtered
      .map((item) => `
        <button data-id="${item.id}" class="w-full text-left border-b border-slate-200 py-3">
          <div class="flex justify-between text-sm font-medium">
            <span>${item.empresa}</span>
            <span>${formatCurrency(item.valor)}</span>
          </div>
          <div class="text-xs text-slate-500">${item.etapa || "Sem etapa"} · ${item.status || ""} · ${item.responsavel || ""}</div>
        </button>
      `)
      .join("") || "<p class=\"text-slate-500\">Sem oportunidades.</p>";

    list.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        window.location.hash = `#/oportunidade?id=${button.dataset.id}`;
      });
    });
  };

  const etapas = [...new Set(oportunidades.map((item) => item.etapa).filter(Boolean))];
  etapaFilter.innerHTML = `<option value="">Todas etapas</option>${etapas.map((item) => `<option>${item}</option>`).join("")}`;

  searchInput.addEventListener("input", debounce(renderList, 200));
  etapaFilter.addEventListener("change", renderList);
  renderList();
};

const renderDetalhe = () => {
  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  const id = params.get("id");
  const item = state.oportunidades.find((op) => op.id === id);
  if (!item) return;

  document.getElementById("detalhe-empresa").textContent = item.empresa;
  document.getElementById("detalhe-contacto").textContent = item.contacto || "-";
  document.getElementById("detalhe-email").textContent = item.email || "-";
  document.getElementById("detalhe-telefone").textContent = item.telemovel || item.telefone || "-";
  document.getElementById("detalhe-problema").textContent = item.notas || "Sem notas.";
  document.getElementById("detalhe-solucao").textContent = item.proposta_url || "Sem solução registada.";
  document.getElementById("detalhe-valor").textContent = formatCurrency(item.valor);
  document.getElementById("detalhe-proxima").textContent = `${item.proxima_acao || "-"} · ${item.data_followup || ""}`;

  const callButton = document.getElementById("action-call");
  const emailButton = document.getElementById("action-email");
  const propostaButton = document.getElementById("action-proposta");

  callButton.href = item.telemovel ? `tel:${item.telemovel}` : "#";
  emailButton.href = item.email ? `mailto:${item.email}` : "#";
  propostaButton.href = item.proposta_url || "#";

  const modal = document.getElementById("activity-modal");
  const openModal = document.getElementById("action-atividade");
  const closeModal = document.getElementById("activity-close");
  const form = document.getElementById("activity-form");

  openModal.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      id: uuid(),
      data_hora: new Date().toISOString(),
      tipo: formData.get("tipo"),
      empresa: item.empresa,
      oportunidade_id: item.id,
      resumo: formData.get("resumo"),
      proximo_passo: formData.get("proximo_passo"),
      data_followup: formData.get("data_followup"),
      responsavel: getCurrentUser()?.email || "",
      anexos_url: ""
    };

    try {
      if (!navigator.onLine) {
        throw new Error("offline");
      }
      await appendRow(SHEET_TABS.atividades, Object.values(payload));
    } catch (error) {
      addToQueue({ id: payload.id, tab: SHEET_TABS.atividades, values: Object.values(payload) });
    }

    modal.classList.add("hidden");
    form.reset();
  });
};

const renderClientes = () => {
  const list = document.getElementById("clientes-list");
  const searchInput = document.getElementById("clientes-search");

  const renderList = () => {
    const term = searchInput.value.toLowerCase();
    const filtered = state.clientes.filter((item) => item.empresa?.toLowerCase().includes(term));
    list.innerHTML = filtered
      .map((item) => `
        <div class="border-b border-slate-200 py-3">
          <div class="text-sm font-medium">${item.empresa}</div>
          <div class="text-xs text-slate-500">${item.localidade || ""} · ${item.contacto || ""}</div>
        </div>
      `)
      .join("") || "<p class=\"text-slate-500\">Sem clientes.</p>";
  };

  searchInput.addEventListener("input", debounce(renderList, 200));
  renderList();
};

const renderPropostas = () => {
  const list = document.getElementById("propostas-list");
  const filtered = filterByRole(state.propostas);
  list.innerHTML = filtered
    .map((item) => `
      <a href="${item.ficheiro_url || "#"}" target="_blank">
        <div class="p-3 border-b border-slate-200">
          <p class="font-medium">${item.empresa}</p>
          <p class="text-xs text-slate-500">${item.data_envio || ""} · ${formatCurrency(item.valor)} · ${item.status || ""}</p>
        </div>
      </a>
    `)
    .join("") || "<p class='text-slate-400'>Sem propostas.</p>";
};

const renderPerfil = () => {
  const user = getCurrentUser();
  document.getElementById("perfil-nome").textContent = user?.name || "";
  document.getElementById("perfil-email").textContent = user?.email || "";
  document.getElementById("perfil-role").textContent = user?.role || "";
  document.getElementById("perfil-sync").textContent = `${getQueue().length} pendentes`;

  document.getElementById("logout-button").addEventListener("click", () => {
    logout();
    window.location.reload();
  });
};

const processQueue = async () => {
  if (!navigator.onLine) return;
  const queue = getQueue();
  for (const entry of queue) {
    try {
      await appendRow(entry.tab, entry.values);
      removeFromQueue(entry.id);
    } catch (error) {
      console.warn("Falha sync", error);
      break;
    }
  }
};

const handleRoute = async () => {
  const hash = window.location.hash || "#/dashboard-gestao";
  setActiveNav(hash);
  setTitle(hash.startsWith("#/oportunidade") ? "#/oportunidade" : hash);
  await loadView(hash, viewContainer);

  if (hash.startsWith("#/dashboard-gestao")) renderDashboardGestao();
  if (hash.startsWith("#/dashboard-comercial")) renderDashboardComercial();
  if (hash.startsWith("#/pipeline")) renderOportunidades();
  if (hash.startsWith("#/oportunidade")) renderDetalhe();
  if (hash.startsWith("#/clientes")) renderClientes();
  if (hash.startsWith("#/propostas")) renderPropostas();
  if (hash.startsWith("#/perfil")) renderPerfil();
};

const setup = async () => {
  setNetworkBadge();
  window.addEventListener("online", () => {
    setNetworkBadge();
    processQueue();
  });
  window.addEventListener("offline", setNetworkBadge);

  loginButton.addEventListener("click", async () => {
    try {
      await login();
      loginButton.textContent = "Autenticado";
      loginButton.disabled = true;
      await loadData();
      handleRoute();
      processQueue();
    } catch (error) {
      alert("Login falhou ou utilizador não autorizado.");
    }
  });

  const cachedUser = getLastUser();
  if (cachedUser) {
    setCurrentUser(cachedUser);
    loginButton.textContent = "Autenticado";
    loginButton.disabled = true;
    await loadData();
    handleRoute();
  }

  if ("serviceWorker" in navigator) {
    const swUrl = new URL("../service-worker.js", import.meta.url);
    navigator.serviceWorker.register(swUrl, { scope: "./" });
  }

  window.addEventListener("hashchange", handleRoute);
  if (!window.location.hash) {
    window.location.hash = "#/dashboard-gestao";
  } else {
    handleRoute();
  }
};

initAuth();
setup();
