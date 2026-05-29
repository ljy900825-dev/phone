// 대시보드 클라이언트.
// 파일을 base64 로 읽어 옵션과 함께 /api/edit 로 보내고, 편집 전/후 EXIF 를 비교 표시한다.
'use strict';

const $ = (id) => document.getElementById(id);
const CSRF_HEADER = 'X-Phone-Exif-Editor';

let selectedFile = null;
let selectedBase64 = null;

// 진단/표시할 EXIF 요약 항목 (서버 summarize 와 동일 키)
const FIELDS = [
  'Make', 'Model', 'Software', 'LensMake', 'LensModel',
  'DateTime', 'DateTimeOriginal', 'DateTimeDigitized', 'OffsetTimeOriginal',
  'GPS', 'BodySerialNumber', 'CameraOwnerName', 'LensSerialNumber',
  'ImageUniqueID', 'Artist', 'Copyright', 'HostComputer',
];

// --- 기기 프로파일 목록 로드 ---
async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles');
    const { profiles } = await res.json();
    const sel = $('devProfile');
    sel.innerHTML = '';
    for (const p of profiles) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.label} (${p.vendor})`;
      sel.appendChild(opt);
    }
  } catch (e) {
    setStatus('기기 프로파일 로드 실패: ' + e.message, 'err');
  }
}

// --- 파일 선택 ---
$('fileInput').addEventListener('change', (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const isJpeg = /jpe?g$/i.test(file.name) || file.type === 'image/jpeg';
  if (!isJpeg) {
    setStatus('JPEG 파일만 지원합니다 (PNG 등 미지원).', 'err');
    $('editBtn').disabled = true;
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    // dataURL "data:image/jpeg;base64,...." 에서 base64 부분만 추출
    selectedBase64 = String(reader.result).split(',')[1];
    $('editBtn').disabled = false;
  };
  reader.readAsDataURL(file);

  const info = $('fileInfo');
  info.classList.remove('hidden');
  info.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
  setStatus('');
});

// --- 라디오/체크에 따라 입력칸 enable/disable ---
function syncEnabled() {
  const dt = radioValue('dtMode');
  $('dtValue').disabled = dt !== 'custom';
  $('dtOffset').disabled = dt === 'none';

  const gps = radioValue('gpsMode');
  $('gpsLat').disabled = gps !== 'set';
  $('gpsLon').disabled = gps !== 'set';

  const dev = radioValue('devMode');
  $('devProfile').disabled = dev !== 'apply';
}
document.querySelectorAll('input[type="radio"]').forEach((r) =>
  r.addEventListener('change', syncEnabled)
);

function radioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

// --- 편집 실행 ---
$('editBtn').addEventListener('click', async () => {
  if (!selectedBase64) return;

  const options = buildOptions();
  if (options === null) return; // 검증 실패 시 buildOptions 가 상태 표시

  setStatus('편집 중…');
  $('editBtn').disabled = true;
  try {
    const res = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: '1' },
      body: JSON.stringify({
        filename: selectedFile.name,
        imageBase64: selectedBase64,
        options,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '편집 실패');
    renderResult(data);
    setStatus('편집 완료 ✓', 'ok');
  } catch (e) {
    setStatus('오류: ' + e.message, 'err');
  } finally {
    $('editBtn').disabled = false;
  }
});

function buildOptions() {
  const opts = {};

  // ① 촬영일시
  const dtMode = radioValue('dtMode');
  if (dtMode === 'custom') {
    if (!$('dtValue').value) {
      setStatus('촬영일시를 입력하세요.', 'err');
      return null;
    }
    opts.dateTime = { mode: 'custom', value: $('dtValue').value, offset: $('dtOffset').value || null };
  } else if (dtMode === 'randomRecent') {
    opts.dateTime = { mode: 'randomRecent', offset: $('dtOffset').value || '+09:00' };
  } else {
    opts.dateTime = { mode: 'none' };
  }

  // ② GPS
  const gpsMode = radioValue('gpsMode');
  if (gpsMode === 'set') {
    const lat = parseFloat($('gpsLat').value);
    const lon = parseFloat($('gpsLon').value);
    if (!isFinite(lat) || !isFinite(lon)) {
      setStatus('GPS 위도/경도를 입력하세요.', 'err');
      return null;
    }
    opts.gps = { mode: 'set', lat, lon };
  } else {
    opts.gps = { mode: gpsMode }; // keep | remove
  }

  // ③ 기기 프로파일
  const devMode = radioValue('devMode');
  opts.device = devMode === 'apply'
    ? { mode: 'apply', profileId: $('devProfile').value }
    : { mode: 'keep' };

  // ④ 식별정보 제거
  opts.stripIdentifiers = $('stripIds').checked;

  return opts;
}

// --- 결과 렌더링 ---
function renderResult(data) {
  $('resultCard').classList.remove('hidden');

  // 적용된 작업 목록
  const actions = $('actions');
  actions.innerHTML = '<strong>적용된 작업</strong><ul>' +
    data.actions.map((a) => `<li>${escapeHtml(a)}</li>`).join('') + '</ul>';

  // 전/후 비교표
  const tbody = $('diffTable').querySelector('tbody');
  tbody.innerHTML = '';
  for (const key of FIELDS) {
    const b = data.before[key];
    const a = data.after[key];
    const changed = String(b ?? '') !== String(a ?? '');
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<th>${key}</th>` +
      `<td>${fmt(b)}</td>` +
      `<td class="${changed ? 'changed' : ''}">${fmt(a)}</td>`;
    tbody.appendChild(tr);
  }

  // 다운로드 링크 (data URL)
  const link = $('downloadLink');
  link.href = 'data:image/jpeg;base64,' + data.resultBase64;
  link.download = data.outputFile;
  $('savedPath').textContent = `서버에도 저장됨: output/${data.outputFile}`;

  $('resultCard').scrollIntoView({ behavior: 'smooth' });
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '<span class="null">(없음)</span>';
  return escapeHtml(String(v));
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function setStatus(msg, cls = '') {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

// 초기화
loadProfiles();
syncEnabled();
