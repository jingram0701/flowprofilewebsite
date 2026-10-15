/* ============================================================
   FLOW PROFILE — SITE BEHAVIOUR
   You should not need to edit this file. Business details live in config.js.
   ============================================================ */
(function () {
  var S = window.SITE || {};
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Fill in business details from config.js ---- */
  document.querySelectorAll("[data-site]").forEach(function (el) {
    var key = el.getAttribute("data-site");
    var value = S[key];
    if (value) {
      el.textContent = (el.getAttribute("data-prefix") || "") + value;
    } else if (!el.textContent) {
      // nothing in config and no fallback text: hide the empty element's parent line
      var line = el.closest("p, div, li");
      if (line) line.hidden = true;
    }
  });

  document.querySelectorAll("[data-tel]").forEach(function (a) {
    if (S.phoneDial) a.href = "tel:" + S.phoneDial; else a.hidden = true;
  });
  document.querySelectorAll("[data-mail]").forEach(function (a) {
    if (S.email) a.href = "mailto:" + S.email; else a.hidden = true;
  });
  document.querySelectorAll("[data-social]").forEach(function (a) {
    var url = S[a.getAttribute("data-social")];
    if (url) { a.href = url; a.hidden = false; a.target = "_blank"; a.rel = "noopener"; }
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if (S.siteUrl) {
    var og = document.querySelector('meta[property="og:url"]') || document.createElement("meta");
    og.setAttribute("property", "og:url");
    og.setAttribute("content", S.siteUrl);
    document.head.appendChild(og);
  }

  /* ---- Keep anchor links clear of the sticky header ---- */
  var header = document.querySelector(".site-header");
  function setHeaderHeight() {
    if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);
  window.addEventListener("load", setHeaderHeight);

  /* ---- Sections fade up as they scroll into view ---- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    // stagger siblings (service columns, steps) slightly
    reveals.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute("data-reveal"); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty("--d", (i * 0.09) + "s");
    });
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Quote pop-up: appears after a moment, hides while the form is on screen ---- */
  var pop = document.querySelector(".quote-pop");
  if (pop) {
    setTimeout(function () { pop.classList.add("ready"); }, 2500);
    var contactSec = document.getElementById("contact");
    if (contactSec && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        pop.classList.toggle("away", entries[0].isIntersecting);
      }, { threshold: 0.15 }).observe(contactSec);
    }
    pop.addEventListener("click", function () {
      setTimeout(function () { var f = document.getElementById("f-name"); if (f) f.focus({ preventScroll: true }); }, 700);
    });
  }

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Quote form ---- */
  var form = document.getElementById("quote-form");
  if (!form) return;
  var status = form.querySelector(".form-status");
  var button = form.querySelector('button[type="submit"]');

  function setStatus(msg, isError) {
    status.textContent = msg;
    status.classList.toggle("error", !!isError);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("");

    // Basic checks: name and phone are required
    var ok = true;
    ["f-name", "f-phone"].forEach(function (id) {
      var input = document.getElementById(id);
      var valid = input.value.trim().length > 0;
      input.setAttribute("aria-invalid", valid ? "false" : "true");
      if (!valid) ok = false;
    });
    if (!ok) { setStatus("Please add your name and a phone number so we can get back to you.", true); return; }

    var data = new FormData(form);
    if (data.get("_gotcha")) return; // spam bot filled the hidden field

    // Sends straight to Brent's inbox.
    // 1. If gmailScriptUrl is set in config.js, sends from Brent's own Gmail (plain, native email).
    // 2. Otherwise uses FormSubmit (no setup, but FormSubmit adds its own footer).
    button.disabled = true;
    setStatus("Sending…");
    var subject = "NEW: Website request sent – " + data.get("name");
    var fields = {
      "Name": data.get("name"),
      "Phone": data.get("phone"),
      "Email": data.get("email"),
      "Suburb": data.get("suburb"),
      "Service": data.get("service"),
      "Message": data.get("message")
    };
    function done() {
      form.reset();
      setStatus("Thanks, your request has been sent. Brent will be in touch within one business day.");
    }
    function fail() {
      setStatus("That did not send. Please call " + (S.phoneDisplay || "us") + " or email " + (S.email || "us") + ".", true);
    }
    var req;
    if (S.gmailScriptUrl) {
      req = fetch(S.gmailScriptUrl, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ subject: subject, replyTo: data.get("email") || "", fields: fields })
      }).then(done);
    } else {
      var o = {};
      for (var k in fields) o[k] = fields[k] || "–";
      o._subject = subject;
      o._template = "basic";
      o._captcha = "false";
      if (data.get("email")) o._replyto = data.get("email");
      req = fetch("https://formsubmit.co/ajax/" + encodeURIComponent(S.email || ""), {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(o)
      }).then(function (res) { if (res.ok) done(); else fail(); });
    }
    req.catch(fail).finally(function () { button.disabled = false; });
  });
})();
