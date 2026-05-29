// 대시보드 클라이언트.
// 파일을 base64 로 읽어 옵션과 함께 /api/edit 로 보내고, 편집 전/후 EXIF 를 비교 표시한다.
'use strict';

const $ = (id) => document.getElementById(id);
const CSRF_HEADER = 'X-Phone-Exif-Editor';

let selectedFile = null;
let selectedBase64 = null;

// 지도(GPS) 상태
let map = null;
let marker = null;
let pickedLat = null;
let pickedLon = null;

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
    // 제조사별로 그룹(optgroup) 지어 표시
    const groups = { samsung: '삼성 갤럭시', apple: '애플 아이폰' };
    for (const [vendor, label] of Object.entries(groups)) {
      const list = profiles.filter((p) => p.vendor === vendor);
      if (!list.length) continue;
      const og = document.createElement('optgroup');
      og.label = label;
      for (const p of list) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.label;
        og.appendChild(opt);
      }
      sel.appendChild(og);
    }
  } catch (e) {
    setStatus('기기 프로파일 로드 실패: ' + e.message, 'err');
  }
}

// --- 지도(GPS) ---
function ensureMap() {
  if (map || typeof L === 'undefined') return;
  // 기본 중심: 서울시청
  map = L.map('map').setView([37.5665, 126.978], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);
  map.on('click', (e) => setPicked(e.latlng.lat, e.latlng.lng));
  // 표시 영역이 늦게 잡히는 모바일 대응
  setTimeout(() => map.invalidateSize(), 200);
}

function setPicked(lat, lon) {
  pickedLat = lat;
  pickedLon = lon;
  if (!marker) {
    marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      pickedLat = p.lat;
      pickedLon = p.lng;
      $('pickedCoord').textContent = `선택됨: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
    });
  } else {
    marker.setLatLng([lat, lon]);
  }
  $('pickedCoord').textContent = `선택됨: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

async function searchPlace() {
  const q = $('placeSearch').value.trim();
  if (!q) return;
  $('pickedCoord').textContent = '검색 중…';
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!data.length) {
      $('pickedCoord').textContent = '검색 결과가 없습니다. 지도를 직접 탭해보세요.';
      return;
    }
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    map.setView([lat, lon], 15);
    setPicked(lat, lon);
  } catch {
    $('pickedCoord').textContent = '검색 실패(네트워크). 지도를 직접 탭해보세요.';
  }
}

$('searchBtn').addEventListener('click', searchPlace);
$('placeSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); searchPlace(); }
});

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
  // 지도 박스는 "지도에서 찾기"일 때만 표시
  $('mapBox').style.display = gps === 'map' ? '' : 'none';
  if (gps === 'map') ensureMap();

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
  if (gpsMode === 'map') {
    if (pickedLat == null || pickedLon == null) {
      setStatus('지도에서 위치를 선택하거나, GPS를 "지우기"로 바꾸세요.', 'err');
      return null;
    }
    opts.gps = { mode: 'set', lat: pickedLat, lon: pickedLon };
  } else {
    opts.gps = { mode: 'remove' };
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
