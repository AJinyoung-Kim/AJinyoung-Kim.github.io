# AIChE 2026 RSVP: 저장소 연결 방법

홈페이지 팝업의 **Let's connect** 버튼은 지금 이메일 앱을 여는 방식으로 동작합니다.
아래 설정을 마치면 참석자 이름이 **비공개 GitHub 저장소의 `attendees.csv`** 에 자동으로 쌓입니다.

GitHub Pages는 정적 사이트라 브라우저에서 직접 GitHub에 쓸 수 없습니다. 쓰기 권한 토큰을
페이지에 넣으면 누구나 볼 수 있기 때문입니다. 그래서 토큰을 숨겨 두는 작은 중계 서버
(Cloudflare Worker, 무료)를 하나 둡니다. 약 10분 걸립니다.

## 1. 비공개 저장소 만들기 (1분)

1. https://github.com/new
2. Repository name: `aiche-2026-rsvp`
3. **Private** 선택 (중요: 참석자 이름이 공개되지 않도록)
4. **Add a README file** 체크 → Create repository

## 2. 토큰 만들기 (2분)

1. https://github.com/settings/personal-access-tokens/new
2. Token name: `aiche-rsvp`, Expiration: 30 days
3. Repository access: **Only select repositories** → `aiche-2026-rsvp`
4. Permissions → Repository permissions → **Contents: Read and write** (다른 권한은 건드리지 않음)
5. Generate token → `github_pat_...` 값 복사 (한 번만 보입니다)

## 3. Cloudflare Worker 배포 (5분)

1. https://dash.cloudflare.com/sign-up 에서 무료 가입
2. 왼쪽 **Workers & Pages** → **Create** → **Create Worker** → 이름 `aiche-rsvp` → **Deploy**
3. **Edit code** → 기존 코드를 전부 지우고 이 저장소의 `rsvp/worker.js` 내용을 붙여넣기 → **Deploy**
4. Worker 화면 → **Settings** → **Variables and Secrets** → **Add**
   - `GITHUB_REPO` (Type: Text) = `AJinyoung-Kim/aiche-2026-rsvp`
   - `GITHUB_TOKEN` (Type: **Secret**) = 2단계에서 복사한 토큰
   - **Deploy** 눌러 저장
5. Worker 주소 복사 (예: `https://aiche-rsvp.<계정>.workers.dev`)

## 4. 홈페이지에 연결

Worker 주소를 Claude에게 알려주거나, `index.html`에서 아래 한 줄에 직접 넣으면 됩니다.

```js
const RSVP_ENDPOINT = 'https://aiche-rsvp.<계정>.workers.dev';
```

연결 확인용 테스트 (터미널):

```bash
curl -X POST 'https://aiche-rsvp.<계정>.workers.dev' \
  -H 'Origin: https://ajinyoung-kim.github.io' -H 'Content-Type: application/json' \
  -d '{"name":"TEST","events":["poster"]}'
# {"ok":true} 가 나오면 성공. attendees.csv 에서 TEST 행은 지우면 됩니다.
```

## 5. 집계

`aiche-2026-rsvp` 저장소의 `attendees.csv` 를 열면 GitHub이 표로 보여줍니다.
**Download raw file** 로 받아 Excel에서 열 수 있습니다.

- 한 사람이 두 세션을 고르면 세션별로 한 줄씩 기록됩니다.
- 세션별 인원 = `event` 열로 필터한 행 수
- 열: `submitted_at_utc, event, name, affiliation, email`

학회가 끝나면 Cloudflare에서 Worker를 삭제하고 GitHub 토큰을 폐기하세요.
팝업과 RSVP 링크는 11월 11일(CST)이 지나면 홈페이지에서 자동으로 사라집니다.
