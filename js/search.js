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

  // Choose the snippet to show. Normally the curated summary, but if the match
  // came from the diagram/image caption (not the summary), show an excerpt of
  // that caption so the result makes sense.
  function snippetFor(item, terms) {
    var s = item.s || "";
    var sl = s.toLowerCase();
    if (terms.every(function (t) { return sl.indexOf(t) >= 0; })) return s;
    var cap = item.cap || "";
    if (!cap) return s;
    var capl = cap.toLowerCase();
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      pos = capl.indexOf(terms[i]);
      if (pos >= 0) break;
    }
    if (pos < 0) return s;
    var start = Math.max(0, pos - 35);
    if (start > 0) {
      var sp = cap.indexOf(" ", start); // snap forward to a word boundary
      if (sp >= 0 && sp < pos) start = sp + 1;
    }
    var end = Math.min(cap.length, start + 130);
    if (end < cap.length) {
      var sp2 = cap.lastIndexOf(" ", end); // snap back to a word boundary
      if (sp2 > pos) end = sp2;
    }
    return (start > 0 ? "… " : "") + cap.slice(start, end).trim() + (end < cap.length ? " …" : "");
  }

  // --- Typo tolerance --------------------------------------------------
  // How many single-character edits a term may be "off" and still match a
  // word. Short terms must be exact (fuzzing them gives false positives).
  function maxEdits(term) {
    if (term.length <= 3) return 0;
    if (term.length <= 5) return 1;
    return 2;
  }

  // Bounded Levenshtein distance: bails out early (returning max + 1) once a
  // whole row exceeds the budget, so it stays cheap.
  function boundedLev(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    if (la === 0) return lb;
    if (lb === 0) return la;
    var prev = [], curr = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      curr[0] = i;
      var rowMin = curr[0];
      var ac = a.charCodeAt(i - 1);
      for (j = 1; j <= lb; j++) {
        var cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        curr[j] = v;
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      for (j = 0; j <= lb; j++) prev[j] = curr[j];
    }
    return prev[lb];
  }

  // True if any whole word in the haystack is within the term's edit budget.
  function fuzzyWordHit(term, words, max) {
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w || Math.abs(w.length - term.length) > max) continue;
      if (boundedLev(term, w, max) <= max) return true;
    }
    return false;
  }

  // Score one item against all terms. Each term must match (exact substring,
  // or — when allowFuzzy — within its edit budget of an indexed word).
  // Returns the score, or null if any term fails to match.
  function matchItem(item, terms, allowFuzzy) {
    var title = item.t.toLowerCase();
    var topic = item.topic.toLowerCase();
    var keys = item.k.toLowerCase();
    var snip = item.s.toLowerCase();
    var cap = (item.cap || "").toLowerCase();
    var hay = title + " " + topic + " " + keys + " " + snip + " " + cap;
    var words = null; // lazily tokenized, only when a fuzzy fallback is needed
    var score = 0;
    for (var ti = 0; ti < terms.length; ti++) {
      var t = terms[ti];
      // Exact substring match (preferred) — original field weighting.
      var exact = false;
      if (title.indexOf(t) === 0) { score += 6; exact = true; }
      if (title.indexOf(t) >= 0) { score += 10; exact = true; }
      if (topic.indexOf(t) >= 0) { score += 4; exact = true; }
      if (keys.indexOf(t) >= 0) { score += 3; exact = true; }
      if (cap.indexOf(t) >= 0) { score += 2; exact = true; }
      if (snip.indexOf(t) >= 0) { score += 1; exact = true; }
      if (exact) continue;
      if (allowFuzzy) {
        var max = maxEdits(t);
        if (max > 0) {
          if (words === null) words = hay.split(/[^a-z0-9]+/);
          if (fuzzyWordHit(t, words, max)) { score += 1; continue; }
        }
      }
      return null; // this term didn't match
    }
    return score;
  }

  function runSearch(q) {
    var data = (window.PPL_DATA && window.PPL_DATA.searchIndex) || [];
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    function pass(allowFuzzy) {
      var scored = [];
      data.forEach(function (item) {
        var s = matchItem(item, terms, allowFuzzy);
        if (s !== null) scored.push({ item: item, score: s });
      });
      return scored;
    }
    // Exact first (fast, precise); only fall back to typo-tolerant matching
    // when an exact search finds nothing — so good queries stay noise-free.
    var scored = pass(false);
    if (!scored.length) scored = pass(true);
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
            highlight(snippetFor(it, terms), terms) +
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
