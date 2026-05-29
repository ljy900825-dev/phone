# phone — 폰 사진 EXIF 메타데이터 편집기

갤럭시 / 아이폰으로 찍은 **실제 JPEG 사진**의 EXIF 메타데이터를 정리·수정하는
도구입니다. 네이버 블로그 업로드용 사진의 촬영일시·위치·기기 정보를 정돈하고,
개인 식별 태그를 제거하는 용도입니다.

- 브라우저 대시보드에서 사진을 올리고, 옵션을 고른 뒤 버튼 한 번으로 편집합니다.
- **본인 PC용 로컬 모드**와 **링크로 공유하는 공개 모드** 두 가지로 실행할 수 있습니다.
- **자동 업로드/발행 기능은 없습니다.** 메타데이터 편집까지만 합니다.
- 원본 파일은 그대로 두고, 편집본은 다운로드(공개 모드) 또는 `output/` 저장(로컬 모드)으로 받습니다.
- EXIF read/write 는 순수 JS 라이브러리 [`piexifjs`](https://github.com/hMatoba/piexifjs) 사용.

---

## 설치 & 실행

```bash
npm install      # piexifjs 설치
npm start        # 대시보드 실행 → http://127.0.0.1:5173
```

브라우저에서 `http://127.0.0.1:5173` 접속.
포트를 바꾸려면 `PORT=8080 npm start`.

라이브러리 동작을 직접 검증하려면:

```bash
npm run verify   # piexifjs JPEG EXIF read/write/remove 검증
```

---

## 편집할 수 있는 4가지

| # | 항목 | 설명 |
|---|------|------|
| ① | **촬영일시** | `DateTimeOriginal` / `DateTimeDigitized` / `DateTime` 을 원하는 날짜·시각으로 변경하거나 "최근 14일 내 랜덤"으로 설정. 타임존 오프셋(`OffsetTime*`)도 함께 기록. |
| ② | **GPS 위치** | 위도/경도(십진수)를 입력해 좌표를 주입하거나, "제거" 선택 시 GPS 정보를 완전히 삭제. |
| ③ | **제조사/모델** | 갤럭시/아이폰 기기 프로파일 선택 → `Make` / `Model` / `Software` / `LensModel` 등을 그 기기다운 값으로 세팅. |
| ④ | **개인 식별정보 제거** | `BodySerialNumber`, `CameraOwnerName`, `LensSerialNumber`, `ImageUniqueID`, `Artist`, `Copyright`, `HostComputer` 등 식별 태그 삭제. |

### 기기 프로파일

- **Galaxy S24 Ultra** (`SM-S928N`)
- **Galaxy S23** (`SM-S911N`)
- **iPhone 15 Pro**
- **iPhone 14**

> 프로파일 값은 그 기기의 대표값입니다. 개별 사진의 노출/렌즈 조건까지 똑같이
> 맞추진 않습니다 (위조가 아니라 메타데이터 정리 목적).

---

## 두 가지 실행 모드

### 로컬 모드 (기본)

본인 PC에서만 쓰는 모드. 안전조건:

- **`127.0.0.1` 에만 바인딩** — 외부 네트워크에서 접근 불가.
- **Host 헤더 검증** — `127.0.0.1:PORT` / `localhost:PORT` 외 거부.
- **상태변경 요청에 커스텀 헤더 강제** — `POST /api/edit` 는
  `X-Phone-Exif-Editor: 1` 헤더가 없으면 거부 (간단한 CSRF 방어).
- 편집본을 `output/` 에 저장.

### 공개 모드 (`PUBLIC=1`) — 링크로 공유

링크 하나로 다른 사람도 쓰게 하려면 공개 모드로 배포합니다.

```bash
PUBLIC=1 npm start     # 또는 npm run start:public
```

공개 모드에서 달라지는 점:

- **`0.0.0.0` 바인딩** — 외부에서 접근 가능.
- **업로드 사진을 서버에 저장하지 않음** — 결과는 브라우저 다운로드로만 반환
  (남의 사진이 서버에 쌓이지 않도록 한 프라이버시 조치). `PERSIST_OUTPUT=1` 로
  저장을 강제할 수 있으나 공개 환경에서는 권장하지 않습니다.
- Host 검증은 기본 비활성. `ALLOWED_HOSTS=app.example.com` 처럼 도메인을 지정하면
  그 도메인만 허용합니다.
- CSRF 커스텀 헤더 요구는 그대로 유지됩니다.

> ⚠️ **공개 모드에는 로그인/인증이 없습니다.** 링크를 아는 사람은 누구나 사용할 수
> 있습니다. 민감한 용도라면 신뢰할 수 있는 사람과만 링크를 공유하거나, 앞단에
> 인증 프록시(예: Cloudflare Access, Basic Auth)를 두세요.

### 환경변수

| 변수 | 기본 | 설명 |
|------|------|------|
| `PUBLIC` | (없음) | `1` 이면 공개 모드 |
| `PORT` | `5173` | 수신 포트 (배포 플랫폼이 자동 주입) |
| `HOST` | 모드별 | 바인딩 주소 (로컬 `127.0.0.1` / 공개 `0.0.0.0`) |
| `PERSIST_OUTPUT` | 모드별 | `1` 이면 `output/` 저장 강제 |
| `ALLOWED_HOSTS` | (없음) | 콤마구분 허용 Host 목록 |

---

## 배포 (링크 공유용)

### Render (가장 간단 — 깃 저장소 연결)

저장소에 포함된 `render.yaml` 덕분에 블루프린트로 한 번에 배포됩니다.

1. [render.com](https://render.com) 가입 → **New → Blueprint**
2. 이 GitHub 저장소 선택 → 자동으로 `phone-exif-editor` 웹 서비스 생성
   (`PUBLIC=1`, 헬스체크 `/healthz` 설정됨)
3. 배포 완료 후 나오는 `https://<이름>.onrender.com` 링크를 공유

### Docker (Railway / Fly.io / 직접 호스팅)

```bash
docker build -t phone-exif-editor .
docker run -p 8080:8080 phone-exif-editor   # http://localhost:8080
```

이미지는 공개 모드(`PUBLIC=1`)로 기동됩니다. Railway/Fly.io 등은 이 `Dockerfile`
을 자동 인식해 빌드하고 공개 URL 을 발급합니다. (플랫폼이 `PORT` 를 주입하면 서버가
그 값을 사용합니다.)

---

## 사용 흐름

1. 사진 선택 (JPEG만).
2. 4가지 옵션을 원하는 대로 설정.
3. **메타데이터 편집 실행** 클릭.
4. 편집 전/후 EXIF 비교표 확인 (변경된 값은 초록색 강조).
5. **편집본 다운로드** 또는 `output/` 폴더에서 확인.

> JPEG 전용입니다. PNG 등은 EXIF 구조가 달라 지원하지 않습니다.

---

## 프로젝트 구조

```
scripts/
  server.js            로컬 웹서버 (Node 내장 http, 업로드 수신 + 편집 + 결과 반환)
  verify-piexif.js     piexifjs 동작 검증 스크립트
  lib/
    exif-editor.js     EXIF 읽기/편집/저장 코어 (GPS 십진수→rational 변환 포함)
    device-profiles.js 갤럭시/아이폰 EXIF 프리셋
public/
  index.html           대시보드 (업로드 폼 + 4개 옵션 + 비교표)
  app.js               클라이언트 로직
  style.css            스타일
output/                편집본 저장 위치 (git 제외)
fixtures/              검증용 샘플 JPEG
```

## API (로컬)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET`  | `/api/profiles` | 기기 프로파일 목록 |
| `POST` | `/api/edit` | `{ filename, imageBase64, options }` 받아 편집 → 전/후 요약 + 결과 base64 반환. `X-Phone-Exif-Editor: 1` 헤더 필수. |
