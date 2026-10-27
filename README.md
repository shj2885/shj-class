# 혜정쌤의 에듀깨비

내 손으로 뚝딱! 상상력은 쑥쑥!

수업에 필요한 사이트를 한곳에 모아 둔 링크 모음이에요. 수강생은 주소를 입력해 들어와서, 오늘 쓸 사이트를 누르면 새 탭에서 바로 열려요.

- 사이트: https://shj-class.vercel.app
- 링크 관리: https://shj-class.vercel.app/admin (관리자 비밀번호 필요)
- 설계도: [docs/PRD.md](docs/PRD.md)

## 구조

| 파일 | 하는 일 |
|---|---|
| `index.html` · `styles.css` · `app.js` | 첫 화면. 오늘 쓸 사이트와 네 묶음(AI 도구, 디자인·이미지 도구, 수업 자료·과제, 협업·저장 도구) |
| `admin/` | 링크 관리 화면. 추가·고치기·빼기·오늘 지정·순서 바꾸기 |
| `api/links.js` | 첫 화면용 링크 목록(읽기만) |
| `api/admin.js` | 관리자용. `ADMIN_PASSWORD`를 확인한 뒤 링크를 바꾼다 |
| `middleware.js` · `enter.html` · `notes-enter.html` · `api/enter.js` | 입장 비밀번호와 자료실 비밀번호. 입장 비밀번호가 없으면 `/enter`로, 자료실(`/notes`)은 자료실 비밀번호가 없으면 `/notes-enter`로 보낸다(`/admin`은 막지 않음). 통과는 3시간 |
| `notes/` | 자료실(`/notes`). 강의 자료 페이지(`notes/○○.html`)와 폴더 화면. 새 자료는 `notes/catalog.js`에 한 줄 더한다 |
| `api/notes.js` | 자료실 폴더 읽기·저장. 저장은 `ADMIN_PASSWORD`가 맞을 때만 |

링크는 Supabase `links` 표에, 선생님 모드에서 끌어서 바꾼 위쪽 메뉴 순서(`menu_order`)와 입장 비밀번호(`site_password`, 숫자 4자리), 자료실 비밀번호(`notes_password`, 숫자 4자리), 자료실 폴더(`notes_folders`)는 `settings` 표에 저장돼요. 두 비밀번호는 선생님 모드의 '🔑 입장 비밀번호'·'📚 자료실 비밀번호'나 관리자 화면에서 바꿔요. 키와 비밀번호는 Vercel 환경변수에만 있고, 이 저장소에는 없어요.

## 배포

`main` 브랜치에 푸시하면 Vercel이 자동으로 배포해요.
