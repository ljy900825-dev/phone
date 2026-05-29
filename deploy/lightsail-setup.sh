#!/usr/bin/env bash
# phone EXIF editor — AWS Lightsail (Ubuntu) 자동 설치 스크립트.
#
# 서버 SSH 터미널에서 한 줄로 실행:
#   curl -fsSL https://raw.githubusercontent.com/ljy900825-dev/phone/claude/phone-repo-setup-Aqg2u/deploy/lightsail-setup.sh | bash
#
# 하는 일:
#   1) Node.js 22 + git 설치 (없을 때만)
#   2) ~/phone 에 저장소 클론(또는 최신화)
#   3) 의존성 설치 (piexifjs)
#   4) systemd 서비스 등록 → 공개 모드(PUBLIC=1)로 부팅 시 자동 실행
# 실행 후 http://<서버공인IP>:<포트> 로 접속.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ljy900825-dev/phone.git}"
BRANCH="${BRANCH:-claude/phone-repo-setup-Aqg2u}"
APP_DIR="${APP_DIR:-$HOME/phone}"
PORT="${PORT:-8080}"
SERVICE="phone-exif"

echo "==> [1/4] Node.js / git 확인"
if ! command -v node >/dev/null 2>&1; then
  echo "    Node.js 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v git >/dev/null 2>&1 || sudo apt-get install -y git
echo "    node $(node -v) / npm $(npm -v)"

echo "==> [2/4] 저장소 받기 ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "==> [3/4] 의존성 설치"
cd "$APP_DIR"
npm ci --omit=dev

echo "==> [4/4] systemd 서비스 등록 (PUBLIC=1, PORT=$PORT)"
NODE_BIN="$(command -v node)"
sudo tee "/etc/systemd/system/${SERVICE}.service" > /dev/null <<EOF
[Unit]
Description=phone EXIF editor (public)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=PUBLIC=1
Environment=PORT=${PORT}
ExecStart=${NODE_BIN} scripts/server.js
Restart=on-failure
RestartSec=3
User=${USER}

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE}" >/dev/null 2>&1 || true
sudo systemctl restart "${SERVICE}"
sleep 1
sudo systemctl --no-pager --full status "${SERVICE}" | head -n 8 || true

PUBIP="$(curl -fsSL https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
echo ""
echo "================================================================"
echo " 설치 완료 ✅"
echo " 로컬 확인 : curl -s -H 'Host: x' http://127.0.0.1:${PORT}/healthz"
if [ -n "$PUBIP" ]; then
  echo " 공유 링크 : http://${PUBIP}:${PORT}"
fi
echo " (Lightsail 방화벽에서 TCP ${PORT} 포트를 열어야 외부 접속됩니다)"
echo " 로그 보기 : sudo journalctl -u ${SERVICE} -f"
echo " 중지/시작 : sudo systemctl stop|start ${SERVICE}"
echo "================================================================"
