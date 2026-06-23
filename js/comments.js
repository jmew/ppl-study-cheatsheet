/* ==========================================================================
   PPL Study Guide — highlight-to-comment annotations
   Select text in the page body → "Add note" → highlight is saved with your
   comment in localStorage (per page) and re-applied on every visit.
   Click a highlight to view / edit / delete it. A floating button lists all
   notes on the page.

   Highlights are stored as character offsets within the annotation root
   (.content or #main), which is robust to inline markup (bold, links) because
   wrapping text never changes the underlying text content.
   ========================================================================== */
(function () {
  "use strict";

  var PAGE = location.pathname.split("/").pop() || "index.html";
  var KEY = "ppl-notes:" + PAGE;

  var root = null;
  var notes = [];
  var addBtn = null;
  var popover = null;
  var fab = null;
  var panel = null;
  var pending = null; // {start, end, text}

  var ICON_COMMENT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

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

  function renderAll() {
    notes
      .slice()
      .sort(function (a, b) {
        return a.start - b.start;
      })
      .forEach(function (nt) {
        applyHighlight(nt.start, nt.end, nt.id);
      });
  }

  /* ---------- UI: add button ---------- */
  function hideAddBtn() {
    if (addBtn) addBtn.style.display = "none";
  }
  function showAddBtn(rect) {
    if (!addBtn) {
      addBtn = document.createElement("button");
      addBtn.className = "ppl-addbtn";
      addBtn.type = "button";
      addBtn.innerHTML = ICON_COMMENT + "Add note";
      addBtn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
      addBtn.addEventListener("click", function () {
        hideAddBtn();
        if (pending) openAddPopover(pending.rect);
      });
      document.body.appendChild(addBtn);
    }
    addBtn.style.display = "inline-flex";
    addBtn.style.left = rect.left + rect.width / 2 + "px";
    addBtn.style.top = rect.top + "px";
  }

  /* ---------- UI: popover ---------- */
  function closePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  function positionPopover(rect) {
    var pad = 8;
    var w = 300;
    var left = Math.min(
      Math.max(pad, rect.left),
      window.innerWidth - w - pad
    );
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
      '<textarea placeholder="Type your note…"></textarea>' +
      '<div class="ppl-popover__row">' +
      '<button class="ppl-btn" data-act="cancel">Cancel</button>' +
      '<button class="ppl-btn ppl-btn--primary" data-act="save">Save note</button>' +
      "</div>";
    p.querySelector(".ppl-popover__quote").textContent = pending.text;
    positionPopover(rect);
    var ta = p.querySelector("textarea");
    ta.focus();
    p.querySelector('[data-act="cancel"]').addEventListener("click", function () {
      pending = null;
      closePopover();
    });
    p.querySelector('[data-act="save"]').addEventListener("click", function () {
      var nt = {
        id: "n" + Date.now() + Math.floor(Math.random() * 1000),
        start: pending.start,
        end: pending.end,
        text: pending.text,
        note: ta.value.trim(),
        ts: Date.now(),
      };
      notes.push(nt);
      saveNotes();
      applyHighlight(nt.start, nt.end, nt.id);
      pending = null;
      closePopover();
      clearSelection();
      updateFab();
    });
  }

  function openViewPopover(markEl, note) {
    var p = makePopover();
    p.innerHTML =
      '<div class="ppl-popover__quote"></div>' +
      '<div class="ppl-popover__note"></div>' +
      '<div class="ppl-popover__row">' +
      '<button class="ppl-btn ppl-btn--danger ppl-spacer" data-act="delete">Delete</button>' +
      '<button class="ppl-btn" data-act="edit">Edit</button>' +
      '<button class="ppl-btn ppl-btn--primary" data-act="close">Close</button>' +
      "</div>";
    p.querySelector(".ppl-popover__quote").textContent = note.text;
    var noteEl = p.querySelector(".ppl-popover__note");
    noteEl.textContent = note.note || "(highlight, no note)";
    if (!note.note) noteEl.style.color = "var(--text-muted)";
    positionPopover(markEl.getBoundingClientRect());

    p.querySelector('[data-act="close"]').addEventListener("click", closePopover);
    p.querySelector('[data-act="delete"]').addEventListener("click", function () {
      deleteNote(note.id);
      closePopover();
    });
    p.querySelector('[data-act="edit"]').addEventListener("click", function () {
      openEditPopover(markEl, note);
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

  function onSelect() {
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        hideAddBtn();
        return;
      }
      var range = sel.getRangeAt(0);
      var text = sel.toString().trim();
      if (text.length < 2) {
        hideAddBtn();
        return;
      }
      // must be entirely within the annotation root
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        hideAddBtn();
        return;
      }
      // don't annotate inside an existing highlight or a diagram
      if (excluded(range.startContainer) || excluded(range.endContainer)) {
        hideAddBtn();
        return;
      }
      var start = globalOffset(range.startContainer, range.startOffset);
      var end = globalOffset(range.endContainer, range.endOffset);
      if (start < 0 || end < 0 || end <= start) {
        hideAddBtn();
        return;
      }
      var rect = range.getBoundingClientRect();
      pending = { start: start, end: end, text: text, rect: rect };
      showAddBtn(rect);
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
      '<button class="ppl-btn" data-act="close">Close</button></div>' +
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
        '<div class="ppl-panel__empty">No notes yet.<br>Select any text in the page to add one.</div>';
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
      item.querySelector(".ppl-note-item__quote").textContent = nt.text;
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
  // open the view popover when a highlight is clicked
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

  // dismiss popover / add-button / panel when interacting elsewhere
  function onDocMouseDown(e) {
    if (popover && !popover.contains(e.target)) closePopover();
    if (addBtn && addBtn.style.display !== "none" && !addBtn.contains(e.target)) {
      hideAddBtn();
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
    // Skip pages whose body content changes after load (offsets wouldn't be stable)
    if (PAGE === "flashcards.html") return;
    root = document.querySelector(".content") || document.getElementById("main");
    if (!root) return;
    loadNotes();
    renderAll();
    buildFab();

    document.addEventListener("mouseup", onSelect);
    document.addEventListener("keyup", function (e) {
      // support keyboard text selection (shift+arrows)
      if (e.shiftKey || e.key === "Shift") onSelect();
    });
    document.addEventListener("click", onMarkClick);
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("scroll", hideAddBtn, true);
    window.addEventListener("resize", hideAddBtn);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closePopover();
        hideAddBtn();
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
