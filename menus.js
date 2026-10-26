// 위쪽 메뉴와 펼침 메뉴. 첫 화면·관리자 화면·서버(api/admin.js)가 모두 이 목록 하나를 쓴다.
// 메뉴를 바꾸려면 여기만 고치면 된다. key는 데이터베이스에 저장되는 값이라 이미 쓰는 key는 바꾸지 않는다.
// 순서는 선생님 모드에서 끌어서 바꿀 수 있고, 바꾼 순서는 데이터베이스(settings 표의 menu_order)에 저장된다.
(function (root) {
  const MENUS = [
    { key: 'genai', emoji: '💬', ko: '생성형 AI', subs: ['대화형 AI', '이미지·영상 AI'] },
    { key: 'block', emoji: '🧩', ko: '블록코딩', subs: ['엔트리', '스크래치', '코드닷오알지', '코딩 게임'] },
    { key: 'robot', emoji: '🤖', ko: '로봇·피지컬', subs: ['마이크로비트', '아두이노', '교구 로봇'] },
    { key: 'ai', emoji: '✨', ko: 'AI 체험', subs: ['머신러닝 체험', '그림 AI', '엔트리 AI'] },
    { key: 'design', emoji: '🎨', ko: '디자인·창작', subs: ['그림·포스터', '픽셀아트', '3D 만들기', '영상'] },
    { key: 'basics', emoji: '⌨️', ko: '컴퓨터 기초', subs: ['타자 연습', '마우스 연습', '파일 저장', '인터넷 안전'] },
    { key: 'tools', emoji: '📝', ko: '수업 도구', subs: ['과제 제출', '학급방', '설문', '타이머', '모둠 뽑기'] },
    { key: 'play', emoji: '🎮', ko: '쉬어가기', subs: ['코딩 게임', '퍼즐'] },
    // 선생님용은 첫 화면에 보이지 않는다. 관리자 화면에서만 보고 연다.
    { key: 'teacher', emoji: '👩‍🏫', ko: '선생님용', subs: ['교안', '수업 자료', '학부모 안내'], hidden: true },
  ];
  // 저장된 순서(key 목록)대로 list를 그 자리에서 다시 줄 세운다. 저장된 순서에 없는 메뉴(새로 생긴 메뉴)는 원래 순서대로 뒤에 붙는다.
  function sortMenus(list, order) {
    if (!Array.isArray(order)) return list;
    const base = MENUS.map((m) => m.key);
    const rank = (key) => { const i = order.indexOf(key); return i >= 0 ? i : order.length + base.indexOf(key); };
    return list.sort((a, b) => rank(a.key) - rank(b.key));
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = MENUS;
  else { root.MENUS = MENUS; root.sortMenus = sortMenus; }
})(this);
