/* 퍼즐 그림 8장: 직접 그린 SVG (가로 800 × 세로 600, 4:3) */
(function () {
  const svg = (body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><defs>${defs}</defs>${body}</svg>`;

  // 늘 같은 자리에 찍히는 난수 (그림이 매번 똑같이 나오게)
  function rng(seed) {
    return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  }
  const grad = (id, a, b) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  function star(x, y, r, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push((x + Math.cos(a) * rr).toFixed(1) + ',' + (y + Math.sin(a) * rr).toFixed(1));
    }
    return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
  }
  function flower(x, y, r, petal, stem = true) {
    let s = stem ? `<path d="M${x} ${y} q-6 40 2 80" stroke="#3FA65A" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="${x - 14}" cy="${y + 45}" rx="14" ry="7" fill="#4DBA68" transform="rotate(-30 ${x - 14} ${y + 45})"/>` : '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      s += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${r * 0.75}" fill="${petal}"/>`;
    }
    return s + `<circle cx="${x}" cy="${y}" r="${r * 0.7}" fill="#FFD45C"/>`;
  }
  function stars(seed, n, area, colors) {
    const rand = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = area[0] + rand() * area[2], y = area[1] + rand() * area[3];
      const c = colors[i % colors.length];
      s += rand() < 0.35 ? star(x, y, 6 + rand() * 8, c) : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + rand() * 2.5).toFixed(1)}" fill="${c}"/>`;
    }
    return s;
  }
  const cloud = (x, y, k = 1, c = '#fff') =>
    `<g fill="${c}"><ellipse cx="${x}" cy="${y}" rx="${60 * k}" ry="${28 * k}"/><circle cx="${x - 25 * k}" cy="${y - 18 * k}" r="${26 * k}"/><circle cx="${x + 18 * k}" cy="${y - 26 * k}" r="${32 * k}"/></g>`;

  /* 1. 도깨비 친구 */
  const dokkaebi = svg(`
    <rect width="800" height="600" fill="url(#d-sky)"/>
    <circle cx="660" cy="110" r="58" fill="#FFF3B0"/><circle cx="640" cy="95" r="10" fill="#F5E58F"/><circle cx="680" cy="130" r="14" fill="#F5E58F"/>
    ${stars(7, 22, [20, 20, 760, 250], ['#fff', '#FFF3B0', '#FFE0F0'])}
    <path d="M0 470 Q200 400 400 450 T800 430 V600 H0Z" fill="#8EDB8A"/>
    <path d="M0 525 Q300 480 520 530 T800 515 V600 H0Z" fill="#62C06A"/>
    ${flower(90, 500, 12, '#FF8FB1', false)}${flower(160, 540, 10, '#B79CFF', false)}${flower(700, 520, 12, '#FFB37A', false)}${flower(640, 560, 9, '#fff', false)}
    <rect x="345" y="440" width="44" height="80" rx="18" fill="#3FA9BD"/><rect x="411" y="440" width="44" height="80" rx="18" fill="#3FA9BD"/>
    <ellipse cx="362" cy="522" rx="34" ry="16" fill="#2F8A9C"/><ellipse cx="438" cy="522" rx="34" ry="16" fill="#2F8A9C"/>
    <ellipse cx="400" cy="380" rx="120" ry="105" fill="#5CC8DA"/>
    <g clip-path="url(#d-body)">
      <rect x="270" y="400" width="260" height="120" fill="#FFD45C"/>
      <path d="M300 400 l22 0 l-12 120 l-22 0z M360 400 l22 0 l-6 120 l-22 0z M420 400 l22 0 l2 120 l-22 0z M480 400 l22 0 l8 120 l-22 0z" fill="#3B2F4A"/>
    </g>
    <ellipse cx="400" cy="345" rx="62" ry="45" fill="#8EE0EC"/>
    <ellipse cx="282" cy="360" rx="28" ry="55" fill="#4FB7C9" transform="rotate(25 282 360)"/>
    <ellipse cx="518" cy="345" rx="28" ry="55" fill="#4FB7C9" transform="rotate(-50 518 345)"/>
    <g transform="rotate(28 560 260)">
      <path d="M540 330 L548 170 Q560 130 572 170 L580 330 Z" fill="#B9733C"/>
      <path d="M528 230 Q560 100 592 230 Q590 270 560 272 Q530 270 528 230Z" fill="#C98546"/>
      <circle cx="548" cy="205" r="7" fill="#FFE08A"/><circle cx="572" cy="190" r="7" fill="#FFE08A"/><circle cx="560" cy="240" r="7" fill="#FFE08A"/><circle cx="548" cy="250" r="6" fill="#FFE08A"/><circle cx="575" cy="228" r="6" fill="#FFE08A"/>
    </g>
    <circle cx="548" cy="310" r="26" fill="#5CC8DA"/>
    <path d="M300 205 L268 150 L322 182Z M500 205 L532 150 L478 182Z" fill="#4FB7C9"/>
    <circle cx="400" cy="225" r="108" fill="#5CC8DA"/>
    <path d="M378 130 Q398 40 428 128 Z" fill="#FFD45C" stroke="#E8B530" stroke-width="5" stroke-linejoin="round"/>
    <path d="M345 128 q15 -25 30 -5 q12 -22 28 -4 q14 -20 30 0 q14 -18 26 6" fill="none" stroke="#2F8A9C" stroke-width="9" stroke-linecap="round"/>
    <ellipse cx="338" cy="262" rx="20" ry="12" fill="#FF9FC0"/><ellipse cx="462" cy="262" rx="20" ry="12" fill="#FF9FC0"/>
    <circle cx="362" cy="214" r="28" fill="#fff"/><circle cx="438" cy="214" r="28" fill="#fff"/>
    <circle cx="368" cy="218" r="14" fill="#3B2F4A"/><circle cx="432" cy="218" r="14" fill="#3B2F4A"/>
    <circle cx="373" cy="212" r="5" fill="#fff"/><circle cx="437" cy="212" r="5" fill="#fff"/>
    <path d="M336 178 q24 -14 46 0 M418 178 q24 -14 46 0" stroke="#2F8A9C" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M352 262 Q400 318 448 262 Q400 285 352 262Z" fill="#3B2F4A"/>
    <path d="M368 270 l10 0 l-5 14z M422 270 l10 0 l-5 14z" fill="#fff"/>
  `, grad('d-sky', '#B9A6FF', '#FFC2DA') + '<clipPath id="d-body"><ellipse cx="400" cy="380" rx="120" ry="105"/></clipPath>');

  /* 2. 바닷속 친구들 */
  const sea = svg(`
    <rect width="800" height="600" fill="url(#s-bg)"/>
    <g fill="#fff" opacity=".18"><polygon points="120,0 200,0 330,600 230,600"/><polygon points="380,0 430,0 520,600 450,600"/><polygon points="620,0 700,0 760,600 680,600"/></g>
    <path d="M0 520 Q200 485 400 520 T800 505 V600 H0Z" fill="#FFE3A3"/>
    <path d="M0 560 Q250 540 450 565 T800 555 V600 H0Z" fill="#F5D08A"/>
    <g stroke-linecap="round" fill="none">
      <path d="M70 540 q-25 -50 0 -100 q25 -50 0 -110" stroke="#3CB371" stroke-width="16"/>
      <path d="M115 545 q20 -40 0 -80 q-20 -45 5 -90" stroke="#2E9E5E" stroke-width="13"/>
      <path d="M720 530 q-25 -50 0 -100 q25 -50 0 -100" stroke="#3CB371" stroke-width="16"/>
      <path d="M760 540 q20 -40 0 -80" stroke="#2E9E5E" stroke-width="13"/>
    </g>
    <ellipse cx="180" cy="530" rx="60" ry="32" fill="#9B8FC9"/><ellipse cx="640" cy="535" rx="48" ry="26" fill="#8A7FBF"/>
    ${star(300, 548, 30, '#FFD45C')}<circle cx="300" cy="548" r="6" fill="#F5B830"/>
    <path d="M660 560 q20 -50 40 0 z" fill="#FFB5C9"/><path d="M670 560 l10 -38 M690 560 l-10 -38" stroke="#F58CAB" stroke-width="3"/>
    <g transform="translate(250 250)">
      <path d="M-62 0 L-110 -38 L-104 0 L-110 38 Z" fill="#FF8A3D"/>
      <ellipse cx="0" cy="0" rx="72" ry="44" fill="#FF8A3D"/>
      <g clip-path="url(#s-fish)"><rect x="-38" y="-50" width="18" height="100" fill="#fff"/><rect x="18" y="-50" width="18" height="100" fill="#fff"/></g>
      <path d="M-10 -40 q20 -30 40 -2 z" fill="#FF8A3D"/>
      <circle cx="44" cy="-10" r="11" fill="#fff"/><circle cx="47" cy="-10" r="6" fill="#3B2F4A"/>
      <path d="M58 14 q8 6 14 0" stroke="#3B2F4A" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
    <g transform="translate(590 170)">
      <path d="M40 0 L78 -26 L72 0 L78 26 Z" fill="#FFD45C"/>
      <ellipse cx="0" cy="0" rx="48" ry="30" fill="#4C8DF6"/>
      <path d="M-10 -30 q10 30 0 60 M15 -28 q10 28 0 56" stroke="#FFD45C" stroke-width="7" fill="none"/>
      <circle cx="-26" cy="-6" r="8" fill="#fff"/><circle cx="-28" cy="-6" r="4" fill="#3B2F4A"/>
    </g>
    <g transform="translate(540 400)">
      <g fill="none" stroke="#FF7FB0" stroke-width="18" stroke-linecap="round">
        <path d="M-50 20 q-30 40 -10 70 q15 15 25 0"/><path d="M-20 30 q-10 50 10 70"/><path d="M15 30 q15 50 -5 75"/><path d="M45 20 q35 40 15 70 q-12 15 -25 2"/>
      </g>
      <ellipse cx="0" cy="-10" rx="70" ry="62" fill="#FF8FB8"/>
      <ellipse cx="-22" cy="-30" rx="14" ry="10" fill="#FFC2D8"/>
      <circle cx="-24" cy="0" r="12" fill="#fff"/><circle cx="24" cy="0" r="12" fill="#fff"/>
      <circle cx="-22" cy="2" r="6" fill="#3B2F4A"/><circle cx="26" cy="2" r="6" fill="#3B2F4A"/>
      <path d="M-14 26 q14 12 28 0" stroke="#3B2F4A" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g fill="none" stroke="#fff" stroke-width="4" opacity=".85">
      <circle cx="340" cy="210" r="10"/><circle cx="360" cy="170" r="14"/><circle cx="350" cy="120" r="8"/>
      <circle cx="500" cy="120" r="12"/><circle cx="520" cy="80" r="7"/><circle cx="160" cy="140" r="16"/><circle cx="420" cy="320" r="9"/>
    </g>
  `, grad('s-bg', '#A6ECFF', '#3A8DDE') + '<clipPath id="s-fish"><ellipse cx="0" cy="0" rx="72" ry="44"/></clipPath>');

  /* 3. 우주 여행 */
  const space = svg(`
    <rect width="800" height="600" fill="url(#p-bg)"/>
    ${stars(21, 70, [0, 0, 800, 600], ['#fff', '#FFF3B0', '#C9B8FF', '#A6ECFF'])}
    <g transform="rotate(-18 640 140)">
      <ellipse cx="640" cy="140" rx="130" ry="26" fill="none" stroke="#FFE08A" stroke-width="14"/>
      <circle cx="640" cy="140" r="72" fill="#FFB35C"/>
      <path d="M572 115 Q640 100 708 115 M570 150 Q640 165 710 150" stroke="#F58F3D" stroke-width="12" fill="none"/>
      <path d="M512 140 A130 26 0 0 0 768 140" fill="none" stroke="#FFE08A" stroke-width="14"/>
    </g>
    <circle cx="140" cy="120" r="40" fill="#7EE0A0"/><circle cx="128" cy="108" r="9" fill="#5CC883"/><circle cx="152" cy="132" r="6" fill="#5CC883"/>
    <circle cx="130" cy="500" r="110" fill="#DCD8EE"/>
    <circle cx="90" cy="470" r="22" fill="#C3BEDD"/><circle cx="170" cy="530" r="28" fill="#C3BEDD"/><circle cx="150" cy="440" r="12" fill="#C3BEDD"/><circle cx="80" cy="560" r="14" fill="#C3BEDD"/>
    <path d="M560 470 l200 -90" stroke="#A6ECFF" stroke-width="10" stroke-linecap="round" opacity=".45"/>
    <circle cx="560" cy="470" r="16" fill="#E9FBFF"/>
    <g transform="rotate(35 410 300)">
      <path d="M380 420 Q410 520 440 420Z" fill="#FFB35C"/><path d="M392 420 Q410 480 428 420Z" fill="#FFE08A"/>
      <path d="M360 340 L320 420 L370 405Z M460 340 L500 420 L450 405Z" fill="#F36F6F"/>
      <path d="M410 150 Q470 220 465 330 L460 420 L360 420 L355 330 Q350 220 410 150Z" fill="#F7F4FF"/>
      <path d="M410 150 Q440 180 452 215 L368 215 Q380 180 410 150Z" fill="#F36F6F"/>
      <circle cx="410" cy="285" r="34" fill="#6FA8F5" stroke="#B9B2D8" stroke-width="10"/>
      <circle cx="398" cy="273" r="9" fill="#C9E2FF"/>
      <rect x="400" y="350" width="20" height="70" rx="6" fill="#F36F6F"/>
    </g>
    <g transform="translate(660 450)">
      <ellipse cx="0" cy="18" rx="62" ry="18" fill="#B79CFF"/>
      <path d="M-34 14 Q0 -48 34 14Z" fill="#C9F2FF" opacity=".9"/>
      <circle cx="0" cy="-2" r="16" fill="#7EE0A0"/><circle cx="-5" cy="-4" r="4" fill="#3B2F4A"/><circle cx="6" cy="-4" r="4" fill="#3B2F4A"/>
      <circle cx="-30" cy="22" r="5" fill="#FFE08A"/><circle cx="0" cy="28" r="5" fill="#FFE08A"/><circle cx="30" cy="22" r="5" fill="#FFE08A"/>
    </g>
  `, grad('p-bg', '#1E1B4B', '#5B3A9A'));

  /* 4. 꽃밭 나들이 */
  let flowers = '';
  [[60, 430, '#FF6F91'], [150, 470, '#FFB37A'], [250, 440, '#B79CFF'], [345, 490, '#FF8FB1'], [460, 450, '#fff'], [560, 485, '#FF6F91'], [650, 440, '#7CC4FF'], [740, 480, '#FFB37A'], [110, 535, '#B79CFF'], [420, 545, '#FFB37A'], [690, 545, '#FF8FB1']]
    .forEach(([x, y, c]) => (flowers += flower(x, y, 15, c)));
  const garden = svg(`
    <rect width="800" height="600" fill="url(#f-sky)"/>
    <g stroke="#FFD45C" stroke-width="8" stroke-linecap="round">
      <path d="M110 20 v-18 M110 180 v18 M30 100 h-18 M190 100 h18 M54 44 l-13 -13 M166 156 l13 13 M166 44 l13 -13 M54 156 l-13 13"/>
    </g>
    <circle cx="110" cy="100" r="55" fill="#FFD45C"/><circle cx="92" cy="92" r="6" fill="#3B2F4A"/><circle cx="128" cy="92" r="6" fill="#3B2F4A"/>
    <path d="M92 115 q18 14 36 0" stroke="#3B2F4A" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${cloud(380, 90, 1.1)}${cloud(640, 140, 0.9)}
    <path d="M0 360 Q160 290 330 350 T660 330 T800 340 V600 H0Z" fill="#A9E59A"/>
    <path d="M0 420 Q220 370 430 420 T800 400 V600 H0Z" fill="#76CC6E"/>
    ${flowers}
    <g transform="translate(560 200) rotate(-10)">
      <ellipse cx="-30" cy="-18" rx="34" ry="26" fill="#FF8FB1"/><ellipse cx="30" cy="-18" rx="34" ry="26" fill="#B79CFF"/>
      <ellipse cx="-24" cy="20" rx="22" ry="18" fill="#FFB5C9"/><ellipse cx="24" cy="20" rx="22" ry="18" fill="#D4C2FF"/>
      <circle cx="-30" cy="-18" r="9" fill="#fff" opacity=".7"/><circle cx="30" cy="-18" r="9" fill="#fff" opacity=".7"/>
      <rect x="-6" y="-34" width="12" height="70" rx="6" fill="#3B2F4A"/>
      <path d="M-3 -32 q-10 -20 -18 -22 M3 -32 q10 -20 18 -22" stroke="#3B2F4A" stroke-width="3" fill="none"/>
    </g>
    <g transform="translate(300 230) rotate(8)">
      <ellipse cx="-6" cy="-30" rx="18" ry="24" fill="#E6F7FF" opacity=".9" transform="rotate(-20 -6 -30)"/>
      <ellipse cx="14" cy="-30" rx="18" ry="24" fill="#E6F7FF" opacity=".9" transform="rotate(20 14 -30)"/>
      <ellipse cx="0" cy="0" rx="38" ry="26" fill="#FFD45C"/>
      <g clip-path="url(#f-bee)"><rect x="-14" y="-30" width="10" height="60" fill="#3B2F4A"/><rect x="8" y="-30" width="10" height="60" fill="#3B2F4A"/></g>
      <circle cx="-26" cy="-4" r="5" fill="#3B2F4A"/><path d="M38 0 l12 0" stroke="#3B2F4A" stroke-width="4"/>
    </g>
  `, grad('f-sky', '#9FDBFF', '#E9F7FF') + '<clipPath id="f-bee"><ellipse cx="0" cy="0" rx="38" ry="26"/></clipPath>');

  /* 5. 공룡 친구 */
  const dino = svg(`
    <rect width="800" height="600" fill="url(#n-sky)"/>
    <circle cx="610" cy="330" r="110" fill="#FFF0A8" opacity=".9"/>
    <circle cx="130" cy="120" r="34" fill="#C9C2D6"/><circle cx="160" cy="80" r="26" fill="#D9D3E3"/><circle cx="190" cy="48" r="18" fill="#E6E1EC"/>
    <path d="M10 420 L120 180 L170 180 L290 420Z" fill="#9C7A6A"/>
    <path d="M120 180 L170 180 L190 225 Q160 205 145 240 Q130 205 102 222Z" fill="#FF6B3D"/>
    <path d="M140 240 q-10 40 6 70 q8 -40 -6 -70Z" fill="#FF8A3D"/>
    <path d="M0 420 Q200 390 400 425 T800 410 V600 H0Z" fill="#A8D86E"/>
    <path d="M0 500 Q260 470 520 505 T800 490 V600 H0Z" fill="#88C356"/>
    <g>
      <path d="M700 430 Q690 330 720 250" stroke="#B9733C" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M720 250 q-70 -10 -100 40 q50 -30 100 -40 q-20 -60 -80 -70 q60 10 80 70 q30 -60 90 -50 q-60 10 -90 50 q70 10 80 70 q-40 -50 -80 -70Z" fill="#3FA65A"/>
    </g>
    <g transform="translate(400 380)">
      <path d="M90 40 Q220 60 250 -20 Q230 80 80 95Z" fill="#6DD47E"/>
      <path d="M-40 60 L-40 140 L-5 140 L-5 70Z M40 60 L40 140 L75 140 L75 70Z" fill="#58BF6A"/>
      <ellipse cx="20" cy="40" rx="120" ry="80" fill="#6DD47E"/>
      <ellipse cx="-5" cy="60" rx="70" ry="46" fill="#E8F7C8"/>
      <path d="M-60 -20 Q-100 -110 -80 -170 L-10 -170 Q0 -90 -10 -30Z" fill="#6DD47E"/>
      <ellipse cx="-60" cy="-185" rx="72" ry="52" fill="#6DD47E"/>
      <path d="M-30 -232 l18 -26 l12 28z M10 -214 l22 -20 l6 30z M30 -170 l28 -10 l-6 28z M50 -110 l30 -4 l-12 26z M90 -60 l30 6 l-18 22z M130 -20 l30 10 l-22 18z" fill="#FFB35C"/>
      <circle cx="-80" cy="-195" r="14" fill="#fff"/><circle cx="-84" cy="-193" r="7" fill="#3B2F4A"/>
      <path d="M-125 -165 q30 22 60 4" stroke="#3B2F4A" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="-50" cy="-168" rx="12" ry="7" fill="#FF9FC0"/>
      <circle cx="40" cy="20" r="10" fill="#58BF6A"/><circle cx="80" cy="0" r="7" fill="#58BF6A"/><circle cx="60" cy="55" r="8" fill="#58BF6A"/>
    </g>
    <g transform="translate(230 520)">
      <ellipse cx="0" cy="0" rx="34" ry="44" fill="#FFFBEA"/>
      <circle cx="-10" cy="-14" r="7" fill="#7CC4FF"/><circle cx="12" cy="8" r="9" fill="#7CC4FF"/><circle cx="-8" cy="22" r="5" fill="#7CC4FF"/>
      <path d="M-30 -8 l12 -10 l10 10 l12 -12 l10 10 l12 -8" stroke="#C9B98F" stroke-width="3" fill="none"/>
    </g>
  `, grad('n-sky', '#FFE3A5', '#FFA5B4'));

  /* 6. 고양이와 털실 */
  let wall = '';
  for (let x = 0; x < 800; x += 80) wall += `<rect x="${x}" y="0" width="40" height="440" fill="#FFD3E0"/>`;
  const cat = svg(`
    <rect width="800" height="600" fill="#FFE8EF"/>${wall}
    <rect x="540" y="60" width="200" height="170" rx="14" fill="#fff"/>
    <rect x="554" y="74" width="172" height="142" rx="6" fill="#A6DFFF"/>
    ${cloud(620, 150, 0.6)}
    <path d="M640 74 V216 M554 145 H726" stroke="#fff" stroke-width="10"/>
    <rect x="0" y="440" width="800" height="160" fill="#E8C9A0"/>
    <path d="M0 470 H800 M0 520 H800 M0 570 H800" stroke="#D9B686" stroke-width="3"/>
    <ellipse cx="380" cy="510" rx="270" ry="60" fill="#B79CFF"/>
    <ellipse cx="380" cy="510" rx="210" ry="42" fill="none" stroke="#D4C2FF" stroke-width="10"/>
    <g transform="translate(110 360)">
      <path d="M-40 0 h80 l-12 90 h-56z" fill="#FF8A65"/>
      <path d="M0 0 q-30 -80 -70 -100 q40 10 70 70 q10 -90 40 -120 q-20 50 -30 120 q30 -60 70 -70 q-40 30 -80 100z" fill="#4DBA68"/>
    </g>
    <g transform="translate(330 380)">
      <path d="M90 90 Q200 80 170 -10 Q160 -40 140 -20 Q170 40 80 60Z" fill="#FFA94D"/>
      <ellipse cx="0" cy="40" rx="110" ry="100" fill="#FFA94D"/>
      <ellipse cx="0" cy="70" rx="60" ry="62" fill="#FFF1DE"/>
      <ellipse cx="-50" cy="130" rx="36" ry="20" fill="#FFB766"/><ellipse cx="50" cy="130" rx="36" ry="20" fill="#FFB766"/>
      <path d="M-80 -170 L-60 -90 L-110 -110Z M80 -170 L60 -90 L110 -110Z" fill="#FFA94D"/>
      <path d="M-82 -150 L-70 -105 L-98 -114Z M82 -150 L70 -105 L98 -114Z" fill="#FFC2D8"/>
      <ellipse cx="0" cy="-90" rx="110" ry="88" fill="#FFA94D"/>
      <path d="M-20 -176 l6 34 M0 -178 v36 M20 -176 l-6 34" stroke="#F0882A" stroke-width="8" stroke-linecap="round"/>
      <path d="M-104 -40 l30 4 M-108 -10 l30 -2 M104 -40 l-30 4 M108 -10 l-30 -2" stroke="#F0882A" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="-40" cy="-95" rx="17" ry="22" fill="#3B2F4A"/><ellipse cx="40" cy="-95" rx="17" ry="22" fill="#3B2F4A"/>
      <circle cx="-34" cy="-103" r="6" fill="#fff"/><circle cx="46" cy="-103" r="6" fill="#fff"/>
      <ellipse cx="-70" cy="-60" rx="16" ry="9" fill="#FF9FC0"/><ellipse cx="70" cy="-60" rx="16" ry="9" fill="#FF9FC0"/>
      <path d="M-9 -66 h18 l-9 10z" fill="#FF7FA8"/>
      <path d="M0 -56 q-10 14 -22 6 M0 -56 q10 14 22 6" stroke="#3B2F4A" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M-30 -62 l-60 -8 M-30 -52 l-60 6 M30 -62 l60 -8 M30 -52 l60 6" stroke="#7A5A3A" stroke-width="2.5"/>
    </g>
    <path d="M520 490 Q600 560 680 520 T760 560" stroke="#4C8DF6" stroke-width="5" fill="none"/>
    <circle cx="590" cy="455" r="50" fill="#7CC4FF"/>
    <path d="M550 430 q40 20 80 0 M545 460 q45 25 90 -5 M560 490 q30 10 60 -10 M570 412 q-10 40 10 88 M610 410 q15 40 0 92" stroke="#4C8DF6" stroke-width="5" fill="none"/>
  `);

  /* 7. 무지개 마을 */
  const bow = ['#FF6F6F', '#FFB35C', '#FFE066', '#7EE0A0', '#7CC4FF', '#B79CFF']
    .map((c, i) => `<path d="M${90 + i * 26} 430 A${310 - i * 26} ${310 - i * 26} 0 0 1 ${710 - i * 26} 430" stroke="${c}" stroke-width="27" fill="none"/>`).join('');
  const house = (x, w, h, wall, roof, door) => `
    <rect x="${x}" y="${470 - h}" width="${w}" height="${h}" fill="${wall}"/>
    <path d="M${x - 14} ${472 - h} L${x + w / 2} ${410 - h} L${x + w + 14} ${472 - h}Z" fill="${roof}"/>
    <rect x="${x + w / 2 - 16}" y="${430}" width="32" height="40" rx="10" fill="${door}"/>
    <rect x="${x + 12}" y="${490 - h}" width="26" height="26" rx="4" fill="#E9F7FF" stroke="#fff" stroke-width="4"/>
    <rect x="${x + w - 38}" y="${490 - h}" width="26" height="26" rx="4" fill="#E9F7FF" stroke="#fff" stroke-width="4"/>`;
  const village = svg(`
    <rect width="800" height="600" fill="url(#v-sky)"/>
    ${bow}
    ${cloud(110, 420, 1.2)}${cloud(690, 420, 1.2)}${cloud(400, 90, 0.8)}
    <path d="M0 440 Q200 410 400 440 T800 430 V600 H0Z" fill="#8EDB8A"/>
    ${house(70, 120, 110, '#FFB5C9', '#F36F6F', '#B9733C')}
    ${house(240, 100, 140, '#FFE08A', '#7CC4FF', '#F36F6F')}
    ${house(470, 110, 120, '#C9F2FF', '#B79CFF', '#FFB35C')}
    ${house(640, 110, 100, '#D4C2FF', '#FF8FB1', '#4C8DF6')}
    <rect x="395" y="400" width="14" height="70" fill="#B9733C"/><circle cx="402" cy="380" r="40" fill="#4DBA68"/><circle cx="380" cy="395" r="26" fill="#62C06A"/>
    <path d="M330 600 Q380 520 400 470 L430 470 Q440 530 520 600Z" fill="#FFE8C2"/>
    ${flower(40, 540, 10, '#FF8FB1', false)}${flower(230, 560, 10, '#B79CFF', false)}${flower(600, 550, 10, '#FFB37A', false)}${flower(740, 570, 10, '#fff', false)}${flower(160, 590, 9, '#FFE066', false)}
  `, grad('v-sky', '#BFE6FF', '#F0FAFF'));

  /* 8. 생일 파티 */
  let dots = '', flags = '';
  const rd = rng(5);
  for (let i = 0; i < 40; i++) dots += `<circle cx="${(rd() * 800).toFixed(0)}" cy="${(rd() * 460).toFixed(0)}" r="${(5 + rd() * 6).toFixed(0)}" fill="${['#FFD3E0', '#D4C2FF', '#C9F2FF', '#FFE3A5'][i % 4]}"/>`;
  ['#FF6F91', '#FFB35C', '#FFE066', '#7EE0A0', '#7CC4FF', '#B79CFF', '#FF6F91', '#FFB35C', '#FFE066', '#7EE0A0']
    .forEach((c, i) => { const x = 20 + i * 80, y = 40 + Math.sin(i / 9 * Math.PI) * 40; flags += `<path d="M${x} ${y} L${x + 70} ${y + (i < 4.5 ? 8 : -8)} L${x + 34} ${y + 62}Z" fill="${c}"/>`; });
  const balloon = (x, y, c) => `<path d="M${x} ${y + 62} q-14 60 8 120" stroke="#9A8FB0" stroke-width="3" fill="none"/><ellipse cx="${x}" cy="${y}" rx="46" ry="58" fill="${c}"/><path d="M${x - 8} ${y + 56} h16 l-8 12z" fill="${c}"/><ellipse cx="${x - 16}" cy="${y - 22}" rx="10" ry="16" fill="#fff" opacity=".5"/>`;
  const gift = (x, w, h, c, rib) => `<rect x="${x}" y="${480 - h}" width="${w}" height="${h}" rx="6" fill="${c}"/><rect x="${x + w / 2 - 8}" y="${480 - h}" width="16" height="${h}" fill="${rib}"/><rect x="${x}" y="${480 - h + 14}" width="${w}" height="14" fill="${rib}"/><path d="M${x + w / 2} ${480 - h} q-30 -30 -30 0 z M${x + w / 2} ${480 - h} q30 -30 30 0 z" fill="${rib}"/>`;
  const party = svg(`
    <rect width="800" height="600" fill="#FFF6DC"/>${dots}
    <path d="M20 40 Q400 120 780 40" stroke="#9A8FB0" stroke-width="4" fill="none"/>${flags}
    ${balloon(110, 200, '#FF8FB1')}${balloon(190, 150, '#7CC4FF')}${balloon(690, 160, '#FFE066')}${balloon(610, 210, '#B79CFF')}
    <rect x="0" y="470" width="800" height="130" fill="#FFB5C9"/>
    <path d="M0 470 H800" stroke="#FF8FB1" stroke-width="10"/>
    ${gift(60, 110, 90, '#7CC4FF', '#FFE066')}${gift(630, 120, 80, '#B79CFF', '#FF6F91')}
    <rect x="260" y="380" width="280" height="100" rx="18" fill="#FFF1DE"/>
    <path d="M260 400 Q285 430 310 400 Q335 430 360 400 Q385 430 410 400 Q435 430 460 400 Q485 430 510 400 Q525 425 540 400 V390 H260Z" fill="#FF8FB1"/>
    <rect x="300" y="300" width="200" height="90" rx="16" fill="#FFF1DE"/>
    <path d="M300 318 Q325 348 350 318 Q375 348 400 318 Q425 348 450 318 Q475 348 500 318 V308 H300Z" fill="#B79CFF"/>
    <circle cx="330" cy="440" r="9" fill="#F36F6F"/><circle cx="400" cy="450" r="9" fill="#F36F6F"/><circle cx="470" cy="440" r="9" fill="#F36F6F"/>
    <rect x="330" y="240" width="14" height="60" rx="4" fill="#7CC4FF"/><rect x="393" y="230" width="14" height="70" rx="4" fill="#FFB35C"/><rect x="456" y="240" width="14" height="60" rx="4" fill="#7EE0A0"/>
    <path d="M337 214 q12 14 0 26 q-12 -12 0 -26Z M400 204 q12 14 0 26 q-12 -12 0 -26Z M463 214 q12 14 0 26 q-12 -12 0 -26Z" fill="#FFB35C"/>
    <path d="M337 224 q5 6 0 12 q-5 -6 0 -12Z M400 214 q5 6 0 12 q-5 -6 0 -12Z M463 224 q5 6 0 12 q-5 -6 0 -12Z" fill="#FFE066"/>
    <circle cx="350" cy="350" r="7" fill="#fff"/><circle cx="400" cy="360" r="7" fill="#fff"/><circle cx="450" cy="350" r="7" fill="#fff"/>
  `);

  window.PUZZLE_PICS = [
    { name: '도깨비 친구', svg: dokkaebi },
    { name: '바닷속', svg: sea },
    { name: '우주 여행', svg: space },
    { name: '꽃밭 나들이', svg: garden },
    { name: '공룡 친구', svg: dino },
    { name: '고양이와 털실', svg: cat },
    { name: '무지개 마을', svg: village },
    { name: '생일 파티', svg: party },
  ];
})();
