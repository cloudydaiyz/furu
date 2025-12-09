#!/bin/bash

# rds3.sh - Remote Desktop Server (Docker)
# This script is meant to be used as an initializations script for a Ubuntu 24.04
# Docker container.
# It runs as root during instance startup and sets up the entire environment

# BROKEN: This currently isn't working. Do not use!

set -euo pipefail

apt update && apt-get install -y curl

echo "Setting up VNC + Remote Desktop Server..." | tee -a /var/log/user-data-status

# Setup GNOME (without initial setup)
apt install ubuntu-gnome-desktop tigervnc-standalone-server \
  tigervnc-xorg-extension tigervnc-viewer firefox -y
apt remove --purge gnome-initial-setup -y

# From systemctl:
# The unit files have no installation config (WantedBy=, RequiredBy=, 
# UpheldBy=, Also=, or Alias= settings in the [Install] section, and
# DefaultInstance=  for template units). 
# This means they are not meant to be enabled or disabled # using systemctl.
# systemctl enable gdm

systemctl start gdm

# Disable lock screen, screen blanking, and screen saver
gsettings set org.gnome.desktop.lockdown disable-lock-screen true
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver lock-enabled false

# Setup TigerVNC standalone service
mkdir -p "$HOME/.vnc"
touch "$HOME/.vnc/passwd"
echo $VNC_PASSWORD | vncpasswd -f | tee "$HOME/.vnc/passwd"
chmod 600 "$HOME/.vnc/passwd"
chown ubuntu "$HOME/.vnc/passwd"

export DISPLAY=:1
export XAUTHORITY="$HOME/.Xauthority" 

echo Starting VNC server
vncserver \
-localhost no \
-name gnome \
-SecurityTypes vncauth,tlsvnc \
-geometry 1920x1080 \
-depth 32 \
$DISPLAY
echo Started VNC server

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