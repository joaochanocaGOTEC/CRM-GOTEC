const routes = {
  "#/dashboard-gestao": "./views/dashboard-gestao.html",
  "#/dashboard-comercial": "./views/dashboard-comercial.html",
  "#/pipeline": "./views/oportunidades.html",
  "#/oportunidade": "./views/detalhe-oportunidade.html",
  "#/clientes": "./views/clientes.html",
  "#/propostas": "./views/propostas.html",
  "#/perfil": "./views/perfil.html"
};

export const resolveRoute = (hash) => {
  if (hash.startsWith("#/oportunidade")) return routes["#/oportunidade"];
  return routes[hash] || routes["#/dashboard-gestao"];
};

export const loadView = async (hash, container) => {
  const viewPath = resolveRoute(hash);
  const response = await fetch(viewPath, { cache: "no-cache" });
  const html = await response.text();
  container.innerHTML = html;
};

export const setActiveNav = (hash) => {
  document.querySelectorAll(".nav-item").forEach((item) => {
    const route = item.getAttribute("data-route");
    if (hash.startsWith(route)) {
      item.classList.remove("text-slate-500");
      item.classList.add("text-slate-900", "font-semibold");
    } else {
      item.classList.remove("text-slate-900", "font-semibold");
      item.classList.add("text-slate-500");
    }
  });

  if (hash.startsWith("#/pipeline")) {
    const pipelineRoute = document.querySelector('[data-route="#/pipeline"]');
    if (pipelineRoute) {
      pipelineRoute.classList.remove("text-slate-500");
      pipelineRoute.classList.add("text-slate-900", "font-semibold");
    }
  }
};
