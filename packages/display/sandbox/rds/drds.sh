#!/usr/bin/env bash

# drds.sh - Delete Remote Desktop Server
# Usage: drds.sh <instance-id>
#        drds.sh $INSTANCE_ID

aws ec2 terminate-instances --instance-ids $1