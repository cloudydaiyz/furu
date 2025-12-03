#!/usr/bin/env bash

## crds.sh - Create Remote Desktop Server
# Provisions an EC2 instance with a VNC remote desktop server preinstalled

set -euo pipefail

## Create EC2 instance
## NOTE: Remote desktop just barely runs with t2.medium
## https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-instances.html 
## https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/run-instances.html
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

# Give the instance time for initialization (mainly the user data)
sleep 10

OUTPUT2=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID")

PUBLIC_DNS=$(node scripts/parse-crds.js "$OUTPUT2" public-dns describe)
echo Public DNS: "$PUBLIC_DNS"

## Create an SSH tunnel from your local machine.
# ssh -L 5901:localhost:5901 -i "~/.ssh/apollo/guac-key.pem" "ubuntu@$PUBLIC_DNS"

export INSTANCE_ID
export PUBLIC_DNS

# scp -i $GUAC_KEY "scripts/rds.sh" "ubuntu@$PUBLIC_DNS:~"
# ssh -i $GUAC_KEY "ubuntu@$PUBLIC_DNS" "chmod u+rx rds.sh"
# ssh -i $GUAC_KEY "ubuntu@$PUBLIC_DNS" "source ./rds.sh"

echo 
echo Your remote desktop server has been deployed!
echo The server may still be initializing for a couple of minutes.
echo 
echo Shell commands:
echo export INSTANCE_ID="$INSTANCE_ID"
echo export PUBLIC_DNS="$PUBLIC_DNS"
echo export FURU_CONTROLLER_HOST="$PUBLIC_DNS"
echo export VNC_HOSTNAME="$PUBLIC_DNS"
echo
echo scp -i $GUAC_KEY "scripts/rds.sh" "ubuntu@$PUBLIC_DNS:~"
echo ssh -i $GUAC_KEY "ubuntu@$PUBLIC_DNS" "chmod u+rx rds.sh"
echo ssh -i $GUAC_KEY "ubuntu@$PUBLIC_DNS" "source ./rds.sh"
echo
echo To SSH into the instance:
echo ssh -i "\$GUAC_KEY" "ubuntu@\$PUBLIC_DNS"
echo ssh -i "$GUAC_KEY" "ubuntu@$PUBLIC_DNS"
echo
echo To SSH into the instance with a tunnel:
echo ssh -L 5901:localhost:5901 -i "\$GUAC_KEY" "ubuntu@\$PUBLIC_DNS"
echo ssh -L 5901:localhost:5901 -i "$GUAC_KEY" "ubuntu@$PUBLIC_DNS"
echo