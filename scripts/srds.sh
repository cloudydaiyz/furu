#!/usr/bin/env bash

scp -i $GUAC_KEY -o StrictHostKeyChecking=no "scripts/rds.sh" "ubuntu@$PUBLIC_DNS:~"
ssh -i $GUAC_KEY -o StrictHostKeyChecking=no "ubuntu@$PUBLIC_DNS" "chmod u+rx rds.sh"
ssh -i $GUAC_KEY -o StrictHostKeyChecking=no "ubuntu@$PUBLIC_DNS" "source ./rds.sh"