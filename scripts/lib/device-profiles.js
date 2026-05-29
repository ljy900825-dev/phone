// 갤럭시 / 아이폰 기기별 EXIF 프리셋.
// 실제 단말이 사진에 기록하는 값들을 참고해 그 기기다운 Make/Model/Software/Lens 등을 채운다.
//
// 주의: 여기 값들은 "그럴듯한" 대표값이며, 개별 사진의 노출/렌즈 조건까지 똑같이 맞추진 않는다.
// (메타데이터 정리 용도이지 위조 목적이 아니다.)
//
// 각 프로파일 구조:
//  - id, label, vendor('samsung'|'apple')
//  - zeroth: 0th IFD 태그 이름 → 값  (Make/Model/Software 등)
//  - exif:   Exif IFD 태그 이름 → 값 (LensMake/LensModel 등)
// 태그는 piexif 표준 태그 "이름"으로 적고, exif-editor 가 숫자 키로 변환한다.
// (Model/SM-코드는 한국 출시 모델 기준 N 접미사를 사용)

export const DEVICE_PROFILES = [
  // ===== 삼성 갤럭시 =====
  {
    id: 'galaxy-s25-ultra',
    label: 'Galaxy S25 Ultra',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S938N', Software: 'S938NKSU1AYA5' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S25 Ultra Rear Camera',
      FNumber: [17, 10], FocalLength: [670, 100], FocalLengthIn35mmFilm: 23,
    },
  },
  {
    id: 'galaxy-s25-plus',
    label: 'Galaxy S25+',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S936N', Software: 'S936NKSU1AYA5' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S25+ Rear Camera',
      FNumber: [18, 10], FocalLength: [610, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'galaxy-s25',
    label: 'Galaxy S25',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S931N', Software: 'S931NKSU1AYA5' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S25 Rear Camera',
      FNumber: [18, 10], FocalLength: [610, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'galaxy-s24-ultra',
    label: 'Galaxy S24 Ultra',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S928N', Software: 'S928NKSU2BXB1' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S24 Ultra Rear Camera',
      FNumber: [17, 10], FocalLength: [670, 100], FocalLengthIn35mmFilm: 23,
    },
  },
  {
    id: 'galaxy-s24-plus',
    label: 'Galaxy S24+',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S926N', Software: 'S926NKSU2BXB1' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S24+ Rear Camera',
      FNumber: [18, 10], FocalLength: [580, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'galaxy-s24',
    label: 'Galaxy S24',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S921N', Software: 'S921NKSU2BXB1' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S24 Rear Camera',
      FNumber: [18, 10], FocalLength: [580, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'galaxy-s23-ultra',
    label: 'Galaxy S23 Ultra',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S918N', Software: 'S918NKSU4DXA1' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S23 Ultra Rear Camera',
      FNumber: [17, 10], FocalLength: [660, 100], FocalLengthIn35mmFilm: 23,
    },
  },
  {
    id: 'galaxy-s23',
    label: 'Galaxy S23',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-S911N', Software: 'S911NKSU3CXA1' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy S23 Rear Camera',
      FNumber: [18, 10], FocalLength: [580, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'galaxy-z-fold6',
    label: 'Galaxy Z Fold6',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-F956N', Software: 'F956NKSU1AXG5' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy Z Fold6 Rear Camera',
      FNumber: [18, 10], FocalLength: [610, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'galaxy-z-flip6',
    label: 'Galaxy Z Flip6',
    vendor: 'samsung',
    zeroth: { Make: 'samsung', Model: 'SM-F741N', Software: 'F741NKSU1AXG5' },
    exif: {
      LensMake: 'samsung', LensModel: 'Galaxy Z Flip6 Rear Camera',
      FNumber: [18, 10], FocalLength: [610, 100], FocalLengthIn35mmFilm: 24,
    },
  },

  // ===== 애플 아이폰 =====
  {
    id: 'iphone-17-pro-max',
    label: 'iPhone 17 Pro Max',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 17 Pro Max', Software: '26.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 17 Pro Max back triple camera 6.765mm f/1.78',
      FNumber: [178, 100], FocalLength: [6765, 1000], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-17-pro',
    label: 'iPhone 17 Pro',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 17 Pro', Software: '26.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 17 Pro back triple camera 6.765mm f/1.78',
      FNumber: [178, 100], FocalLength: [6765, 1000], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-17',
    label: 'iPhone 17',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 17', Software: '26.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 17 back dual camera 5.96mm f/1.6',
      FNumber: [16, 10], FocalLength: [596, 100], FocalLengthIn35mmFilm: 26,
    },
  },
  {
    id: 'iphone-16-pro-max',
    label: 'iPhone 16 Pro Max',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 16 Pro Max', Software: '18.3.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 16 Pro Max back triple camera 6.765mm f/1.78',
      FNumber: [178, 100], FocalLength: [6765, 1000], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-16-pro',
    label: 'iPhone 16 Pro',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 16 Pro', Software: '18.3.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 16 Pro back triple camera 6.765mm f/1.78',
      FNumber: [178, 100], FocalLength: [6765, 1000], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-16',
    label: 'iPhone 16',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 16', Software: '18.3.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 16 back dual camera 5.96mm f/1.6',
      FNumber: [16, 10], FocalLength: [596, 100], FocalLengthIn35mmFilm: 26,
    },
  },
  {
    id: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 15 Pro Max', Software: '18.2.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 15 Pro Max back triple camera 6.86mm f/1.78',
      FNumber: [178, 100], FocalLength: [686, 100], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-15-pro',
    label: 'iPhone 15 Pro',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 15 Pro', Software: '18.2.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 15 Pro back triple camera 6.765mm f/1.78',
      FNumber: [178, 100], FocalLength: [6765, 1000], FocalLengthIn35mmFilm: 24,
    },
  },
  {
    id: 'iphone-15',
    label: 'iPhone 15',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 15', Software: '18.2.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 15 back dual camera 5.96mm f/1.6',
      FNumber: [16, 10], FocalLength: [596, 100], FocalLengthIn35mmFilm: 26,
    },
  },
  {
    id: 'iphone-14',
    label: 'iPhone 14',
    vendor: 'apple',
    zeroth: { Make: 'Apple', Model: 'iPhone 14', Software: '18.2.1' },
    exif: {
      LensMake: 'Apple', LensModel: 'iPhone 14 back dual camera 5.7mm f/1.5',
      FNumber: [15, 10], FocalLength: [57, 10], FocalLengthIn35mmFilm: 26,
    },
  },
];

export function getProfile(id) {
  return DEVICE_PROFILES.find((p) => p.id === id) || null;
}

// UI 로 내려줄 가벼운 목록 (값 전체 노출은 불필요)
export function listProfiles() {
  return DEVICE_PROFILES.map((p) => ({ id: p.id, label: p.label, vendor: p.vendor }));
}
