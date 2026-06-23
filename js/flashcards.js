/* ==========================================================================
   PPL Study Guide — flashcards
   Drives flashcards.html from PPL_DATA.flashcards: topic filter, shuffle,
   flip, prev/next, keyboard control.
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    var all = (window.PPL_DATA && window.PPL_DATA.flashcards) || [];
    var card = document.getElementById("fc-card");
    if (!card) return;

    var elTopic = document.getElementById("fc-topic");
    var elShuffle = document.getElementById("fc-shuffle");
    var elReset = document.getElementById("fc-reset");
    var elPrev = document.getElementById("fc-prev");
    var elNext = document.getElementById("fc-next");
    var elQ = document.getElementById("fc-q");
    var elA = document.getElementById("fc-a");
    var elTag = document.getElementById("fc-tag");
    var elProgress = document.getElementById("fc-progress");
    var elCounter = document.getElementById("fc-counter");

    var deck = all.slice();
    var idx = 0;
    var shuffled = false;

    // Populate topic dropdown
    var topics = [];
    all.forEach(function (c) {
      if (topics.indexOf(c.topic) < 0) topics.push(c.topic);
    });
    topics.sort();
    var opts = ['<option value="__all">All topics (' + all.length + ")</option>"];
    topics.forEach(function (t) {
      var n = all.filter(function (c) {
        return c.topic === t;
      }).length;
      opts.push('<option value="' + t + '">' + t + " (" + n + ")</option>");
    });
    elTopic.innerHTML = opts.join("");

    function shuffleArray(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    }

    function rebuild() {
      var topic = elTopic.value;
      deck = all.filter(function (c) {
        return topic === "__all" || c.topic === topic;
      });
      if (shuffled) shuffleArray(deck);
      idx = 0;
      render();
    }

    function setFlipped(state) {
      card.classList.toggle("flipped", state);
      card.setAttribute("aria-pressed", String(state));
    }

    function render() {
      setFlipped(false);
      if (!deck.length) {
        elQ.textContent = "No cards.";
        elA.textContent = "";
        elTag.textContent = "";
        elProgress.textContent = "0 / 0";
        return;
      }
      var c = deck[idx];
      elTag.textContent = c.topic;
      elQ.textContent = c.q;
      elA.textContent = c.a;
      elProgress.textContent = idx + 1 + " / " + deck.length;
      elCounter.textContent = deck.length + " card" + (deck.length === 1 ? "" : "s");
    }

    function flip() {
      setFlipped(!card.classList.contains("flipped"));
    }
    function next() {
      if (!deck.length) return;
      idx = (idx + 1) % deck.length;
      render();
    }
    function prev() {
      if (!deck.length) return;
      idx = (idx - 1 + deck.length) % deck.length;
      render();
    }

    // Events
    card.addEventListener("click", flip);
    card.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
    });
    elNext.addEventListener("click", next);
    elPrev.addEventListener("click", prev);
    elTopic.addEventListener("change", rebuild);
    elShuffle.addEventListener("click", function () {
      shuffled = true;
      shuffleArray(deck);
      idx = 0;
      render();
    });
    elReset.addEventListener("click", function () {
      shuffled = false;
      rebuild();
    });

    // Global keyboard (ignore when typing in the search box)
    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (/^(input|textarea|select)$/i.test(tag)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " " && document.activeElement !== card) {
        e.preventDefault();
        flip();
      }
    });

    rebuild();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
