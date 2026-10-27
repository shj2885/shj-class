// 프롬프트 상자마다 '복사' 버튼을 붙인다. 누르면 상자 안 글이 그대로 복사된다.
document.querySelectorAll('.prompt').forEach((box) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = '복사';
  btn.addEventListener('click', async () => {
    const text = box.querySelector('pre').innerText.trim();
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 예전 방식으로 한 번 더. 그래도 안 되면 글을 선택해 두고 Ctrl+C를 누르게 한다
      const range = document.createRange();
      range.selectNodeContents(box.querySelector('pre'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      if (ok) sel.removeAllRanges();
    }
    btn.textContent = ok ? '복사했어요 ✓' : 'Ctrl+C 를 누르세요';
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('done'); }, ok ? 1600 : 4000);
  });
  box.prepend(btn);
});
