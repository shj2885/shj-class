/* 도깨비 다른그림찾기 그림: 그림 조각(나무·물고기·집…)을 장면마다 배치한다.
   다른 곳은 게임할 때마다 조각 중에서 골라 오른쪽 그림만 바꾼다(없애기·색 바꾸기·뒤집기·크게).
   그림 크기는 800×600, 조각은 (0,0)을 가운데로 그리고 s배로 키운다. */
(() => {
  const LINE = '#4A3B33', EYE = '#2A211C';
  const O = `stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"`;

  // 캐릭터 얼굴: 반짝이는 눈, 발그레한 볼, 웃는 입(mouth=false면 입은 캐릭터가 따로 그린다)
  const face = (y, w = 10, mouth = true) => `<circle cx="${-w}" cy="${y}" r="4.5" fill="${EYE}"/><circle cx="${w}" cy="${y}" r="4.5" fill="${EYE}"/><circle cx="${-w + 1.5}" cy="${y - 1.5}" r="1.6" fill="#fff"/><circle cx="${w + 1.5}" cy="${y - 1.5}" r="1.6" fill="#fff"/><ellipse cx="${-w - 6}" cy="${y + 9}" rx="5.5" ry="3.2" fill="#FF7F98" opacity=".6"/><ellipse cx="${w + 6}" cy="${y + 9}" rx="5.5" ry="3.2" fill="#FF7F98" opacity=".6"/>${mouth ? `<path d="M-4.5 ${y + 8} q4.5 4.5 9 0" stroke="${EYE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}`;
  // 선 두른 굵은 꼬리·다리(바깥선 먼저, 그 위에 색)
  const limb = (d, c, w = 7) => `<path d="${d}" stroke="${LINE}" stroke-width="${w + 5}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

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

    // ----- 동물 친구들 (모두 한쪽 팔·꼬리가 달라서 뒤집으면 티가 난다) -----
    bunny: { r: 54, flip: true, color: true, draw: (c) => `<ellipse cx="-11" cy="-46" rx="8" ry="22" fill="${c}" ${O} transform="rotate(-8 -11 -46)"/><ellipse cx="12" cy="-46" rx="8" ry="22" fill="${c}" ${O} transform="rotate(12 12 -46)"/><ellipse cx="-11" cy="-44" rx="3.5" ry="14" fill="#FF9FB8" transform="rotate(-8 -11 -46)"/><ellipse cx="12" cy="-44" rx="3.5" ry="14" fill="#FF9FB8" transform="rotate(12 12 -46)"/><ellipse cx="27" cy="10" rx="6" ry="13" fill="${c}" ${O} transform="rotate(-40 27 10)"/><ellipse cy="30" rx="22" ry="20" fill="${c}" ${O}/><ellipse cy="33" rx="12" ry="11" fill="#fff" opacity=".6"/><ellipse cx="-11" cy="49" rx="9" ry="5" fill="${c}" ${O}/><ellipse cx="11" cy="49" rx="9" ry="5" fill="${c}" ${O}/><circle cy="-6" r="27" fill="${c}" ${O}/>${face(-6)}<g transform="translate(19 -29)"><path d="M0 0 L-10 -7 V7Z M0 0 L10 -7 V7Z" fill="#F0472A" ${O}/><circle r="3.5" fill="#F0472A" ${O}/></g>` },
    bear: { r: 52, flip: true, color: true, draw: (c) => `<circle cx="-20" cy="-27" r="10" fill="${c}" ${O}/><circle cx="20" cy="-27" r="10" fill="${c}" ${O}/><circle cx="-20" cy="-27" r="5" fill="#000" opacity=".15"/><circle cx="20" cy="-27" r="5" fill="#000" opacity=".15"/><path d="M33 8 L38 -26" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="-32" r="10" fill="#FF6B8A" ${O}/><path d="M33 -32 a5 5 0 1 1 5 5" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cy="30" rx="24" ry="20" fill="${c}" ${O}/><ellipse cy="33" rx="14" ry="12" fill="#FFF1DE" opacity=".7"/><ellipse cx="29" cy="12" rx="6" ry="12" fill="${c}" ${O} transform="rotate(-25 29 12)"/><ellipse cx="-12" cy="49" rx="9" ry="5" fill="${c}" ${O}/><ellipse cx="12" cy="49" rx="9" ry="5" fill="${c}" ${O}/><circle cy="-6" r="26" fill="${c}" ${O}/><ellipse cy="5" rx="11" ry="8" fill="#FFF1DE" ${O}/>${face(-10, 11, false)}<ellipse cy="2" rx="4" ry="3" fill="${EYE}"/><path d="M-4 7 q4 4 8 0" stroke="${EYE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` },
    cat: { r: 50, flip: true, color: true, draw: (c) => `${limb('M16 40 C42 42 46 14 32 2', c)}<path d="M-25 -16 L-21 -46 L-4 -30Z M25 -16 L21 -46 L4 -30Z" fill="${c}" ${O}/><path d="M-20 -22 L-19 -38 L-10 -29Z M20 -22 L19 -38 L10 -29Z" fill="#FF9FB8"/><ellipse cy="28" rx="20" ry="19" fill="${c}" ${O}/><ellipse cx="-9" cy="46" rx="8" ry="5" fill="${c}" ${O}/><ellipse cx="9" cy="46" rx="8" ry="5" fill="${c}" ${O}/><ellipse cy="-6" rx="29" ry="24" fill="${c}" ${O}/><path d="M-6 -28 v7 M0 -30 v8 M6 -28 v7" stroke="#000" stroke-width="3" opacity=".18" stroke-linecap="round"/>${face(-6)}<path d="M-14 4 h-16 M-14 8 l-15 4 M14 4 h16 M14 8 l15 4" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"/>` },
    puppy: { r: 50, flip: true, color: true, draw: (c) => `${limb('M-17 38 Q-34 34 -36 16', c, 6)}<ellipse cy="32" rx="20" ry="17" fill="${c}" ${O}/><ellipse cx="-9" cy="48" rx="8" ry="5" fill="${c}" ${O}/><ellipse cx="9" cy="48" rx="8" ry="5" fill="${c}" ${O}/><circle cy="-6" r="26" fill="${c}" ${O}/><ellipse cx="11" cy="-9" rx="10" ry="9" fill="#8B5A3C" opacity=".75"/><ellipse cx="-27" cy="-4" rx="9" ry="18" fill="#8B5A3C" ${O} transform="rotate(18 -27 -4)"/><ellipse cx="27" cy="-4" rx="9" ry="18" fill="#8B5A3C" ${O} transform="rotate(-18 27 -4)"/>${face(-8, 10, false)}<ellipse cy="3" rx="5" ry="3.5" fill="${EYE}"/><ellipse cy="13" rx="4" ry="5" fill="#FF7F98" ${O}/><path d="M-6 8 q6 5 12 0" stroke="${EYE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` },
    penguin: { r: 52, flip: true, color: true, draw: (c) => `<ellipse cx="-12" cy="46" rx="10" ry="5" fill="#FFB224" ${O}/><ellipse cx="12" cy="46" rx="10" ry="5" fill="#FFB224" ${O}/><ellipse cx="-29" cy="12" rx="7" ry="18" fill="${c}" ${O} transform="rotate(15 -29 12)"/><ellipse cx="31" cy="-10" rx="7" ry="18" fill="${c}" ${O} transform="rotate(-50 31 -10)"/><ellipse cy="4" rx="30" ry="42" fill="${c}" ${O}/><ellipse cy="12" rx="21" ry="31" fill="#fff"/>${face(-16, 9, false)}<path d="M-6 -9 H6 L0 -1Z" fill="#FFB224" ${O}/>` },
    dino: { r: 58, flip: true, color: true, draw: (c) => `${[[-30, 2], [-16, -6], [-2, -8], [12, -4]].map(([x, y]) => `<path d="M${x - 7} ${y + 6} L${x} ${y - 12} L${x + 7} ${y + 6}Z" fill="#FFB224" ${O}/>`).join('')}<path d="M-24 20 Q-58 34 -62 6 Q-42 20 -20 4Z" fill="${c}" ${O}/><rect x="-22" y="28" width="12" height="22" rx="5" fill="${c}" ${O}/><rect x="6" y="28" width="12" height="22" rx="5" fill="${c}" ${O}/><ellipse cx="-4" cy="16" rx="30" ry="22" fill="${c}" ${O}/><ellipse cx="0" cy="22" rx="16" ry="12" fill="#fff" opacity=".45"/><circle cx="28" cy="-18" r="23" fill="${c}" ${O}/><g transform="translate(29 -20)">${face(0, 8)}</g>` },
    chick: { r: 36, flip: true, color: true, draw: (c) => `<path d="M-8 26 v8 M8 26 v8" stroke="#FF9F43" stroke-width="4" stroke-linecap="round"/><path d="M-3 -24 q0 -12 6 -4 q4 -10 7 1" fill="${c}" ${O}/><ellipse cx="26" cy="-4" rx="6" ry="11" fill="${c}" ${O} transform="rotate(-45 26 -4)"/><circle r="26" fill="${c}" ${O}/><ellipse cx="-24" cy="6" rx="5" ry="9" fill="${c}" ${O}/>${face(-5, 9, false)}<path d="M-5 2 H5 L0 9Z" fill="#FF9F43" ${O}/>` },
    octopus: { r: 54, flip: true, color: true, draw: (c) => `${['M-24 10 Q-34 34 -22 46', 'M-12 14 Q-16 38 -4 48', 'M4 14 Q4 40 16 46', 'M18 12 Q28 34 36 38', 'M26 2 Q46 -2 48 -24'].map((d) => limb(d, c, 9)).join('')}<ellipse cy="-12" rx="32" ry="30" fill="${c}" ${O}/><circle cx="-12" cy="-30" r="6" fill="#fff" opacity=".35"/>${face(-8, 11)}` },
    turtle: { r: 54, flip: true, color: true, draw: (c) => `<ellipse cx="-24" cy="22" rx="10" ry="7" fill="#8FD16A" ${O}/><ellipse cx="22" cy="22" rx="10" ry="7" fill="#8FD16A" ${O}/><path d="M-36 6 L-48 12 L-36 14Z" fill="#8FD16A" ${O}/><circle cx="42" cy="-6" r="15" fill="#8FD16A" ${O}/><circle cx="46" cy="-10" r="3.5" fill="${EYE}"/><circle cx="47" cy="-11" r="1.3" fill="#fff"/><path d="M42 0 q5 4 10 0" stroke="${EYE}" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="-2" rx="3.5" ry="2" fill="#FF7F98" opacity=".6"/><path d="M-38 10 Q-36 -28 0 -28 Q36 -28 38 10Z" fill="${c}" ${O}/><path d="M-12 -24 L-18 -2 L0 6 L18 -2 L12 -24 M-18 -2 L-36 6 M18 -2 L36 6 M0 6 V10" stroke="#000" stroke-width="2.5" fill="none" opacity=".2"/><rect x="-40" y="6" width="80" height="8" rx="4" fill="${c}" ${O}/>` },
    astro: { r: 52, flip: true, color: true, draw: (c) => `<ellipse cx="-27" cy="26" rx="7" ry="13" fill="#F4F4F8" ${O} transform="rotate(20 -27 26)"/><ellipse cx="28" cy="2" rx="7" ry="13" fill="#F4F4F8" ${O} transform="rotate(-50 28 2)"/><rect x="-22" y="12" width="44" height="38" rx="14" fill="#F4F4F8" ${O}/><rect x="-10" y="22" width="20" height="12" rx="3" fill="#7CC4FF" ${O}/><circle cx="-4" cy="28" r="2" fill="#F0472A"/><circle cx="4" cy="28" r="2" fill="#FFD45C"/><path d="M18 -36 L26 -54" stroke="${LINE}" stroke-width="3"/><circle cx="26" cy="-56" r="5" fill="#F0472A" ${O}/><circle cy="-12" r="31" fill="#DDF3FF" ${O}/><path d="M-12 -24 L-10 -38 L-1 -30Z M12 -24 L10 -38 L1 -30Z" fill="${c}" ${O}/><circle cy="-12" r="19" fill="${c}" ${O}/>${face(-14, 7)}<path d="M-20 -32 q8 -8 18 -8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>` },
    egg: { r: 30, flip: true, color: true, draw: (c) => `<path d="M0 -28 C18 -28 24 0 24 8 C24 22 13 30 0 30 C-13 30 -24 22 -24 8 C-24 0 -18 -28 0 -28Z" fill="#FFF8E6" ${O}/><circle cx="-8" cy="-6" r="5" fill="${c}"/><circle cx="9" cy="10" r="6" fill="${c}"/><circle cx="12" cy="-14" r="3.5" fill="${c}"/>` },
    snowman: { r: 54, flip: true, color: true, draw: (c) => `<circle cy="26" r="28" fill="#fff" ${O}/><path d="M-24 18 L-46 0 M24 18 L44 4 L50 -4" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/><circle cy="-18" r="20" fill="#fff" ${O}/><path d="M-20 -4 Q0 6 20 -4 L22 4 Q0 14 -22 4Z" fill="${c}" ${O}/><path d="M12 2 l6 18 h-8z" fill="${c}" ${O}/><rect x="-16" y="-48" width="32" height="8" rx="2" fill="#3B3B5C"/><rect x="-11" y="-64" width="22" height="18" rx="2" fill="#3B3B5C"/>${face(-22, 7, false)}<path d="M0 -16 L12 -13 L0 -11Z" fill="#FF9F43"/><circle cy="20" r="3" fill="${LINE}"/><circle cy="32" r="3" fill="${LINE}"/>` },
    igloo: { r: 56, flip: true, color: false, draw: (c) => `<path d="M-56 34 A56 56 0 0 1 56 34Z" fill="#F4FBFF" ${O}/><path d="M-50 10 H50 M-36 -14 H36 M-14 -34 H14 M-20 10 V-14 M18 10 V-14 M0 -14 V-34 M-38 34 V10 M2 34 V10 M36 34 V10" stroke="#9FC8E3" stroke-width="2"/><path d="M-30 34 V22 A16 16 0 0 1 2 22 V34Z" fill="#3B5A7A" ${O}/>` },
  };

  // [조각, x, y, 크기, 색]
  const SCENES = [
    {
      name: '숲속 소풍', bg: `<rect width="800" height="600" fill="#BFE7FF"/><ellipse cx="200" cy="420" rx="420" ry="140" fill="#9ED97A"/><ellipse cx="640" cy="440" rx="380" ry="150" fill="#8FD16A"/><rect y="440" width="800" height="160" fill="#86C95E"/>`,
      items: [
        ['sun', 690, 90, .9, '#FFD45C'], ['cloud', 160, 80, 1, '#FFFFFF'], ['cloud', 450, 60, .8, '#FFFFFF'], ['bird', 320, 150, .7, '#FF8FB1'],
        ['house', 610, 300, 1.3, '#E8668E'], ['tree', 90, 300, 1.2, '#4FA33C'], ['tree', 250, 330, 1, '#5FB34A'], ['pine', 760, 330, .9, '#2E8B57'],
        ['flower', 120, 500, .9, '#FF6B8A'], ['flower', 300, 520, .9, '#B79CFF'], ['flower', 430, 555, .8, '#FFB224'], ['flower', 700, 520, .9, '#4FA3E8'],
        ['mushroom', 210, 440, .8, '#F0472A'], ['mushroom', 570, 520, .7, '#B79CFF'], ['butterfly', 410, 370, .8, '#FF9F43'],
        ['balloon', 470, 210, .9, '#4FA3E8'], ['apple', 40, 560, .8, '#E53935'], ['ball', 770, 450, .7, '#FF6B8A'],
        ['bunny', 340, 430, 1.1, '#FFC9DA'], ['bear', 520, 415, 1.1, '#C68B59'], ['chick', 650, 445, .85, '#FFE066'],
      ],
    },
    {
      name: '바닷속 친구들', bg: `<defs><linearGradient id="{id}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EDBFA"/><stop offset="1" stop-color="#2B7CC4"/></linearGradient></defs><rect width="800" height="600" fill="url(#{id}sea)"/><ellipse cx="400" cy="620" rx="520" ry="110" fill="#F3DFA2"/>`,
      items: [
        ['fish', 150, 120, 1, '#FFB224'], ['fish', 520, 170, .9, '#FF6B8A'], ['fish', 340, 300, 1.1, '#B79CFF'], ['fish', 650, 320, 1, '#5FD0B0'], ['fish', 220, 420, .8, '#FFD45C'],
        ['crab', 600, 525, .9, '#F0472A'], ['star', 120, 545, .7, '#FF8FB1'], ['star', 430, 560, .6, '#FFD45C'],
        ['seaweed', 60, 460, 1.2, '#2E9E6A'], ['seaweed', 730, 450, 1.3, '#3BAE8E'], ['seaweed', 360, 470, .9, '#1F8A5B'],
        ['shell', 270, 555, .8, '#FFB6C8'], ['octopus', 480, 420, 1.05, '#FF8FB1'], ['turtle', 160, 290, .9, '#5FB34A'], ['bubble', 450, 80, .9, '#FFFFFF'], ['bubble', 720, 130, .8, '#FFFFFF'], ['bubble', 60, 250, .7, '#FFFFFF'],
      ],
    },
    {
      name: '우주 여행', bg: `<rect width="800" height="600" fill="#1B1F4A"/><g fill="#fff" opacity=".55">${[[40, 40], [250, 30], [600, 40], [770, 160], [120, 220], [460, 90], [700, 520], [40, 560], [560, 600 - 40], [380, 200], [90, 380], [520, 380]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,
      items: [
        ['planet', 170, 150, 1.2, '#FF8FB1'], ['planet', 640, 420, 1.4, '#5FD0B0'], ['planet', 740, 560, .6, '#FFB224'], ['moon', 680, 100, 1, '#FFE79A'],
        ['rocket', 400, 300, 1.3, '#F0472A'], ['ufo', 200, 440, 1, '#B79CFF'], ['astro', 280, 220, 1, '#FFB86B'], ['astro', 745, 390, .75, '#FFC9DA'], ['goblin', 560, 230, .9, '#3D3A7A'],
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
        ['puppy', 290, 415, .9, '#F5E1C0'], ['cat', 470, 415, .85, '#FFB86B'], ['chick', 665, 435, .7, '#FFE066'],
        ['balloon', 700, 170, .8, '#FF6B8A'], ['balloon', 760, 210, .7, '#FFD45C'], ['bird', 460, 160, .6, '#5B6BFF'],
      ],
    },
    {
      name: '여름 바닷가', bg: `<rect width="800" height="300" fill="#BFE7FF"/><rect y="300" width="800" height="130" fill="#4FB3E8"/><path d="M0 330 q50 -10 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/><path d="M0 420 Q400 400 800 420 V600 H0Z" fill="#F6DFA4"/>`,
      items: [
        ['sun', 680, 90, .9, '#FFD45C'], ['cloud', 180, 90, 1, '#FFFFFF'], ['bird', 400, 140, .55, '#5E6B7A'], ['bird', 480, 180, .45, '#5E6B7A'],
        ['boat', 220, 330, 1, '#FF6B8A'], ['boat', 580, 350, .85, '#FFD45C'], ['fish', 390, 340, .55, '#FFB224'],
        ['tent', 650, 460, 1, '#B79CFF'], ['parasol', 470, 460, 1, '#F0472A'], ['bear', 545, 495, .9, '#C68B59'], ['puppy', 370, 470, .8, '#F5E1C0'],
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
        ['mushroom', 260, 545, .75, '#B79CFF'], ['mushroom', 520, 545, .8, '#FF6B8A'], ['cat', 470, 335, .85, '#FFB86B'],
        ['lantern', 330, 210, .9, '#FFB224'], ['lantern', 460, 240, .8, '#FF6B8A'],
      ],
    },
    {
      name: '동물 친구들 놀이터', bg: `<rect width="800" height="600" fill="#CDEEFF"/><ellipse cx="400" cy="520" rx="560" ry="200" fill="#9ED97A"/><rect y="470" width="800" height="130" fill="#8FD16A"/><path d="M60 470 V300 M220 470 V300 M40 300 H240" stroke="#E8668E" stroke-width="10" stroke-linecap="round"/><path d="M110 300 V400 M170 300 V400" stroke="#8B7B6B" stroke-width="3"/><rect x="96" y="398" width="88" height="10" rx="4" fill="#FFB224"/><path d="M560 470 L640 330 H690 V470" fill="none" stroke="#4FA3E8" stroke-width="10" stroke-linejoin="round"/><path d="M690 360 H720 M690 400 H720 M690 440 H720 M720 330 V470" stroke="#4FA3E8" stroke-width="7"/>`,
      items: [
        ['sun', 720, 70, .8, '#FFD45C'], ['cloud', 330, 70, 1, '#FFFFFF'], ['cloud', 540, 120, .7, '#FFFFFF'],
        ['bunny', 140, 340, .8, '#FFFFFF'], ['bear', 640, 290, .7, '#C68B59'], ['cat', 300, 430, .9, '#BDBDCB'], ['puppy', 460, 430, .95, '#F5E1C0'],
        ['chick', 600, 520, .7, '#FFE066'], ['chick', 680, 535, .55, '#FFE066'], ['penguin', 760, 520, .7, '#3B4A6B'],
        ['balloon', 420, 230, .9, '#FF6B8A'], ['balloon', 480, 260, .8, '#4FA3E8'], ['ball', 200, 540, .8, '#FFB224'],
        ['flower', 60, 540, .8, '#FF6B8A'], ['flower', 380, 545, .7, '#B79CFF'], ['butterfly', 280, 220, .7, '#FF9F43'],
      ],
    },
    {
      name: '공룡 나라', bg: `<rect width="800" height="600" fill="#FFE2B8"/><path d="M440 360 L540 150 H600 L700 360Z" fill="#B0715A"/><path d="M540 150 Q570 120 600 150 L585 180 Q570 165 555 180Z" fill="#F0472A"/><path d="M560 120 q-20 -40 10 -60 q30 -20 20 -50" stroke="#9E9E9E" stroke-width="18" fill="none" stroke-linecap="round" opacity=".5"/><rect y="360" width="800" height="240" fill="#B9DB7A"/><ellipse cx="200" cy="600" rx="400" ry="120" fill="#A5CF63"/>`,
      items: [
        ['sun', 90, 80, .8, '#FFB224'], ['cloud', 300, 90, .9, '#FFFFFF'], ['bird', 420, 170, .7, '#B79CFF'], ['bird', 720, 90, .55, '#B79CFF'],
        ['dino', 180, 380, 1.3, '#7ED36B'], ['dino', 520, 440, 1.05, '#5FB8E8'], ['dino', 720, 510, .8, '#FF8FB1'],
        ['egg', 330, 520, .9, '#7ED36B'], ['egg', 390, 545, .75, '#FF8FB1'], ['egg', 80, 540, .8, '#5FB8E8'],
        ['tree', 360, 330, .9, '#4FA33C'], ['pine', 760, 330, .9, '#2E8B57'],
        ['flower', 250, 560, .7, '#FF6B8A'], ['mushroom', 620, 560, .6, '#F0472A'],
      ],
    },
    {
      name: '펭귄의 눈 나라', bg: `<rect width="800" height="600" fill="#CFE6FF"/><path d="M0 330 L120 200 L230 330 L360 160 L520 330 L640 210 L800 330Z" fill="#E9F4FF"/><path d="M90 230 L120 200 L150 232 M330 195 L360 160 L392 196 M612 240 L640 210 L670 242" stroke="#fff" stroke-width="10" fill="none"/><rect y="330" width="800" height="270" fill="#F7FBFF"/><ellipse cx="560" cy="540" rx="150" ry="28" fill="#9AD2F5"/>`,
      items: [
        ['cloud', 220, 70, .9, '#FFFFFF'], ['cloud', 600, 90, .8, '#FFFFFF'], ['star', 80, 120, .45, '#FFFFFF'], ['star', 420, 60, .4, '#FFFFFF'], ['star', 740, 160, .45, '#FFFFFF'],
        ['igloo', 140, 360, 1.3, '#FFFFFF'], ['snowman', 690, 360, 1.1, '#F0472A'],
        ['penguin', 330, 410, 1.1, '#3B4A6B'], ['penguin', 450, 440, .85, '#4FA3E8'], ['penguin', 230, 500, .75, '#B79CFF'],
        ['fish', 560, 540, .6, '#FFB224'], ['fish', 640, 535, .5, '#FF8FB1'],
        ['pine', 40, 470, .9, '#2E8B57'], ['pine', 770, 480, .8, '#2E7D5B'], ['ball', 120, 560, .7, '#F0472A'],
      ],
    },
  ];

  window.SPOT = { PARTS, SCENES };
})();
