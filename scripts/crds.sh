#!/usr/bin/env bash

# crds.sh - Create Remote Desktop Server
# Provisions an EC2 instance
# NOTE: You need at least a t2.medium for decent performance

set -euo pipefail

scripts/seed-ssm.sh

OUTPUT1=$(aws ec2 run-instances \
--count 1 \
--image-id ami-0f5fcdfbd140e4ab7 \
--instance-type t3.medium \
--key-name guac-key \
--security-group-ids $SECURITY_GROUP_ID \
--region us-east-2 \
--iam-instance-profile $INSTANCE_PROFILE_PARAM \
--block-device-mappings '
[
    {
        "DeviceName": "/dev/sda1",
        "Ebs": {
            "VolumeSize": 24
        }
    }
]
')

INSTANCE_ID=$(node scripts/parse-crds.js "${OUTPUT1}" instance-id)
echo Instance ID: "$INSTANCE_ID"

# Give the instance time for initialization
sleep 10

OUTPUT2=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID")

PUBLIC_DNS=$(node scripts/parse-crds.js "$OUTPUT2" public-dns describe)
echo Public DNS: "$PUBLIC_DNS"

export INSTANCE_ID
export PUBLIC_DNS

echo 
echo Your remote desktop server has been deployed!
echo The server may still be initializing for a couple of minutes.
echo 
echo Shell commands:
echo export INSTANCE_ID="$INSTANCE_ID"
echo export PUBLIC_DNS="$PUBLIC_DNS"
echo
echo To SSH into the instance:
echo ssh -i "\$GUAC_KEY" "ubuntu@\$PUBLIC_DNS"
echo ssh -i "$GUAC_KEY" "ubuntu@$PUBLIC_DNS"
echo
echo Create an SSH tunnel from your local machine:
echo ssh -L 5901:localhost:5901 -i "\$GUAC_KEY" "ubuntu@\$PUBLIC_DNS"
echo ssh -L 5901:localhost:5901 -i "$GUAC_KEY" "ubuntu@$PUBLIC_DNS"
echo