(function(){
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return; // page is fully readable without JS
  gsap.registerPlugin(ScrollTrigger);
  // iOS address-bar show/hide resizes the viewport: don't recalculate on that, it causes jumps
  ScrollTrigger.config({ignoreMobileResize:true});

  function words(el){ return el ? el.querySelectorAll(".w") : []; }

  // ---------- image-sequence reveal (canvas) ----------
  var peak = document.querySelector(".peak");
  var canvas = peak && peak.querySelector(".peak__canvas");
  var ctx = canvas && canvas.getContext("2d");
  var N = 145, frames = new Array(N), loaded = new Array(N), current = -1, wanted = 0, started = false;
  function src(i){ return "assets/peak/" + String(i).padStart(3,"0") + ".webp"; }
  function sizeCanvas(){
    if (!canvas) return;
    var r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; current = -1; draw(wanted); }
  }
  function nearest(i){
    if (loaded[i]) return i;
    for (var k = 1; k < N; k++){ if (i-k >= 0 && loaded[i-k]) return i-k; if (i+k < N && loaded[i+k]) return i+k; }
    return -1;
  }
  function draw(i){
    var j = nearest(i); if (j < 0 || j === current) return;
    current = j;
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(frames[j], 0, 0, canvas.width, canvas.height);
    if (!peak.classList.contains("is-seq")) peak.classList.add("is-seq");
  }
  function load(i){
    var im = new Image(); im.decoding = "async";
    im.onload = function(){ loaded[i] = true; if (Math.abs(i - wanted) <= Math.abs(current - wanted) || current < 0) { current = -1; draw(wanted); } };
    im.src = src(i); frames[i] = im;
  }
  function startLoading(){
    if (started) return; started = true;
    // coarse pass first (every 8th), then fill in, so scrubbing works early
    var order = [], seen = {};
    [8,4,2,1].forEach(function(step){ for (var i = 0; i < N; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); } });
    if (!seen[N-1]) order.push(N-1);
    var k = 0;
    (function pump(){ for (var c = 0; c < 6 && k < order.length; c++) load(order[k++]); if (k < order.length) setTimeout(pump, 60); })();
    sizeCanvas();
  }

  var mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", function(){
    var EASE = "expo.out";

    // hero entrance (opacity/transform only, no layout change)
    gsap.timeline({defaults:{ease:EASE}})
      .from(words(document.querySelector(".hero h1")), {yPercent:40, autoAlpha:0, duration:1.1, stagger:0.06})
      .from("[data-hero]", {y:24, autoAlpha:0, duration:1, stagger:0.08}, 0.25)
      .from(".hero__product img", {y:80, autoAlpha:0, duration:1.4}, 0.15);
    gsap.to(".hero__product img", {yPercent:-8, scale:1.06, ease:"none",
      scrollTrigger:{trigger:".hero", start:"top top", end:"bottom top", scrub:0.3}});

    // statement: words light up (faint words always visible)
    var sw = words(document.querySelector("[data-scrubwords]"));
    gsap.set(sw, {opacity:0.18});
    gsap.timeline({scrollTrigger:{trigger:".say", start:"top 60%", end:"bottom 85%", scrub:0.3}})
      .to(sw, {opacity:1, ease:"none", stagger:0.1, duration:0.4});

    gsap.fromTo(".lie img", {scale:1.06}, {scale:1, ease:"none",
      scrollTrigger:{trigger:".lie figure", start:"top bottom", end:"bottom 60%", scrub:0.3}});

    // headings word by word
    document.querySelectorAll("[data-split]").forEach(function(h){
      if (h.closest(".hero")) return;
      gsap.from(words(h), {yPercent:45, autoAlpha:0, duration:0.9, ease:EASE, stagger:0.05,
        scrollTrigger:{trigger:h, start:"top 88%", once:true}});
    });
    ScrollTrigger.batch("[data-rise]", {start:"top 90%", once:true,
      onEnter:function(b){ gsap.from(b, {y:36, autoAlpha:0, duration:0.9, ease:EASE, stagger:0.08, overwrite:true}); }});
    document.querySelectorAll("[data-stagger]").forEach(function(g){
      gsap.from(g.children, {y:40, autoAlpha:0, duration:0.9, ease:EASE, stagger:0.06,
        scrollTrigger:{trigger:g, start:"top 88%", once:true}});
    });
    document.querySelectorAll("[data-zoom] img").forEach(function(img){
      gsap.fromTo(img, {scale:1.1}, {scale:1, ease:"none",
        scrollTrigger:{trigger:img.parentNode, start:"top bottom", end:"center 55%", scrub:0.3}});
    });

    // reveal: CSS sticky (no pin, no spacer, no jump) + scroll-scrubbed image sequence
    if (canvas && ctx) {
      var caps = peak.querySelectorAll(".peak__caps p");
      ScrollTrigger.create({trigger:peak, start:"top bottom+=1200", once:true, onEnter:startLoading});
      ScrollTrigger.create({trigger:peak, start:"top top", end:"bottom bottom",
        onUpdate:function(self){
          var p = self.progress;
          wanted = Math.min(N-1, Math.round(p * (N-1)));
          draw(wanted);
          var a = p < 0.36 ? 0 : (p < 0.7 ? 1 : 2);
          for (var i = 0; i < caps.length; i++) caps[i].classList.toggle("on", i === a);
        }});
      caps[0] && caps[0].classList.add("on");
      if ("ResizeObserver" in window) new ResizeObserver(sizeCanvas).observe(canvas);
    }

    gsap.from(".final__dev", {y:100, ease:"none",
      scrollTrigger:{trigger:".final__dev", start:"top bottom", end:"bottom bottom", scrub:0.3}});
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
})();
