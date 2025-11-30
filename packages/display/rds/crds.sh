#!/usr/bin/env bash

## crds.sh - Create Remote Desktop Server

## Create EC2 instance
## NOTE: Remote desktop just barely runs with t2.medium
## https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-instances.html 
## https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/run-instances.html
OUTPUT1=$(aws ec2 run-instances \
--count 1 \
--image-id ami-06971c49acd687c30 \
--instance-type t2.medium \
--key-name guac-key \
--security-group-ids sg-0963e1f6ab4c12e45 \
--region us-east-2 \
--user-data file://rds/rds.sh)
# OUTPUT1='{ "Groups": [], "Instances": [ { "AmiLaunchIndex": 0, "ImageId": "ami-06971c49acd687c30", "InstanceId": "i-08a14b41ebd3fac55", "InstanceType": "t2.medium", "KeyName": "guac-key", "LaunchTime": "2025-06-18T12:30:35+00:00", "Monitoring": { "State": "disabled" }, "Placement": { "AvailabilityZone": "us-east-2a", "GroupName": "", "Tenancy": "default" }, "PrivateDnsName": "ip-172-31-14-199.us-east-2.compute.internal", "PrivateIpAddress": "172.31.14.199", "ProductCodes": [], "PublicDnsName": "", "State": { "Code": 0, "Name": "pending" }, "StateTransitionReason": "", "SubnetId": "subnet-044a28ad7345aa5f5", "VpcId": "vpc-0645a2dfd0cadf04c", "Architecture": "x86_64", "BlockDeviceMappings": [], "ClientToken": "853c49aa-05fd-4687-a3f2-c00205f25e98", "EbsOptimized": false, "EnaSupport": true, "Hypervisor": "xen", "NetworkInterfaces": [ { "Attachment": { "AttachTime": "2025-06-18T12:30:35+00:00", "AttachmentId": "eni-attach-0f35fa104994c8006", "DeleteOnTermination": true, "DeviceIndex": 0, "Status": "attaching", "NetworkCardIndex": 0 }, "Description": "", "Groups": [ { "GroupName": "launch-wizard-2", "GroupId": "sg-0963e1f6ab4c12e45" } ], "Ipv6Addresses": [], "MacAddress": "02:65:08:8a:7d:4f", "NetworkInterfaceId": "eni-041243aec03883588", "OwnerId": "471112798654", "PrivateDnsName": "ip-172-31-14-199.us-east-2.compute.internal", "PrivateIpAddress": "172.31.14.199", "PrivateIpAddresses": [ { "Primary": true, "PrivateDnsName": "ip-172-31-14-199.us-east-2.compute.internal", "PrivateIpAddress": "172.31.14.199" } ], "SourceDestCheck": true, "Status": "in-use", "SubnetId": "subnet-044a28ad7345aa5f5", "VpcId": "vpc-0645a2dfd0cadf04c", "InterfaceType": "interface" } ], "RootDeviceName": "/dev/xvda", "RootDeviceType": "ebs", "SecurityGroups": [ { "GroupName": "launch-wizard-2", "GroupId": "sg-0963e1f6ab4c12e45" } ], "SourceDestCheck": true, "StateReason": { "Code": "pending", "Message": "pending" }, "VirtualizationType": "hvm", "CpuOptions": { "CoreCount": 2, "ThreadsPerCore": 1 }, "CapacityReservationSpecification": { "CapacityReservationPreference": "open" }, "MetadataOptions": { "State": "pending", "HttpTokens": "required", "HttpPutResponseHopLimit": 2, "HttpEndpoint": "enabled", "HttpProtocolIpv6": "disabled", "InstanceMetadataTags": "disabled" }, "EnclaveOptions": { "Enabled": false }, "BootMode": "uefi-preferred", "PrivateDnsNameOptions": { "HostnameType": "ip-name", "EnableResourceNameDnsARecord": false, "EnableResourceNameDnsAAAARecord": false }, "MaintenanceOptions": { "AutoRecovery": "default" }, "CurrentInstanceBootMode": "legacy-bios" } ], "OwnerId": "471112798654", "ReservationId": "r-0f0dfe2d0abfa82f2" }'

INSTANCE_ID=$(node rds/parse-crds.js "${OUTPUT1}" instance-id)
echo Instance ID: "$INSTANCE_ID"

# Give the instance time for initialization (mainly the user data)
sleep 10

OUTPUT2=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID")

PUBLIC_DNS=$(node rds/parse-crds.js "$OUTPUT2" public-dns describe)
echo Public DNS: "$PUBLIC_DNS"

## Create an SSH tunnel from your local machine.
# ssh -L 5901:localhost:5901 -i "~/.ssh/apollo/guac-key.pem" "ec2-user@$PUBLIC_DNS"

echo 
echo Shell commands:
echo export INSTANCE_ID="$INSTANCE_ID"
echo export PUBLIC_DNS="$PUBLIC_DNS"
echo ssh -L 5901:localhost:5901 -i "~/.ssh/apollo/guac-key.pem" "ec2-user@$PUBLIC_DNS"

## AFTER RUNNING THIS
## Use your VNC client to connect to localhost:5901 or 127.0.0.1:5901 with the previously set VNC password.