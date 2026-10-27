// 자료실에 있는 자료 목록. 새 자료 페이지(notes/○○.html)를 만들면 여기에 한 줄 더한다(최신 회차가 위).
// slug는 폴더에 저장되는 값이라 한 번 정하면 바꾸지 않는다. 자료실 화면(notes.js)과 서버(api/notes.js)가 함께 쓴다.
(function (root) {
  const NOTES = [
    { slug: 'flow-video-kit', emoji: '🎬', tag: '9회 · 10/27', title: '구글 플로우 영상 키트', sub: '구글 플로우로 60초 영상 만들기 · 이신영 (리더플AI)' },
    { slug: 'site-admin-lab', emoji: '📝', tag: '10/25 사이트만들기', title: '클로드로 내 사이트 + 관리자 페이지', sub: '실습 프롬프트 · 설계도부터 관리자 페이지, 검색 등록까지 · 이신영 (리더플AI)' },
    { slug: 'motion-graphics-kit', emoji: '🎁', tag: '8회 · 10/20', title: '모션그래픽 스타터 키트', sub: '클로드로 모션그래픽 만들기 · 이신영 (리더플AI)' },
    { slug: 'higgsfield-prompts', emoji: '🎁', tag: '7회 · 10/13', title: '클로드 × 힉스필드 사례별 프롬프트 & 유의사항', sub: '7회 후기 선물 · 프롬프트 10개와 유의사항 · 이신영 (리더플AI)' },
    { slug: 'chatgpt-feature-map', emoji: '🗺️', tag: '2회 · 9/7', title: '챗GPT 기능 지도', sub: '채팅 · 예약 · GPTs · 프로젝트 · 워크 · 플러그인 · 코덱스 · 이신영 (리더플AI)' },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = NOTES;
  else root.NOTES = NOTES;
})(this);
