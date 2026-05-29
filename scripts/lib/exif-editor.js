// EXIF 읽기/편집/저장 코어.
// piexifjs 기반. JPEG(바이너리 문자열) <-> piexif EXIF 객체 변환을 담당하고,
// 4가지 편집(촬영일시 / GPS / 기기 프로파일 / 식별정보 제거)을 적용한다.
import piexif from 'piexifjs';
import { getProfile } from './device-profiles.js';

// piexifjs 1.0.6 에는 타임존 오프셋 태그(OffsetTime*)가 없어 dump 시 크래시한다.
// 실제 폰이 기록하는 값이므로 TAGS 테이블과 ExifIFD 상수에 런타임 등록한다.
(function registerMissingTags() {
  const extra = {
    36880: 'OffsetTime',
    36881: 'OffsetTimeOriginal',
    36882: 'OffsetTimeDigitized',
  };
  for (const [num, name] of Object.entries(extra)) {
    const key = Number(num);
    if (!piexif.TAGS['Exif'][key]) {
      piexif.TAGS['Exif'][key] = { name, type: 'Ascii' };
    }
    if (piexif.ExifIFD[name] == null) {
      piexif.ExifIFD[name] = key;
    }
  }
})();

// ---------------------------------------------------------------------------
// 기본 read/write
// ---------------------------------------------------------------------------

/** JPEG Buffer 에서 piexif EXIF 객체를 읽는다. EXIF 가 없으면 빈 구조를 돌려준다. */
export function readExif(jpegBuffer) {
  assertJpeg(jpegBuffer);
  const binStr = jpegBuffer.toString('binary');
  try {
    return piexif.load(binStr);
  } catch {
    return { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
  }
}

/** piexif EXIF 객체를 JPEG Buffer 에 써넣어 새 Buffer 를 돌려준다. */
export function writeExif(jpegBuffer, exifObj) {
  assertJpeg(jpegBuffer);
  const binStr = jpegBuffer.toString('binary');
  const exifBytes = piexif.dump(normalizeForDump(exifObj));
  const newBinStr = piexif.insert(exifBytes, binStr);
  return Buffer.from(newBinStr, 'binary');
}

function assertJpeg(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error('JPEG 파일이 아닙니다 (FFD8 SOI 마커 없음). PNG 등은 지원하지 않습니다.');
  }
}

// piexif.dump 가 요구하는 IFD 키가 빠져있으면 채워준다.
function normalizeForDump(exifObj) {
  return {
    '0th': exifObj['0th'] || {},
    Exif: exifObj['Exif'] || {},
    GPS: exifObj['GPS'] || {},
    Interop: exifObj['Interop'] || {},
    '1st': exifObj['1st'] || {},
    thumbnail: exifObj['thumbnail'] || null,
  };
}

// ---------------------------------------------------------------------------
// 사람이 읽을 수 있는 요약 (편집 전/후 비교용)
// ---------------------------------------------------------------------------

/** EXIF 객체에서 관심 항목만 뽑아 평탄한 요약 객체로 만든다. */
export function summarize(exifObj) {
  const z = exifObj['0th'] || {};
  const e = exifObj['Exif'] || {};
  const g = exifObj['GPS'] || {};
  const I = piexif.ImageIFD;
  const E = piexif.ExifIFD;

  const gps = readGps(g);

  return {
    Make: z[I.Make] ?? null,
    Model: z[I.Model] ?? null,
    Software: z[I.Software] ?? null,
    LensMake: e[E.LensMake] ?? null,
    LensModel: e[E.LensModel] ?? null,
    DateTime: z[I.DateTime] ?? null,
    DateTimeOriginal: e[E.DateTimeOriginal] ?? null,
    DateTimeDigitized: e[E.DateTimeDigitized] ?? null,
    OffsetTimeOriginal: e[E.OffsetTimeOriginal] ?? null,
    GPS: gps ? `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}` : null,
    // 개인 식별 태그
    BodySerialNumber: e[E.BodySerialNumber] ?? null,
    CameraOwnerName: e[E.CameraOwnerName] ?? null,
    LensSerialNumber: e[E.LensSerialNumber] ?? null,
    ImageUniqueID: e[E.ImageUniqueID] ?? null,
    Artist: z[I.Artist] ?? null,
    Copyright: z[I.Copyright] ?? null,
    HostComputer: z[I.HostComputer] ?? null,
  };
}

// ---------------------------------------------------------------------------
// 1) 촬영일시
// ---------------------------------------------------------------------------

/** Date -> EXIF 날짜 문자열 "YYYY:MM:DD HH:MM:SS" */
export function formatExifDateTime(date) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}:${p(date.getMonth() + 1)}:${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

/** 최근 N일 이내(기본 14일) 무작위 시각. 낮 8~22시 사이로 잡아 자연스럽게. */
export function randomRecentDate(withinDays = 14) {
  const now = Date.now();
  const offsetMs = Math.floor(Math.random() * withinDays * 24 * 60 * 60 * 1000);
  const d = new Date(now - offsetMs);
  d.setHours(8 + Math.floor(Math.random() * 14)); // 08~21시
  d.setMinutes(Math.floor(Math.random() * 60));
  d.setSeconds(Math.floor(Math.random() * 60));
  return d;
}

/**
 * 촬영일시를 설정한다.
 *  - DateTimeOriginal / DateTimeDigitized (ExifIFD)
 *  - DateTime (0th)
 * @param {object} exifObj
 * @param {string} exifDateStr "YYYY:MM:DD HH:MM:SS"
 * @param {string|null} offset 예: "+09:00" (선택)
 */
export function setDateTime(exifObj, exifDateStr, offset = null) {
  const z = (exifObj['0th'] ||= {});
  const e = (exifObj['Exif'] ||= {});
  const I = piexif.ImageIFD;
  const E = piexif.ExifIFD;

  z[I.DateTime] = exifDateStr;
  e[E.DateTimeOriginal] = exifDateStr;
  e[E.DateTimeDigitized] = exifDateStr;

  if (offset) {
    e[E.OffsetTime] = offset;
    e[E.OffsetTimeOriginal] = offset;
    e[E.OffsetTimeDigitized] = offset;
  }
  return exifObj;
}

// ---------------------------------------------------------------------------
// 2) GPS 위치
// ---------------------------------------------------------------------------

/** 십진수 좌표(절대값) -> EXIF rational DMS 배열 [[d,1],[m,1],[s*1e4,1e4]] */
export function decimalToDmsRational(decimal) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  const secDen = 10000;
  const secNum = Math.round(sec * secDen);
  return [
    [deg, 1],
    [min, 1],
    [secNum, secDen],
  ];
}

/** EXIF rational DMS -> 십진수 */
function dmsRationalToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const toNum = (r) => (Array.isArray(r) ? r[0] / r[1] : Number(r));
  let dec = toNum(dms[0]) + toNum(dms[1]) / 60 + toNum(dms[2]) / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

/** GPS IFD 에서 위/경도 십진수를 읽는다. 없으면 null. */
export function readGps(gpsIfd) {
  const G = piexif.GPSIFD;
  if (!gpsIfd || !gpsIfd[G.GPSLatitude] || !gpsIfd[G.GPSLongitude]) return null;
  const lat = dmsRationalToDecimal(gpsIfd[G.GPSLatitude], gpsIfd[G.GPSLatitudeRef]);
  const lon = dmsRationalToDecimal(gpsIfd[G.GPSLongitude], gpsIfd[G.GPSLongitudeRef]);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

/** GPS 좌표를 설정한다. */
export function setGps(exifObj, lat, lon) {
  const g = (exifObj['GPS'] = {});
  const G = piexif.GPSIFD;
  g[G.GPSVersionID] = [2, 3, 0, 0];
  g[G.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
  g[G.GPSLatitude] = decimalToDmsRational(lat);
  g[G.GPSLongitudeRef] = lon >= 0 ? 'E' : 'W';
  g[G.GPSLongitude] = decimalToDmsRational(lon);
  return exifObj;
}

/** GPS 정보를 완전히 제거한다. */
export function removeGps(exifObj) {
  exifObj['GPS'] = {};
  return exifObj;
}

// ---------------------------------------------------------------------------
// 3) 기기 제조사/모델 프로파일
// ---------------------------------------------------------------------------

/** 기기 프로파일을 EXIF 에 적용한다. profileId 는 device-profiles 의 id. */
export function applyDeviceProfile(exifObj, profileId) {
  const profile = getProfile(profileId);
  if (!profile) throw new Error(`알 수 없는 기기 프로파일: ${profileId}`);

  const z = (exifObj['0th'] ||= {});
  const e = (exifObj['Exif'] ||= {});

  for (const [name, value] of Object.entries(profile.zeroth || {})) {
    const key = piexif.ImageIFD[name];
    if (key == null) throw new Error(`알 수 없는 0th 태그: ${name}`);
    z[key] = value;
  }
  for (const [name, value] of Object.entries(profile.exif || {})) {
    const key = piexif.ExifIFD[name];
    if (key == null) throw new Error(`알 수 없는 Exif 태그: ${name}`);
    e[key] = value;
  }
  return exifObj;
}

// ---------------------------------------------------------------------------
// 4) 개인 식별정보 제거
// ---------------------------------------------------------------------------

// 삭제 대상: 단말/소유자를 특정할 수 있는 태그들.
const IDENTIFIER_EXIF_TAGS = [
  'BodySerialNumber',
  'CameraOwnerName',
  'LensSerialNumber',
  'ImageUniqueID',
];
const IDENTIFIER_ZEROTH_TAGS = ['Artist', 'Copyright', 'HostComputer'];

/** 개인 식별 태그를 삭제하고, 삭제된 항목 이름 목록을 돌려준다. */
export function removeIdentifiers(exifObj) {
  const z = (exifObj['0th'] ||= {});
  const e = (exifObj['Exif'] ||= {});
  const removed = [];

  for (const name of IDENTIFIER_EXIF_TAGS) {
    const key = piexif.ExifIFD[name];
    if (key != null && key in e) {
      delete e[key];
      removed.push(name);
    }
  }
  for (const name of IDENTIFIER_ZEROTH_TAGS) {
    const key = piexif.ImageIFD[name];
    if (key != null && key in z) {
      delete z[key];
      removed.push(name);
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------
// 통합 편집 진입점
// ---------------------------------------------------------------------------

/**
 * 옵션에 따라 EXIF 를 편집해 새 JPEG Buffer 와 전/후 요약을 돌려준다.
 *
 * options = {
 *   dateTime: { mode: 'none'|'custom'|'randomRecent', value?: 'YYYY-MM-DDTHH:mm', offset?: '+09:00' },
 *   gps:      { mode: 'keep'|'set'|'remove', lat?, lon? },
 *   device:   { mode: 'keep'|'apply', profileId? },
 *   stripIdentifiers: boolean
 * }
 */
export function editJpeg(jpegBuffer, options = {}) {
  const before = summarize(readExif(jpegBuffer));
  const exifObj = readExif(jpegBuffer);
  const actions = [];

  // 1) 촬영일시
  const dt = options.dateTime || { mode: 'none' };
  if (dt.mode === 'custom') {
    const d = parseLocalDateTime(dt.value);
    if (!d) throw new Error('촬영일시 값이 올바르지 않습니다.');
    const s = formatExifDateTime(d);
    setDateTime(exifObj, s, dt.offset || null);
    actions.push(`촬영일시 → ${s}`);
  } else if (dt.mode === 'randomRecent') {
    const d = randomRecentDate(dt.withinDays || 14);
    const s = formatExifDateTime(d);
    setDateTime(exifObj, s, dt.offset || '+09:00');
    actions.push(`촬영일시 → ${s} (최근 랜덤)`);
  }

  // 2) GPS
  const gps = options.gps || { mode: 'keep' };
  if (gps.mode === 'set') {
    const lat = Number(gps.lat);
    const lon = Number(gps.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error('GPS 좌표가 올바르지 않습니다 (위도 ±90, 경도 ±180).');
    }
    setGps(exifObj, lat, lon);
    actions.push(`GPS → ${lat}, ${lon}`);
  } else if (gps.mode === 'remove') {
    removeGps(exifObj);
    actions.push('GPS 제거');
  }

  // 3) 기기 프로파일
  const device = options.device || { mode: 'keep' };
  if (device.mode === 'apply') {
    applyDeviceProfile(exifObj, device.profileId);
    const p = getProfile(device.profileId);
    actions.push(`기기 프로파일 → ${p ? p.label : device.profileId}`);
  }

  // 4) 식별정보 제거
  if (options.stripIdentifiers) {
    const removed = removeIdentifiers(exifObj);
    actions.push(removed.length ? `식별정보 제거: ${removed.join(', ')}` : '식별정보 제거(해당 없음)');
  }

  const outBuffer = writeExif(jpegBuffer, exifObj);
  const after = summarize(readExif(outBuffer));
  return { outBuffer, before, after, actions };
}

/** "YYYY-MM-DDTHH:mm" (datetime-local) -> Date (로컬 기준) */
function parseLocalDateTime(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
}
