/* =========================================================
   Arcana & Elixires · Coven Bar — Interacciones
   JavaScript puro, sin dependencias
   ========================================================= */

/*
 * CONFIGURACIÓN DEL FORMULARIO
 * Para recibir los mensajes directamente en tu correo, crea un formulario gratis en
 * https://formspree.io y pega aquí tu endpoint (ej: "https://formspree.io/f/abcdwxyz").
 * Si lo dejas vacío, el formulario abrirá el programa de correo del visitante con el
 * mensaje ya redactado hacia CONTACT_EMAIL.
 */
const FORM_ENDPOINT = "";
const CONTACT_EMAIL = "hola@covenbar.co";

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initMenu();
  initReveal();
  initCounters();
  initFilters();
  initContactForm();
  setYear();
});

/* ---------- Header: fondo sólido al hacer scroll ---------- */
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Menú hamburguesa ---------- */
function initMenu() {
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  window.matchMedia("(min-width: 960px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
}

/* ---------- Aparición suave de secciones ---------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  items.forEach((el) => io.observe(el));
}

/* ---------- Contadores animados ---------- */
function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const format = (n) => n.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduce) { el.textContent = format(target); return; }
    const duration = 1800;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => io.observe(el));
}

/* ---------- Filtro de productos por categoría ---------- */
function initFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  const products = document.querySelectorAll(".product[data-category]");
  const counter = document.querySelector(".filter-count");
  if (!buttons.length || !products.length) return;

  const apply = (filter) => {
    let visible = 0;
    buttons.forEach((b) => {
      const active = b.dataset.filter === filter;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    products.forEach((p) => {
      const show = filter === "todos" || p.dataset.category === filter;
      p.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });
    if (counter) counter.textContent = `${visible} ${visible === 1 ? "propuesta" : "propuestas"} en el grimorio`;
  };

  buttons.forEach((b) => b.addEventListener("click", () => {
    apply(b.dataset.filter);
    history.replaceState(null, "", b.dataset.filter === "todos" ? location.pathname : `#${b.dataset.filter}`);
  }));

  const initial = location.hash.replace("#", "");
  const valid = Array.from(buttons).some((b) => b.dataset.filter === initial);
  apply(valid ? initial : "todos");
}

/* ---------- Formulario de contacto ---------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const submit = form.querySelector('button[type="submit"]');

  // Preselecciona el motivo si llega desde un producto (?motivo=...)
  const params = new URLSearchParams(location.search);
  const motivo = params.get("motivo");
  const select = form.querySelector("#motivo");
  if (motivo && select) {
    const option = Array.from(select.options).find((o) => o.value === motivo);
    if (option) select.value = motivo;
    const msg = form.querySelector("#mensaje");
    const producto = params.get("producto");
    if (producto && msg && !msg.value) msg.value = `Hola, quiero información sobre "${producto}". `;
  }

  const rules = {
    nombre: (v) => (v.length < 2 ? "Escribe tu nombre (mínimo 2 caracteres)." : v.length > 80 ? "Máximo 80 caracteres." : ""),
    email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "Escribe un correo válido." : v.length > 120 ? "Máximo 120 caracteres." : ""),
    mensaje: (v) => (v.length < 10 ? "Cuéntanos un poco más (mínimo 10 caracteres)." : v.length > 1000 ? "Máximo 1000 caracteres." : ""),
  };

  const validateField = (input) => {
    const rule = rules[input.name];
    if (!rule) return true;
    const error = rule(input.value.trim());
    const field = input.closest(".field");
    field.classList.toggle("has-error", !!error);
    field.querySelector(".field__error").textContent = error;
    input.setAttribute("aria-invalid", String(!!error));
    return !error;
  };

  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => { if (input.closest(".field").classList.contains("has-error")) validateField(input); });
  });

  const showStatus = (type, text) => {
    status.className = `form-status is-${type}`;
    status.textContent = text;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.elements._gotcha && form.elements._gotcha.value) return; // anti-spam
    const valid = Object.keys(rules).map((n) => validateField(form.elements[n])).every(Boolean);
    if (!valid) {
      showStatus("error", "Revisa los campos marcados para poder enviar tu mensaje.");
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const data = {
      nombre: form.elements.nombre.value.trim(),
      email: form.elements.email.value.trim(),
      motivo: form.elements.motivo ? form.elements.motivo.value : "",
      mensaje: form.elements.mensaje.value.trim(),
    };

    submit.disabled = true;
    const label = submit.innerHTML;
    submit.textContent = "Enviando…";

    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error de envío");
        showStatus("success", `Gracias, ${data.nombre}. Tu mensaje llegó al aquelarre: te responderemos en menos de 24 horas.`);
      } else {
        const subject = encodeURIComponent(`[Web] ${data.motivo || "Contacto"} — ${data.nombre}`);
        const body = encodeURIComponent(`Nombre: ${data.nombre}\nEmail: ${data.email}\nMotivo: ${data.motivo}\n\n${data.mensaje}`);
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
        showStatus("success", `Gracias, ${data.nombre}. Abrimos tu correo con el mensaje listo para enviar a ${CONTACT_EMAIL}.`);
      }
      form.reset();
    } catch (err) {
      showStatus("error", `No pudimos enviar tu mensaje. Escríbenos directamente a ${CONTACT_EMAIL} o por WhatsApp.`);
    } finally {
      submit.disabled = false;
      submit.innerHTML = label;
    }
  });
}

/* ---------- Año actual en el footer ---------- */
function setYear() {
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
}
