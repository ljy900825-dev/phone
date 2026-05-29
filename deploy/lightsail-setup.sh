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

# 이 스크립트는 Lightsail(Ubuntu) 서버 전용. macOS(노트북)에서 실수로 실행 방지.
if [ "$(uname)" = "Darwin" ]; then
  echo "⚠️  이 스크립트는 Lightsail(Ubuntu) 서버용입니다. 지금 macOS 에서 실행 중이에요."
  echo "    공유 링크를 만들려면 → Lightsail 콘솔의 서버 SSH 터미널(>_ 아이콘)에서 실행하세요."
  echo "    (이 맥에서 본인만 테스트하려면:  cd ~/phone && npm install && npm start )"
  exit 1
fi

# apt 가 중간에 대화창(needrestart/debconf)을 띄우지 않도록 비대화형으로 강제.
# (curl|bash 로 실행하면 이 창이 키보드 입력을 못 받아 멈추기 때문)
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
export NEEDRESTART_SUSPEND=1

echo "==> [1/4] Node.js / git 확인"
if ! command -v node >/dev/null 2>&1; then
  echo "    Node.js 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo -E apt-get install -y nodejs
fi
command -v git >/dev/null 2>&1 || sudo -E apt-get install -y git
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

echo "==> [4/4] 서비스 등록 (PUBLIC=1, PORT=$PORT)"
NODE_BIN="$(command -v node)"
USE_SYSTEMD=0
# 비번 없이 sudo 가 되고 systemctl 이 있을 때만 systemd 사용. 아니면 sudo 없이 우회.
if command -v systemctl >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  USE_SYSTEMD=1
fi

if [ "$USE_SYSTEMD" = "1" ]; then
  echo "    systemd 서비스로 등록 (부팅 시 자동 실행 + 자동 복구)"
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
else
  echo "    sudo 권한이 없어 systemd 대신 nohup + crontab(@reboot) 으로 실행합니다."
  pkill -f "node scripts/server.js" >/dev/null 2>&1 || true
  sleep 1
  ( cd "$APP_DIR" && PUBLIC=1 PORT="$PORT" nohup "$NODE_BIN" scripts/server.js > "$APP_DIR/app.log" 2>&1 & )
  # 재부팅 시 자동 실행 (사용자 crontab, sudo 불필요)
  ( crontab -l 2>/dev/null | grep -v 'scripts/server.js' ; \
    echo "@reboot cd $APP_DIR && PUBLIC=1 PORT=$PORT $NODE_BIN scripts/server.js > $APP_DIR/app.log 2>&1" ) \
    | crontab - 2>/dev/null || true
  sleep 2
fi

# 기동 확인
HEALTH="$(curl -fsS "http://127.0.0.1:${PORT}/healthz" 2>/dev/null || true)"
PUBIP="$(curl -fsSL https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
echo ""
echo "================================================================"
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo " 설치 완료 ✅  서버 응답: $HEALTH"
else
  echo " ⚠️ 서버 기동 확인 실패. 로그 확인: tail -n 30 $APP_DIR/app.log"
fi
if [ -n "$PUBIP" ]; then
  echo " 공유 링크 : http://${PUBIP}:${PORT}"
fi
echo " (Lightsail 방화벽에서 TCP ${PORT} 포트를 열어야 외부 접속됩니다)"
if [ "$USE_SYSTEMD" = "1" ]; then
  echo " 로그 보기 : sudo journalctl -u ${SERVICE} -f"
  echo " 중지/시작 : sudo systemctl stop|start ${SERVICE}"
else
  echo " 로그 보기 : tail -f $APP_DIR/app.log"
  echo " 중지     : pkill -f 'node scripts/server.js'"
fi
echo "================================================================"
