/* ==========================================================================
   PPL Study Guide — highlight annotations + starring
   Select text → "Star" (quick, no note required) or "Note" → saved in
   localStorage (per page) and re-applied on every visit. Click a highlight to
   view / edit / delete it or toggle its star. A floating button lists the
   page's notes; all starred highlights are collected on starred.html.

   Highlights are stored as character offsets within the annotation root
   (.content / #main), robust to inline markup. If the page wording later
   changes and the offsets drift, the highlight is re-located by searching its
   saved text. The selection's rich HTML is stored too, so the Starred page can
   show each snippet with its original styling.
   ========================================================================== */
(function () {
  "use strict";

  var PAGE = location.pathname.split("/").pop() || "index.html";
  var KEY = "ppl-notes:" + PAGE;

  var root = null;
  var notes = [];
  var selbar = null;
  var popover = null;
  var fab = null;
  var panel = null;
  var pending = null; // {start, end, text, html, sec, rect}

  var ICON_COMMENT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.72 5.86 6.43.72-4.78 4.34 1.29 6.34L12 16.9l-5.66 2.96 1.29-6.34-4.78-4.34 6.43-.72z"/></svg>';

  /* ---------- storage ---------- */
  function loadNotes() {
    try {
      notes = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(notes)) notes = [];
    } catch (e) {
      notes = [];
    }
  }
  function saveNotes() {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes));
    } catch (e) {}
  }

  /* ---------- text-node model ---------- */
  function excluded(node) {
    var el = node.parentNode;
    while (el && el !== root) {
      if (el.nodeType === 1) {
        var tag = el.tagName.toLowerCase();
        if (tag === "svg" || tag === "script" || tag === "style") return true;
        if (el.classList && el.classList.contains("pager")) return true;
      }
      el = el.parentNode;
    }
    return false;
  }

  function textNodes() {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        return excluded(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var arr = [];
    var n;
    while ((n = walker.nextNode())) arr.push(n);
    return arr;
  }

  // global char offset of a (textNode, localOffset) within root; -1 if not found
  function globalOffset(node, local) {
    if (node.nodeType !== 3) return -1;
    var nodes = textNodes();
    var total = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] === node) return total + local;
      total += nodes[i].nodeValue.length;
    }
    return -1;
  }

  function rootPlainText() {
    return textNodes()
      .map(function (n) {
        return n.nodeValue;
      })
      .join("");
  }

  /* ---------- applying a highlight ---------- */
  function applyHighlight(start, end, id) {
    if (end <= start) return;
    var nodes = textNodes();
    var total = 0;
    var targets = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var len = node.nodeValue.length;
      var ns = total;
      var ne = total + len;
      total = ne;
      if (ne <= start || ns >= end) continue;
      var ls = Math.max(start, ns) - ns;
      var le = Math.min(end, ne) - ns;
      if (le > ls) targets.push({ node: node, ls: ls, le: le });
    }
    targets.forEach(function (t) {
      try {
        var r = document.createRange();
        r.setStart(t.node, t.ls);
        r.setEnd(t.node, t.le);
        var mark = document.createElement("mark");
        mark.className = "ppl-hl";
        mark.setAttribute("data-id", id);
        r.surroundContents(mark);
      } catch (e) {
        /* skip segments that can't be wrapped */
      }
    });
  }

  function unwrap(id) {
    var marks = root.querySelectorAll('mark.ppl-hl[data-id="' + id + '"]');
    marks.forEach(function (m) {
      var parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  // Add / remove the "important" styling on a highlight's mark segments. The ★
  // glyph is attached only to the last segment so multi-node highlights show one.
  function markStar(id, on) {
    var marks = root.querySelectorAll('mark.ppl-hl[data-id="' + id + '"]');
    marks.forEach(function (m, i) {
      m.classList.toggle("ppl-hl--star", !!on);
      m.classList.toggle("ppl-hl--star-end", !!on && i === marks.length - 1);
    });
  }

  // If the saved offsets no longer line up with the saved text (page wording
  // changed), re-find the highlight by searching for its saved text.
  function resolveOffsets(nt) {
    var full = rootPlainText();
    if (full.slice(nt.start, nt.end).trim() === nt.text) return true;
    if (nt.text && nt.text.length >= 2) {
      var idx = full.indexOf(nt.text);
      if (idx >= 0) {
        nt.start = idx;
        nt.end = idx + nt.text.length;
        nt._moved = true;
        return true;
      }
    }
    return false; // couldn't place on the page (still shown on the Starred page)
  }

  function renderAll() {
    var moved = false;
    notes.forEach(function (nt) {
      nt._ok = resolveOffsets(nt);
      if (nt._moved) {
        moved = true;
        delete nt._moved;
      }
    });
    if (moved) saveNotes();
    notes
      .slice()
      .sort(function (a, b) {
        return a.start - b.start;
      })
      .forEach(function (nt) {
        if (nt._ok === false) return;
        applyHighlight(nt.start, nt.end, nt.id);
        if (nt.important) markStar(nt.id, true);
      });
  }

  /* ---------- selection toolbar (Star + Note) ---------- */
  function hideSelbar() {
    if (selbar) selbar.style.display = "none";
  }
  function buildSelbar() {
    selbar = document.createElement("div");
    selbar.className = "ppl-selbar";
    var star = document.createElement("button");
    star.type = "button";
    star.className = "ppl-selbtn ppl-selbtn--star";
    star.innerHTML = ICON_STAR + "<span>Star</span>";
    var note = document.createElement("button");
    note.type = "button";
    note.className = "ppl-selbtn";
    note.innerHTML = ICON_COMMENT + "<span>Note</span>";
    [star, note].forEach(function (b) {
      b.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    star.addEventListener("click", function () {
      hideSelbar();
      if (pending) quickStar();
    });
    note.addEventListener("click", function () {
      var r = pending && pending.rect;
      hideSelbar();
      if (pending) openAddPopover(r);
    });
    selbar.appendChild(star);
    selbar.appendChild(note);
    document.body.appendChild(selbar);
  }
  function showSelbar(rect) {
    if (!selbar) buildSelbar();
    selbar.style.display = "inline-flex";
    selbar.style.left = rect.left + rect.width / 2 + "px";
    selbar.style.top = rect.top + "px";
  }

  /* ---------- note objects ---------- */
  function newId() {
    return "n" + Date.now() + Math.floor(Math.random() * 1000);
  }
  function makeNote(important, noteText) {
    return {
      id: newId(),
      start: pending.start,
      end: pending.end,
      text: pending.text,
      html: pending.html,
      sec: pending.sec || null,
      note: noteText || "",
      important: !!important,
      ts: Date.now(),
    };
  }
  function quickStar() {
    var nt = makeNote(true, "");
    notes.push(nt);
    saveNotes();
    applyHighlight(nt.start, nt.end, nt.id);
    markStar(nt.id, true);
    pending = null;
    clearSelection();
    updateFab();
  }

  /* ---------- popover ---------- */
  function closePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  function positionPopover(rect) {
    var pad = 8;
    var w = 300;
    var left = Math.min(Math.max(pad, rect.left), window.innerWidth - w - pad);
    var top = rect.bottom + 8;
    if (top + 200 > window.innerHeight) {
      top = Math.max(pad, rect.top - 210);
    }
    popover.style.left = left + "px";
    popover.style.top = top + "px";
  }

  function makePopover() {
    closePopover();
    popover = document.createElement("div");
    popover.className = "ppl-popover";
    popover.addEventListener("mousedown", function (e) {
      e.stopPropagation();
    });
    document.body.appendChild(popover);
    return popover;
  }

  function openAddPopover(rect) {
    var p = makePopover();
    p.innerHTML =
      '<div class="ppl-popover__quote"></div>' +
      '<textarea placeholder="Type your note (optional)…"></textarea>' +
      '<div class="ppl-popover__row">' +
      '<button class="ppl-btn ppl-spacer" data-act="star">☆ Star</button>' +
      '<button class="ppl-btn" data-act="cancel">Cancel</button>' +
      '<button class="ppl-btn ppl-btn--primary" data-act="save">Save</button>' +
      "</div>";
    p.querySelector(".ppl-popover__quote").textContent = pending.text;
    positionPopover(rect);
    var ta = p.querySelector("textarea");
    ta.focus();
    function commit(important) {
      var nt = makeNote(important, ta.value.trim());
      notes.push(nt);
      saveNotes();
      applyHighlight(nt.start, nt.end, nt.id);
      if (nt.important) markStar(nt.id, true);
      pending = null;
      closePopover();
      clearSelection();
      updateFab();
    }
    p.querySelector('[data-act="cancel"]').addEventListener("click", function () {
      pending = null;
      closePopover();
    });
    p.querySelector('[data-act="save"]').addEventListener("click", function () {
      commit(false);
    });
    p.querySelector('[data-act="star"]').addEventListener("click", function () {
      commit(true);
    });
  }

  function openViewPopover(markEl, note) {
    var p = makePopover();
    p.innerHTML =
      '<div class="ppl-popover__quote"></div>' +
      '<div class="ppl-popover__note"></div>' +
      '<div class="ppl-popover__row">' +
      '<button class="ppl-btn ppl-spacer" data-act="star"></button>' +
      '<button class="ppl-btn ppl-btn--danger" data-act="delete">Delete</button>' +
      '<button class="ppl-btn" data-act="edit">Edit</button>' +
      '<button class="ppl-btn ppl-btn--primary" data-act="close">Close</button>' +
      "</div>";
    p.querySelector(".ppl-popover__quote").textContent = note.text;
    var noteEl = p.querySelector(".ppl-popover__note");
    noteEl.textContent = note.note || "(highlight, no note)";
    if (!note.note) noteEl.style.color = "var(--text-muted)";
    var starBtn = p.querySelector('[data-act="star"]');
    starBtn.textContent = note.important ? "★ Starred" : "☆ Star";
    starBtn.classList.toggle("ppl-btn--star", note.important);
    positionPopover(markEl.getBoundingClientRect());

    p.querySelector('[data-act="close"]').addEventListener("click", closePopover);
    p.querySelector('[data-act="delete"]').addEventListener("click", function () {
      deleteNote(note.id);
      closePopover();
    });
    p.querySelector('[data-act="edit"]').addEventListener("click", function () {
      openEditPopover(markEl, note);
    });
    starBtn.addEventListener("click", function () {
      note.important = !note.important;
      saveNotes();
      markStar(note.id, note.important);
      starBtn.textContent = note.important ? "★ Starred" : "☆ Star";
      starBtn.classList.toggle("ppl-btn--star", note.important);
      updateFab();
    });
  }

  function openEditPopover(markEl, note) {
    var p = makePopover();
    p.innerHTML =
      '<div class="ppl-popover__quote"></div>' +
      "<textarea></textarea>" +
      '<div class="ppl-popover__row">' +
      '<button class="ppl-btn ppl-btn--danger ppl-spacer" data-act="delete">Delete</button>' +
      '<button class="ppl-btn" data-act="cancel">Cancel</button>' +
      '<button class="ppl-btn ppl-btn--primary" data-act="save">Save</button>' +
      "</div>";
    p.querySelector(".ppl-popover__quote").textContent = note.text;
    var ta = p.querySelector("textarea");
    ta.value = note.note || "";
    positionPopover(markEl.getBoundingClientRect());
    ta.focus();
    p.querySelector('[data-act="cancel"]').addEventListener("click", function () {
      openViewPopover(markEl, note);
    });
    p.querySelector('[data-act="delete"]').addEventListener("click", function () {
      deleteNote(note.id);
      closePopover();
    });
    p.querySelector('[data-act="save"]').addEventListener("click", function () {
      note.note = ta.value.trim();
      saveNotes();
      closePopover();
      updateFab();
    });
  }

  function deleteNote(id) {
    notes = notes.filter(function (n) {
      return n.id !== id;
    });
    saveNotes();
    unwrap(id);
    updateFab();
    renderPanelList();
  }

  /* ---------- selection handling ---------- */
  function clearSelection() {
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function rangeHtml(range) {
    var d = document.createElement("div");
    d.appendChild(range.cloneContents());
    return d.innerHTML;
  }

  function nearestSection(node) {
    var el = node && node.nodeType === 1 ? node : node ? node.parentNode : null;
    while (el && el !== root) {
      if (el.nodeType === 1 && el.classList && el.classList.contains("section") && el.id) {
        return el.id;
      }
      el = el.parentNode;
    }
    return null;
  }

  function onSelect() {
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        hideSelbar();
        return;
      }
      var range = sel.getRangeAt(0);
      var text = sel.toString().trim();
      if (text.length < 2) {
        hideSelbar();
        return;
      }
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        hideSelbar();
        return;
      }
      if (excluded(range.startContainer) || excluded(range.endContainer)) {
        hideSelbar();
        return;
      }
      var start = globalOffset(range.startContainer, range.startOffset);
      var end = globalOffset(range.endContainer, range.endOffset);
      if (start < 0 || end < 0 || end <= start) {
        hideSelbar();
        return;
      }
      var rect = range.getBoundingClientRect();
      pending = {
        start: start,
        end: end,
        text: text,
        html: rangeHtml(range),
        sec: nearestSection(range.commonAncestorContainer),
        rect: rect,
      };
      showSelbar(rect);
    }, 10);
  }

  /* ---------- floating button + panel ---------- */
  function buildFab() {
    fab = document.createElement("button");
    fab.className = "ppl-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Show notes on this page");
    fab.innerHTML =
      ICON_COMMENT +
      '<span class="ppl-fab__label">Notes</span>' +
      '<span class="ppl-fab__count" data-count="0">0</span>';
    fab.addEventListener("click", function () {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) renderPanelList();
    });
    document.body.appendChild(fab);

    panel = document.createElement("div");
    panel.className = "ppl-panel";
    panel.innerHTML =
      '<div class="ppl-panel__head"><h3>Notes on this page</h3>' +
      '<span class="ppl-panel__actions">' +
      '<a class="ppl-btn" href="starred.html">★ Starred</a>' +
      '<button class="ppl-btn" data-act="close">Close</button></span></div>' +
      '<div class="ppl-panel__list"></div>';
    panel.querySelector('[data-act="close"]').addEventListener("click", function () {
      panel.classList.remove("open");
    });
    document.body.appendChild(panel);
    updateFab();
  }

  function updateFab() {
    if (!fab) return;
    var c = notes.length;
    var badge = fab.querySelector(".ppl-fab__count");
    badge.textContent = c;
    badge.setAttribute("data-count", c);
    if (panel && panel.classList.contains("open")) renderPanelList();
  }

  function renderPanelList() {
    var list = panel.querySelector(".ppl-panel__list");
    if (!notes.length) {
      list.innerHTML =
        '<div class="ppl-panel__empty">No notes yet.<br>Select any text in the page, then <strong>Star</strong> it or add a note.</div>';
      return;
    }
    var sorted = notes.slice().sort(function (a, b) {
      return a.start - b.start;
    });
    list.innerHTML = "";
    sorted.forEach(function (nt) {
      var item = document.createElement("div");
      item.className = "ppl-note-item";
      item.innerHTML =
        '<div class="ppl-note-item__quote"></div><div class="ppl-note-item__note"></div>';
      var q = item.querySelector(".ppl-note-item__quote");
      var prefix = nt.important ? "★ " : "";
      if (nt.html) {
        q.innerHTML = prefix + nt.html;
      } else {
        q.textContent = prefix + nt.text;
      }
      item.querySelector(".ppl-note-item__note").textContent = nt.note || "";
      item.addEventListener("click", function () {
        var mark = root.querySelector('mark.ppl-hl[data-id="' + nt.id + '"]');
        if (mark) {
          mark.scrollIntoView({ behavior: "smooth", block: "center" });
          flash(nt.id);
          panel.classList.remove("open");
        }
      });
      list.appendChild(item);
    });
  }

  function flash(id) {
    var marks = root.querySelectorAll('mark.ppl-hl[data-id="' + id + '"]');
    marks.forEach(function (m) {
      m.classList.add("ppl-hl--active");
    });
    setTimeout(function () {
      marks.forEach(function (m) {
        m.classList.remove("ppl-hl--active");
      });
    }, 1600);
  }

  /* ---------- global listeners ---------- */
  function onMarkClick(e) {
    var mark = e.target.closest ? e.target.closest("mark.ppl-hl") : null;
    if (!mark || !root.contains(mark)) return;
    var id = mark.getAttribute("data-id");
    var note = notes.find(function (n) {
      return n.id === id;
    });
    if (note) {
      e.preventDefault();
      openViewPopover(mark, note);
    }
  }

  function onDocMouseDown(e) {
    if (popover && !popover.contains(e.target)) closePopover();
    if (selbar && selbar.style.display !== "none" && !selbar.contains(e.target)) {
      hideSelbar();
    }
    if (
      panel &&
      panel.classList.contains("open") &&
      !panel.contains(e.target) &&
      e.target !== fab &&
      !(fab && fab.contains(e.target))
    ) {
      panel.classList.remove("open");
    }
  }

  /* ---------- init ---------- */
  function init() {
    // Skip pages whose body content changes after load, and the Starred page
    // (which renders its own aggregated view).
    if (PAGE === "flashcards.html" || PAGE === "starred.html") return;
    root = document.querySelector(".content") || document.getElementById("main");
    if (!root) return;
    loadNotes();
    renderAll();
    buildFab();

    document.addEventListener("mouseup", onSelect);
    document.addEventListener("keyup", function (e) {
      if (e.shiftKey || e.key === "Shift") onSelect();
    });
    document.addEventListener("click", onMarkClick);
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("scroll", hideSelbar, true);
    window.addEventListener("resize", hideSelbar);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closePopover();
        hideSelbar();
        if (panel) panel.classList.remove("open");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
