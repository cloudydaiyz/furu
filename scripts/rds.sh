#!/bin/bash

# rds.sh - Remote Desktop Server
# This script includes the commands that are ran when booting a AWS EC2 virtual machine (AL2023)
# for it to run as a remote desktop server.

set -euo pipefail

## Install the GNOME desktop environment and related packages
sudo dnf groupinstall "Desktop" -y

## Install TigerVNC server package for AL2023
## NOTE: It may already be installed
sudo dnf install -y tigervnc-server

## Assign a display number to the user (":1=ec2-user")
# sudo vi /etc/tigervnc/vncserver.users
echo "
# TigerVNC User assignment
#
# This file assigns users to specific VNC display numbers.
# The syntax is <display>=<username>. E.g.:
#
# :2=andrew
# :3=lisa

:1=ec2-user
" | sudo tee /etc/tigervnc/vncserver.users

## Edit the VNC server configuration file.
# sudo vi /etc/tigervnc/vncserver-config-defaults
echo "
## Default settings for VNC servers started by the vncserver service
#
# Any settings given here will override the builtin defaults, but can
# also be overriden by ~/.config/tigervnc/config and vncserver-config-mandatory.
#
# See HOWTO.md and the following manpages for more details:
#     vncsession(8) Xvnc(1)
#
# Several common settings are shown below. Uncomment and modify to your
# liking.

# session=gnome
# securitytypes=vncauth,tlsvnc
# geometry=2000x1200
# localhost
# alwaysshared

session=gnome
securitytypes=vncauth,tlsvnc
geometry=1920x1080
# localhost
alwaysshared" | sudo tee /etc/tigervnc/vncserver-config-defaults

## Create the VNC password file
echo Initializing tigervnc directory...
sudo mkdir -p "/home/ec2-user/.config/tigervnc"

echo Initializing passwd file...
sudo touch "/home/ec2-user/.config/tigervnc/passwd"

echo Populating passwd file...
echo "helloworld" | vncpasswd -f | sudo tee "/home/ec2-user/.config/tigervnc/passwd"

## Ensure the file only has user rw permissions (otherwise the service will not start!)
echo Configuring passwd file permissions...
sudo chmod 600 "/home/ec2-user/.config/tigervnc/passwd"
sudo chown ec2-user "/home/ec2-user/.config/tigervnc/passwd"

## Start the VNC server
## NOTE: the part after the @ must match the display number
echo Starting the VNC server...
sudo systemctl start vncserver@:1
echo Started VNC server