/* ==========================================================================
   PPL Study Guide — Starred collection
   Reads every per-page note store (ppl-notes:<page>) from localStorage, keeps
   the items flagged important, and renders them grouped by topic — each snippet
   shown with its original styling (the saved selection HTML). Pure client-side.
   ========================================================================== */
(function () {
  "use strict";

  var PREFIX = "ppl-notes:";
  var PAGES = [
    ["aerodynamics.html", "Aerodynamics"],
    ["systems.html", "Systems & Instruments"],
    ["airspace.html", "Airspace"],
    ["airports.html", "Airports & Operations"],
    ["atc.html", "ATC & Communications"],
    ["performance.html", "Performance & W&B"],
    ["regulations.html", "Regulations"],
    ["weather.html", "Weather"],
    ["weather-reports.html", "Weather Reports"],
    ["navigation.html", "Navigation"],
    ["navigation-planning.html", "Navigation Planning"],
    ["human-factors.html", "Human Factors"],
    ["far-aim.html", "FAR/AIM"],
    ["index.html", "Home"],
  ];
  var ORDER = {};
  var LABEL = {};
  PAGES.forEach(function (p, i) {
    ORDER[p[0]] = i;
    LABEL[p[0]] = p[1];
  });
  function label(page) {
    return LABEL[page] || page.replace(/\.html$/, "");
  }
  function order(page) {
    return ORDER[page] == null ? 99 : ORDER[page];
  }

  function loadAll() {
    var byPage = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(PREFIX) !== 0) continue;
      var page = k.slice(PREFIX.length);
      var arr;
      try {
        arr = JSON.parse(localStorage.getItem(k)) || [];
      } catch (e) {
        arr = [];
      }
      if (!Array.isArray(arr)) continue;
      var starred = arr.filter(function (n) {
        return n && n.important;
      });
      if (starred.length) byPage[page] = starred;
    }
    return byPage;
  }

  function unstar(page, id) {
    var k = PREFIX + page;
    var arr;
    try {
      arr = JSON.parse(localStorage.getItem(k)) || [];
    } catch (e) {
      return;
    }
    arr.forEach(function (n) {
      if (n.id === id) n.important = false;
    });
    localStorage.setItem(k, JSON.stringify(arr));
  }

  function clearAll() {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(PREFIX) !== 0) continue;
      var arr;
      try {
        arr = JSON.parse(localStorage.getItem(k)) || [];
      } catch (e) {
        continue;
      }
      var changed = false;
      arr.forEach(function (n) {
        if (n.important) {
          n.important = false;
          changed = true;
        }
      });
      if (changed) localStorage.setItem(k, JSON.stringify(arr));
    }
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function setCount(n) {
    var c = document.getElementById("starred-count");
    if (c) c.textContent = n ? "· " + n : "";
  }

  function render() {
    var mount = document.getElementById("starred-root");
    if (!mount) return;
    var byPage = loadAll();
    var pages = Object.keys(byPage).sort(function (a, b) {
      return order(a) - order(b);
    });
    var total = pages.reduce(function (s, p) {
      return s + byPage[p].length;
    }, 0);
    setCount(total);

    if (!total) {
      mount.innerHTML =
        '<div class="starred-empty">' +
        "<p>No starred items yet.</p>" +
        '<p class="muted">On any lecture page, <strong>select some text</strong> and click ' +
        "<strong>★ Star</strong> — it'll be collected here for quick review.</p>" +
        "</div>";
      return;
    }

    var html =
      '<div class="starred-bar"><span class="muted">' +
      total +
      " starred item" +
      (total === 1 ? "" : "s") +
      '</span><button class="btn" id="starred-clear" type="button">Clear all</button></div>';

    pages.forEach(function (page) {
      var items = byPage[page].slice().sort(function (a, b) {
        return (a.start || 0) - (b.start || 0);
      });
      html += '<section class="starred-group">';
      html +=
        '<h2 class="starred-group__title"><a href="' +
        page +
        '">' +
        esc(label(page)) +
        "</a></h2>";
      items.forEach(function (n) {
        var href = page + (n.sec ? "#" + n.sec : "");
        html +=
          '<article class="starred-item" data-page="' +
          page +
          '" data-id="' +
          esc(n.id) +
          '">' +
          '<div class="starred-item__quote">' +
          (n.html || esc(n.text)) +
          "</div>" +
          (n.note ? '<div class="starred-item__note"></div>' : "") +
          '<div class="starred-item__foot">' +
          '<a class="starred-item__link" href="' +
          href +
          '">Go to ' +
          esc(label(page)) +
          " →</a>" +
          '<button class="starred-item__unstar" type="button">★ Unstar</button>' +
          "</div>" +
          "</article>";
      });
      html += "</section>";
    });
    mount.innerHTML = html;

    // notes set as plain text (not HTML); wire up unstar buttons
    mount.querySelectorAll(".starred-item").forEach(function (el) {
      var page = el.getAttribute("data-page");
      var id = el.getAttribute("data-id");
      var n = (byPage[page] || []).find(function (x) {
        return x.id === id;
      });
      var noteEl = el.querySelector(".starred-item__note");
      if (noteEl && n) noteEl.textContent = n.note;
      el.querySelector(".starred-item__unstar").addEventListener("click", function () {
        unstar(page, id);
        render();
      });
    });

    var clr = document.getElementById("starred-clear");
    if (clr)
      clr.addEventListener("click", function () {
        if (
          window.confirm(
            "Remove all " + total + " starred items? Your notes/highlights stay on their pages."
          )
        ) {
          clearAll();
          render();
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
