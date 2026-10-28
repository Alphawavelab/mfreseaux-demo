// ============ Réglages métier (à ajuster) ============
// Les prix ne sont pas affichés : le client demande son devis (installation dès 450 € TTC).
const CALC = { conso: 17, home: 0.22, pub: 0.60 }; // kWh/100km, €/kWh domicile, €/kWh borne publique rapide

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';
try { localStorage.removeItem('mfr-theme'); } catch (e) {} // ancien sélecteur de palettes

// ============ Utilitaires d'animation ============
function tween(el, to, fmt, ms = 700) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (reduce) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  cancelAnimationFrame(el._raf);
  const step = now => {
    const p = Math.min((now - t0) / ms, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

// ============ Titre du hero : mots qui montent ============
(function splitHero() {
  const h1 = $('.hero h1');
  if (!h1 || reduce) return;
  let i = 0;
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--i', i++);
          w.appendChild(s); frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(h1);
})();

// ============ Révélation au scroll ============
const revealSel = '.sec-head,.card,.result,.steps li,.offer,.feat li,.panel,.ph,.faq details,.final,.trust li,.calc .box,.zones li';
const targets = $$(revealSel);
targets.forEach(el => { el.classList.add('rv'); const sib = [...el.parentElement.children].indexOf(el); el.style.setProperty('--d', Math.min(sib, 5) * 0.08 + 's'); });
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(el => io.observe(el));
} else targets.forEach(el => el.classList.add('in'));

// ============ Scroll : barre de progression + header ============
const bar = $('.progress-bar'), head = $('header.site');
function onScroll() {
  const h = document.documentElement;
  const p = h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1);
  if (bar) bar.style.transform = `scaleX(${p})`;
  head?.classList.toggle('scrolled', h.scrollTop > 20);
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();

// ============ Batterie qui se charge (hero) ============
(function battery() {
  const fill = $('#batfill'), pct = $('#batpct');
  if (!fill) return;
  if (reduce) { fill.style.width = '80%'; pct.textContent = '80'; return; }
  const dur = 7000, hold = 1500; let t0 = performance.now();
  const loop = now => {
    let t = (now - t0) % (dur + hold);
    const p = Math.min(t / dur, 1), v = Math.round(p * 100);
    fill.style.width = v + '%'; pct.textContent = v;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

// ============ Effet tilt (cartes) et boutons magnétiques ============
if (fine && !reduce) {
  $$('.offer').forEach(c => {
    c.classList.add('tilt');
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
    c.addEventListener('pointerleave', () => c.style.transform = '');
  });
  $$('.btn-dark,.btn-red').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .28}px)`;
    });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });
}

// ============ Configurateur de devis ============
const steps = $$('.step'), bars = $$('.progress i');
const prev = $('#prev'), next = $('#next');
let cur = 0;
const val = n => (document.querySelector(`input[name="${n}"]:checked`) || {}).value;
const rng = n => Math.round(n).toLocaleString('fr-FR');

const DIST = { '0': 'moins de 10 m', '150': '10 à 20 m', '300': '20 à 30 m', '500': 'plus de 30 m' };
function estimate() {
  if (!$('#est')) return; // pages sans configurateur
  // pas de prix affiché : récapitulatif du projet, tarif sur devis
  const kw = val('kw').replace('.', ',');
  const ph = val('phase') === 'tri' ? 'triphasé' : 'monophasé';
  $('#est').textContent = 'dès 450 €';
  $('#estsub').textContent = `TTC · ${kw} kW ${ph} · tableau à ${DIST[val('dist')]} · tarif exact sur devis`;
}
function show(i) {
  cur = i;
  steps.forEach((s, k) => s.classList.toggle('on', k === i));
  bars.forEach((b, k) => b.classList.toggle('on', k <= i));
  prev.hidden = i === 0;
  next.hidden = i === steps.length - 1;
}
next?.addEventListener('click', () => { estimate(); show(Math.min(cur + 1, steps.length - 1)); });
prev?.addEventListener('click', () => show(Math.max(cur - 1, 0)));
$$('#cfg input[type=radio]').forEach(r => r.addEventListener('change', estimate));
// 11 et 22 kW imposent le triphasé ; 3,7 et 7,4 kW sont monophasés
$$('input[name="kw"]').forEach(r => r.addEventListener('change', () => { $(Number(val('kw')) > 7.4 ? '#p3' : '#p1').checked = true; estimate(); }));
$$('input[name="phase"]').forEach(r => r.addEventListener('change', () => { if (val('phase') === 'mono' && Number(val('kw')) > 7.4) $('#k7').checked = true; estimate(); }));
estimate();

// Formulaire de devis : envoi par e-mail via envoyer-demande.php
$('#lead')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#lead-err'), btn = $('button[type=submit]', f);
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const data = new FormData(f);
  const kw = (val('kw') || '').replace('.', ','), ph = val('phase') === 'tri' ? 'triphasé' : 'monophasé';
  data.set('projet', `Borne ${kw} kW ${ph}, tableau à ${DIST[val('dist')] || 'distance non précisée'}`);
  err.hidden = true; btn.disabled = true; btn.textContent = 'Envoi en cours…';
  try {
    const r = await fetch(f.action, { method: 'POST', body: data });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.message || 'Envoi impossible.');
    f.style.display = 'none';
    $('#ok').style.display = 'block';
  } catch (x) {
    err.textContent = document.body.dataset.demo ? 'Version de démonstration : l\'envoi des demandes sera actif à la mise en ligne du site.' : (x.message && x.message !== 'Failed to fetch' ? x.message : 'Envoi impossible pour le moment.') + ' Vous pouvez nous appeler au 06 63 36 65 00.';
    err.hidden = false; btn.disabled = false; btn.textContent = 'Recevoir mon devis gratuit';
  }
});

// ============ Simulateur d'économies ============
(function calc() {
  const km = $('#km'); if (!km) return;
  const upd = () => {
    const v = Number(km.value);
    km.style.setProperty('--p', ((v - km.min) / (km.max - km.min) * 100) + '%');
    $('#kmout').textContent = v.toLocaleString('fr-FR') + ' km';
    const kwh = v / 100 * CALC.conso, home = kwh * CALC.home, pub = kwh * CALC.pub, eco = pub - home;
    tween($('#eco'), eco, eur, 500);
    tween($('#c-home'), home, eur, 500);
    tween($('#c-pub'), pub, eur, 500);
    $('#b-pub').style.width = '100%';
    $('#b-home').style.width = (home / pub * 100) + '%';
  };
  km.addEventListener('input', upd); upd();
})();

// ============ Menu mobile ============
const burger = $('.burger'), menu = $('#menu');
burger?.addEventListener('click', () => {
  const o = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', o);
});
menu?.addEventListener('click', e => {
  if (e.target.closest('a')) {
    menu.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu?.classList.contains('open')) {
    menu.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
    burger?.focus();
  }
});
