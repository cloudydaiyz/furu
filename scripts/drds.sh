#!/usr/bin/env bash

# drds.sh - Delete Remote Desktop Server
# Usage: drds.sh <instance-id>
#        drds.sh $INSTANCE_ID

set -euo pipefail

# aws ec2 terminate-instances --instance-ids $1
aws ec2 terminate-instances --instance-ids $INSTANCE_ID