// 자료실에 있는 자료 목록. 새 자료 페이지(notes/○○.html)를 만들면 여기 맨 위에 한 줄 더한다.
// slug는 폴더에 저장되는 값이라 한 번 정하면 바꾸지 않는다. 자료실 화면(notes.js)과 서버(api/notes.js)가 함께 쓴다.
(function (root) {
  const NOTES = [
    { slug: 'flow-video-kit', emoji: '🎬', tag: '9회 · 10/27', title: '구글 플로우 영상 키트', sub: '구글 플로우로 60초 영상 만들기 · 이신영 (리더플AI)' },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = NOTES;
  else root.NOTES = NOTES;
})(this);
