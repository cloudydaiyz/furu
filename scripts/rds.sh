#!/bin/bash

# rds.sh - Remote Desktop Server
# This script includes the commands that are ran after booting a AWS EC2 virtual machine (Ubuntu 24.04)
# for it to run as a remote desktop server. This must be ran as user `ubuntu`.
# 
# Prerequisites: 
# - VM must have access to the ssm:GetParameter action
# - VM must have access to the following parameters: 
#   - /furu/github-user - GitHub Username
#   - /furu/github-pat - GitHub PAT
#   - /furu/commit-id - GitHub Commit ID for furu (or "main")
#   - /furu/furu-controller-access-key - $FURU_CONTROLLER_ACCESS_KEY

echo "Initializing apt + importing env vars from SSM using AWS CLI..." | sudo tee -a /var/log/user-data-status

sudo apt update

# From: https://dev.to/abstractmusa/install-aws-cli-command-line-interface-on-ubuntu-1b50
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install unzip -y
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws

GITHUB_USER=$(aws ssm get-parameter \
	--name "/furu/github-user" \
	--query "Parameter.Value" \
	--output "text")

GITHUB_PAT=$(aws ssm get-parameter \
	--name "/furu/github-pat" \
	--query "Parameter.Value" \
	--output "text")

COMMIT_ID=$(aws ssm get-parameter \
	--name "/furu/commit-id" \
	--query "Parameter.Value" \
	--output "text")

FURU_CONTROLLER_ACCESS_KEY=$(aws ssm get-parameter \
	--name "/furu/furu-controller-access-key" \
	--query "Parameter.Value" \
	--output "text")

VNC_PASSWORD=$(aws ssm get-parameter \
	--name "/furu/vnc-password" \
	--query "Parameter.Value" \
	--output "text")

echo "Setting up VNC + Remote Desktop Server..." | sudo tee -a /var/log/user-data-status

# Setup GNOME (without initial setup)
sudo apt install ubuntu-gnome-desktop firefox -y
sudo apt remove --purge gnome-initial-setup -y

# From systemctl:
# The unit files have no installation config (WantedBy=, RequiredBy=, 
# UpheldBy=, Also=, or Alias= settings in the [Install] section, and
# DefaultInstance=  for template units). 
# This means they are not meant to be enabled or disabled # using systemctl.
# sudo systemctl enable gdm

sudo systemctl start gdm

# Disable lock screen, screen blanking, and screen saver
gsettings set org.gnome.desktop.lockdown disable-lock-screen true
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver lock-enabled false

# Setup TigerVNC standalone service
time sudo apt install -y tigervnc-standalone-server tigervnc-xorg-extension tigervnc-viewer

mkdir -p "$HOME/.vnc"
touch "$HOME/.vnc/passwd"
echo $VNC_PASSWORD | vncpasswd -f | sudo tee "$HOME/.vnc/passwd"
sudo chmod 600 "$HOME/.vnc/passwd"
sudo chown ubuntu "$HOME/.vnc/passwd"

export DISPLAY=:1
export XAUTHORITY="$HOME/.Xauthority" 

vncserver \
-localhost no \
-name gnome \
-SecurityTypes vncauth,tlsvnc \
-geometry 1920x1080 \
-depth 32 \
-PasswordFile "/var/lib/furu/.vnc/passwd" \ 
$DISPLAY

echo "Starting the app..." | sudo tee -a /var/log/user-data-status

# Download node + pnpm (from nodejs.org)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 22
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable pnpm
pnpm -v

# Add global pnpm dependencies
pnpm setup
source "$HOME/.bashrc"
pnpm add -g pm2 typescript playwright

git clone https://${GITHUB_USER}:${GITHUB_PAT}@github.com/cloudydaiyz/furu.git app
cd app
git checkout $COMMIT_ID

source scripts/apps/controller.sh

echo "App started!" | sudo tee -a /var/log/user-data-status