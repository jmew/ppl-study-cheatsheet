/* ==========================================================================
   PPL Study Guide — instant cross-page search
   Binds to the #site-search box injected by main.js and filters
   PPL_DATA.searchIndex. Works from any page (results link to page#anchor).
   ========================================================================== */
(function () {
  "use strict";

  var bound = false;

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, terms) {
    var out = text;
    terms.forEach(function (t) {
      if (!t) return;
      try {
        out = out.replace(new RegExp("(" + esc(t) + ")", "ig"), "<mark>$1</mark>");
      } catch (e) {}
    });
    return out;
  }

  function runSearch(q) {
    var data = (window.PPL_DATA && window.PPL_DATA.searchIndex) || [];
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var scored = [];
    data.forEach(function (item) {
      var hay = (item.t + " " + item.topic + " " + item.k + " " + item.s).toLowerCase();
      var ok = terms.every(function (t) {
        return hay.indexOf(t) >= 0;
      });
      if (!ok) return;
      var title = item.t.toLowerCase();
      var topic = item.topic.toLowerCase();
      var keys = item.k.toLowerCase();
      var snip = item.s.toLowerCase();
      var score = 0;
      terms.forEach(function (t) {
        if (title.indexOf(t) === 0) score += 6;
        if (title.indexOf(t) >= 0) score += 10;
        if (topic.indexOf(t) >= 0) score += 4;
        if (keys.indexOf(t) >= 0) score += 3;
        if (snip.indexOf(t) >= 0) score += 1;
      });
      scored.push({ item: item, score: score });
    });
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, 12).map(function (s) {
      return s.item;
    });
  }

  function bind() {
    if (bound) return;
    var input = document.getElementById("site-search");
    var box = document.getElementById("search-results");
    if (!input || !box) return;
    bound = true;

    var activeIndex = -1;
    var current = [];

    function close() {
      box.classList.remove("open");
      box.innerHTML = "";
      activeIndex = -1;
      current = [];
    }

    function render(items, terms) {
      current = items;
      activeIndex = -1;
      if (!items.length) {
        box.innerHTML = '<div class="search__empty">No matches. Try another term.</div>';
        box.classList.add("open");
        return;
      }
      box.innerHTML = items
        .map(function (it, i) {
          return (
            '<a class="search__result" role="option" data-i="' +
            i +
            '" href="' +
            it.p +
            '">' +
            '<div class="search__result-title">' +
            highlight(it.t, terms) +
            "</div>" +
            '<div class="search__result-meta">' +
            it.topic +
            "</div>" +
            '<div class="search__result-snippet">' +
            it.s +
            "</div>" +
            "</a>"
          );
        })
        .join("");
      box.classList.add("open");
    }

    function setActive(i) {
      var nodes = box.querySelectorAll(".search__result");
      if (!nodes.length) return;
      if (i < 0) i = nodes.length - 1;
      if (i >= nodes.length) i = 0;
      activeIndex = i;
      nodes.forEach(function (n, idx) {
        n.classList.toggle("active", idx === activeIndex);
      });
      nodes[activeIndex].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", function () {
      var q = input.value.trim();
      if (q.length < 2) {
        close();
        return;
      }
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      render(runSearch(q), terms);
    });

    input.addEventListener("keydown", function (e) {
      if (!box.classList.contains("open")) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(activeIndex - 1);
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && current[activeIndex]) {
          e.preventDefault();
          location.href = current[activeIndex].p;
        }
      } else if (e.key === "Escape") {
        close();
        input.blur();
      }
    });

    input.addEventListener("focus", function () {
      if (input.value.trim().length >= 2 && current.length) box.classList.add("open");
    });

    document.addEventListener("click", function (e) {
      if (!box.contains(e.target) && e.target !== input) close();
    });

    // Keyboard shortcut: "/" focuses search
    document.addEventListener("keydown", function (e) {
      if (
        e.key === "/" &&
        document.activeElement !== input &&
        !/^(input|textarea|select)$/i.test(document.activeElement.tagName)
      ) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  document.addEventListener("ppl:chrome-ready", bind);
  if (document.readyState !== "loading") bind();
  document.addEventListener("DOMContentLoaded", bind);
})();
