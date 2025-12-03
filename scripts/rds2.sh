#!/bin/bash

# rds2.sh - Remote Desktop Server (EC2 User Data)
# This script is meant to be used as EC2 user data for Ubuntu 24.04
# It runs as root during instance startup and sets up the entire environment

# BROKEN: This currently isn't working. Do not use!

set -euo pipefail

# Logging setup
LOG_FILE="/var/log/user-data.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "=========================================="
echo "$(date): EC2 User Data Script Starting"
echo "=========================================="

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install AWS CLI
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
apt-get install -y unzip
cd /tmp
unzip awscliv2.zip
./aws/install
cd -
rm -rf /tmp/awscliv2.zip /tmp/aws

# Fetch parameters from SSM
echo "Fetching configuration from AWS SSM Parameter Store..."
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

echo "SSM parameters retrieved successfully"

# Setup GNOME + Desktop Environment
echo "Setting up GNOME desktop environment..."
apt-get install -y ubuntu-gnome-desktop firefox
apt-get remove --purge -y gnome-initial-setup

# Start GDM
echo "Starting GDM..."
systemctl start gdm

# Wait for GDM to initialize X11 session and create .Xauthority
echo "Waiting for GDM to initialize..."
for i in {1..60}; do
	if [ -f /home/ubuntu/.Xauthority ]; then
		echo "X11 session initialized"
		break
	fi
	echo "Waiting for X11... ($i/60)"
	sleep 2
done

if [ ! -f /home/ubuntu/.Xauthority ]; then
	echo "Warning: .Xauthority not created by GDM, creating manually..."
	sudo -u ubuntu touch /home/ubuntu/.Xauthority
fi

# Disable lock screen and screen saver (system-wide)
echo "Disabling lock screen and screen saver..."
cat > /tmp/gnome-settings.sh << 'EOF'
#!/bin/bash
gsettings set org.gnome.desktop.lockdown disable-lock-screen true
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver lock-enabled false
EOF
chmod +x /tmp/gnome-settings.sh

# Run as ubuntu user in X session (with retry)
for i in {1..5}; do
	echo "Applying GNOME settings (attempt $i/5)..."
	if sudo -u ubuntu DISPLAY=:0 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus /tmp/gnome-settings.sh 2>/dev/null; then
		break
	fi
	sleep 2
done

# Setup TigerVNC
echo "Setting up TigerVNC server..."
apt-get install -y tigervnc-standalone-server tigervnc-xorg-extension tigervnc-viewer

sudo -u ubuntu mkdir -p /home/ubuntu/.vnc
sudo -u ubuntu touch /home/ubuntu/.vnc/passwd
echo "$VNC_PASSWORD" | sudo -u ubuntu vncpasswd -f | sudo tee /home/ubuntu/.vnc/passwd > /dev/null
chmod 600 /home/ubuntu/.vnc/passwd
chown ubuntu:ubuntu /home/ubuntu/.vnc/passwd

# Create VNC startup script
cat > /home/ubuntu/.vnc/xstartup << 'VNCEOF'
#!/bin/sh
unset SESSION_MANAGER
exec /usr/bin/startwm.sh
VNCEOF
chmod +x /home/ubuntu/.vnc/xstartup
chown ubuntu:ubuntu /home/ubuntu/.vnc/xstartup

# Start VNC server on display :5901 (external) -> :1 (internal)
echo "Starting VNC server..."
sudo -u ubuntu vncserver \
	-localhost no \
	-name gnome \
	-SecurityTypes vncauth,tlsvnc \
	-geometry 1920x1080 \
	-depth 24 \
	-PasswordFile "/home/ubuntu/.vnc/passwd" \
	:1

echo "VNC server started on display :1 (port 5901)"

# Setup Node.js and pnpm as ubuntu user
echo "Setting up Node.js and pnpm..."
sudo -u ubuntu bash -c '
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
	. "$HOME/.nvm/nvm.sh"
	nvm install 22
	export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
	corepack enable pnpm
	pnpm -v
	
	# Setup pnpm
	pnpm setup
	
	# Ensure pnpm bin directory is in PATH for this session
	export PNPM_HOME="$HOME/.local/share/pnpm"
	export PATH="$PNPM_HOME:$PATH"
	
	# Add global dependencies
	pnpm add -g pm2 typescript playwright
'

# Source bashrc for ubuntu user for future sessions
sudo -u ubuntu bash -c 'source "$HOME/.bashrc"'

# Clone repository and setup app
echo "Cloning furu repository..."
sudo -u ubuntu git clone https://${GITHUB_USER}:${GITHUB_PAT}@github.com/cloudydaiyz/furu.git /home/ubuntu/app

echo "Checking out commit $COMMIT_ID..."
cd /home/ubuntu/app
sudo -u ubuntu git checkout "$COMMIT_ID"

# Run the controller setup script
echo "Setting up furu controller app..."
sudo -u ubuntu bash -c '
	cd /home/ubuntu/app
	. "$HOME/.nvm/nvm.sh"
	. "$HOME/.bashrc"
	export FURU_CONTROLLER_ACCESS_KEY="'"${FURU_CONTROLLER_ACCESS_KEY}"'"
	scripts/apps/controller.sh
'

echo "=========================================="
echo "$(date): EC2 User Data Script Complete"
echo "=========================================="
