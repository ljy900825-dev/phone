// piexifjs 로 JPEG EXIF read/write 가 정상 동작하는지 확인하는 검증 스크립트.
// 1x1 픽셀 최소 JPEG 에 EXIF 를 주입 → 다시 읽어 값이 보존되는지 확인한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import piexif from 'piexifjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// EXIF 가 전혀 없는 1x1 흰색 JPEG (base64). 실제 폰 사진 대용 픽스처.
const BLANK_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////' +
  '////////////////////////////////////////////////////wAALCAABAAEBAREA' +
  '/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8A' +
  'fwD/2Q==';

function ok(cond, msg) {
  if (!cond) throw new Error('검증 실패: ' + msg);
  console.log('  ✓ ' + msg);
}

function run() {
  console.log('[1] 픽스처 JPEG 준비');
  const jpegBuf = Buffer.from(BLANK_JPEG_B64, 'base64');
  ok(jpegBuf[0] === 0xff && jpegBuf[1] === 0xd8, 'JPEG SOI 마커(FFD8) 확인');

  const fixturePath = path.join(root, 'fixtures', 'sample.jpg');
  fs.writeFileSync(fixturePath, jpegBuf);
  console.log('     -> ' + fixturePath);

  console.log('[2] piexif.dump 으로 EXIF 생성 + insert');
  const binStr = jpegBuf.toString('binary');

  const zeroth = {};
  const exif = {};
  const gps = {};
  zeroth[piexif.ImageIFD.Make] = 'samsung';
  zeroth[piexif.ImageIFD.Model] = 'SM-S928N';
  zeroth[piexif.ImageIFD.Software] = 'S928NKSU2BXB1';
  exif[piexif.ExifIFD.DateTimeOriginal] = '2026:05:20 14:30:00';
  exif[piexif.ExifIFD.LensModel] = 'Galaxy S24 Ultra Rear Camera';
  // GPS: 37.5665 N, 126.9780 E (서울시청 부근)
  gps[piexif.GPSIFD.GPSLatitudeRef] = 'N';
  gps[piexif.GPSIFD.GPSLatitude] = [[37, 1], [33, 1], [5940, 100]];
  gps[piexif.GPSIFD.GPSLongitudeRef] = 'E';
  gps[piexif.GPSIFD.GPSLongitude] = [[126, 1], [58, 1], [4080, 100]];

  const exifObj = { '0th': zeroth, Exif: exif, GPS: gps };
  const exifBytes = piexif.dump(exifObj);
  const newBinStr = piexif.insert(exifBytes, binStr);
  const outBuf = Buffer.from(newBinStr, 'binary');

  const writtenPath = path.join(root, 'fixtures', 'sample-with-exif.jpg');
  fs.writeFileSync(writtenPath, outBuf);
  ok(outBuf[0] === 0xff && outBuf[1] === 0xd8, '주입 후에도 유효한 JPEG');

  console.log('[3] 다시 읽어서 값 확인 (piexif.load)');
  const reread = fs.readFileSync(writtenPath).toString('binary');
  const loaded = piexif.load(reread);

  ok(loaded['0th'][piexif.ImageIFD.Make] === 'samsung', 'Make=samsung 보존');
  ok(loaded['0th'][piexif.ImageIFD.Model] === 'SM-S928N', 'Model=SM-S928N 보존');
  ok(
    loaded['Exif'][piexif.ExifIFD.DateTimeOriginal] === '2026:05:20 14:30:00',
    'DateTimeOriginal 보존'
  );
  ok(loaded['GPS'][piexif.GPSIFD.GPSLatitudeRef] === 'N', 'GPSLatitudeRef=N 보존');
  ok(
    Array.isArray(loaded['GPS'][piexif.GPSIFD.GPSLatitude]),
    'GPSLatitude rational 배열 보존'
  );

  console.log('[4] EXIF 제거(piexif.remove) 동작 확인');
  const stripped = piexif.remove(reread);
  const strippedLoaded = piexif.load(stripped);
  const noTags =
    Object.keys(strippedLoaded['0th']).length === 0 &&
    Object.keys(strippedLoaded['Exif']).length === 0;
  ok(noTags, 'piexif.remove 후 EXIF 비어있음');

  console.log('\n✅ piexifjs JPEG EXIF read/write 검증 통과');
}

run();
