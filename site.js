(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 759px)").matches;

  // pick video source by viewport (only when motion is allowed)
  var vid = document.querySelector(".peak video");
  if (vid && !reduce) {
    vid.src = small ? vid.dataset.srcM : vid.dataset.srcD;
    if (small) vid.poster = "assets/peak-poster-m.webp";
    vid.load();
  }

  if (!window.gsap || !window.ScrollTrigger) return; // content is fully visible without JS
  gsap.registerPlugin(ScrollTrigger);

  // split text nodes into word spans (keeps nested elements intact)
  function split(el){
    var out = [];
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function(t){
            if (!t) return;
            if (/^\s+$/.test(t) && t.indexOf("\u00a0") === -1) { frag.appendChild(document.createTextNode(t)); return; }
            var s = document.createElement("span"); s.className = "w"; s.textContent = t; frag.appendChild(s); out.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") { walk(n); }
      });
    })(el);
    return out;
  }

  var mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", function(){
    var EASE = "expo.out";

    // hero entrance
    var hw = split(document.querySelector(".hero h1"));
    var tl = gsap.timeline({defaults:{ease:EASE}});
    tl.from(hw, {yPercent:40, autoAlpha:0, duration:1.1, stagger:0.06})
      .from("[data-hero]", {y:24, autoAlpha:0, duration:1, stagger:0.08}, 0.25)
      .from(".hero__product img", {y:80, scale:0.94, autoAlpha:0, duration:1.4}, 0.15);
    // hero scroll: product lifts and grows slightly, never fades out completely
    gsap.to(".hero__product img", {yPercent:-8, scale:1.08, ease:"none",
      scrollTrigger:{trigger:".hero", start:"top top", end:"bottom top", scrub:true}});

    // statement: words light up as you scroll (faint words always visible)
    var sw = split(document.querySelector("[data-scrubwords]"));
    gsap.set(sw, {opacity:0.16});
    gsap.timeline({scrollTrigger:{trigger:".say", start:"top 60%", end:"bottom 85%", scrub:0.6}})
      .to(sw, {opacity:1, ease:"none", stagger:0.1, duration:0.4});

    // lie photo: gentle settle
    gsap.fromTo(".lie img", {scale:1.08}, {scale:1, ease:"none",
      scrollTrigger:{trigger:".lie figure", start:"top bottom", end:"bottom 60%", scrub:true}});

    // headings word by word
    document.querySelectorAll("[data-split]").forEach(function(h){
      if (h.closest(".hero")) return;
      var w = split(h);
      gsap.from(w, {yPercent:45, autoAlpha:0, duration:0.9, ease:EASE, stagger:0.05,
        scrollTrigger:{trigger:h, start:"top 88%", toggleActions:"play none none none"}});
    });

    // generic rises
    ScrollTrigger.batch("[data-rise]", {start:"top 90%", once:true,
      onEnter:function(b){ gsap.from(b, {y:36, autoAlpha:0, duration:0.9, ease:EASE, stagger:0.08, overwrite:true}); }});
    document.querySelectorAll("[data-stagger]").forEach(function(g){
      gsap.from(g.children, {y:40, autoAlpha:0, duration:0.9, ease:EASE, stagger:0.06,
        scrollTrigger:{trigger:g, start:"top 88%", toggleActions:"play none none none"}});
    });
    document.querySelectorAll("[data-zoom] img").forEach(function(img){
      gsap.fromTo(img, {scale:1.12}, {scale:1, ease:"none",
        scrollTrigger:{trigger:img.parentNode, start:"top bottom", end:"center 55%", scrub:true}});
    });

    // sticky product reveal: scrub the exploded-view clip + caption cross-fades
    var caps = gsap.utils.toArray(".peak__caps p");
    gsap.set(caps.slice(1), {autoAlpha:0, y:16});
    var ptl = gsap.timeline({scrollTrigger:{trigger:".peak", start:"top top", end:"bottom bottom", scrub:true}});
    ptl.to({}, {duration:1})
       .to(caps[0], {autoAlpha:0, y:-16, duration:0.14}, 0.86)
       .to(caps[1], {autoAlpha:1, y:0, duration:0.14}, 1.0)
       .to(caps[1], {autoAlpha:0, y:-16, duration:0.14}, 1.86)
       .to(caps[2], {autoAlpha:1, y:0, duration:0.14}, 2.0)
       .to({}, {duration:0.6}, 2.25);
    if (vid) {
      var target = 0, ticking = false;
      ScrollTrigger.create({trigger:".peak", start:"top 80%", end:"bottom bottom",
        onUpdate:function(self){
          if (!vid.duration) return;
          target = self.progress * (vid.duration - 0.05);
          if (!ticking) { ticking = true; requestAnimationFrame(function(){ ticking = false; try { vid.currentTime = target; } catch(e){} }); }
        }});
    }

    // final device rises
    gsap.from(".final__dev", {y:120, ease:"none",
      scrollTrigger:{trigger:".final__dev", start:"top bottom", end:"bottom bottom", scrub:true}});
  });

  // refresh after fonts and images settle
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
  window.addEventListener("load", function(){ ScrollTrigger.refresh(); });
})();
