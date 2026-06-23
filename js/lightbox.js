/* ==========================================================================
   PPL Study Guide — image lightbox
   Click any diagram image to view it full-screen. Close with the × button,
   a click on the backdrop, or the Escape key.
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    var overlay = document.createElement("div");
    overlay.className = "ppl-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<button class="ppl-lightbox__close" type="button" aria-label="Close image">\u00d7</button>' +
      '<img alt="" />';
    document.body.appendChild(overlay);

    var img = overlay.querySelector("img");
    var closeBtn = overlay.querySelector(".ppl-lightbox__close");

    function open(src, alt) {
      img.src = src;
      img.alt = alt || "";
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      overlay.classList.remove("open");
      img.removeAttribute("src");
      document.body.style.overflow = "";
    }

    // open when a diagram image is clicked
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.tagName === "IMG" && t.closest && t.closest("figure.diagram")) {
        e.preventDefault();
        open(t.currentSrc || t.src, t.alt);
      }
    });

    // close on backdrop / button click
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === closeBtn || e.target === img) {
        close();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
