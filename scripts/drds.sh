#!/usr/bin/env bash

# drds.sh - Delete Remote Desktop Server
# Deletes a pre-provisioned EC2 instance with ID $INSTANCE_ID

set -euo pipefail

# aws ec2 terminate-instances --instance-ids $1
aws ec2 terminate-instances --instance-ids $INSTANCE_ID