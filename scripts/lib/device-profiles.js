// 갤럭시 / 아이폰 기기별 EXIF 프리셋.
// 실제 단말이 사진에 기록하는 값들을 참고해 그 기기다운 Make/Model/Software/Lens 등을 채운다.
//
// 주의: 여기 값들은 "그럴듯한" 대표값이며, 개별 사진의 노출/렌즈 조건까지 똑같이 맞추진 않는다.
// (메타데이터 정리 용도이지 위조 목적이 아니다.)

/**
 * 각 프로파일 구조:
 *  - id: 내부 식별자
 *  - label: UI 표시 이름
 *  - vendor: 'samsung' | 'apple'
 *  - zeroth: 0th IFD 태그 이름 → 값  (Make/Model/Software 등)
 *  - exif:   Exif IFD 태그 이름 → 값 (LensMake/LensModel 등)
 * 태그는 piexif 의 표준 태그 "이름"으로 적고, exif-editor 가 숫자 키로 변환한다.
 */
export const DEVICE_PROFILES = [
  {
    id: 'galaxy-s24-ultra',
    label: 'Galaxy S24 Ultra',
    vendor: 'samsung',
    zeroth: {
      Make: 'samsung',
      Model: 'SM-S928N',
      Software: 'S928NKSU2BXB1',
    },
    exif: {
      LensMake: 'samsung',
      LensModel: 'Galaxy S24 Ultra Rear Camera',
      FNumber: [17, 10], // f/1.7
      FocalLength: [670, 100], // 6.7mm
      FocalLengthIn35mmFilm: 23,
    },
  },
  {
    id: 'galaxy-s23',
    label: 'Galaxy S23',
    vendor: 'samsung',
    zeroth: {
      Make: 'samsung',
      Model: 'SM-S911N',
      Software: 'S911NKSU3CXA1',
    },
    exif: {
      LensMake: 'samsung',
      LensModel: 'Galaxy S23 Rear Camera',
      FNumber: [18, 10], // f/1.8
      FocalLength: [580, 100], // 5.8mm
      FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-15-pro',
    label: 'iPhone 15 Pro',
    vendor: 'apple',
    zeroth: {
      Make: 'Apple',
      Model: 'iPhone 15 Pro',
      Software: '17.4.1',
    },
    exif: {
      LensMake: 'Apple',
      LensModel: 'iPhone 15 Pro back triple camera 6.765mm f/1.78',
      FNumber: [178, 100], // f/1.78
      FocalLength: [6765, 1000], // 6.765mm
      FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-14',
    label: 'iPhone 14',
    vendor: 'apple',
    zeroth: {
      Make: 'Apple',
      Model: 'iPhone 14',
      Software: '17.3',
    },
    exif: {
      LensMake: 'Apple',
      LensModel: 'iPhone 14 back dual camera 5.7mm f/1.5',
      FNumber: [15, 10], // f/1.5
      FocalLength: [57, 10], // 5.7mm
      FocalLengthIn35mmFilm: 26,
    },
  },
];

export function getProfile(id) {
  return DEVICE_PROFILES.find((p) => p.id === id) || null;
}

// UI 로 내려줄 가벼운 목록 (값 전체 노출은 불필요)
export function listProfiles() {
  return DEVICE_PROFILES.map((p) => ({
    id: p.id,
    label: p.label,
    vendor: p.vendor,
  }));
}
