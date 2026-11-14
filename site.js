(function(){
  "use strict";
  var root = document.documentElement;
  var TOUCH = root.classList.contains("is-touch");
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- images: reveal only after decode (never pop in half-drawn) ----------
  document.querySelectorAll("img[data-fade]").forEach(function(img){
    function show(){ img.classList.add("in"); }
    if (img.complete && img.naturalWidth) { show(); return; }
    img.addEventListener("load", function(){ (img.decode ? img.decode().catch(function(){}) : Promise.resolve()).then(show); }, {once:true});
    img.addEventListener("error", show, {once:true});
  });

  // one-time "on enter" helper (IntersectionObserver: cheap, no scroll listeners)
  function onEnter(el, fn, margin){
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { io.disconnect(); fn(); } }); }, {rootMargin: margin || "0px 0px -12% 0px"});
    io.observe(el);
  }

  // ---------- frame sequence (the device opening) ----------
  var peak = document.querySelector(".peak");
  var canvas = peak && peak.querySelector(".peak__canvas");
  var ctx = canvas && canvas.getContext("2d", {alpha:false});
  var caps = peak ? peak.querySelectorAll(".peak__caps p") : [];
  var N = 145, frames = [], ready = [], shown = -1;
  function src(i){ return "assets/peak/" + String(i).padStart(3,"0") + ".webp"; }
  function sizeCanvas(){
    var r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; shown = -1; }
  }
  function nearest(i){
    if (ready[i]) return i;
    for (var k = 1; k < N; k++){ if (i-k >= 0 && ready[i-k]) return i-k; if (i+k < N && ready[i+k]) return i+k; }
    return -1;
  }
  function draw(i){
    var j = nearest(i); if (j < 0 || j === shown) return;
    shown = j;
    ctx.drawImage(frames[j], 0, 0, canvas.width, canvas.height);
    if (!peak.classList.contains("is-seq")) peak.classList.add("is-seq");
  }
  function setCap(a){ for (var i = 0; i < caps.length; i++) caps[i].classList.toggle("on", i === a); }
  // load + decode frames [0..last], every `step`, calling done() when all are decoded
  function preload(last, step, done){
    var list = []; for (var i = 0; i <= last; i += step) list.push(i);
    var left = list.length, k = 0;
    function one(i){
      var im = new Image(); frames[i] = im;
      im.src = src(i);
      (im.decode ? im.decode() : new Promise(function(r){ im.onload = r; })).then(function(){ ready[i] = true; }, function(){}).then(function(){
        if (--left === 0 && done) done();
        if (k < list.length) one(list[k++]);
      });
    }
    for (var c = 0; c < 4 && k < list.length; c++) one(list[k++]);
  }

  if (!window.gsap) return; // everything is visible and readable without the animation library
  var hasST = !!window.ScrollTrigger;
  if (hasST) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ignoreMobileResize:true}); }

  if (REDUCE) return; // reduced motion: static page, still image in the reveal, all captions readable

  var EASE = "expo.out";
  function words(el){ return el ? el.querySelectorAll(".w") : []; }

  // ---------- shared, time-based reveals (same on touch and desktop) ----------
  gsap.timeline({defaults:{ease:EASE}})
    .from(words(document.querySelector(".hero h1")), {yPercent:40, autoAlpha:0, duration:1.1, stagger:0.06})
    .from("[data-hero]", {y:24, autoAlpha:0, duration:1, stagger:0.08}, 0.25)
    .from(".hero__product", {y:60, autoAlpha:0, duration:1.4}, 0.15);

  document.querySelectorAll("[data-split]").forEach(function(h){
    if (h.closest(".hero")) return;
    var w = words(h); gsap.set(w, {yPercent:45, autoAlpha:0});
    onEnter(h, function(){ gsap.to(w, {yPercent:0, autoAlpha:1, duration:0.9, ease:EASE, stagger:0.05}); });
  });
  document.querySelectorAll("[data-rise]").forEach(function(el){
    gsap.set(el, {y:32, autoAlpha:0});
    onEnter(el, function(){ gsap.to(el, {y:0, autoAlpha:1, duration:0.9, ease:EASE}); });
  });
  document.querySelectorAll("[data-stagger]").forEach(function(g){
    gsap.set(g.children, {y:32, autoAlpha:0});
    onEnter(g, function(){ gsap.to(g.children, {y:0, autoAlpha:1, duration:0.9, ease:EASE, stagger:0.06}); });
  });

  var sw = words(document.querySelector("[data-scrubwords]"));

  if (TOUCH || !hasST) {
    // ===== TOUCH: nothing is tied to scroll position. Native momentum scroll stays untouched. =====
    // statement: words light up once, on a timer
    gsap.set(sw, {opacity:0.18});
    onEnter(document.querySelector("[data-scrubwords]"), function(){ gsap.to(sw, {opacity:1, duration:0.6, ease:"power1.out", stagger:0.07}); }, "0px 0px -30% 0px");
    // device opening: a short muted inline video (hardware-decoded, no seeking, no canvas work), played once on enter
    if (peak) {
      setCap(0);
      var media = peak.querySelector(".peak__media"), still = media.querySelector(".peak__still");
      var v = document.createElement("video");
      v.muted = true; v.defaultMuted = true; v.playsInline = true;
      v.setAttribute("muted",""); v.setAttribute("playsinline",""); v.setAttribute("aria-hidden","true");
      v.preload = "auto"; v.className = "peak__video"; v.width = 760; v.height = 470;
      var vReady = false, vEntered = false, vDone = false;
      function vPlay(){
        if (!vReady || !vEntered || vDone) return; vDone = true;
        var pr = v.play();
        var tick = function(){
          var d = v.duration || 2.92, t = v.currentTime / d;
          setCap(t < 0.34 ? 0 : (t < 0.7 ? 1 : 2));
          if (!v.ended && !v.paused) requestAnimationFrame(tick); else setCap(2);
        };
        if (pr && pr.then) pr.then(function(){ peak.classList.add("is-vid"); requestAnimationFrame(tick); }, function(){ still.src = "assets/peak/072.webp"; setCap(2); });
        else { peak.classList.add("is-vid"); requestAnimationFrame(tick); }
      }
      var vLoad = function(){
        still.src = "assets/peak/000.webp"; // same first frame as the clip, so the swap is invisible
        v.addEventListener("canplaythrough", function(){ vReady = true; vPlay(); }, {once:true});
        v.addEventListener("error", function(){ still.src = "assets/peak/072.webp"; }, {once:true});
        v.src = "assets/peak-open.mp4"; media.appendChild(v); v.load();
      };
      var vIdle = function(){ (window.requestIdleCallback || function(f){ setTimeout(f, 600); })(vLoad, {timeout:2500}); };
      if (document.readyState === "complete") vIdle(); else window.addEventListener("load", vIdle);
      onEnter(media, function(){ vEntered = true; vPlay(); }, "0px 0px -25% 0px");
    }
    return;
  }

  // ===== DESKTOP (fine pointer): smooth wheel scrolling + scroll-linked scenes =====
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({lerp:0.09, wheelMultiplier:1, smoothWheel:true, syncTouch:false, anchors:{offset:-64}});
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  gsap.to(".hero__product img", {yPercent:-6, scale:1.05, ease:"none",
    scrollTrigger:{trigger:".hero", start:"top top", end:"bottom top", scrub:true}});

  gsap.set(sw, {opacity:0.18});
  gsap.timeline({scrollTrigger:{trigger:".say", start:"top 60%", end:"bottom 85%", scrub:true}})
    .to(sw, {opacity:1, ease:"none", stagger:0.1, duration:0.4});

  gsap.fromTo(".lie img", {scale:1.06}, {scale:1, ease:"none",
    scrollTrigger:{trigger:".lie figure", start:"top bottom", end:"bottom 60%", scrub:true}});
  document.querySelectorAll("[data-zoom] img").forEach(function(img){
    gsap.fromTo(img, {scale:1.08}, {scale:1, ease:"none",
      scrollTrigger:{trigger:img.parentNode, start:"top bottom", end:"center 55%", scrub:true}});
  });

  if (canvas && ctx) {
    setCap(0);
    // all frames, decoded during idle time after load, well before the section is reached
    var kick = function(){ preload(N-1, 1); };
    if (document.readyState === "complete") setTimeout(kick, 300); else window.addEventListener("load", function(){ setTimeout(kick, 300); });
    var target = 0, smooth = 0;
    var stp = ScrollTrigger.create({trigger:peak, start:"top top", end:"bottom bottom",
      onUpdate:function(self){ target = self.progress; }});
    if ("ResizeObserver" in window) new ResizeObserver(sizeCanvas).observe(canvas); else sizeCanvas();
    // every frame: ease toward the scroll position, draw the nearest decoded frame
    gsap.ticker.add(function(){
      var r = canvas.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      smooth += (target - smooth) * 0.18;
      if (Math.abs(target - smooth) < 0.0005) smooth = target;
      draw(Math.round(smooth * (N-1)));
      setCap(smooth < 0.36 ? 0 : (smooth < 0.7 ? 1 : 2));
    });
  }

  gsap.from(".final__dev", {y:80, ease:"none",
    scrollTrigger:{trigger:".final__float", start:"top bottom", end:"bottom bottom", scrub:true}});

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
})();
