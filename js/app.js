/* ==========================================================================
   ARCANA & ELIXIRES · COVEN BAR — Lógica de la SPA (JavaScript vanilla)
   --------------------------------------------------------------------------
   Módulos (en orden):
     1. Utilidades       → selectores, formato de moneda/fecha, iconos
     2. Estado           → copia mutable de AE_DATA (simula el backend)
     3. Router           → cambia de vista sin recargar y sincroniza ambas navs
     4. Componentes      → funciones render* que pintan cada bloque
     5. Modal y Toasts   → confirmación con estados (resumen/carga/éxito/error)
     6. Formularios      → validación Bootstrap + flujos de reserva, regalo, perfil
     7. Interacciones    → carta, cuenta de mesa, historial, ajustes, sesión
     8. Arranque
   Al migrar a React/Vue/Angular: cada render* es un componente y "state" es
   tu store; el router se sustituye por el del framework.
   ========================================================================== */
(function () {
  "use strict";

  /* 1. UTILIDADES ========================================================== */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var bind = function (name) { return $$('[data-bind="' + name + '"]'); };
  var setText = function (name, value) { bind(name).forEach(function (el) { el.textContent = value; }); };

  var moneyFmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  var money = function (n) { return moneyFmt.format(n).replace(/\u00a0/g, " "); };
  var signed = function (n) { return (n > 0 ? "+ " : "− ") + money(Math.abs(n)); };
  var fmtDate = function (iso, opts) { return new Date(iso).toLocaleDateString("es-CO", opts || { day: "numeric", month: "short" }); };
  var fmtTime = function (iso) { return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); };
  var icon = function (name, cls) { return '<svg class="ae-icon ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var todayISO = function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

  /* 2. ESTADO ============================================================== */
  var state = JSON.parse(JSON.stringify(window.AE_DATA));
  state.bill = {};            // { menuId: cantidad }
  state.loggedIn = true;

  var account = function (id) { return state.accounts.find(function (a) { return a.id === id; }); };
  var totalBalance = function () { return state.accounts.reduce(function (s, a) { return s + a.balance; }, 0); };
  var addTx = function (tx) {
    tx.id = "t" + Date.now();
    tx.date = new Date().toISOString();
    state.transactions.unshift(tx);
  };

  /* 3. ROUTER ============================================================== */
  var VIEWS = ["inicio", "grimorio", "reservar", "carta", "historial", "ajustes", "mas", "salida"];
  var TITLES = { inicio: "Inicio", grimorio: "Mi Grimorio", reservar: "Reservar", carta: "Carta & Pagos", historial: "Historial", ajustes: "Ajustes", mas: "Más", salida: "Sesión cerrada" };
  /* Vista → pestaña de la bottom nav que debe resaltarse */
  var TAB_GROUP = { historial: "mas", ajustes: "mas" };
  var currentView = null;

  function parseHash() {
    var raw = (location.hash || "#inicio").slice(1);
    var parts = raw.split("?");
    var params = new URLSearchParams(parts[1] || "");
    return { view: VIEWS.indexOf(parts[0]) > -1 ? parts[0] : "inicio", params: params };
  }

  function showView(view, params) {
    if (!state.loggedIn && view !== "salida") view = "salida";
    if (state.loggedIn && view === "salida") view = "inicio";

    // Mostrar/ocultar secciones con la clase d-none de Bootstrap
    $$(".ae-view").forEach(function (sec) { sec.classList.toggle("d-none", sec.dataset.view !== view); });

    // Sincronizar estado activo en navbar superior y bottom nav
    $$("[data-view-link]").forEach(function (link) {
      var target = link.dataset.viewLink;
      var inTabbar = !!link.closest(".ae-tabbar");
      var isActive = target === view || (inTabbar && TAB_GROUP[view] === target);
      if (link.classList.contains("navbar-brand") || link.closest(".ae-quick, .ae-menu-list, .ae-card")) return;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });

    // Cerrar el menú hamburguesa en móvil tras navegar
    var collapse = $("#aeMainMenu");
    if (collapse && collapse.classList.contains("show")) bootstrap.Collapse.getOrCreateInstance(collapse).hide();

    // Pestaña interna opcional (#reservar?tab=regalar)
    if (view === "reservar" && params && params.get("tab") === "regalar") {
      bootstrap.Tab.getOrCreateInstance($("#tab-regalar")).show();
    }

    document.title = TITLES[view] + " · Arcana & Elixires — Coven Bar";
    document.body.classList.toggle("ae-logged-out", !state.loggedIn);
    $(".ae-tabbar").classList.toggle("d-none", !state.loggedIn);
    $("#aeMainMenu").classList.toggle("invisible", !state.loggedIn);
    $(".ae-navbar__toggler").classList.toggle("invisible", !state.loggedIn);

    // Accesibilidad: llevar el foco al título de la nueva vista (no en la carga inicial)
    if (currentView !== null && currentView !== view) {
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      var h = $('.ae-view[data-view="' + view + '"] h1');
      if (h) h.focus({ preventScroll: true });
    }
    currentView = view;
  }

  function navigate(view, query) {
    var hash = "#" + view + (query ? "?" + query : "");
    if (location.hash === hash) showView(view, new URLSearchParams(query || ""));
    else location.hash = hash; // dispara hashchange → showView
  }

  window.addEventListener("hashchange", function () { var r = parseHash(); showView(r.view, r.params); });

  /* 4. COMPONENTES ========================================================= */

  /** Tarjeta de saldo + datos de usuario repetidos en varias vistas */
  function renderSummary() {
    var u = state.user;
    setText("userFirstName", u.firstName);
    setText("userFullName", u.fullName);
    setText("memberLevel", u.level);
    setText("nextLevel", u.nextLevel);
    setText("memberId", u.memberId);
    setText("memberSince", u.memberSince);
    setText("tableNumber", state.tableNumber);
    setText("totalBalance", money(totalBalance()));
    setText("essencePoints", u.points.toLocaleString("es-CO"));
    setText("levelProgressLabel", u.points.toLocaleString("es-CO") + " / " + u.nextLevelAt.toLocaleString("es-CO") + " pts");
    var pct = Math.min(100, Math.round((u.points / u.nextLevelAt) * 100));
    bind("levelProgress").forEach(function (el) {
      el.setAttribute("aria-valuenow", pct);
      el.firstElementChild.style.width = pct + "%";
    });
    bind("trend").forEach(function (el) {
      var up = state.trendPercent >= 0;
      el.className = "ae-trend " + (up ? "ae-trend--up" : "ae-trend--down");
      el.innerHTML = icon(up ? "up" : "down", "ae-icon--sm") + "<span>" + (up ? "+" : "") + state.trendPercent.toLocaleString("es-CO") + "%</span>";
      el.setAttribute("aria-label", "Tendencia " + (up ? "al alza" : "a la baja") + " de " + Math.abs(state.trendPercent) + "% este mes");
    });
    setText("moonPhase", moonPhase());
  }

  /** Fase lunar aproximada (decorativa) */
  function moonPhase() {
    var lp = 2551443, now = new Date(), newMoon = new Date(1970, 0, 7, 20, 35, 0);
    var phase = ((now.getTime() - newMoon.getTime()) / 1000) % lp / (24 * 3600);
    if (phase < 1.8) return "Luna nueva";
    if (phase < 7.4) return "Luna creciente";
    if (phase < 9.2) return "Cuarto creciente";
    if (phase < 14.8) return "Gibosa creciente";
    if (phase < 16.6) return "Luna llena";
    if (phase < 22.1) return "Gibosa menguante";
    if (phase < 23.9) return "Cuarto menguante";
    return "Luna menguante";
  }

  /** Sparkline SVG a partir de state.trend */
  function renderSparkline() {
    var data = state.trend.slice();
    data[data.length - 1] = totalBalance();
    var w = 300, h = 60, pad = 4;
    var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
    var pts = data.map(function (v, i) {
      var x = (i / (data.length - 1)) * w;
      var y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
      return [x.toFixed(1), y.toFixed(1)];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" ");
    var last = pts[pts.length - 1];
    bind("sparkline").forEach(function (svg) {
      svg.innerHTML =
        '<defs><linearGradient id="spk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d2ad63" stop-opacity=".35"/><stop offset="1" stop-color="#d2ad63" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + line + " L" + w + " " + h + " L0 " + h + ' Z" fill="url(#spk)"/>' +
        '<path d="' + line + '" fill="none" stroke="#d2ad63" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
        '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="#efe6d4" stroke="#d2ad63" stroke-width="2"/>';
    });
  }

  /** Un <li> de movimiento */
  function txItem(tx) {
    var cat = state.categories[tx.cat] || { label: "Otro", icon: "spark" };
    var inflow = tx.amount > 0;
    return '<li class="ae-tx ae-cat--' + tx.cat + '">' +
      '<span class="ae-tx__icon">' + icon(cat.icon) + "</span>" +
      '<div class="ae-tx__body"><p class="ae-tx__title">' + esc(tx.title) + "</p>" +
      '<p class="ae-tx__meta">' + cat.label + " · " + fmtDate(tx.date) + " · " + fmtTime(tx.date) + "</p></div>" +
      '<span class="ae-tx__amount ae-tx__amount--' + (inflow ? "in" : "out") + '">' +
      '<span class="visually-hidden">' + (inflow ? "Ingreso de " : "Consumo de ") + "</span>" + signed(tx.amount) + "</span></li>";
  }

  function renderRecentTx() {
    bind("recentTx").forEach(function (ul) { ul.innerHTML = state.transactions.slice(0, 5).map(txItem).join(""); });
  }

  function renderAllTx() {
    var q = ($("#h-search").value || "").trim().toLowerCase();
    var type = $("#h-type").value;
    var list = state.transactions.filter(function (t) {
      var okType = type === "all" || (type === "in" ? t.amount > 0 : t.amount < 0);
      var okQ = !q || t.title.toLowerCase().indexOf(q) > -1 || (state.categories[t.cat] || {}).label.toLowerCase().indexOf(q) > -1;
      return okType && okQ;
    });
    bind("allTx").forEach(function (ul) {
      ul.innerHTML = list.length ? list.map(txItem).join("") : '<li class="ae-empty">Ningún movimiento coincide con tu búsqueda.</li>';
    });
  }

  /** Gráfico de barras CSS: consumos por categoría en los últimos 28 días */
  function renderChart() {
    var since = Date.now() - 28 * 864e5;
    var totals = {};
    state.transactions.forEach(function (t) {
      if (t.amount < 0 && new Date(t.date).getTime() >= since) totals[t.cat] = (totals[t.cat] || 0) + Math.abs(t.amount);
    });
    var keys = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
    var max = Math.max.apply(null, keys.map(function (k) { return totals[k]; }).concat([1]));
    var sum = keys.reduce(function (s, k) { return s + totals[k]; }, 0);

    bind("chart").forEach(function (el) {
      el.setAttribute("aria-label", "Total consumido en 4 semanas: " + money(sum));
      el.innerHTML = keys.map(function (k) {
        var c = state.categories[k];
        return '<div class="ae-chart__row ae-cat--' + k + '">' +
          '<span class="ae-chart__label">' + icon(c.icon, "ae-icon--sm") + c.label + "</span>" +
          '<span class="ae-chart__track"><span class="ae-chart__bar" data-w="' + Math.round((totals[k] / max) * 100) + '"></span></span>' +
          '<span class="ae-chart__value">' + money(totals[k]) + "</span></div>";
      }).join("");
      // Animación de entrada de las barras
      requestAnimationFrame(function () { $$(".ae-chart__bar", el).forEach(function (b) { b.style.width = b.dataset.w + "%"; }); });
    });
    bind("chartTable").forEach(function (t) {
      t.innerHTML = t.querySelector("caption").outerHTML +
        "<thead><tr><th scope=\"col\">Categoría</th><th scope=\"col\">Monto</th></tr></thead><tbody>" +
        keys.map(function (k) { return "<tr><td>" + state.categories[k].label + "</td><td>" + money(totals[k]) + "</td></tr>"; }).join("") + "</tbody>";
    });
  }

  function renderNextReservation() {
    var r = state.nextReservation;
    bind("nextReservation").forEach(function (el) {
      if (!r) { el.innerHTML = '<p class="ae-muted">Aún no tienes reservas.</p><a href="#reservar" class="btn ae-btn ae-btn--ghost">Reservar ahora</a>'; return; }
      var d = new Date(r.date);
      el.innerHTML =
        '<div class="ae-next__date"><span class="ae-next__day"><span><small>' + fmtDate(r.date, { month: "short" }) + "</small><br><strong>" + d.getDate() + "</strong></span></span>" +
        '<div><p class="ae-next__name">' + esc(r.experience) + "</p>" +
        '<p class="ae-next__meta">' + fmtDate(r.date, { weekday: "long" }) + " · " + fmtTime(r.date) + "</p>" +
        '<p class="ae-next__meta">' + r.guests + " personas · " + esc(r.table) + "</p></div></div>";
    });
  }

  function renderAccounts() {
    bind("accounts").forEach(function (el) {
      el.innerHTML = state.accounts.map(function (a) {
        return '<div class="col-12 col-md-4"><article class="ae-card ae-account ae-cat--' + a.cat + '">' +
          '<div class="ae-account__head"><span class="ae-tx__icon">' + icon(a.icon) + "</span>" +
          '<div><p class="ae-account__name">' + esc(a.name) + '</p><p class="ae-account__num">' + esc(a.number) + "</p></div></div>" +
          '<p class="ae-account__balance">' + money(a.balance) + "</p></article></div>";
      }).join("");
    });
    // Opciones de "cuenta de origen" en los formularios
    bind("sourceOptions").forEach(function (sel) {
      var prev = sel.value;
      sel.innerHTML = state.accounts.map(function (a) {
        return '<option value="' + a.id + '">' + esc(a.name) + " · " + money(a.balance) + "</option>";
      }).join("");
      if (prev) sel.value = prev;
    });
    updateSourceHint();
  }

  function updateSourceHint() {
    var a = account($("#g-source").value);
    setText("sourceHint", a ? "Disponible: " + money(a.balance) : "");
  }

  function renderStaticOptions() {
    bind("experienceOptions").forEach(function (sel) {
      sel.insertAdjacentHTML("beforeend", state.experiences.map(function (e) {
        return '<option value="' + e.id + '">' + esc(e.name) + " · abono " + money(e.deposit) + "</option>";
      }).join(""));
    });
    bind("contacts").forEach(function (dl) { dl.innerHTML = state.contacts.map(function (c) { return '<option value="' + c + '">'; }).join(""); });
  }

  /** Carta filtrable */
  var menuFilter = "all";
  function renderMenu() {
    bind("menu").forEach(function (el) {
      el.innerHTML = state.menu.filter(function (m) { return menuFilter === "all" || m.cat === menuFilter; }).map(function (m) {
        var qty = state.bill[m.id] || 0;
        return '<div class="col-12 col-sm-6 col-xl-4"><article class="ae-card ae-product ae-cat--' + m.catClass + '">' +
          '<img class="ae-product__img" src="' + m.img + '" alt="' + esc(m.alt) + '" loading="lazy" width="816" height="816" />' +
          '<div class="ae-product__body"><span class="ae-product__tag">' + esc(m.tag) + "</span>" +
          '<h3 class="ae-product__name">' + esc(m.name) + '</h3><p class="ae-product__desc">' + esc(m.desc) + "</p>" +
          '<div class="ae-product__foot"><span class="ae-product__price">' + money(m.price) + "</span>" +
          '<button type="button" class="btn ae-btn ae-btn--ghost btn-sm" data-add="' + m.id + '" aria-label="Añadir ' + esc(m.name) + ' a la cuenta">' +
          icon("plus", "ae-icon--sm") + (qty ? "Añadido (" + qty + ")" : "Añadir") + "</button></div></div></article></div>";
      }).join("");
    });
  }

  /** Cuenta de mesa */
  function billTotals() {
    var sub = Object.keys(state.bill).reduce(function (s, id) {
      var m = state.menu.find(function (x) { return x.id === id; });
      return s + m.price * state.bill[id];
    }, 0);
    var tip = Math.round(sub * 0.1 / 100) * 100;
    return { sub: sub, tip: tip, total: sub + tip };
  }

  function renderBill() {
    var ids = Object.keys(state.bill);
    bind("billItems").forEach(function (ul) {
      ul.innerHTML = ids.length ? ids.map(function (id) {
        var m = state.menu.find(function (x) { return x.id === id; });
        var q = state.bill[id];
        return '<li class="ae-bill__item"><span class="ae-bill__item-name">' + esc(m.name) + "</span>" +
          '<span class="ae-bill__qty"><button type="button" data-qty="-1" data-id="' + id + '" aria-label="Quitar uno de ' + esc(m.name) + '">' + icon(q > 1 ? "minus" : "trash") + "</button>" +
          '<span aria-label="Cantidad">' + q + "</span>" +
          '<button type="button" data-qty="1" data-id="' + id + '" aria-label="Añadir otro ' + esc(m.name) + '">' + icon("plus") + "</button></span>" +
          "<span>" + money(m.price * q) + "</span></li>";
      }).join("") : '<li class="ae-muted small">Tu cuenta está vacía. Añade elixires de la carta.</li>';
    });
    var t = billTotals();
    setText("billSubtotal", money(t.sub));
    setText("billTip", money(t.tip));
    setText("billTotal", money(t.total));
    $('[data-action="pay-bill"]').disabled = !ids.length;
  }

  function renderAll() {
    renderSummary(); renderSparkline(); renderChart(); renderRecentTx(); renderAllTx();
    renderNextReservation(); renderAccounts(); renderMenu(); renderBill();
  }

  /* 5. MODAL Y TOASTS ====================================================== */
  var modalEl = $("#confirmModal");
  var modal = new bootstrap.Modal(modalEl);
  var modalCfg = null;

  function setModalState(name) {
    $$("[data-modal-state]", modalEl).forEach(function (s) { s.classList.toggle("d-none", s.dataset.modalState !== name); });
    var confirmBtn = $("[data-modal-confirm]", modalEl);
    var cancelBtn = $("[data-modal-cancel]", modalEl);
    var closeBtn = $(".btn-close", modalEl);
    confirmBtn.disabled = name === "loading";
    cancelBtn.disabled = name === "loading";
    closeBtn.disabled = name === "loading";
    cancelBtn.classList.toggle("d-none", name === "success");
    confirmBtn.textContent = name === "success" ? "Listo" : name === "error" ? "Volver" : modalCfg.confirmLabel || "Confirmar";
    if (name === "loading") confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Procesando…';
    else if (modalEl.classList.contains("show")) confirmBtn.focus(); // mantiene el foco dentro del modal (Esc y Tab siguen funcionando)
  }

  /**
   * Abre el modal de confirmación.
   * cfg = { title, rows: [[etiqueta, valor, destacado?]], confirmLabel, run: async () => ({title, text}) }
   * Si run lanza un Error, se muestra el estado de error con su mensaje.
   */
  function confirmAction(cfg) {
    modalCfg = cfg;
    modalCfg.phase = "review";
    $("#confirmModalTitle").textContent = cfg.title;
    bind("modalSummary")[0].innerHTML = cfg.rows.map(function (r) {
      return '<div class="' + (r[2] ? "is-strong" : "") + '"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("");
    setModalState("review");
    modal.show();
  }

  $("[data-modal-confirm]", modalEl).addEventListener("click", function () {
    if (!modalCfg) return;
    if (modalCfg.phase === "success") { modal.hide(); return; }
    if (modalCfg.phase === "error") { modalCfg.phase = "review"; setModalState("review"); return; }
    modalCfg.phase = "loading";
    setModalState("loading");
    Promise.resolve()
      .then(function () { return wait(1400); })      // latencia simulada de red
      .then(function () { return modalCfg.run(); })
      .then(function (res) {
        modalCfg.phase = "success";
        setText("modalSuccessTitle", res.title);
        setText("modalSuccessText", res.text || "");
        setModalState("success");
        renderAll();
      })
      .catch(function (err) {
        modalCfg.phase = "error";
        setText("modalErrorText", err.message);
        setModalState("error");
      });
  });

  function toast(message, type) {
    var wrap = bind("toasts")[0];
    var el = document.createElement("div");
    el.className = "toast ae-toast ae-toast--" + (type || "success");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = '<div class="toast-body">' + icon(type === "error" ? "alert" : "check") +
      '<span class="flex-grow-1">' + esc(message) + '</span><button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>';
    wrap.appendChild(el);
    var t = new bootstrap.Toast(el, { delay: 3800 });
    el.addEventListener("hidden.bs.toast", function () { el.remove(); });
    t.show();
  }

  /* 6. FORMULARIOS ========================================================= */

  /** Patrón de validación nativo de Bootstrap: was-validated + checkValidity */
  function validate(form, extra) {
    if (extra) extra();
    form.classList.add("was-validated");
    if (!form.checkValidity()) {
      var first = form.querySelector(":invalid");
      if (first) first.focus();
      return false;
    }
    return true;
  }

  // --- Reserva -------------------------------------------------------------
  var formReserva = $("#form-reserva");
  var rDate = $("#r-date");
  rDate.min = todayISO();
  $("#r-name").value = state.user.fullName;

  formReserva.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = validate(formReserva, function () {
      rDate.setCustomValidity(rDate.value && rDate.value < todayISO() ? "past" : "");
    });
    if (!ok) return;

    var exp = state.experiences.find(function (x) { return x.id === $("#r-experience").value; });
    var src = account($("#r-source").value);
    var guests = parseInt($("#r-guests").value, 10);
    var dateTime = new Date(rDate.value + "T" + $("#r-time").value + ":00");
    if ($("#r-time").value === "01:00") dateTime.setDate(dateTime.getDate() + 1);

    confirmAction({
      title: "Confirmar reserva",
      confirmLabel: "Confirmar y pagar abono",
      rows: [
        ["Experiencia", exp.name],
        ["Fecha", fmtDate(dateTime.toISOString(), { weekday: "long", day: "numeric", month: "long" })],
        ["Hora", $("#r-time").value],
        ["Personas", guests],
        ["A nombre de", $("#r-name").value],
        ["Se descuenta de", src.name],
        ["Abono", money(exp.deposit), true]
      ],
      run: function () {
        var day = new Date(rDate.value + "T12:00:00").getDay();
        if (day === 1 || day === 2) throw new Error("El coven descansa los lunes y martes. Elige otra noche.");
        if (src.balance < exp.deposit) throw new Error("Saldo insuficiente en " + src.name + ". Recarga o elige otra cuenta.");
        src.balance -= exp.deposit;
        addTx({ title: "Abono reserva · " + exp.name, cat: "ritual", amount: -exp.deposit, account: src.id });
        state.nextReservation = { date: dateTime.toISOString(), experience: exp.name, guests: guests, table: "Por asignar" };
        formReserva.reset();
        formReserva.classList.remove("was-validated");
        $("#r-name").value = state.user.fullName;
        return { title: "¡Reserva conjurada!", text: "Te esperamos el " + fmtDate(dateTime.toISOString(), { weekday: "long", day: "numeric", month: "long" }) + " a las " + fmtTime(dateTime.toISOString()) + "." };
      }
    });
  });

  // --- Regalar Esencia (transferencia) ------------------------------------
  var formRegalar = $("#form-regalar");
  $$(".ae-chip[data-amount]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      $("#g-amount").value = chip.dataset.amount;
      $$(".ae-chip[data-amount]").forEach(function (c) { c.classList.toggle("is-active", c === chip); });
    });
  });
  $("#g-amount").addEventListener("input", function () { $$(".ae-chip[data-amount]").forEach(function (c) { c.classList.toggle("is-active", c.dataset.amount === $("#g-amount").value); }); });
  $("#g-source").addEventListener("change", updateSourceHint);

  formRegalar.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate(formRegalar)) return;
    var amount = parseInt($("#g-amount").value, 10);
    var src = account($("#g-source").value);
    var to = $("#g-to").value.trim();
    var msg = $("#g-message").value.trim();

    confirmAction({
      title: "Confirmar regalo",
      confirmLabel: "Enviar regalo",
      rows: [
        ["Para", to],
        ["Desde", src.name],
        ["Mensaje", msg || "—"],
        ["Monto", money(amount), true]
      ],
      run: function () {
        if (src.balance < amount) throw new Error("Saldo insuficiente: " + src.name + " tiene " + money(src.balance) + ".");
        src.balance -= amount;
        addTx({ title: "Regalo enviado a " + to, cat: "regalo", amount: -amount, account: src.id });
        formRegalar.reset();
        formRegalar.classList.remove("was-validated");
        $$(".ae-chip[data-amount]").forEach(function (c) { c.classList.remove("is-active"); });
        return { title: "¡Regalo enviado!", text: to + " recibirá " + money(amount) + " para su próximo elixir." };
      }
    });
  });

  // --- Perfil --------------------------------------------------------------
  var formPerfil = $("#form-perfil");
  function fillProfile() {
    $("#p-name").value = state.user.fullName;
    $("#p-handle").value = state.user.handle;
    $("#p-email").value = state.user.email;
    $("#p-birth").value = state.user.birth;
  }
  formPerfil.addEventListener("submit", function (e) {
    e.preventDefault();
    var birth = $("#p-birth");
    var ok = validate(formPerfil, function () {
      var b = new Date(birth.value), limit = new Date();
      limit.setFullYear(limit.getFullYear() - 18);
      birth.setCustomValidity(!birth.value || b > limit ? "menor" : "");
    });
    if (!ok) { toast("Revisa los campos marcados.", "error"); return; }
    var btn = formPerfil.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Guardando…';
    wait(900).then(function () {
      state.user.fullName = $("#p-name").value.trim();
      state.user.firstName = state.user.fullName.split(" ")[0];
      state.user.handle = $("#p-handle").value.trim();
      state.user.email = $("#p-email").value.trim();
      state.user.birth = birth.value;
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
      formPerfil.classList.remove("was-validated");
      renderSummary();
      toast("Perfil actualizado.", "success");
    });
  });

  /* 7. INTERACCIONES ======================================================= */

  // Delegación global de clics para acciones
  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      var id = add.dataset.add;
      state.bill[id] = (state.bill[id] || 0) + 1;
      renderMenu(); renderBill();
      var item = state.menu.find(function (m) { return m.id === id; });
      toast(item.name + " añadido a la cuenta.", "success");
      var again = $('[data-add="' + id + '"]'); if (again) again.focus();
      return;
    }

    var qty = e.target.closest("[data-qty]");
    if (qty) {
      var qid = qty.dataset.id;
      state.bill[qid] = (state.bill[qid] || 0) + parseInt(qty.dataset.qty, 10);
      if (state.bill[qid] <= 0) delete state.bill[qid];
      renderMenu(); renderBill();
      return;
    }

    var filter = e.target.closest("[data-filter]");
    if (filter) {
      menuFilter = filter.dataset.filter;
      $$("[data-filter]").forEach(function (f) {
        var on = f === filter;
        f.classList.toggle("is-active", on);
        f.setAttribute("aria-pressed", on);
      });
      renderMenu();
      return;
    }

    var tabLink = e.target.closest("[data-tab]");
    if (tabLink) {
      e.preventDefault();
      navigate(tabLink.dataset.viewLink, "tab=" + tabLink.dataset.tab);
      return;
    }

    var action = e.target.closest("[data-action]");
    if (!action) return;
    var name = action.dataset.action;

    if (name === "pay-bill") {
      var t = billTotals();
      var src = account("monedero");
      confirmAction({
        title: "Pagar cuenta de la mesa " + state.tableNumber,
        confirmLabel: "Pagar " + money(t.total),
        rows: [
          ["Subtotal", money(t.sub)],
          ["Propina (10%)", money(t.tip)],
          ["Pagar con", src.name + " · " + money(src.balance)],
          ["Esencia a ganar", "+" + Math.round(t.sub * 0.05 / 10).toLocaleString("es-CO") + " pts"],
          ["Total", money(t.total), true]
        ],
        run: function () {
          if (src.balance < t.total) throw new Error("Tu monedero tiene " + money(src.balance) + ". Recarga para pagar " + money(t.total) + ".");
          src.balance -= t.total;
          var pts = Math.round(t.sub * 0.05 / 10);
          state.user.points += pts;
          account("esencia").balance += pts * 10;
          addTx({ title: "Cuenta mesa " + state.tableNumber + " (" + Object.keys(state.bill).length + " ítems)", cat: "elixir", amount: -t.total, account: "monedero" });
          state.bill = {};
          return { title: "¡Cuenta pagada!", text: "Ganaste " + pts + " puntos de Esencia. Que la noche siga siendo mágica." };
        }
      });
    }

    if (name === "topup") {
      confirmAction({
        title: "Recargar monedero",
        confirmLabel: "Recargar",
        rows: [["Desde", "Visa •••• 4521"], ["Hacia", "Monedero del Coven"], ["Monto", money(100000), true]],
        run: function () {
          account("monedero").balance += 100000;
          addTx({ title: "Recarga desde Visa •••• 4521", cat: "recarga", amount: 100000, account: "monedero" });
          return { title: "Recarga exitosa", text: "Tu monedero ahora tiene " + money(account("monedero").balance) + "." };
        }
      });
    }

    if (name === "logout") {
      confirmAction({
        title: "¿Cerrar sesión?",
        confirmLabel: "Cerrar sesión",
        rows: [["Usuario", state.user.handle], ["Dispositivo", "Este navegador"]],
        run: function () {
          state.loggedIn = false;
          setTimeout(function () { modal.hide(); navigate("salida"); }, 700);
          return { title: "Sesión cerrada", text: "Hasta la próxima luna." };
        }
      });
    }

    if (name === "login") {
      e.preventDefault();
      state.loggedIn = true;
      navigate("inicio");
      toast("Bienvenida de vuelta, " + state.user.firstName + ".", "success");
    }
  });

  // Historial: búsqueda y filtro en vivo
  $("#h-search").addEventListener("input", renderAllTx);
  $("#h-type").addEventListener("change", renderAllTx);

  // Ajustes: reducir animaciones
  $("#s-motion").addEventListener("change", function (e) {
    document.documentElement.classList.toggle("ae-reduce-motion", e.target.checked);
  });
  ["s-moon", "s-tx"].forEach(function (id) {
    $("#" + id).addEventListener("change", function (e) {
      toast((e.target.checked ? "Activado: " : "Desactivado: ") + e.target.nextElementSibling.textContent, "success");
    });
  });

  /* 8. ARRANQUE ============================================================ */
  renderStaticOptions();
  fillProfile();
  renderAll();
  var r = parseHash();
  showView(r.view, r.params);
})();
