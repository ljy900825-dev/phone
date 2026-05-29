// EXIF 편집 대시보드 서버. Node 내장 http 모듈만 사용 (외부 프레임워크 없음).
//
// 두 가지 모드:
//   1) 로컬 모드 (기본): 127.0.0.1 바인딩 + Host 검증 + 편집본 디스크 저장(output/)
//   2) 공개 모드 (PUBLIC=1): 링크로 공유해 누구나 사용. 아래가 달라진다.
//        - 0.0.0.0 바인딩 (플랫폼 도메인에서 접근)
//        - Host 검증 완화 (ALLOWED_HOSTS 로 지정하지 않으면 허용)
//        - 업로드 사진을 서버에 저장하지 않음 (프라이버시) → 결과는 다운로드로만 반환
// 공통: 상태변경(POST) 요청에 커스텀 헤더 강제 (간단 CSRF 방어).
// 자동 업로드/발행 기능은 어느 모드에서도 제공하지 않는다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { editJpeg } from './lib/exif-editor.js';
import { listProfiles } from './lib/device-profiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_DIR = path.join(ROOT, 'output');

// --- 환경설정 ---
const PUBLIC_MODE = process.env.PUBLIC === '1';
const PORT = Number(process.env.PORT) || 5173;
// 공개 모드는 기본 0.0.0.0(플랫폼이 외부 노출), 로컬 모드는 127.0.0.1.
const HOST = process.env.HOST || (PUBLIC_MODE ? '0.0.0.0' : '127.0.0.1');
const MAX_BODY = 60 * 1024 * 1024; // 60MB
const CSRF_HEADER = 'x-phone-exif-editor'; // POST 시 필수
// 디스크 저장 여부: 공개 모드는 기본 미저장. PERSIST_OUTPUT=1 로 강제 가능.
const PERSIST_OUTPUT = process.env.PERSIST_OUTPUT === '1' || !PUBLIC_MODE;
// Host 허용 목록: ALLOWED_HOSTS 환경변수(콤마구분)가 있으면 그것만 허용.
// 없으면 로컬 모드는 127.0.0.1/localhost 만, 공개 모드는 전체 허용.
const ALLOWED_HOSTS = process.env.ALLOWED_HOSTS
  ? new Set(process.env.ALLOWED_HOSTS.split(',').map((h) => h.trim()))
  : PUBLIC_MODE
    ? null // null = 모든 Host 허용
    : new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

if (PERSIST_OUTPUT) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  // --- Host 헤더 검증 (ALLOWED_HOSTS 가 null 이면 생략) ---
  if (ALLOWED_HOSTS && !ALLOWED_HOSTS.has(req.headers.host)) {
    return send(res, 403, { error: 'Host 헤더가 허용되지 않았습니다.' });
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 헬스체크 (배포 플랫폼용)
  if (req.method === 'GET' && url.pathname === '/healthz') {
    return send(res, 200, { ok: true, mode: PUBLIC_MODE ? 'public' : 'local' });
  }

  if (req.method === 'GET' && url.pathname === '/api/profiles') {
    return send(res, 200, { profiles: listProfiles() });
  }

  if (req.method === 'POST' && url.pathname === '/api/edit') {
    // --- CSRF 방어: 커스텀 헤더 강제 ---
    if (req.headers[CSRF_HEADER] !== '1') {
      return send(res, 403, { error: `상태변경 요청에는 ${CSRF_HEADER} 헤더가 필요합니다.` });
    }
    return handleEdit(req, res);
  }

  if (req.method === 'GET') {
    return serveStatic(url.pathname, res);
  }

  send(res, 404, { error: 'Not Found' });
});

// ---------------------------------------------------------------------------
// /api/edit : { filename, imageBase64, options } -> 편집 후 결과 반환 + output 저장
// ---------------------------------------------------------------------------
function handleEdit(req, res) {
  readBody(req)
    .then((raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch {
        return send(res, 400, { error: 'JSON 본문 파싱 실패' });
      }

      const { filename, imageBase64, options } = payload || {};
      if (!imageBase64) return send(res, 400, { error: 'imageBase64 누락' });

      let inputBuffer;
      try {
        inputBuffer = Buffer.from(imageBase64, 'base64');
      } catch {
        return send(res, 400, { error: 'base64 디코딩 실패' });
      }

      let result;
      try {
        result = editJpeg(inputBuffer, options || {});
      } catch (e) {
        return send(res, 400, { error: e.message });
      }

      // 편집본 처리 (원본은 건드리지 않음).
      // 로컬 모드: output/ 에 저장. 공개 모드: 저장하지 않고 다운로드용 base64 만 반환.
      const outName = makeOutputName(filename);
      let outPath = null;
      if (PERSIST_OUTPUT) {
        outPath = path.join(OUTPUT_DIR, outName);
        fs.writeFileSync(outPath, result.outBuffer);
      }

      send(res, 200, {
        ok: true,
        actions: result.actions,
        before: result.before,
        after: result.after,
        outputFile: outName,
        outputPath: outPath, // 공개 모드에서는 null
        persisted: PERSIST_OUTPUT,
        resultBase64: result.outBuffer.toString('base64'),
      });
    })
    .catch((e) => send(res, 413, { error: e.message }));
}

function makeOutputName(filename) {
  const base = path
    .basename(filename || 'photo.jpg')
    .replace(/\.(jpe?g)$/i, '')
    .replace(/[^\w.-]+/g, '_');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base || 'photo'}-edited-${ts}.jpg`;
}

// ---------------------------------------------------------------------------
// 정적 파일 서빙 (public/)
// ---------------------------------------------------------------------------
function serveStatic(pathname, res) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  // 디렉터리 탈출 방지
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return send(res, 403, { error: 'forbidden' });
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'Not Found' });
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('요청 본문이 너무 큽니다 (최대 60MB).'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

server.listen(PORT, HOST, () => {
  console.log(`\n📷 phone EXIF editor 대시보드 실행 중 [${PUBLIC_MODE ? '공개' : '로컬'} 모드]`);
  console.log(`   → http://${HOST}:${PORT}`);
  if (PUBLIC_MODE) {
    console.log(`   공개 모드: 0.0.0.0 바인딩, 업로드 사진 ${PERSIST_OUTPUT ? 'output/ 에 저장' : '미저장(다운로드만)'}`);
    if (!ALLOWED_HOSTS) console.log(`   ⚠️  Host 검증 비활성 · 인증 없음 — 신뢰할 수 있는 사람과만 링크 공유하세요.`);
  } else {
    console.log(`   (Ctrl+C 로 종료 · 편집본은 output/ 에 저장됩니다)`);
  }
  console.log('');
});
