#!/bin/bash

# rds3.sh - Remote Desktop Server (Docker)
# This script is meant to be used as an initializations script for a Ubuntu 24.04
# Docker container.
# It runs as root during instance startup and sets up the entire environment

# BROKEN: This currently isn't working. Do not use!

set -euo pipefail

apt update && apt-get install -y curl

echo "Setting up VNC + Remote Desktop Server..." | tee -a /var/log/user-data-status

# Install minimal GNOME desktop + VNC + Xvfb (virtual X server)
apt install -y \
  xvfb \
  gnome-shell \
  gnome-session \
  dbus \
  dbus-x11 \
  tigervnc-standalone-server \
  tigervnc-common \
  firefox \
  xterm

# Create non-root user for running the desktop
useradd -m -s /bin/bash ubuntu || true

# Setup VNC password for ubuntu user
mkdir -p /home/ubuntu/.vnc
echo "${VNC_PASSWORD:-password}" | vncpasswd -f > /home/ubuntu/.vnc/passwd
chmod 600 /home/ubuntu/.vnc/passwd
chown -R ubuntu:ubuntu /home/ubuntu/.vnc

# Create VNC startup script
cat > /home/ubuntu/.vnc/xstartup << 'VNCEOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
export XDG_SESSION_TYPE=x11
exec dbus-launch gnome-session
VNCEOF
chmod +x /home/ubuntu/.vnc/xstartup
chown ubuntu:ubuntu /home/ubuntu/.vnc/xstartup

# Start VNC server as ubuntu user
echo "Starting VNC server..."
sudo -u ubuntu vncserver \
  -localhost no \
  -name gnome \
  -SecurityTypes vncauth,tlsvnc \
  -geometry 1920x1080 \
  -depth 24 \
  :1

echo "Starting the app..." | tee -a /var/log/user-data-status

# Download node + pnpm (from nodejs.org)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 22
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable pnpm
pnpm -v

# Add global pnpm dependencies
pnpm setup

# Ensure pnpm bin directory is in PATH
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

source "$HOME/.bashrc"
pnpm add -g pm2 typescript playwright

git clone https://${GITHUB_USER}:${GITHUB_PAT}@github.com/cloudydaiyz/furu.git app
cd app
git checkout $COMMIT_ID

pnpm install --frozen-lockfile
pnpm build
pnpm deploy:controller
pnpm start:controller
# node prod/controller/dist/index.js