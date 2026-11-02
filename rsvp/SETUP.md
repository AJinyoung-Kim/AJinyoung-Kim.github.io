# AIChE 2026 RSVP: 설정 방법

## 이메일 알림 (기본, 한 번만 활성화)

팝업에서 **Attend → 이름 입력 → Let's connect** 를 누르면 RSVP가 `jkim4046@gatech.edu` 로
메일로 옵니다. 메일 전송은 FormSubmit(formsubmit.co, 무료, 가입 없음)이 대신 해 줍니다.

처음 한 번만 활성화가 필요합니다.

1. https://ajinyoung-kim.github.io 에서 팝업을 열고 본인 이름으로 한 번 제출합니다.
   (이때는 아직 활성화 전이라 "Sorry, that didn't go through"가 뜨는 게 정상입니다.)
2. `jkim4046@gatech.edu` 로 온 FormSubmit 메일에서 **Activate Form** 을 누릅니다.
   스팸함도 확인하세요.
3. 다시 한 번 제출해서 "Thank you!" 화면과 RSVP 메일이 오는지 확인합니다.
4. 브라우저의 사이트 데이터(localStorage)에 제출 기록이 남아 팝업이 자동으로 안 뜰 수 있습니다.
   홈 화면 AIChE 소식 옆 **RSVP →** 버튼으로 언제든 다시 열 수 있습니다.

참석자가 이메일을 남기면 받은 메일에서 바로 **답장** 하면 그 사람에게 갑니다.

## (선택) GitHub에 CSV로도 기록하기

이메일과 별도로 비공개 GitHub 저장소의 `attendees.csv` 에도 쌓고 싶을 때만 아래를 하세요.
GitHub Pages는 정적 사이트라 쓰기 토큰을 숨겨 둘 작은 중계 서버(Cloudflare Worker, 무료)가
필요합니다. 약 10분 걸립니다. 설정하면 이메일과 CSV에 동시에 기록됩니다.

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
