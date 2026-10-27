/* 도깨비 다른그림찾기 그림: 그림 조각(나무·물고기·집…)을 장면마다 배치한다.
   다른 곳은 게임할 때마다 조각 중에서 골라 오른쪽 그림만 바꾼다(없애기·색 바꾸기·뒤집기·크게).
   그림 크기는 800×600, 조각은 (0,0)을 가운데로 그리고 s배로 키운다. */
(() => {
  const LINE = '#4A3B33';

  // r: 크기 1일 때 대략의 반지름(누르는 범위), flip: 뒤집으면 달라 보이는지, color: 색 바꾸기가 잘 보이는지
  const PARTS = {
    tree: { r: 52, flip: false, color: true, draw: (c) => `<rect x="-9" y="8" width="18" height="44" rx="4" fill="#8B5A2B"/><circle cx="0" cy="-14" r="38" fill="${c}"/><circle cx="-14" cy="-28" r="11" fill="#fff" opacity=".18"/>` },
    pine: { r: 52, flip: false, color: true, draw: (c) => `<rect x="-7" y="30" width="14" height="22" fill="#6B4423"/><path d="M0 -52 L30 -8 H14 L38 32 H-38 L-14 -8 H-30Z" fill="${c}"/>` },
    flower: { r: 32, flip: false, color: true, draw: (c) => `<path d="M0 0 V40" stroke="#3E9B47" stroke-width="5" stroke-linecap="round"/><ellipse cx="11" cy="28" rx="10" ry="5" fill="#4FB35A" transform="rotate(-30 11 28)"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(Math.cos(a * Math.PI / 180) * 14).toFixed(1)}" cy="${(-12 + Math.sin(a * Math.PI / 180) * 14).toFixed(1)}" r="11" fill="${c}"/>`).join('')}<circle cx="0" cy="-12" r="8" fill="#FFD45C"/>` },
    cloud: { r: 48, flip: false, color: false, draw: (c) => `<g fill="${c}"><circle cx="-22" cy="4" r="20"/><circle cx="2" cy="-8" r="26"/><circle cx="26" cy="4" r="19"/><rect x="-42" y="4" width="86" height="20" rx="10"/></g>` },
    sun: { r: 48, flip: false, color: true, draw: (c) => `<g stroke="${c}" stroke-width="6" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = Math.PI * a / 180; return `<line x1="${(Math.cos(r) * 36).toFixed(1)}" y1="${(Math.sin(r) * 36).toFixed(1)}" x2="${(Math.cos(r) * 48).toFixed(1)}" y2="${(Math.sin(r) * 48).toFixed(1)}"/>`; }).join('')}</g><circle r="28" fill="${c}"/><circle cx="-9" cy="-4" r="3" fill="${LINE}"/><circle cx="9" cy="-4" r="3" fill="${LINE}"/><path d="M-9 8 q9 8 18 0" stroke="${LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
    house: { r: 55, flip: true, color: true, draw: (c) => `<rect x="-38" y="-10" width="76" height="60" fill="#FFF3D6" stroke="${LINE}" stroke-width="3"/><path d="M-48 -8 L0 -52 L48 -8Z" fill="${c}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><rect x="-26" y="18" width="20" height="32" fill="#A0673B" stroke="${LINE}" stroke-width="2"/><rect x="8" y="4" width="20" height="18" fill="#9AD7FF" stroke="${LINE}" stroke-width="2.5"/>` },
    fish: { r: 42, flip: true, color: true, draw: (c) => `<path d="M26 0 L50 -20 L50 20Z" fill="${c}"/><ellipse rx="34" ry="22" fill="${c}"/><path d="M-4 -21 q10 -14 22 -4" fill="${c}"/><circle cx="-18" cy="-5" r="6" fill="#fff"/><circle cx="-19" cy="-5" r="3" fill="#222"/><path d="M4 -12 q7 12 0 24" stroke="#fff" stroke-width="3" fill="none" opacity=".55"/>` },
    bird: { r: 34, flip: true, color: true, draw: (c) => `<path d="M24 -2 L40 4 L24 10Z" fill="#FFB224"/><ellipse rx="28" ry="22" fill="${c}"/><path d="M-6 -2 q-20 -24 -32 -6 q14 4 32 14Z" fill="#fff" opacity=".5"/><circle cx="12" cy="-6" r="4" fill="#222"/>` },
    butterfly: { r: 38, flip: false, color: true, draw: (c) => `<g fill="${c}"><ellipse cx="-18" cy="-12" rx="18" ry="22" transform="rotate(-20 -18 -12)"/><ellipse cx="18" cy="-12" rx="18" ry="22" transform="rotate(20 18 -12)"/><ellipse cx="-14" cy="16" rx="12" ry="14"/><ellipse cx="14" cy="16" rx="12" ry="14"/></g><rect x="-4" y="-22" width="8" height="46" rx="4" fill="${LINE}"/><path d="M-2 -22 q-8 -14 -14 -14 M2 -22 q8 -14 14 -14" stroke="${LINE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
    mushroom: { r: 34, flip: false, color: true, draw: (c) => `<rect x="-12" y="0" width="24" height="30" rx="8" fill="#FFF3D6" stroke="${LINE}" stroke-width="2"/><path d="M-36 4 Q-36 -34 0 -34 Q36 -34 36 4Z" fill="${c}" stroke="${LINE}" stroke-width="2"/><circle cx="-14" cy="-14" r="6" fill="#fff"/><circle cx="12" cy="-20" r="5" fill="#fff"/><circle cx="20" cy="-4" r="4" fill="#fff"/>` },
    apple: { r: 28, flip: true, color: true, draw: (c) => `<circle r="22" fill="${c}"/><path d="M0 -20 q2 -10 6 -14" stroke="#6B4423" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="13" cy="-28" rx="10" ry="5" fill="#4FB35A" transform="rotate(-25 13 -28)"/><circle cx="-8" cy="-7" r="5" fill="#fff" opacity=".45"/>` },
    balloon: { r: 36, flip: false, color: true, draw: (c) => `<path d="M0 30 q-8 14 0 26 q8 12 0 22" stroke="${LINE}" stroke-width="2" fill="none"/><ellipse rx="26" ry="31" fill="${c}"/><path d="M-5 30 h10 l-5 6z" fill="${c}"/><ellipse cx="-9" cy="-12" rx="6" ry="10" fill="#fff" opacity=".4"/>` },
    star: { r: 32, flip: false, color: true, draw: (c) => `<path d="M0 -32 L9 -11 L31 -10 L14 4 L20 26 L0 14 L-20 26 L-14 4 L-31 -10 L-9 -11Z" fill="${c}" stroke-linejoin="round" stroke="${c}" stroke-width="4"/>` },
    boat: { r: 50, flip: true, color: true, draw: (c) => `<path d="M-46 14 H46 L32 38 H-32Z" fill="#A0673B" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><rect x="-3" y="-48" width="6" height="62" fill="${LINE}"/><path d="M6 -46 L40 8 H6Z" fill="${c}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>` },
    rocket: { r: 56, flip: false, color: true, draw: (c) => `<path d="M-12 40 L0 66 L12 40Z" fill="#FFB224"/><path d="M-20 18 L-36 44 L-18 40Z M20 18 L36 44 L18 40Z" fill="${c}"/><path d="M-20 40 V-14 Q-20 -40 0 -58 Q20 -40 20 -14 V40Z" fill="#F4F4F8" stroke="${LINE}" stroke-width="3"/><path d="M-17 -24 Q-14 -42 0 -56 Q14 -42 17 -24Z" fill="${c}"/><circle cy="2" r="10" fill="#7CC4FF" stroke="${LINE}" stroke-width="3"/>` },
    planet: { r: 48, flip: true, color: true, draw: (c) => `<circle r="34" fill="${c}"/><circle cx="-10" cy="-12" r="8" fill="#fff" opacity=".25"/><circle cx="12" cy="10" r="5" fill="#000" opacity=".12"/><ellipse rx="54" ry="12" fill="none" stroke="#FFE79A" stroke-width="6" transform="rotate(-18)"/>` },
    crab: { r: 42, flip: false, color: true, draw: (c) => `<g stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"><path d="M-22 10 l-14 14 M-18 16 l-8 16 M22 10 l14 14 M18 16 l8 16"/><path d="M-24 -6 q-18 -6 -20 -24 M24 -6 q18 -6 20 -24"/></g><circle cx="-44" cy="-28" r="9" fill="${c}"/><circle cx="44" cy="-28" r="9" fill="${c}"/><ellipse rx="30" ry="20" fill="${c}"/><circle cx="-9" cy="-20" r="5" fill="#fff"/><circle cx="9" cy="-20" r="5" fill="#fff"/><circle cx="-9" cy="-20" r="2.5" fill="#222"/><circle cx="9" cy="-20" r="2.5" fill="#222"/>` },
    seaweed: { r: 44, flip: true, color: true, draw: (c) => `<path d="M-8 48 C-24 24 8 12 -8 -12 C-20 -30 0 -40 -4 -52" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M12 48 C2 30 22 22 12 4" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/>` },
    shell: { r: 30, flip: false, color: true, draw: (c) => `<path d="M0 20 L-26 -6 Q0 -36 26 -6Z" fill="${c}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/><path d="M0 20 L-12 -20 M0 20 L0 -24 M0 20 L12 -20" stroke="${LINE}" stroke-width="2" opacity=".6"/><rect x="-8" y="16" width="16" height="8" rx="3" fill="${c}" stroke="${LINE}" stroke-width="2"/>` },
    bubble: { r: 32, flip: true, color: false, draw: (c) => `<g fill="none" stroke="${c}" stroke-width="3" opacity=".9"><circle cx="-8" cy="10" r="16"/><circle cx="16" cy="-12" r="10"/><circle cx="-14" cy="-22" r="7"/></g>` },
    car: { r: 48, flip: true, color: true, draw: (c) => `<path d="M-46 14 V-2 Q-46 -8 -40 -8 L-26 -10 L-14 -30 H18 L34 -10 L44 -8 Q48 -6 48 0 V14Z" fill="${c}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><path d="M-10 -26 H0 V-12 H-20Z M6 -26 H16 L28 -12 H6Z" fill="#CDEBFF"/><circle cx="40" cy="0" r="4" fill="#FFE79A"/><circle cx="-26" cy="16" r="11" fill="#333"/><circle cx="26" cy="16" r="11" fill="#333"/><circle cx="-26" cy="16" r="4" fill="#ccc"/><circle cx="26" cy="16" r="4" fill="#ccc"/>` },
    moon: { r: 38, flip: true, color: true, draw: (c) => `<path d="M10 -34 A34 34 0 1 0 10 34 A26 26 0 1 1 10 -34Z" fill="${c}"/>` },
    goblin: { r: 42, flip: false, color: true, draw: (c) => `<path d="M-22 -26 L-16 -50 L-6 -32Z M22 -26 L16 -50 L6 -32Z" fill="#FFD45C" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/><circle r="34" fill="${c}"/><circle cx="-12" cy="-4" r="9" fill="#fff"/><circle cx="12" cy="-4" r="9" fill="#fff"/><circle cx="-11" cy="-3" r="4.5" fill="#222"/><circle cx="13" cy="-3" r="4.5" fill="#222"/><circle cx="-22" cy="12" r="5" fill="#FF8FB1" opacity=".8"/><circle cx="22" cy="12" r="5" fill="#FF8FB1" opacity=".8"/><path d="M-8 14 q8 8 16 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>` },
    ball: { r: 30, flip: true, color: true, draw: (c) => `<circle r="24" fill="#fff" stroke="${LINE}" stroke-width="2.5"/><path d="M-24 0 A24 24 0 0 1 0 -24 V24 A24 24 0 0 1 -24 0Z" fill="${c}"/><path d="M-17 -17 Q0 0 17 17" stroke="${c}" stroke-width="6" fill="none"/>` },
    tent: { r: 48, flip: true, color: true, draw: (c) => `<path d="M-48 36 L0 -44 L48 36Z" fill="${c}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><path d="M0 -44 L-14 36 H14Z" fill="#fff" opacity=".35"/><path d="M0 -44 V-56 L18 -50 L0 -46" fill="#F0472A"/>` },
    ufo: { r: 48, flip: false, color: true, draw: (c) => `<ellipse cy="-8" rx="22" ry="20" fill="#9AD7FF" stroke="${LINE}" stroke-width="2.5"/><ellipse cy="6" rx="50" ry="16" fill="${c}" stroke="${LINE}" stroke-width="2.5"/><circle cx="-26" cy="6" r="4" fill="#FFE79A"/><circle cy="10" r="4" fill="#FFE79A"/><circle cx="26" cy="6" r="4" fill="#FFE79A"/>` },
    parasol: { r: 54, flip: true, color: true, draw: (c) => `<path d="M0 -30 L-6 56" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/><path d="M-50 -14 Q-2 -64 50 -26 Q36 -34 26 -22 Q14 -34 2 -22 Q-10 -32 -22 -18 Q-34 -26 -50 -14Z" fill="${c}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>` },
    lantern: { r: 32, flip: false, color: true, draw: (c) => `<path d="M0 -44 V-26" stroke="${LINE}" stroke-width="2"/><circle r="30" fill="${c}" opacity=".25"/><rect x="-16" y="-26" width="32" height="44" rx="12" fill="${c}"/><rect x="-10" y="-30" width="20" height="6" rx="2" fill="${LINE}"/><rect x="-10" y="16" width="20" height="6" rx="2" fill="${LINE}"/><path d="M-8 -16 V8 M0 -18 V10 M8 -16 V8" stroke="#fff" stroke-width="1.5" opacity=".45"/>` },
  };

  // [조각, x, y, 크기, 색]
  const SCENES = [
    {
      name: '숲속 소풍', bg: `<rect width="800" height="600" fill="#BFE7FF"/><ellipse cx="200" cy="420" rx="420" ry="140" fill="#9ED97A"/><ellipse cx="640" cy="440" rx="380" ry="150" fill="#8FD16A"/><rect y="440" width="800" height="160" fill="#86C95E"/>`,
      items: [
        ['sun', 690, 90, .9, '#FFD45C'], ['cloud', 160, 80, 1, '#FFFFFF'], ['cloud', 450, 60, .8, '#FFFFFF'], ['bird', 320, 150, .7, '#FF8FB1'],
        ['house', 610, 300, 1.3, '#E8668E'], ['tree', 90, 300, 1.2, '#4FA33C'], ['tree', 250, 330, 1, '#5FB34A'], ['pine', 760, 330, .9, '#2E8B57'],
        ['flower', 120, 500, .9, '#FF6B8A'], ['flower', 300, 520, .9, '#B79CFF'], ['flower', 470, 480, .8, '#FFB224'], ['flower', 700, 520, .9, '#4FA3E8'],
        ['mushroom', 210, 440, .8, '#F0472A'], ['mushroom', 570, 520, .7, '#B79CFF'], ['butterfly', 410, 370, .8, '#FF9F43'],
        ['balloon', 470, 210, .9, '#4FA3E8'], ['apple', 370, 560, .8, '#E53935'], ['ball', 650, 450, .8, '#FF6B8A'],
      ],
    },
    {
      name: '바닷속 친구들', bg: `<defs><linearGradient id="{id}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EDBFA"/><stop offset="1" stop-color="#2B7CC4"/></linearGradient></defs><rect width="800" height="600" fill="url(#{id}sea)"/><ellipse cx="400" cy="620" rx="520" ry="110" fill="#F3DFA2"/>`,
      items: [
        ['fish', 150, 120, 1, '#FFB224'], ['fish', 520, 170, .9, '#FF6B8A'], ['fish', 340, 300, 1.1, '#B79CFF'], ['fish', 650, 320, 1, '#5FD0B0'], ['fish', 220, 420, .8, '#FFD45C'],
        ['crab', 600, 525, .9, '#F0472A'], ['star', 120, 545, .7, '#FF8FB1'], ['star', 430, 560, .6, '#FFD45C'],
        ['seaweed', 60, 460, 1.2, '#2E9E6A'], ['seaweed', 730, 450, 1.3, '#3BAE8E'], ['seaweed', 360, 470, .9, '#1F8A5B'],
        ['shell', 270, 555, .8, '#FFB6C8'], ['bubble', 450, 80, .9, '#FFFFFF'], ['bubble', 720, 130, .8, '#FFFFFF'], ['bubble', 60, 250, .7, '#FFFFFF'],
      ],
    },
    {
      name: '우주 여행', bg: `<rect width="800" height="600" fill="#1B1F4A"/><g fill="#fff" opacity=".55">${[[40, 40], [250, 30], [600, 40], [770, 160], [120, 220], [460, 90], [700, 520], [40, 560], [560, 600 - 40], [380, 200], [90, 380], [520, 380]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,
      items: [
        ['planet', 170, 150, 1.2, '#FF8FB1'], ['planet', 640, 420, 1.4, '#5FD0B0'], ['planet', 740, 560, .6, '#FFB224'], ['moon', 680, 100, 1, '#FFE79A'],
        ['rocket', 400, 300, 1.3, '#F0472A'], ['ufo', 200, 440, 1, '#B79CFF'], ['goblin', 560, 230, .9, '#3D3A7A'],
        ['star', 80, 300, .6, '#FFD45C'], ['star', 330, 80, .5, '#FFFFFF'], ['star', 520, 120, .55, '#FFD45C'], ['star', 770, 280, .5, '#FF8FB1'], ['star', 450, 530, .6, '#7CC4FF'], ['star', 300, 560, .5, '#FFD45C'],
      ],
    },
    {
      name: '우리 마을', bg: `<rect width="800" height="600" fill="#DFF3FF"/><rect y="360" width="800" height="110" fill="#9ED97A"/><rect y="465" width="800" height="100" fill="#8E9AA6"/><g fill="#fff">${[40, 160, 280, 400, 520, 640, 760].map((x) => `<rect x="${x - 25}" y="512" width="50" height="6" rx="3"/>`).join('')}</g><rect y="565" width="800" height="35" fill="#86C95E"/>`,
      items: [
        ['sun', 90, 80, .8, '#FFB224'], ['cloud', 330, 70, 1, '#FFFFFF'], ['cloud', 600, 100, .8, '#FFFFFF'],
        ['house', 120, 320, 1.1, '#F0472A'], ['house', 340, 310, 1, '#4FA3E8'], ['house', 570, 320, 1.15, '#5FD0B0'],
        ['tree', 235, 370, .7, '#4FA33C'], ['tree', 455, 370, .7, '#5FB34A'], ['pine', 730, 330, .9, '#2E8B57'],
        ['car', 190, 505, .9, '#FFB224'], ['car', 560, 510, .9, '#B79CFF'],
        ['balloon', 700, 170, .8, '#FF6B8A'], ['balloon', 760, 210, .7, '#FFD45C'], ['bird', 460, 160, .6, '#5B6BFF'],
      ],
    },
    {
      name: '여름 바닷가', bg: `<rect width="800" height="300" fill="#BFE7FF"/><rect y="300" width="800" height="130" fill="#4FB3E8"/><path d="M0 330 q50 -10 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/><path d="M0 420 Q400 400 800 420 V600 H0Z" fill="#F6DFA4"/>`,
      items: [
        ['sun', 680, 90, .9, '#FFD45C'], ['cloud', 180, 90, 1, '#FFFFFF'], ['bird', 400, 140, .55, '#5E6B7A'], ['bird', 480, 180, .45, '#5E6B7A'],
        ['boat', 220, 330, 1, '#FF6B8A'], ['boat', 580, 350, .85, '#FFD45C'], ['fish', 390, 340, .55, '#FFB224'],
        ['tent', 650, 460, 1, '#B79CFF'], ['parasol', 470, 460, 1, '#F0472A'],
        ['ball', 150, 500, .9, '#4FA3E8'], ['crab', 330, 530, .75, '#FF7043'], ['shell', 640, 560, .8, '#FFB6C8'],
        ['star', 250, 570, .6, '#FF8FB1'], ['star', 760, 570, .5, '#FFB224'],
      ],
    },
    {
      name: '도깨비 마을의 밤', bg: `<rect width="800" height="600" fill="#2C2A5A"/><ellipse cx="200" cy="560" rx="460" ry="160" fill="#3D3A7A"/><ellipse cx="700" cy="580" rx="380" ry="150" fill="#4A4690"/>`,
      items: [
        ['moon', 120, 100, 1.1, '#FFE79A'], ['star', 300, 70, .5, '#FFD45C'], ['star', 540, 110, .5, '#FFFFFF'], ['star', 730, 60, .55, '#FFD45C'],
        ['house', 600, 330, 1.2, '#F0472A'], ['pine', 750, 320, .9, '#2E7D5B'], ['pine', 30, 330, .8, '#2E7D5B'],
        ['goblin', 150, 420, 1, '#5FD0B0'], ['goblin', 380, 440, .95, '#FF8FB1'], ['goblin', 740, 480, .85, '#FFB224'],
        ['mushroom', 260, 545, .75, '#B79CFF'], ['mushroom', 520, 545, .8, '#FF6B8A'],
        ['lantern', 330, 210, .9, '#FFB224'], ['lantern', 460, 240, .8, '#FF6B8A'],
      ],
    },
  ];

  window.SPOT = { PARTS, SCENES };
})();
