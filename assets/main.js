/* House of Amrut — site script. No dependencies. */
(function () {
  "use strict";

  // Where reservation requests go.
  // SHEET_URL: the Google Apps Script web-app URL (see apps-script/README.md). Each request is
  //   saved as a row in the Google Sheet and emailed to you. Paste the URL between the quotes.
  // CMS_URL: the old Strapi CMS. Turned off. To use it again, put its address back here
  //   ("https://house-of-amrut-cms.onrender.com") AND add that address to connect-src in vercel.json.
  // If both are set, both are used and the guest sees "sent" if at least one of them saves the request.
  var SHEET_URL = "";
  var CMS_URL = "";

  // Opening hours used to build the date and time pickers.
  var CLOSED_DAYS = [0, 1, 2, 3];  // 0 = Sunday … 6 = Saturday. Open Thursday to Saturday.
  var FIRST_SEATING = 19 * 60;    // 7:00 PM, minutes after midnight
  var LAST_SEATING = 25 * 60;     // 1:00 AM (the house closes at 2 AM)
  var DAYS_SHOWN = 9;             // three weeks of open nights

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header turns solid once you leave the hero */
  var header = $("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-solid", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile menu */
  var menu = $("#mobile-menu"), openBtn = $("[data-menu-open]"), closeBtn = $("[data-menu-close]");
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    openBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    (open ? closeBtn : openBtn).focus();
  }
  if (openBtn) openBtn.addEventListener("click", function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && !menu.hidden) setMenu(false); });

  /* Home hero. The lines appear in step with the pour.
     When the bottle is set down the text fades, the scene dims and the logo drifts in, with the Enter button beneath it. After the
     video ends the logo holds, then fades as the scene goes to black; the video restarts under the
     black and fades back up. The script runs the loop itself so there is never a hard cut. */
  var hero = $(".home-hero"), heroVideo = $(".hero-video"), heroCopy = $("[data-hero-copy]"), heroLines = $("[data-hero-lines]");
  var BOTTLE_DOWN_AT = 11.4; // seconds into the video: text out, logo in
  var LOGO_HOLD = 2200;      // ms the logo stays after the video's last frame
  var TO_BLACK = 2800;       // ms for the logo and scene to fade to black
  if (hero && heroVideo && heroCopy && heroLines && !reduceMotion) {
    var timed = $$(".hero-timed", heroCopy), endBtn = $(".endframe-btn", hero), started = false, ending = false;
    heroVideo.loop = false;
    function sync(t) {
      timed.forEach(function (l) { l.classList.toggle("is-on", t >= +l.dataset.from && t < +l.dataset.to); });
      var end = t >= BOTTLE_DOWN_AT;
      heroCopy.classList.toggle("is-gone", end);
      if (end && !hero.classList.contains("is-end")) { hero.classList.add("is-end"); endBtn.tabIndex = 0; }
    }
    // Take over straight away so the two lines never show together, even for a moment.
    heroCopy.classList.add("is-timed");
    sync(0);
    heroVideo.addEventListener("timeupdate", function () {
      started = true;
      if (!ending) sync(heroVideo.currentTime);
    });
    // If the video can't play (data saver, low-power mode), fall back to both lines and the button.
    setTimeout(function () {
      if (!started && heroVideo.paused) heroCopy.classList.remove("is-timed");
    }, 3500);
    heroVideo.addEventListener("ended", function () {
      if (ending) return;
      ending = true;
      setTimeout(function () {
        hero.classList.add("is-out");                 // logo drifts away, scene to black
        setTimeout(function () {
          hero.classList.add("is-reset");             // put the logo back in its start pose, unseen
          hero.classList.remove("is-end"); endBtn.tabIndex = -1;
          heroVideo.currentTime = 0;
          var p = heroVideo.play(); if (p && p.catch) p.catch(function () {});
          sync(0);
          requestAnimationFrame(function () { requestAnimationFrame(function () {
            hero.classList.remove("is-out", "is-reset"); // fade up from black into the empty glass
            ending = false;
          }); });
        }, TO_BLACK);
      }, LOGO_HOLD);
    });
  }

  /* Photos surface out of the dark as they come into view */
  var shades = $$(".shade");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-seen"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    shades.forEach(function (s) { io.observe(s); });
  } else {
    shades.forEach(function (s) { s.classList.add("is-seen"); });
  }

  /* The candle: a glow that follows the pointer and reveals the photo.
     On touch screens and with reduced motion it drifts slowly on its own (or stays put). */
  $$("[data-candle]").forEach(function (el) {
    var tx = 50, ty = 55, x = 50, y = 55, raf = null, t0 = performance.now(), pointer = false;
    function frame(now) {
      if (!pointer) {
        var t = (now - t0) / 1000;
        tx = 50 + Math.sin(t * 0.23) * 18;
        ty = 52 + Math.sin(t * 0.31 + 1) * 12;
      }
      x += (tx - x) * 0.07; y += (ty - y) * 0.07;
      var flicker = 34 + Math.sin(now / 170) * 0.6 + Math.sin(now / 53) * 0.4;
      el.style.setProperty("--x", x.toFixed(2) + "%");
      el.style.setProperty("--y", y.toFixed(2) + "%");
      el.style.setProperty("--r", flicker.toFixed(2) + "vmax");
      raf = requestAnimationFrame(frame);
    }
    if (reduceMotion) return;
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var r = el.getBoundingClientRect();
      pointer = true;
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
    });
    el.addEventListener("pointerleave", function () { pointer = false; t0 = performance.now(); });
    var vis = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(frame); }
      else if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
    vis.observe(el);
  });

  /* Interior gallery filter (The House) */
  var gallery = $("[data-gallery]");
  if (gallery) {
    var gChips = $$("[data-filter]");
    gChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        gChips.forEach(function (c) { var on = c === chip; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on)); });
        $$(".gallery-tile", gallery).forEach(function (t) { t.hidden = f !== "all" && t.getAttribute("data-cat") !== f; });
      });
    });
  }

  /* Tasting room tabs */
  var tablist = $("[data-tabs]");
  if (tablist) {
    var tabs = $$("[role=tab]", tablist);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
      history.replaceState(null, "", "#" + tab.id.replace("tab-", ""));
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    var fromHash = location.hash && document.getElementById("tab-" + location.hash.slice(1));
    if (fromHash) select(fromHash);
  }

  /* Library: search, filter, bottle details */
  var bottles = $("[data-bottles]");
  if (bottles) {
    var modal = $("[data-modal]");
    $$("button.bottle-btn", bottles).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var d = JSON.parse(btn.getAttribute("data-bottle"));
        $("[data-m-img]", modal).src = d.img;
        $("[data-m-year]", modal).textContent = d.year;
        $("[data-m-name]", modal).textContent = d.name;
        $("[data-m-cask]", modal).textContent = d.cask;
        drawRadar($("[data-m-radar]", modal), d.profile);
        if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
      });
    });
    $("[data-m-close]", modal).addEventListener("click", function () { modal.close(); });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); });
  }

  function drawRadar(svg, vals) {
    var labels = ["Sweetness", "Smoke", "Spice", "Fruit", "Oak"];
    var cx = 110, cy = 104, R = 64, n = 5, ns = "http://www.w3.org/2000/svg";
    svg.innerHTML = "";
    svg.setAttribute("aria-label", "Tasting profile: " + labels.map(function (l, i) { return l + " " + Math.round(vals[i] * 10) + " of 10"; }).join(", "));
    function pt(i, r) { var a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    function el(tag, attrs) { var e = document.createElementNS(ns, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      el("polygon", { points: labels.map(function (_, i) { return pt(i, R * f).join(","); }).join(" "), fill: "none", stroke: "currentColor", "stroke-opacity": ".18" });
    });
    labels.forEach(function (l, i) {
      var p = pt(i, R); el("line", { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: "currentColor", "stroke-opacity": ".18" });
      var t = pt(i, R + 18), txt = el("text", { x: t[0], y: t[1], "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "8", fill: "currentColor", "fill-opacity": ".75", style: "font-family:Cinzel,serif;letter-spacing:.1em" });
      txt.textContent = l.toUpperCase();
    });
    el("polygon", { points: vals.map(function (v, i) { return pt(i, R * v).join(","); }).join(" "), fill: "currentColor", "fill-opacity": ".14", stroke: "currentColor", "stroke-width": "1" });
  }

  /* Reservation form */
  var form = $("[data-reserve]");
  if (form) {
    var datesEl = $("[data-dates]"), dateVal = $("[data-date-value]"), timeSel = $("[data-times]"), msg = $("[data-msg]");
    var wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    function label(m) { var h = Math.floor(m / 60) % 24, mm = m % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12; return h12 + ":" + String(mm).padStart(2, "0") + " " + ap; }

    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()), made = 0;
    if (nowMin > LAST_SEATING - 60) d.setDate(d.getDate() + 1); // too late to book tonight
    while (made < DAYS_SHOWN) {
      if (CLOSED_DAYS.indexOf(d.getDay()) === -1) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "date"; b.setAttribute("aria-pressed", "false");
        b.dataset.date = iso(d);
        b.dataset.today = String(iso(d) === iso(now));
        b.innerHTML = "<span>" + wd[d.getDay()] + "</span><strong>" + d.getDate() + "</strong><span>" + mo[d.getMonth()] + "</span>";
        b.setAttribute("aria-label", wd[d.getDay()] + " " + d.getDate() + " " + mo[d.getMonth()]);
        datesEl.appendChild(b); made++;
      }
      d.setDate(d.getDate() + 1);
    }
    function fillTimes(isToday) {
      var keep = timeSel.value;
      timeSel.innerHTML = '<option value="">Select</option>';
      for (var m = FIRST_SEATING; m <= LAST_SEATING; m += 30) {
        if (isToday && m < nowMin + 60) continue;
        var o = document.createElement("option"); o.value = label(m); o.textContent = label(m); timeSel.appendChild(o);
      }
      timeSel.value = keep; if (timeSel.value !== keep) timeSel.value = "";
    }
    fillTimes(false);
    datesEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".date"); if (!btn) return;
      $$(".date", datesEl).forEach(function (x) { x.setAttribute("aria-pressed", String(x === btn)); });
      dateVal.value = btn.dataset.date;
      fillTimes(btn.dataset.today === "true");
      datesEl.closest(".field").classList.remove("is-invalid");
    });

    // Pre-select the experience when arriving from an "Enquire" link
    var exp = new URLSearchParams(location.search).get("experience");
    if (exp) { var sel = $("[data-experience]"); sel.value = exp; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.textContent = ""; msg.classList.remove("is-error");
      var missing = [];
      [["name", "your name"], ["email", "an email"], ["party", "party size"], ["date", "a date"], ["time", "a time"]].forEach(function (f) {
        var input = form.elements[f[0]];
        var bad = !input.value || (f[0] === "email" && !/^\S+@\S+\.\S+$/.test(input.value));
        var field = f[0] === "date" ? datesEl.closest(".field") : input.closest(".field");
        field.classList.toggle("is-invalid", bad);
        if (bad) missing.push(f[1]);
      });
      if (missing.length) {
        msg.textContent = "Add " + missing.join(", ") + " to send your request.";
        msg.classList.add("is-error");
        return;
      }
      var btn = form.querySelector("[type=submit]");
      btn.disabled = true; btn.textContent = "Sending…";
      var payload = {
        name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(),
        partySize: form.elements.party.value, date: form.elements.date.value, time: form.elements.time.value,
        experience: form.elements.experience.value, notes: form.elements.notes.value.trim(),
        website: form.elements.website.value // hidden trap field; real guests leave it empty
      };
      // Send to every destination that's set up, at the same time.
      // The guest sees "sent" if at least one of them saved the request.
      var sends = [];
      if (SHEET_URL) {
        // text/plain keeps this a "simple" request, which Google Apps Script accepts from any site.
        sends.push(fetch(SHEET_URL, {
          method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload)
        }).then(function (r) { return r.json(); }).then(function (res) {
          if (!res || !res.ok) throw new Error((res && res.error) || "sheet failed");
        }));
      }
      if (CMS_URL) {
        var cmsData = Object.assign({}, payload); delete cmsData.website;
        sends.push(fetch(CMS_URL + "/api/reservations", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: cmsData })
        }).then(function (r) { if (!r.ok) throw new Error("cms " + r.status); }));
      }
      var oneSaved = new Promise(function (resolve, reject) {
        if (!sends.length) return reject(new Error("No destination set"));
        var failed = 0;
        sends.forEach(function (p) {
          p.then(resolve, function () { if (++failed === sends.length) reject(new Error("All destinations failed")); });
        });
      });
      oneSaved.then(function () {
        form.reset(); dateVal.value = "";
        $$(".date", datesEl).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        msg.textContent = "Request sent. We will be in touch to confirm your table.";
      }).catch(function () {
        msg.textContent = "Your request didn't go through. Try again, or message @houseofamrut on Instagram.";
        msg.classList.add("is-error");
      }).then(function () { btn.disabled = false; btn.textContent = "Send Reservation Request"; });
    });
  }
})();
