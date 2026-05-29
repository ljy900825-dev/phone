# phone EXIF editor — 공개 배포용 컨테이너 이미지
FROM node:22-alpine

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 앱 소스
COPY scripts ./scripts
COPY public ./public

# 공개 모드로 기동: 0.0.0.0 바인딩, 업로드 사진 미저장(다운로드만)
ENV PUBLIC=1
ENV PORT=8080
EXPOSE 8080

CMD ["node", "scripts/server.js"]
