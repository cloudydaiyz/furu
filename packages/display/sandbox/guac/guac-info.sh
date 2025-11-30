#!/usr/bin/env bash

# guac-info.sh
# Prints out Apache Guacamole connection configuration based on environment
# variables set by rds/crds.sh

echo
echo "### EDIT CONNECTION ###"
echo "Name: rds"
echo "Location: ROOT"
echo "Protocol: VNC"
echo
echo "### PARAMETERS ###"
echo
echo "** Network **"
echo "Hostname: $PUBLIC_DNS"
echo "Port: 5901"
echo
echo "** Authentication **"
echo "Password: helloworld"
echo