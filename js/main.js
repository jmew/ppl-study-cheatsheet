/* ==========================================================================
   PPL Study Guide — shared site chrome
   Injects header + footer, handles theme toggle, mobile menu, the Topics
   dropdown, in-page table of contents (scrollspy), section anchors, and the
   prev/next pager. Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Ordered list of all pages (drives nav, dropdown & pager) ---- */
  var PAGES = [
    { file: "index.html", label: "Home", nav: false },
    {
      file: "aerodynamics.html",
      label: "Aerodynamics",
      desc: "Forces, drag, stalls & spins",
      lecture: "1",
      nav: true,
    },
    {
      file: "systems.html",
      label: "Systems & Instruments",
      desc: "Engine, compass, pitot-static",
      lecture: "2",
      nav: true,
    },
    {
      file: "airspace.html",
      label: "Airspace",
      desc: "Classes A–G & special use",
      lecture: "3",
      nav: true,
    },
    {
      file: "airports.html",
      label: "Airports & Operations",
      desc: "Pattern, markings, PAPI/VASI",
      lecture: "3",
      nav: true,
    },
    {
      file: "atc.html",
      label: "ATC & Communications",
      desc: "Comm flow & squawk codes",
      lecture: "4",
      nav: true,
    },
    {
      file: "performance.html",
      label: "Performance & W&B",
      desc: "Density altitude & loading",
      lecture: "5",
      nav: true,
    },
    {
      file: "regulations.html",
      label: "Regulations",
      desc: "Certs, currency, limits, mnemonics",
      lecture: "6",
      nav: true,
    },
    {
      file: "weather.html",
      label: "Weather",
      desc: "Pressure, fronts, fog, storms",
      lecture: "7 & 8",
      nav: true,
    },
    {
      file: "weather-reports.html",
      label: "Weather Reports",
      desc: "METAR/TAF, AIRMET/SIGMET",
      lecture: "9",
      nav: true,
    },
    {
      file: "navigation.html",
      label: "Navigation",
      desc: "VOR, GPS & RAIM",
      lecture: "10",
      nav: true,
    },
    {
      file: "navigation-planning.html",
      label: "Navigation Planning",
      desc: "E6-B: speed, distance, time",
      lecture: "11",
      nav: true,
    },
    {
      file: "human-factors.html",
      label: "Human Factors",
      desc: "Aeromedical & illusions",
      lecture: "12",
      nav: true,
    },
    {
      file: "far-aim.html",
      label: "FAR/AIM",
      desc: "High-yield rules & AIM by part/chapter",
      nav: true,
    },
    { file: "flashcards.html", label: "Flashcards", nav: false },
  ];

  var ICONS = {
    plane:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L11 19v-5.5z"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  };

  /* ---- Helpers ---- */
  function currentFile() {
    var path = location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  var here = currentFile();

  /* ---- Build header ---- */
  function buildHeader() {
    var topicLinks = PAGES.filter(function (p) {
      return p.nav;
    })
      .map(function (p) {
        var cur = p.file === here ? ' aria-current="page"' : "";
        var num = p.lecture
          ? '<span class="dropdown__num">L' + p.lecture + "</span>"
          : "";
        return (
          '<a href="' +
          p.file +
          '"' +
          cur +
          '><span class="dropdown__head">' +
          num +
          '<span class="dropdown__label">' +
          p.label +
          "</span></span>" +
          "<small>" +
          (p.desc || "") +
          "</small></a>"
        );
      })
      .join("");

    var topicActive = PAGES.some(function (p) {
      return p.nav && p.file === here;
    });

    var homeCur = here === "index.html" ? ' aria-current="page"' : "";
    var fcCur = here === "flashcards.html" ? ' aria-current="page"' : "";
    var stCur = here === "starred.html" ? ' aria-current="page"' : "";

    var header = el(
      '<header class="site-header">' +
        '<div class="site-header__inner">' +
        '<a class="brand" href="index.html">' +
        ICONS.plane +
        "<span>PPL <span class=\"brand__tag\">Study Guide</span></span>" +
        "</a>" +
        '<nav class="primary-nav" aria-label="Primary">' +
        '<a href="index.html"' +
        homeCur +
        ">Home</a>" +
        '<div class="has-dropdown">' +
        '<button class="dropdown-toggle' +
        (topicActive ? " is-active" : "") +
        '" aria-expanded="false" aria-haspopup="true">Topics ' +
        ICONS.chevron +
        "</button>" +
        '<div class="dropdown" role="menu">' +
        topicLinks +
        "</div>" +
        "</div>" +
        '<a href="flashcards.html"' +
        fcCur +
        ">Flashcards</a>" +
        '<a class="nav-star" href="starred.html"' +
        stCur +
        ">\u2605 Starred</a>" +
        '<div class="search" role="search">' +
        '<input type="search" class="search__input" id="site-search" ' +
        'placeholder="Search the guide…" autocomplete="off" ' +
        'aria-label="Search the study guide" />' +
        '<div class="search__results" id="search-results" role="listbox"></div>' +
        "</div>" +
        "</nav>" +
        '<div class="header-tools">' +
        '<button class="theme-toggle" id="theme-toggle" type="button" ' +
        'aria-label="Toggle dark mode" title="Toggle dark mode">' +
        ICONS.moon +
        ICONS.sun +
        "</button>" +
        '<button class="nav-toggle" id="nav-toggle" type="button" ' +
        'aria-label="Toggle menu" aria-expanded="false">' +
        ICONS.menu +
        "</button>" +
        "</div>" +
        "</div>" +
        "</header>"
    );

    var skip = el('<a class="skip-link" href="#main">Skip to content</a>');
    document.body.insertBefore(header, document.body.firstChild);
    document.body.insertBefore(skip, header);
  }

  /* ---- Build footer ---- */
  function buildFooter() {
    var footer = el(
      '<footer class="site-footer">' +
        "<div>Built as a personal PPL written-exam study aid · " +
        '<a href="flashcards.html">Flashcards</a> · ' +
        '<a href="index.html">All topics</a></div>' +
        '<p class="site-footer__disclaimer">For study only — not for ' +
        "navigation or flight operations. Always verify against current FAA " +
        "publications (PHAK, AIM, FAR) and your CFI.</p>" +
        "</footer>"
    );
    document.body.appendChild(footer);
  }

  /* ---- Theme toggle ---- */
  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var cur =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "light"
          : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      try {
        localStorage.setItem("ppl-theme", cur);
      } catch (e) {}
    });
  }

  /* ---- Mobile menu + dropdown ---- */
  function initMenus() {
    var navToggle = document.getElementById("nav-toggle");
    var nav = document.querySelector(".primary-nav");
    var ddToggle = document.querySelector(".dropdown-toggle");
    var dd = document.querySelector(".dropdown");

    if (navToggle && nav) {
      navToggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(open));
      });
    }

    if (ddToggle && dd) {
      ddToggle.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = dd.classList.toggle("open");
        ddToggle.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", function (e) {
        if (!dd.contains(e.target) && !ddToggle.contains(e.target)) {
          dd.classList.remove("open");
          ddToggle.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          dd.classList.remove("open");
          ddToggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ---- Section anchors + auto TOC + scrollspy ---- */
  function initSections() {
    var sections = Array.prototype.slice.call(
      document.querySelectorAll(".section[id]")
    );
    if (!sections.length) return;

    // Add hover anchor links to each section heading
    sections.forEach(function (s) {
      var h = s.querySelector("h2");
      if (h && !h.querySelector(".anchor")) {
        var a = el('<a class="anchor" href="#' + s.id + '" aria-label="Link to this section">#</a>');
        h.appendChild(a);
      }
    });

    // Populate an auto-TOC if a container exists
    var tocNav = document.querySelector("[data-toc]");
    var links = [];
    if (tocNav) {
      var html = '<h2>On this page</h2>';
      sections.forEach(function (s) {
        var h = s.querySelector("h2");
        if (!h) return;
        var label = h.getAttribute("data-toc") || h.textContent.replace("#", "").trim();
        html += '<a href="#' + s.id + '">' + label + "</a>";
      });
      tocNav.innerHTML = html;
      links = Array.prototype.slice.call(tocNav.querySelectorAll("a"));
    }

    // Scrollspy
    if (links.length && "IntersectionObserver" in window) {
      var byId = {};
      links.forEach(function (l) {
        byId[l.getAttribute("href").slice(1)] = l;
      });
      var visible = new Set();
      var obs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          });
          // highlight the first visible section in document order
          var activeId = null;
          for (var i = 0; i < sections.length; i++) {
            if (visible.has(sections[i].id)) {
              activeId = sections[i].id;
              break;
            }
          }
          links.forEach(function (l) {
            l.classList.toggle(
              "active",
              l.getAttribute("href").slice(1) === activeId
            );
          });
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      sections.forEach(function (s) {
        obs.observe(s);
      });
    }
  }

  /* ---- Prev / next pager ---- */
  function initPager() {
    var content = document.querySelector(".content");
    if (!content || here === "index.html") return;
    if (content.querySelector(".pager")) return;

    var idx = -1;
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].file === here) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;

    var prev = PAGES[idx - 1];
    var next = PAGES[idx + 1];
    var html = '<nav class="pager" aria-label="Pagination">';
    if (prev) {
      html +=
        '<a class="prev" href="' +
        prev.file +
        '"><span>← Previous</span><b>' +
        prev.label +
        "</b></a>";
    } else {
      html += "<span></span>";
    }
    if (next) {
      html +=
        '<a class="next" href="' +
        next.file +
        '"><span>Next →</span><b>' +
        next.label +
        "</b></a>";
    } else {
      html += "<span></span>";
    }
    html += "</nav>";
    content.appendChild(el(html));
  }

  /* ---- Init ---- */
  function init() {
    buildHeader();
    buildFooter();
    initTheme();
    initMenus();
    initSections();
    initPager();
    // Let search.js know the chrome is ready
    document.dispatchEvent(new CustomEvent("ppl:chrome-ready"));
    // Load the annotation/comments feature (after pager so offsets are stable)
    if (!document.getElementById("ppl-comments-js")) {
      var cs = document.createElement("script");
      cs.id = "ppl-comments-js";
      cs.src = "js/comments.js?v=20260625k";
      document.body.appendChild(cs);
    }
    // Load the image lightbox
    if (!document.getElementById("ppl-lightbox-js")) {
      var lb = document.createElement("script");
      lb.id = "ppl-lightbox-js";
      lb.src = "js/lightbox.js?v=20260625k";
      document.body.appendChild(lb);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
