# phone — 폰 사진 EXIF 메타데이터 편집기 (로컬 전용)

갤럭시 / 아이폰으로 찍은 **실제 JPEG 사진**의 EXIF 메타데이터를 정리·수정하는
**로컬 전용** 도구입니다. 네이버 블로그 업로드용 사진의 촬영일시·위치·기기 정보를
정돈하고, 개인 식별 태그를 제거하는 용도입니다.

- 브라우저 대시보드에서 사진을 올리고, 옵션을 고른 뒤 버튼 한 번으로 편집합니다.
- **자동 업로드/발행 기능은 없습니다.** 메타데이터 편집까지만 합니다.
- 원본 파일은 그대로 두고, 편집본은 `output/` 에 저장 + 브라우저 다운로드로 받습니다.
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

## 로컬 전용 안전조건

이 도구는 **본인 PC에서만** 쓰도록 설계됐습니다.

- **`127.0.0.1` 에만 바인딩** — 외부 네트워크에서 접근 불가.
- **Host 헤더 검증** — `127.0.0.1:PORT` / `localhost:PORT` 외 거부.
- **상태변경 요청에 커스텀 헤더 강제** — `POST /api/edit` 는
  `X-Phone-Exif-Editor: 1` 헤더가 없으면 거부 (간단한 CSRF 방어).

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
