(() => {
  'use strict';

  const D = window.LOVE;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = gsap.utils.random;
  const clamp = gsap.utils.clamp;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.6c-.3 0-.6-.1-.8-.3C6.4 16.2 3 13.2 3 9.4 3 6.9 5 5 7.4 5c1.8 0 3.2 1 4.6 2.6C13.4 6 14.8 5 16.6 5 19 5 21 6.9 21 9.4c0 3.8-3.4 6.8-8.2 10.9-.2.2-.5.3-.8.3z"/></svg>';
  // 拍立得卡片的高寬比（照片區是 3:4 直式，下面留寫字的白邊）；要跟 style.css 的 --card 一致
  const CARD = 1.5;
  const PALETTE = ['#f19bb0', '#ffc2ad', '#d6c4ff', '#ffb8c8', '#f7a6a0', '#ffd59e'];

  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ───────── 元素 ───────── */
  const scene = $('#scene');
  const ENV = $$('.env');
  const flapWrap = $('#flapWrap'), flap = $('#flap'), flapOut = $('#flapOut'), flapIn = $('#flapIn');
  const envFront = $('#envFront');
  const seal = $('#seal'), sealRipple = $('#sealRipple');
  const letter = $('#letter'), paperReal = $('#paperReal'), pcWrap = $('#pcWrap'), pc = $('#pc');
  const fadeT = $('#fadeT'), fadeB = $('#fadeB');
  const foldTop = $('#foldTop'), foldBot = $('#foldBot'), faceFront = $('#faceFront'), faceBack = $('#faceBack');
  const foldTopClip = $('#foldTopClip'), foldBotClip = $('#foldBotClip'), shade = $('#shade'), crease = $('#crease');
  const introTitle = $('#introTitle'), introHeart = $('#introHeart'), introFx = $('#introFx');
  const hintOpen = $('#hintOpen'), hintScroll = $('#hintScroll'), hintScrollIn = $('#hintScrollIn'), hintMore = $('#hintMore');
  const endTitle = $('#endTitle'), endSub = $('#endSub'), endHint = $('#endHint'), replay = $('#replay');
  const trail = $('#trail'), bgWarm = $('#bgWarm');
  const scroller = $('#scroller');

  /* ───────── 內容 ───────── */
  function splitChars(el, text) {
    el.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch' + (ch === '♡' ? ' accent' : ch === '&' ? ' amp' : '');
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    }
    return $$('.ch', el);
  }

  const L = D.letter;
  pc.innerHTML =
    `<div class="pc-date">${esc(L.date)}</div>` +
    `<p class="pc-greet">${esc(L.greeting)}</p>` +
    L.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('') +
    `<div class="pc-sign"><span>${esc(L.closing)}</span><b>${esc(L.signature)}</b></div>` +
    `<div class="pc-doodle" aria-hidden="true">${HEART}${HEART}</div>` +
    (L.ps ? `<p class="pc-ps">${esc(L.ps)}</p>` : '');

  const setText = (sel, text) => { $(sel).textContent = text ?? ''; };
  document.title = D.page.title;
  document.querySelector('meta[name="apple-mobile-web-app-title"]').content = D.page.homeScreenName;
  setText('#hintOpenText', D.intro.openHint);
  setText('#hintScrollText', D.intro.scrollHint);
  setText('#coverTo', D.cover.to);
  setText('#coverFrom', D.cover.from);
  setText('#hintMoreText', D.afterLetter.hint);
  setText('#endSub', D.ending.subtitle);
  setText('#endHint', D.ending.hint);
  setText('#replayText', D.ending.replay);
  const nameChars = splitChars($('#itNames'), D.intro.names);
  const titleChars = splitChars($('#itText'), D.intro.title);
  const introChars = [...nameChars, ...titleChars];
  const endChars = splitChars(endTitle, D.ending.title);

  const photoEls = D.photos.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'photo' + (i % 2 ? ' alt' : '');
    el.tabIndex = -1;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `打開照片：${p.title}`);
    el.innerHTML =
      `<i class="tape"></i>` +
      `<div class="ph-img"><img src="photos/${esc(p.file)}" alt="${esc(p.title)}" draggable="false" decoding="async"` +
      ` style="object-position:${esc(p.focus || 'center')}"></div>` +
      `<div class="ph-label"><span>${esc(p.title)}</span>${p.tag ? `<small>${esc(p.tag)}</small>` : `<small class="ph-heart" aria-hidden="true">${HEART}</small>`}</div>`;
    const img = el.querySelector('img');
    img.addEventListener('error', () => { img.parentElement.classList.add('noimg'); img.remove(); }, { once: true });
    scene.insertBefore(el, envFront);
    return el;
  });

  // 封蠟：不規則的蠟滴外形 + 壓印凹槽 + 浮雕愛心
  const WAX = 'M50 3.5C61 2.5 69 8 77.5 11 88 15 95.5 25 96.5 37.5 97.5 47 93.5 54 96.5 63.5 98.5 76 90 86 80 91 70 96 60.5 94 50 97 38 99.5 28 94.5 20 89.5 10 83 3.5 73 4 62 3.5 52 7 46 4 36 2 24 12 14 22 9.5 31 5 40 5 50 3.5Z';
  const HEART_D = 'M12 20.6c-.3 0-.6-.1-.8-.3C6.4 16.2 3 13.2 3 9.4 3 6.9 5 5 7.4 5c1.8 0 3.2 1 4.6 2.6C13.4 6 14.8 5 16.6 5 19 5 21 6.9 21 9.4c0 3.8-3.4 6.8-8.2 10.9-.2.2-.5.3-.8.3z';
  const heartAt = (x, y, fill, op = 1) =>
    `<path d="${HEART_D}" transform="translate(${x} ${y}) scale(1.45) translate(-12 -12.8)" fill="${fill}" opacity="${op}"/>`;
  const SEAL_SVG =
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    `<path d="${WAX}" fill="url(#waxBody)"/>` +
    `<path d="${WAX}" fill="none" stroke="#8f2f49" stroke-opacity=".3" stroke-width="1.2"/>` +
    '<circle cx="50" cy="51" r="30.5" fill="url(#waxPress)"/>' +
    '<circle cx="49.2" cy="50.2" r="30.5" fill="none" stroke="#8a2943" stroke-opacity=".5" stroke-width="2"/>' +
    '<circle cx="50.9" cy="51.9" r="30.5" fill="none" stroke="#ffc9d4" stroke-opacity=".5" stroke-width="1.3"/>' +
    '<circle cx="50" cy="51" r="24.5" fill="none" stroke="#f0a2b3" stroke-opacity=".55" stroke-width="1.1" stroke-dasharray="1.4 3.1"/>' +
    heartAt(50.8, 52.6, '#8f2f49', 0.55) +
    heartAt(49.4, 51, '#ffc2cf', 0.6) +
    heartAt(50, 51.8, '#d8667f') +
    '<ellipse cx="32" cy="22" rx="13" ry="5.5" fill="#fff" opacity=".2" transform="rotate(-28 32 22)"/>' +
    '</svg>';
  seal.innerHTML = SEAL_SVG;

  // 封蠟彈開時冒出的小星光
  const SPARK = '<svg viewBox="0 0 24 24"><path d="M12 1.5c.6 4.6 2.1 6.9 6.4 7.9.9.2.9 1.4 0 1.6-4.3 1-5.8 3.3-6.4 7.9-.1.9-1.4.9-1.5 0-.6-4.6-2.1-6.9-6.4-7.9-.9-.2-.9-1.4 0-1.6 4.3-1 5.8-3.3 6.4-7.9.1-.9 1.4-.9 1.5 0z"/></svg>';
  const sparks = Array.from({ length: 7 }, (_, i) => {
    const sp = document.createElement('i');
    sp.innerHTML = SPARK;
    sp.style.color = ['#fff4c7', '#ffd1dc', '#ffffff'][i % 3];
    $('#sealFx').appendChild(sp);
    return sp;
  });
  const trailHearts = Array.from({ length: 12 }, (_, i) => {
    const h = document.createElement('i');
    h.innerHTML = HEART;
    h.style.color = PALETTE[i % PALETTE.length];
    trail.appendChild(h);
    return h;
  });

  /* ───────── 平滑捲動 ───────── */
  const lenis = new Lenis({
    duration: 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.3,
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  // iPhone 捲動時網址列伸縮會改變視窗高度，不要因此重算
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.clearScrollMemory('manual');
  // 重新整理時瀏覽器會想回到上次的位置；信還沒拆就一律回到最上面
  const toTop = () => { window.scrollTo(0, 0); lenis.scrollTo(0, { immediate: true, force: true }); };
  addEventListener('load', toTop);
  addEventListener('pageshow', toTop);

  // 讀取動態島與底部 Home 條的安全區
  const probe = document.createElement('div');
  probe.className = 'safe-probe';
  document.body.appendChild(probe);
  const safe = () => {
    const cs = getComputedStyle(probe);
    return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  };

  const state = {
    ready: false, opened: false, opening: false, closing: false,
    pendingClose: false, lb: false, photosDone: Infinity,
  };

  /* ───────── 幾何 ───────── */
  let G;
  function calc() {
    const vw = innerWidth, vh = innerHeight, mobile = vw < 640;
    const aspect = mobile ? 1.3 : 1.45;
    const envW = Math.min(vw * 0.84, 440, vh * 0.36 * aspect);
    const envH = envW / aspect;
    const W = Math.min(vw * 0.9, 560);
    // 手機上留出底部提示條的空間
    const H = Math.min(vh * (mobile ? 0.76 : 0.82), 780);
    const s = Math.min((0.86 * envW) / W, (0.84 * envH) / (H / 2));
    const envTop = vh / 2 - envH / 2;
    const baseTop = vh / 2 - H / 2;
    const peekPx = envH * 0.1;
    const dEnv = vh * 0.14;

    // 照片最後的位置
    const n = D.photos.length;
    const cols = mobile ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const sa = safe();
    const envEnd = vh / 2 + envH * 0.12 - sa.bottom * 0.6;
    // 照片區從結尾標題下緣開始，到露出一角的信封上方為止
    const endEl = $('#ending');
    const areaTop = Math.max(vh * 0.17, endEl.offsetTop + endEl.offsetHeight + (mobile ? 22 : 28));
    const areaBottom = vh - envH * 0.24 - 14 - sa.bottom * 0.6;
    const areaH = Math.max(areaBottom - areaTop, vh * 0.4);
    // 每張拍立得有自己的一格：歪斜後的外框 + 間距一定塞得進格子裡，所以永遠不會疊到
    const rots = [-5, 4, -3, 6, -4, 3, -6, 5];
    const maxA = (6 * Math.PI) / 180;
    const fw = Math.cos(maxA) + CARD * Math.sin(maxA);   // 寬 1 的卡片歪 6° 後外框的寬
    const fh = CARD * Math.cos(maxA) + Math.sin(maxA);   // …外框的高
    const gap = mobile ? 14 : 22;
    const side = mobile ? 10 : 40;
    const usableW = Math.min(vw - side * 2, 1100);
    const cellW = usableW / cols;
    // 手機：照片以寬度為準盡量放大，放不下一個畫面就往下捲；電腦：整個塞進一個畫面
    const pw = mobile
      ? Math.min((cellW - gap) / fw, 230)
      : Math.min((cellW - gap) / fw, (areaH / rows - gap) / fh, 270);
    const ph = pw * CARD;
    const boundW = pw * fw, boundH = pw * fh;
    const stagger = mobile && cols === 2 ? boundH * 0.18 : 0;   // 右欄往下錯開
    const cellH = mobile ? boundH + gap + 12 : Math.max(areaH / rows, boundH + gap);
    const spareX = Math.max(0, (cellW - boundW - gap) / 2);
    const spareY = Math.max(0, (cellH - boundH - gap) / 2);
    const jit = [[-0.7, 0.3], [0.8, -0.6], [-0.4, 0.8], [0.6, -0.3], [-0.8, 0.5], [0.5, 0.7], [-0.6, -0.4], [0.7, 0.2]];
    const pos = D.photos.map((_, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      const offX = ((cols - inRow) * cellW) / 2;
      const cx = (vw - usableW) / 2 + offX + cellW * (c + 0.5) + jit[i % 8][0] * spareX;
      const cy = areaTop + cellH * (r + 0.5) + jit[i % 8][1] * spareY + (c % 2 ? stagger : 0);
      return { x: cx - vw / 2, y: cy - vh / 2, r: rots[i % 8], s: 1, bottom: cy + boundH / 2 };
    });
    // 照片超出一個畫面時，最後整頁往上捲這麼多（留出最下面按鈕的位置）
    const boardBottom = Math.max(...pos.map((p) => p.bottom));
    const pan = Math.max(0, boardBottom - (vh - 72 - sa.bottom));
    const sp = Math.min((0.42 * envW) / pw, (0.6 * envH) / ph);

    return {
      vw, vh, mobile, envW, envH, W, H, s, pw, ph, sp, pos, pan,
      peekPx,
      peekPct: (-peekPx / H) * 100,
      dEnv,
      y0: envTop + envH * 0.08 - baseTop,
      yOut: envTop + dEnv - 14 - (H / 2) * s - baseTop + peekPx,
      yF: H / 4 + peekPx,
      yU: peekPx,
      yFly: peekPx - vh * 0.75 - H,
      xFly: vw * 0.28,
      envAway: vh / 2 + envH * 0.95,
      envEnd,
      yIn: envH * 0.12,
      yRise: -envH / 2 - (ph * sp) / 2 - 10,
      unit: vh * 0.8,
    };
  }

  function applyVars() {
    const r = document.documentElement.style;
    r.setProperty('--envW', G.envW + 'px');
    r.setProperty('--envH', G.envH + 'px');
    r.setProperty('--W', G.W + 'px');
    r.setProperty('--H', G.H + 'px');
    r.setProperty('--pw', G.pw + 'px');
    r.setProperty('--seal', G.envW * 0.22 + 'px');
  }

  /* ───────── 拆信（手勢控制的時間軸） ───────── */
  let openTl;
  function buildOpen() {
    const S = G.envW * 0.22;
    gsap.set(flap, { transformPerspective: 900 });
    // 時間軸裡的 set 會記住「當下」的值當起點，所以先歸位
    gsap.set(flapWrap, { zIndex: 5 });
    gsap.set(flapOut, { autoAlpha: 1 });
    gsap.set(flapIn, { autoAlpha: 0 });
    gsap.set(seal, { autoAlpha: 1 });

    const o = gsap.timeline({ paused: true });
    o.fromTo(introTitle, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -18, duration: 0.45, ease: 'power2.in', immediateRender: false }, 0)
      .fromTo(hintOpen, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: 10, duration: 0.3, immediateRender: false }, 0);

    // ① 手指往上拉 → 封蠟先被壓扁一點（蓄力）
    const REST = 'drop-shadow(0px 2px 2px rgba(120,30,50,0.28)) drop-shadow(0px 5px 6px rgba(150,50,70,0.18))';
    const LIFT = 'drop-shadow(0px 7px 5px rgba(120,30,50,0.2)) drop-shadow(0px 16px 14px rgba(150,50,70,0.22))';
    o.fromTo(seal, { scaleX: 1, scaleY: 1 }, { scaleX: 1.05, scaleY: 0.9, duration: 0.18, ease: 'power1.in', immediateRender: false }, 0.02);

    // ② 啵！整顆彈起來離開信封，留下一圈漣漪和幾顆小星光
    const POP = 0.2;
    o.fromTo(seal, { scaleX: 1.05, scaleY: 0.9, y: 0, rotation: 0, filter: REST },
      { scaleX: 1.14, scaleY: 1.14, y: -S * 0.1, rotation: -7, filter: LIFT, duration: 0.16, ease: 'power3.out', immediateRender: false }, POP)
      .fromTo(seal, { scaleX: 1.14, scaleY: 1.14, y: -S * 0.1, rotation: -7 },
        { scaleX: 1.05, scaleY: 1.05, y: -S * 0.06, rotation: -3, duration: 0.35, ease: 'back.out(3)', immediateRender: false }, POP + 0.16)
      .fromTo(sealRipple, { scale: 0.5, opacity: 0 }, { scale: 0.8, opacity: 0.7, duration: 0.05, immediateRender: false }, POP)
      .to(sealRipple, { scale: 2, opacity: 0, duration: 0.5, ease: 'power2.out' }, POP + 0.05);
    sparks.forEach((sp, i) => {
      const ang = (i / sparks.length) * Math.PI * 2 - Math.PI / 2 + rand(-0.25, 0.25);
      const r = S * rand(0.7, 1.05);
      o.fromTo(sp, { x: 0, y: 0, scale: 0, rotation: 0 },
        { x: Math.cos(ang) * r, y: Math.sin(ang) * r, scale: rand(0.7, 1.2), rotation: rand(-90, 90), duration: 0.32, ease: 'power2.out' }, POP + i * 0.015)
        .to(sp, { scale: 0, duration: 0.22, ease: 'power1.in' }, POP + 0.3 + i * 0.015);
    });

    // ③ 蓋子翻開，封蠟黏在蓋子上一起走
    const FLAP = 0.26, FLAP_D = 0.95, MID = FLAP + FLAP_D / 2;
    o.fromTo(flap, { rotationX: 0 }, { rotationX: 180, duration: FLAP_D, ease: 'power2.inOut', immediateRender: false }, FLAP)
      .set(flapWrap, { zIndex: 2 }, MID)
      .set([flapOut, seal], { autoAlpha: 0 }, MID)
      .set(flapIn, { autoAlpha: 1 }, MID)
      .fromTo(letter, { yPercent: 0 }, { yPercent: G.peekPct, duration: 0.6, ease: 'back.out(2.2)', immediateRender: false }, 0.9)
      .fromTo(hintScroll, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, immediateRender: false }, 1.15);
    return o;
  }

  /* ───────── 捲動時間軸 ───────── */
  let tl, st;
  function build() {
    G = calc();
    applyVars();

    // 把信紙內容複製到摺頁上，攤開瞬間與真正的信紙無縫交接
    const clone = () => { const c = pc.cloneNode(true); c.removeAttribute('id'); return c; };
    foldTopClip.replaceChildren(clone());
    foldBotClip.replaceChildren(clone());

    const overflow = Math.max(0, pc.offsetHeight - G.H);
    const R = Math.max(0.3, overflow / (G.unit * 0.8));

    // 初始狀態（未拆封）
    gsap.set(ENV, { x: 0, y: 0, scale: 1, transformOrigin: '50% 50%' });
    gsap.set(letter, { x: 0, y: G.y0, scale: G.s, rotation: 0, zIndex: 3, transformOrigin: '50% 0%' });
    gsap.set(foldBot, { rotationX: 180, transformPerspective: 1400, transformOrigin: '50% 0%' });
    gsap.set(faceFront, { autoAlpha: 0 });
    gsap.set(faceBack, { autoAlpha: 1 });
    gsap.set(shade, { opacity: 0.6 });
    gsap.set(crease, { opacity: 0.7 });
    gsap.set([foldTop, foldBot], { autoAlpha: 1 });
    gsap.set(paperReal, { autoAlpha: 0 });
    gsap.set(pcWrap, { y: 0 });
    gsap.set([fadeT, fadeB], { opacity: 0 });
    gsap.set(hintScrollIn, { opacity: 1, y: 0 });
    gsap.set(trailHearts, { x: 0, y: 0, scale: 0, opacity: 1 });
    gsap.set(bgWarm, { opacity: 0 });
    gsap.set('#ending', { y: 0 });
    const n = photoEls.length;
    photoEls.forEach((el, i) => {
      el.classList.remove('lifted');
      gsap.set(el, {
        x: (i - (n - 1) / 2) * G.envW * 0.05,
        y: G.yIn,
        rotation: (i - (n - 1) / 2) * 3,
        scale: G.sp,
        zIndex: 3,
        autoAlpha: 0,
        transformOrigin: '50% 50%',
      });
    });

    tl = gsap.timeline({ paused: true });
    let t = 0;

    // A｜信紙從信封裡往上抽
    tl.to(hintScrollIn, { opacity: 0, y: 14, duration: 0.3, ease: 'power1.out' }, 0)
      .to(letter, { y: G.yOut, duration: 1.2, ease: 'power2.inOut' }, 0)
      .to(ENV, { y: G.dEnv, duration: 1.2, ease: 'power1.inOut' }, 0);
    t = 1.2;
    tl.set(letter, { zIndex: 7 }, t);

    // B｜信紙飛到正中央放大，信封往下退場
    tl.to(letter, { y: G.yF, scale: 1, duration: 1, ease: 'power3.inOut' }, t)
      .to(letter, { rotation: -3, duration: 0.5, ease: 'sine.out' }, t)
      .to(letter, { rotation: 0, duration: 0.5, ease: 'sine.inOut' }, t + 0.5)
      .to(ENV, { y: G.envAway, scale: 0.92, duration: 1, ease: 'power2.in' }, t);
    t += 1;

    // C｜攤開摺起來的下半張
    tl.to(foldBot, { rotationX: 0, duration: 0.9, ease: 'power2.inOut' }, t)
      .set(faceBack, { autoAlpha: 0 }, t + 0.45)
      .set(faceFront, { autoAlpha: 1 }, t + 0.45)
      .to(shade, { opacity: 0, duration: 0.45, ease: 'power1.in' }, t + 0.45)
      .to(crease, { opacity: 0, duration: 0.5 }, t + 0.4)
      .to(letter, { y: G.yU, duration: 0.9, ease: 'power2.inOut' }, t);
    t += 0.9;
    tl.set(paperReal, { autoAlpha: 1 }, t).set([foldTop, foldBot], { autoAlpha: 0 }, t);
    t += 0.2;

    // D｜閱讀：信的內容往上捲
    if (overflow > 0) {
      tl.to(fadeB, { opacity: 1, duration: 0.15 }, t)
        .to(fadeT, { opacity: 1, duration: 0.25 }, t + 0.1)
        .to(pcWrap, { y: -overflow, duration: R, ease: 'none' }, t)
        .to(fadeB, { opacity: 0, duration: 0.2 }, t + R - 0.2);
    }
    // 讀到信尾就出現「還沒完喔」，一路陪到照片開始跳出來
    tl.fromTo(hintMore, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'back.out(2)' }, t + R - 0.3);
    t += R + 0.35;

    // E｜信飛走
    tl.to(letter, { y: G.yU + 28, rotation: 2, scale: 0.97, duration: 0.3, ease: 'power1.out' }, t)
      .to(letter, { y: G.yFly, x: G.xFly, rotation: -16, scale: 0.42, duration: 0.9, ease: 'power2.in' }, t + 0.3);
    trailHearts.forEach((h, i) => {
      const sx = rand(-G.W * 0.45, G.W * 0.45), sy = rand(-G.H * 0.1, G.H * 0.45);
      const ti = t + 0.35 + i * 0.035;
      tl.fromTo(h, { x: sx, y: sy, scale: 0, rotation: rand(-30, 30) },
        { x: sx + G.xFly * rand(0.15, 0.55), y: sy - G.vh * rand(0.25, 0.7), scale: rand(0.6, 1.4), rotation: rand(-50, 50), duration: 0.75, ease: 'power2.out' }, ti)
        .to(h, { opacity: 0, duration: 0.3 }, ti + 0.5);
    });
    tl.to(bgWarm, { opacity: 1, duration: 1.4, ease: 'sine.inOut' }, t + 0.4);
    t += 1.2;

    // F｜信封回來
    tl.to(ENV, { y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }, t - 0.2);
    t += 0.6;
    tl.set(photoEls, { autoAlpha: 1 }, t);

    // 信封抖兩下，照片從開口探出頭 → 讓人知道裡面還有東西
    tl.to(ENV, { rotation: -3, duration: 0.1, ease: 'sine.out' }, t)
      .to(ENV, { rotation: 2.4, duration: 0.14, ease: 'sine.inOut' }, t + 0.1)
      .to(ENV, { rotation: -1.2, duration: 0.12, ease: 'sine.inOut' }, t + 0.24)
      .to(ENV, { rotation: 0, duration: 0.14, ease: 'sine.out' }, t + 0.36);
    photoEls.forEach((el, i) => {
      tl.to(el, { y: G.yIn - G.envH * rand(0.1, 0.18), duration: 0.3, ease: 'back.out(3)' }, t + 0.08 + i * 0.03);
    });
    t += 0.55;
    tl.to(hintMore, { autoAlpha: 0, y: -10, duration: 0.25 }, t + 0.1);

    // G｜照片一張一張彈出來
    photoEls.forEach((el, i) => {
      const ti = t + i * 0.22, p = G.pos[i];
      tl.to(el, { y: G.yRise, duration: 0.45, ease: 'power2.out' }, ti)
        .set(el, { zIndex: 10 + i }, ti + 0.45)
        .to(el, { x: p.x, y: p.y, rotation: p.r, scale: p.s, duration: 0.85, ease: 'back.out(1.3)' }, ti + 0.45);
    });
    const tDone = t + (n - 1) * 0.22 + 0.45 + 0.85;
    tl.to(ENV, { y: G.envEnd, scale: 0.72, duration: 0.8, ease: 'power2.inOut' }, t + n * 0.22 + 0.2);

    // H｜結尾
    tl.fromTo(endChars, { yPercent: 110, opacity: 0, rotation: 8 },
      { yPercent: 0, opacity: 1, rotation: 0, stagger: 0.035, duration: 0.5, ease: 'back.out(2)' }, tDone - 0.5);
    tl.fromTo(endTitle, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, tDone - 0.5);
    tl.fromTo([endSub, endHint], { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.4, ease: 'power2.out' }, tDone);

    // I｜照片放不進一個畫面時（手機），繼續往下滑 → 整頁連同標題往上捲，看到最下面那排
    let tReplay = tDone + 0.24;
    if (G.pan > 0) {
      const tp = tDone + 0.5, dur = (G.pan / G.unit) * 1.25;
      photoEls.forEach((el, i) => tl.to(el, { y: G.pos[i].y - G.pan, duration: dur, ease: 'none' }, tp));
      tl.to('#ending', { y: -G.pan, duration: dur, ease: 'none' }, tp);
      tReplay = tp + dur - 0.15;   // 捲到底、最下面那排露出來之後才出現，不會壓在照片上
    }
    tl.fromTo(replay, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, tReplay);
    tl.to({}, { duration: 0.6 });

    state.photosDone = tDone;
    scroller.style.height = tl.duration() * G.unit + G.vh + 'px';

    st = ScrollTrigger.create({
      trigger: scroller,
      start: 'top top',
      end: 'bottom bottom',
      scrub: reduce ? true : 0.9,
      animation: tl,
      onUpdate: (self) => {
        const done = tl.time() >= state.photosDone - 0.02;
        photoEls.forEach((el) => (el.tabIndex = done ? 0 : -1));
      },
    });
  }

  /* ───────── 待機時的輕輕漂浮 ───────── */
  let bob;
  function startBob() {
    if (reduce) return;
    bob && bob.kill();
    bob = gsap.to(scene, { y: -7, rotation: 0.5, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
  function stopBob() {
    bob && bob.kill();
    bob = null;
    gsap.to(scene, { y: 0, rotation: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
  }

  /* ───────── 開／關信封 ───────── */
  function finishOpen() {
    if (state.opened || state.opening || state.closing) return;
    state.opening = true;
    stopBob();
    const p = openTl.progress();
    gsap.to(openTl, {
      progress: 1, duration: 0.5 + (1 - p) * 1.3, ease: 'power1.out', overwrite: true,
      onComplete: () => {
        state.opening = false;
        state.opened = true;
        document.body.classList.remove('closed');
        lenis.scrollTo(0, { immediate: true, force: true });
        lenis.start();
      },
    });
  }
  function cancelOpen() {
    gsap.to(openTl, { progress: 0, duration: 0.6, ease: 'power2.out', overwrite: true, onComplete: startBob });
  }
  function closeEnvelope() {
    state.pendingClose = false;
    state.closing = true;
    lenis.scrollTo(0, { immediate: true, force: true });
    lenis.stop();
    document.body.classList.add('closed');
    gsap.to(openTl, {
      progress: 0, duration: 1.4, ease: 'power2.inOut', overwrite: true,
      onComplete: () => { state.closing = false; state.opened = false; startBob(); },
    });
  }

  // 回到最上面 → 自動把信封闔上
  lenis.on('scroll', (l) => {
    ScrollTrigger.update();
    if (!state.opened || state.closing || state.lb || state.rebuilding) return;
    if (l.scroll > 4) state.pendingClose = false;
    else if (l.direction < 0) state.pendingClose = true;
  });
  addEventListener('scroll', () => {
    if (!state.opened && !state.opening && !state.closing && window.scrollY > 0) toTop();
  }, { passive: true });
  gsap.ticker.add(() => {
    if (state.pendingClose && !state.lb && !state.rebuilding && tl && tl.progress() < 0.002) closeEnvelope();
  });

  /* ───────── 手勢 ───────── */
  let drag = null;
  const canGesture = () => state.ready && !state.opened && !state.opening && !state.closing && !state.lb;

  addEventListener('pointerdown', (e) => {
    if (!canGesture() || e.button > 0) return;
    if (e.target.closest('#hintOpen')) return;
    drag = { y: e.clientY, x: e.clientX, p0: openTl.progress(), p: openTl.progress(), moved: false };
    document.body.classList.add('dragging');
    stopBob();
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = drag.y - e.clientY;
    if (Math.abs(dy) > 6 || Math.abs(e.clientX - drag.x) > 6) drag.moved = true;
    drag.p = clamp(0, 1, drag.p0 + dy / (G.envH * 1.15));
    gsap.to(openTl, { progress: drag.p, duration: 0.5, ease: 'power3.out', overwrite: true });
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    document.body.classList.remove('dragging');
    if (!d.moved || d.p > 0.3) finishOpen();
    else cancelOpen();
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  hintOpen.addEventListener('click', () => canGesture() && finishOpen());

  // 滑鼠滾輪也能拆信；已打開時在最上面往上滾就闔上
  let wheelP = null, wheelTimer;
  addEventListener('wheel', (e) => {
    if (state.lb) return;
    if (!state.opened) {
      if (!canGesture()) return;
      if (wheelP === null) { wheelP = openTl.progress(); stopBob(); }
      wheelP = clamp(0, 1, wheelP + e.deltaY / 900);
      gsap.to(openTl, { progress: wheelP, duration: 0.5, ease: 'power3.out', overwrite: true });
      clearTimeout(wheelTimer);
      const settle = () => { const p = wheelP; wheelP = null; p > 0.3 ? finishOpen() : cancelOpen(); };
      if (wheelP >= 1) settle();
      else wheelTimer = setTimeout(settle, 180);
      return;
    }
    if (!state.closing && lenis.scroll <= 1 && e.deltaY < -2) state.pendingClose = true;
  }, { passive: true });

  // iOS Safari 不一定理會 overflow:hidden；未拆封、闔上中、看照片時直接擋掉觸控捲動與回彈
  addEventListener('touchmove', (e) => {
    if (!state.opened || state.closing || state.lb) e.preventDefault();
  }, { passive: false });

  let touchY = null;
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null || !state.opened || state.closing || state.lb) return;
    if (lenis.scroll <= 1 && e.touches[0].clientY - touchY > 46) { state.pendingClose = true; touchY = null; }
  }, { passive: true });

  replay.addEventListener('click', () => {
    lenis.scrollTo(0, { duration: 3.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
  });

  /* ───────── 照片燈箱 ───────── */
  const LB = {
    el: $('#lb'), backdrop: $('#lbBackdrop'), note: $('#lbNote'), text: $('#lbText'),
    btns: [$('#lbClose'), $('#lbPrev'), $('#lbNext')],
    idx: -1, card: null, busy: false, g: null,
  };

  function lbGeom() {
    const vw = innerWidth, vh = innerHeight;
    if (vw >= 900) {
      const noteW = Math.min(340, vw * 0.28);
      const TW = Math.min(520, (vh - 140) / CARD, vw - noteW - 240);
      const left = (vw - (TW + 56 + noteW)) / 2;
      return { wide: true, TW, TH: TW * CARD, cx: left + TW / 2, cy: vh / 2, noteLeft: left + TW + 56, noteW };
    }
    const sa = safe();
    const noteH = 150, btnSpace = 70 + sa.bottom, topSpace = 60 + sa.top;
    const TW = Math.min(vw * 0.82, 460, (vh - noteH - btnSpace - topSpace - 10) / CARD);
    const TH = TW * CARD;
    const top = Math.max(topSpace, topSpace + (vh - topSpace - btnSpace - (TH + 22 + noteH)) / 2);
    const noteW = Math.min(vw - 32, 460);
    return { wide: false, TW, TH, cx: vw / 2, cy: top + TH / 2, noteLeft: (vw - noteW) / 2, noteTop: top + TH + 22, noteW };
  }
  function placeNote(g) {
    Object.assign(LB.note.style, { left: g.noteLeft + 'px', width: g.noteW + 'px' });
    if (g.wide) { LB.note.style.top = g.cy + 'px'; LB.note.style.transform = ''; gsap.set(LB.note, { yPercent: -50 }); }
    else { LB.note.style.top = g.noteTop + 'px'; gsap.set(LB.note, { yPercent: 0 }); }
  }
  function fillNote(i) {
    LB.text.textContent = D.photos[i].note;
  }
  function makeCard(i, g) {
    const c = photoEls[i].cloneNode(true);
    c.removeAttribute('style');
    c.removeAttribute('tabindex');
    c.removeAttribute('role');
    c.classList.add('lb-card');
    c.classList.remove('lifted');
    Object.assign(c.style, {
      position: 'fixed', margin: '0',
      left: g.cx - g.TW / 2 + 'px', top: g.cy - g.TH / 2 + 'px',
      width: g.TW + 'px', height: g.TH + 'px', fontSize: g.TW / 14 + 'px',
    });
    LB.el.appendChild(c);
    return c;
  }
  function fromPhoto(i, g) {
    const el = photoEls[i], r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - g.cx,
      y: r.top + r.height / 2 - g.cy,
      scale: (G.pw * gsap.getProperty(el, 'scale')) / g.TW,
      rotation: gsap.getProperty(el, 'rotation'),
    };
  }

  function openLB(i) {
    if (LB.busy || state.lb) return;
    LB.busy = true;
    state.lb = true;
    lenis.stop();
    const g = (LB.g = lbGeom());
    LB.idx = i;
    fillNote(i);
    placeNote(g);
    gsap.set(LB.el, { autoAlpha: 1 });
    LB.el.setAttribute('aria-hidden', 'false');
    const c = (LB.card = makeCard(i, g));
    photoEls[i].classList.add('lifted');
    gsap.fromTo(c, fromPhoto(i, g), { x: 0, y: 0, scale: 1, rotation: -1.2, duration: 0.9, ease: 'expo.out' });
    gsap.fromTo(LB.backdrop, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' });
    gsap.fromTo(LB.note, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, delay: 0.3, ease: 'power3.out' });
    gsap.fromTo(LB.btns, { autoAlpha: 0, scale: 0.8 }, {
      autoAlpha: 1, scale: 1, duration: 0.4, delay: 0.35, stagger: 0.05, ease: 'back.out(2)',
      onComplete: () => { LB.busy = false; },
    });
    LB.btns[0].focus({ preventScroll: true });
  }
  function closeLB() {
    if (LB.busy || !state.lb) return;
    LB.busy = true;
    const i = LB.idx, c = LB.card;
    gsap.to(LB.note, { autoAlpha: 0, y: 16, duration: 0.25 });
    gsap.to(LB.btns, { autoAlpha: 0, duration: 0.2 });
    gsap.to(LB.backdrop, { opacity: 0, duration: 0.55, delay: 0.1 });
    gsap.to(c, {
      ...fromPhoto(i, LB.g), duration: 0.75, ease: 'power3.inOut',
      onComplete: () => {
        photoEls[i].classList.remove('lifted');
        c.remove();
        gsap.set(LB.el, { autoAlpha: 0 });
        LB.el.setAttribute('aria-hidden', 'true');
        state.lb = false;
        LB.busy = false;
        lenis.start();
        photoEls[i].focus({ preventScroll: true });
      },
    });
  }
  function forceCloseLB() {
    if (!state.lb) return;
    gsap.killTweensOf([LB.card, LB.note, LB.backdrop, ...LB.btns]);
    LB.card && LB.card.remove();
    photoEls.forEach((el) => el.classList.remove('lifted'));
    gsap.set(LB.el, { autoAlpha: 0 });
    state.lb = false;
    LB.busy = false;
    lenis.start();
  }
  function goLB(dir) {
    if (LB.busy || !state.lb) return;
    LB.busy = true;
    const n = photoEls.length, oldI = LB.idx, old = LB.card, i = (oldI + dir + n) % n, g = LB.g;
    gsap.to(old, {
      x: -dir * innerWidth * 0.7, rotation: -dir * 14, autoAlpha: 0, duration: 0.55, ease: 'power2.in',
      onComplete: () => old.remove(),
    });
    photoEls[oldI].classList.remove('lifted');
    photoEls[i].classList.add('lifted');
    const c = (LB.card = makeCard(i, g));
    LB.idx = i;
    gsap.fromTo(c, { x: dir * innerWidth * 0.7, rotation: dir * 14, autoAlpha: 0 }, {
      x: 0, rotation: -1.2, autoAlpha: 1, duration: 0.85, delay: 0.12, ease: 'expo.out',
      onComplete: () => { LB.busy = false; },
    });
    gsap.to(LB.note, {
      autoAlpha: 0, y: -10, duration: 0.25,
      onComplete: () => {
        fillNote(i);
        gsap.fromTo(LB.note, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      },
    });
  }

  photoEls.forEach((el, i) => {
    el.addEventListener('click', () => {
      if (!tl || tl.time() < state.photosDone - 0.02) return;
      openLB(i);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });
  $('#lbClose').addEventListener('click', closeLB);
  $('#lbPrev').addEventListener('click', () => goLB(-1));
  $('#lbNext').addEventListener('click', () => goLB(1));
  let lbSwipe = null, swiped = false;
  LB.backdrop.addEventListener('click', () => { if (!swiped) closeLB(); swiped = false; });
  LB.el.addEventListener('pointerdown', (e) => { lbSwipe = { x: e.clientX, y: e.clientY }; swiped = false; });
  LB.el.addEventListener('pointerup', (e) => {
    if (!lbSwipe) return;
    const dx = e.clientX - lbSwipe.x, dy = e.clientY - lbSwipe.y;
    lbSwipe = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { swiped = true; goLB(dx < 0 ? 1 : -1); }
  });

  addEventListener('keydown', (e) => {
    if (state.lb) {
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowRight') goLB(1);
      else if (e.key === 'ArrowLeft') goLB(-1);
      return;
    }
    if (canGesture() && (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && e.target === document.body))) {
      e.preventDefault();
      finishOpen();
    }
  });

  /* ───────── 背景漂浮小物 ───────── */
  function ambient() {
    const box = $('#floats');
    const count = innerWidth < 640 ? 12 : 18;
    for (let i = 0; i < count; i++) {
      const f = document.createElement('span');
      f.className = 'floater';
      f.innerHTML = Math.random() < 0.6 ? HEART : '<i class="dot"></i>';
      const size = rand(7, 18);
      Object.assign(f.style, { width: size + 'px', height: size + 'px', left: rand(2, 98) + '%', color: PALETTE[i % PALETTE.length] });
      box.appendChild(f);
      gsap.set(f, { opacity: rand(0.25, 0.6), rotation: rand(-30, 30) });
      if (reduce) { gsap.set(f, { y: rand(0, innerHeight) }); continue; }
      gsap.fromTo(f, { y: () => innerHeight + 30 }, { y: -40, duration: rand(18, 34), ease: 'none', repeat: -1 }).progress(Math.random());
      gsap.to(f, { x: rand(-40, 40), duration: rand(3, 6), ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
  }

  function burst(count, radius) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('i');
      el.innerHTML = i % 3 === 0 ? '<span class="dot"></span>' : HEART;
      el.style.color = PALETTE[i % PALETTE.length];
      introFx.appendChild(el);
      const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const r = radius * rand(0.75, 1.15);
      gsap.fromTo(el, { x: 0, y: 0, scale: 0 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: rand(0.6, 1.2), rotation: rand(-90, 90), duration: 1, ease: 'expo.out' });
      gsap.to(el, { opacity: 0, duration: 0.5, delay: 0.5, onComplete: () => el.remove() });
    }
  }

  /* ───────── 開場三秒 ───────── */
  function intro() {
    const vh = innerHeight;
    const heartPx = introHeart.offsetWidth;
    const S = G.envW * 0.22, sealHeart = S * 0.26;
    gsap.set(scene, { y: -vh * 1.1, transformOrigin: `50% ${vh / 2 + G.envH / 2}px` });
    gsap.set(introHeart, { xPercent: -50, yPercent: -50, y: -G.envH * 0.22, scale: 0 });
    gsap.set(introChars, { opacity: 0 });

    const it = gsap.timeline({ delay: 0.15 });
    it.fromTo('#bg', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0)
      .fromTo(introHeart, { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(3)' }, 0.1)
      .to(introHeart, { scale: 1.16, duration: 0.13, yoyo: true, repeat: 3, ease: 'power1.inOut' }, 0.68)
      .add(() => burst(12, Math.min(innerWidth * 0.3, 150)), 0.72)
      // 名字一個字一個字彈出來，接著 Happy 100 Days 歪歪地蹦出來，最後畫一條手寫底線
      .fromTo(nameChars, { yPercent: 120, opacity: 0, rotation: () => rand(-18, 18) },
        { yPercent: 0, opacity: 1, rotation: 0, duration: 0.55, stagger: 0.05, ease: 'back.out(2.2)' }, 0.75)
      .fromTo(titleChars, { yPercent: 70, scale: 0.4, opacity: 0, rotation: () => rand(-24, 24) },
        { yPercent: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.035, ease: 'back.out(2.6)' }, 0.95)
      .fromTo('#itSwash', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 1.4)
      .fromTo('.it-spark', { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(3)' }, 1.55)
      // 信封從天而降，愛心化成封蠟
      .to(scene, { y: 0, duration: 0.6, ease: 'power3.in' }, 1.45)
      .to(introHeart, { y: -G.envH * 0.34, scale: 1.08, duration: 0.3, ease: 'power2.out' }, 1.45)
      .to(introHeart, { y: G.envH * 0.01 + S * 0.018, scale: sealHeart / heartPx, rotation: 360, duration: 0.3, ease: "power2.in" }, 1.75)
      .set(letter, { autoAlpha: 1 }, 2.05)
      .set(introHeart, { autoAlpha: 0 }, 2.05)
      .fromTo(seal, { autoAlpha: 0, scale: 1.45 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'elastic.out(1, .45)' }, 2.05)
      .to(scene, { scaleY: 0.9, scaleX: 1.06, duration: 0.09, ease: 'power1.out' }, 2.05)
      .to(scene, { scaleY: 1, scaleX: 1, duration: 0.75, ease: 'elastic.out(1, .38)' }, 2.14)
      .fromTo(hintOpen, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 2.4)
      .add(() => { state.ready = true; startBob(); }, 2.55);
    if (reduce) it.timeScale(2.5);
  }

  /* ───────── 視窗大小改變 ───────── */
  function rebuild() {
    state.rebuilding = true;
    state.pendingClose = false;
    clearTimeout(state.rbT);
    state.rbT = setTimeout(() => { state.rebuilding = false; }, 500);
    forceCloseLB();
    const prog = st ? st.progress : 0;
    const op = openTl.progress();
    st && st.kill();
    tl && tl.kill();
    openTl.kill();
    build();
    openTl = buildOpen();
    if (op > 0) openTl.progress(op);
    ScrollTrigger.refresh();
    tl.progress(prog);
    lenis.scrollTo(prog * ScrollTrigger.maxScroll(window), { immediate: true, force: true });
  }
  let lastW = innerWidth, lastH = innerHeight, rT;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      const w = innerWidth, h = innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 140 && matchMedia('(pointer: coarse)').matches) return;
      lastW = w;
      lastH = h;
      rebuild();
    }, 220);
  });

  // 開發用：網址加上 ?debug 可以在 console 操作時間軸
  if (location.search.includes('debug')) window.__dbg = { get openTl() { return openTl; }, get tl() { return tl; }, state };

  /* ───────── 背景音樂 ───────── */
  const M = D.music || {};
  const bgm = $('#bgm'), soundBtn = $('#soundBtn'), gate = $('#gate');
  const hasMusic = !!M.file;
  let userMuted = false, resumeOnShow = false;
  if (hasMusic) bgm.src = encodeURI(M.file);
  setText('#gateHint', M.soundHint);
  setText('#gateBtn', M.start);

  function playMusic() {
    if (!hasMusic) return;
    bgm.volume = 0;
    const p = bgm.play();
    if (p && p.catch) p.catch(() => {});
    // 電腦上慢慢淡入；iPhone 不允許網頁改音量，會直接用手機音量播
    gsap.to(bgm, { volume: clamp(0, 1, M.volume ?? 0.7), duration: 2.5, ease: 'sine.out' });
  }
  function setMuted(m) {
    userMuted = m;
    bgm.muted = m;
    soundBtn.classList.toggle('muted', m);
    soundBtn.setAttribute('aria-label', m ? '開啟聲音' : '靜音');
    if (!m && bgm.paused) playMusic();
  }
  // 按聲音鈕不要被當成拆信手勢
  soundBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  soundBtn.addEventListener('click', (e) => { e.stopPropagation(); setMuted(!userMuted); });
  // 切到別的 App 時暫停，回來再接著播
  document.addEventListener('visibilitychange', () => {
    if (!hasMusic) return;
    if (document.hidden) { resumeOnShow = !bgm.paused; bgm.pause(); }
    else if (resumeOnShow && !userMuted) bgm.play().catch(() => {});
  });

  /* ───────── 開始 ───────── */
  gsap.set('#bg', { opacity: 0 });
  gsap.set(scene, { y: -innerHeight * 1.1 });
  const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]);
  fontsReady.then(() => {
    build();
    openTl = buildOpen();
    ambient();

    if (!hasMusic) { gate.hidden = true; intro(); }
    else {
      // 先提醒打開聲音；點一下＝開始播音樂（iPhone 規定要使用者先點過）＋開始開場動畫
      gsap.fromTo('.gate-in', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
      let started = false;
      const go = () => {
        if (started) return;
        started = true;
        playMusic();
        gsap.to('.gate-in', { scale: 0.92, opacity: 0, duration: 0.4, ease: 'power2.in' });
        gsap.to(gate, { opacity: 0, duration: 0.6, delay: 0.15, ease: 'power1.inOut', onComplete: () => { gate.hidden = true; } });
        gsap.to(soundBtn, { autoAlpha: 1, duration: 0.5, delay: 2.8 });
        gsap.delayedCall(0.35, intro);
      };
      gate.addEventListener('click', go);
      gate.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      gate.focus({ preventScroll: true });
    }
    // 中文字型是分段下載的，字型晚到導致信的長度改變時，重新量一次
    let lastPcH = pc.offsetHeight, fT;
    document.fonts.addEventListener('loadingdone', () => {
      clearTimeout(fT);
      fT = setTimeout(() => {
        if (Math.abs(pc.offsetHeight - lastPcH) > 2) { lastPcH = pc.offsetHeight; rebuild(); }
      }, 300);
    });
  });
})();
