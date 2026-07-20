/**
 * script.js
 * Toda a interatividade do site: idioma, tema, menu mobile, animações de
 * scroll, contador de KPIs, fundo de grade animada e o formulário de
 * contato (validação, sanitização e proteção anti-spam via honeypot).
 *
 * Nenhuma dependência externa. Comentado em português para facilitar
 * manutenção futura.
 */
(function () {
  "use strict";

  /* ========================================================================
     1. IDIOMA (i18n)
     Detecta o idioma do navegador na primeira visita, lembra a escolha do
     usuário em localStorage e aplica as traduções em todos os elementos
     marcados com data-i18n.
     ======================================================================== */
  function detectBrowserLang() {
    const nav = (navigator.language || navigator.userLanguage || "pt").slice(0, 2).toLowerCase();
    return SUPPORTED_LANGS.includes(nav) ? nav : DEFAULT_LANG;
  }

  function getStoredLang() {
    try {
      return localStorage.getItem("tf_lang");
    } catch (e) {
      return null; // localStorage pode falhar em modo privado/restrito
    }
  }

  function storeLang(lang) {
    try {
      localStorage.setItem("tf_lang", lang);
    } catch (e) {
      /* silenciosamente ignorado — apenas perde a preferência entre sessões */
    }
  }

  function applyLang(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        // innerHTML é usado apenas para chaves que contêm o <span id="year">
        // controlado por nós mesmos (footer.rights) — nunca para dados vindos
        // do usuário, o que manteria a proteção contra XSS.
        el.innerHTML = dict[key];
      }
    });

    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const isActive = btn.dataset.lang === lang;
      btn.setAttribute("aria-pressed", String(isActive));
    });

    // O <span id="year"> é substituído pelo footer.rights via innerHTML;
    // preenchemos o ano novamente depois da troca de idioma.
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    storeLang(lang);
  }

  function initLang() {
    const initial = getStoredLang() || detectBrowserLang();
    applyLang(initial);

    document.getElementById("lang-switch").addEventListener("click", (e) => {
      const btn = e.target.closest(".lang-btn");
      if (!btn) return;
      applyLang(btn.dataset.lang);
    });
  }

  /* ========================================================================
     2. TEMA (claro/escuro)
     ======================================================================== */
  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    const stored = (() => {
      try { return localStorage.getItem("tf_theme"); } catch (e) { return null; }
    })();

    if (stored) document.documentElement.setAttribute("data-theme", stored);

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      if (next === "dark") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
      try { localStorage.setItem("tf_theme", next); } catch (e) { /* ignora */ }
    });
  }

  /* ========================================================================
     3. MENU MOBILE
     ======================================================================== */
  function initMobileNav() {
    const navToggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("nav");

    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ========================================================================
     4. HEADER — leve sombra/blur extra ao rolar
     ======================================================================== */
  function initHeaderScroll() {
    const header = document.getElementById("header");
    window.addEventListener("scroll", () => {
      header.style.boxShadow = window.scrollY > 10 ? "0 8px 30px -20px rgba(0,0,0,0.6)" : "none";
    }, { passive: true });
  }

  /* ========================================================================
     5. SCROLL REVEAL + CONTADOR DE KPIs + BARRAS DE HABILIDADE
     Usa IntersectionObserver (leve, nativo, sem libs) para revelar seções
     e disparar animações apenas quando entram na viewport.
     ======================================================================== */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initReveal() {
    const revealEls = document.querySelectorAll(".reveal");
    const kpiValues = document.querySelectorAll(".kpi-card__value");
    const skillFills = document.querySelectorAll(".skill-bars__fill");

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Sem animação: mostra tudo já no estado final
      revealEls.forEach((el) => el.classList.add("is-visible"));
      kpiValues.forEach((el) => (el.textContent = el.dataset.count));
      skillFills.forEach((el) => (el.style.width = el.dataset.level + "%"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));

    // KPIs contam apenas uma vez, ao entrar na tela
    const kpiObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    kpiValues.forEach((el) => kpiObserver.observe(el));

    // Barras de habilidade preenchem ao entrar na tela
    const skillObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.style.width = entry.target.dataset.level + "%";
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    skillFills.forEach((el) => skillObserver.observe(el));
  }

  /* ========================================================================
     6. RIPPLE EFFECT NOS BOTÕES (microinteração)
     ======================================================================== */
  function initRipple() {
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height);
        ripple.className = "ripple";
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = e.clientX - rect.left - size / 2 + "px";
        ripple.style.top = e.clientY - rect.top - size / 2 + "px";
        btn.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());
      });
    });
  }

  /* ========================================================================
     7. FUNDO — GRADE ANIMADA (canvas)
     Um motivo discreto de "grade de dashboard": linhas horizontais e
     verticais que se deslocam lentamente, reforçando o tema de dados sem
     recorrer a partículas genéricas.
     ======================================================================== */
  function initGridBackground() {
    const canvas = document.getElementById("grid-bg");
    const ctx = canvas.getContext("2d");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width, height, offset = 0;
    const spacing = 46;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize, { passive: true });
    resize();

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.06)";
      ctx.lineWidth = 1;

      for (let x = -spacing + (offset % spacing); x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -spacing + (offset % spacing); y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (!prefersReduced) {
        offset += 0.15;
        requestAnimationFrame(draw);
      }
    }
    draw();
  }

  /* ========================================================================
     8. FORMULÁRIO DE CONTATO
     Sem backend implantado por padrão, então o envio é feito via mailto:
     (abre o cliente de e-mail do próprio usuário com os dados preenchidos).
     Antes disso, aplicamos:
       - validação de campos obrigatórios e formato de e-mail
       - sanitização/escape de caracteres HTML antes de qualquer uso do
         conteúdo (prevenção de XSS, mesmo sem exibirmos o dado na página)
       - honeypot anti-spam: campo invisível que só um bot preencheria
     Para usar um backend real (recomendado em produção), veja o exemplo
     em /backend/app.py e troque a função `submitForm` para usar fetch().
     ======================================================================== */

  // Escapa caracteres HTML — usar sempre que um valor for inserido no DOM
  // como innerHTML (aqui não usamos, mas fica pronto para reaproveitar caso
  // o formulário passe a exibir os dados na própria página).
  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Sanitização para o envio via mailto: remove apenas caracteres de
  // controle e quebras que poderiam ser usados para injetar cabeçalhos de
  // e-mail (ex: "Bcc:"), sem desfigurar o texto legível para o destinatário.
  function sanitize(value) {
    return value
      .replace(/[\r\n]+/g, " ")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .trim();
  }

  function isValidEmail(value) {
    // Regex simples e suficiente para validação de formato no front-end.
    // A validação definitiva de um e-mail real deve ocorrer no backend.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setFieldError(field, message) {
    const errorEl = document.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) errorEl.textContent = message || "";
  }

  function initContactForm() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("form-status");
    const submitBtn = document.getElementById("submit-btn");

    // Simples limite de tentativas no cliente (mitigação básica; um
    // rate limit de verdade precisa viver no servidor — veja README.md).
    let attempts = 0;
    const MAX_ATTEMPTS_PER_MINUTE = 5;
    let windowStart = Date.now();

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // --- honeypot: se o campo escondido veio preenchido, é um bot ---
      const honeypot = form.querySelector("#website").value;
      if (honeypot) {
        // Finge sucesso para não dar pista ao bot de que foi bloqueado.
        status.textContent = TRANSLATIONS[currentLangSafe()].contact.success || "";
        form.reset();
        return;
      }

      // --- rate limit simples no client-side ---
      const now = Date.now();
      if (now - windowStart > 60000) {
        windowStart = now;
        attempts = 0;
      }
      attempts++;
      if (attempts > MAX_ATTEMPTS_PER_MINUTE) {
        status.dataset.state = "error";
        status.textContent = "Muitas tentativas. Aguarde um instante e tente novamente.";
        return;
      }

      const lang = document.documentElement.lang.startsWith("pt") ? "pt"
        : document.documentElement.lang.startsWith("es") ? "es" : "en";
      const t = TRANSLATIONS[lang];

      const nameEl = form.querySelector("#name");
      const emailEl = form.querySelector("#email");
      const subjectEl = form.querySelector("#subject");
      const messageEl = form.querySelector("#message");

      let hasError = false;
      [
        [nameEl, "name"],
        [emailEl, "email"],
        [subjectEl, "subject"],
        [messageEl, "message"],
      ].forEach(([el, key]) => setFieldError(key, ""));

      if (!nameEl.value.trim()) { setFieldError("name", t["contact.error.required"]); hasError = true; }
      if (!emailEl.value.trim()) { setFieldError("email", t["contact.error.required"]); hasError = true; }
      else if (!isValidEmail(emailEl.value.trim())) { setFieldError("email", t["contact.error.email"]); hasError = true; }
      if (!subjectEl.value.trim()) { setFieldError("subject", t["contact.error.required"]); hasError = true; }
      if (!messageEl.value.trim()) { setFieldError("message", t["contact.error.required"]); hasError = true; }

      if (hasError) {
        status.dataset.state = "error";
        status.textContent = t["contact.error.generic"];
        return;
      }

      // Sanitiza tudo antes de usar (mesmo indo para um mailto, é boa
      // prática nunca propagar entrada crua do usuário).
      const name = sanitize(nameEl.value);
      const email = sanitize(emailEl.value);
      const subject = sanitize(subjectEl.value);
      const message = sanitize(messageEl.value);

      submitBtn.disabled = true;
      status.dataset.state = "";
      status.textContent = t["contact.sending"];

      // Sem backend implantado: usamos mailto como canal padrão.
      const body = `${name} (${email})%0D%0A%0D%0A${encodeURIComponent(message)}`;
      const mailtoLink = `mailto:tiago.silvaf@outlook.com?subject=${encodeURIComponent(subject)}&body=${body}`;

      window.setTimeout(() => {
        window.location.href = mailtoLink;
        status.dataset.state = "success";
        status.textContent = t["contact.success"];
        submitBtn.disabled = false;
        form.reset();
      }, 500);
    });
  }

  function currentLangSafe() {
    const lang = document.documentElement.lang;
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("es")) return "es";
    return "en";
  }

  /* ========================================================================
     INIT
     ======================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    initLang();
    initTheme();
    initMobileNav();
    initHeaderScroll();
    initReveal();
    initRipple();
    initGridBackground();
    initContactForm();
  });
})();
