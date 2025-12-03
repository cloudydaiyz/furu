const assert = require('node:assert');
const { test } = require('node:test');
const extract = require('../parse-crds');

const output1 = {
    "Groups": [],
    "Instances": [
        {
            "AmiLaunchIndex": 0,
            "ImageId": "ami-06971c49acd687c30",
            "InstanceId": "i-0f8572f3f625de186",
            "InstanceType": "t2.medium",
            "KeyName": "guac-key",
            "LaunchTime": "2025-06-17T11:49:44+00:00",
            "Monitoring": {
                "State": "disabled"
            },
            "Placement": {
                "AvailabilityZone": "us-east-2a",
                "GroupName": "",
                "Tenancy": "default"
            },
            "PrivateDnsName": "ip-172-31-14-84.us-east-2.compute.internal",
            "PrivateIpAddress": "172.31.14.84",
            "ProductCodes": [],
            "PublicDnsName": "",
            "State": {
                "Code": 0,
                "Name": "pending"
            },
            "StateTransitionReason": "",
            "SubnetId": "subnet-044a28ad7345aa5f5",
            "VpcId": "vpc-0645a2dfd0cadf04c",
            "Architecture": "x86_64",
            "BlockDeviceMappings": [],
            "ClientToken": "8938aef6-28c2-4fd3-8d8f-1b7ef9b79310",
            "EbsOptimized": false,
            "EnaSupport": true,
            "Hypervisor": "xen",
            "NetworkInterfaces": [
                {
                    "Attachment": {
                        "AttachTime": "2025-06-17T11:49:44+00:00",
                        "AttachmentId": "eni-attach-0299c659c98ee26fd",
                        "DeleteOnTermination": true,
                        "DeviceIndex": 0,
                        "Status": "attaching",
                        "NetworkCardIndex": 0
                    },
                    "Description": "",
                    "Groups": [
                        {
                            "GroupName": "launch-wizard-2",
                            "GroupId": "sg-0963e1f6ab4c12e45"
                        }
                    ],
                    "Ipv6Addresses": [],
                    "MacAddress": "02:05:d9:f2:c0:d5",
                    "NetworkInterfaceId": "eni-0c2f9763a779e8b06",
                    "PrivateDnsName": "ip-172-31-14-84.us-east-2.compute.internal",
                    "PrivateIpAddress": "172.31.14.84",
                    "PrivateIpAddresses": [
                        {
                            "Primary": true,
                            "PrivateDnsName": "ip-172-31-14-84.us-east-2.compute.internal",
                            "PrivateIpAddress": "172.31.14.84"
                        }
                    ],
                    "SourceDestCheck": true,
                    "Status": "in-use",
                    "SubnetId": "subnet-044a28ad7345aa5f5",
                    "VpcId": "vpc-0645a2dfd0cadf04c",
                    "InterfaceType": "interface"
                }
            ],
            "RootDeviceName": "/dev/xvda",
            "RootDeviceType": "ebs",
            "SecurityGroups": [
                {
                    "GroupName": "launch-wizard-2",
                    "GroupId": "sg-0963e1f6ab4c12e45"
                }
            ],
            "SourceDestCheck": true,
            "StateReason": {
                "Code": "pending",
                "Message": "pending"
            },
            "VirtualizationType": "hvm",
            "CpuOptions": {
                "CoreCount": 2,
                "ThreadsPerCore": 1
            },
            "CapacityReservationSpecification": {
                "CapacityReservationPreference": "open"
            },
            "MetadataOptions": {
                "State": "pending",
                "HttpTokens": "required",
                "HttpPutResponseHopLimit": 2,
                "HttpEndpoint": "enabled",
                "HttpProtocolIpv6": "disabled",
                "InstanceMetadataTags": "disabled"
            },
            "EnclaveOptions": {
                "Enabled": false
            },
            "BootMode": "uefi-preferred",
            "PrivateDnsNameOptions": {
                "HostnameType": "ip-name",
                "EnableResourceNameDnsARecord": false,
                "EnableResourceNameDnsAAAARecord": false
            },
            "MaintenanceOptions": {
                "AutoRecovery": "default"
            },
            "CurrentInstanceBootMode": "legacy-bios"
        }
    ],
    "ReservationId": "r-07b434e0ac1118d21"
};

const output2 = {
    "Reservations": [
        {
            "Groups": [],
            "Instances": [
                {
                    "AmiLaunchIndex": 0,
                    "ImageId": "ami-06971c49acd687c30",
                    "InstanceId": "i-0f8572f3f625de186",
                    "InstanceType": "t2.medium",
                    "KeyName": "guac-key",
                    "LaunchTime": "2025-06-17T11:49:44+00:00",
                    "Monitoring": {
                        "State": "disabled"
                    },
                    "Placement": {
                        "AvailabilityZone": "us-east-2a",
                        "GroupName": "",
                        "Tenancy": "default"
                    },
                    "PrivateDnsName": "ip-172-31-14-84.us-east-2.compute.internal",
                    "PrivateIpAddress": "172.31.14.84",
                    "ProductCodes": [],
                    "PublicDnsName": "ec2-18-220-239-187.us-east-2.compute.amazonaws.com",
                    "PublicIpAddress": "18.220.239.187",
                    "State": {
                        "Code": 16,
                        "Name": "running"
                    },
                    "StateTransitionReason": "",
                    "SubnetId": "subnet-044a28ad7345aa5f5",
                    "VpcId": "vpc-0645a2dfd0cadf04c",
                    "Architecture": "x86_64",
                    "BlockDeviceMappings": [
                        {
                            "DeviceName": "/dev/xvda",
                            "Ebs": {
                                "AttachTime": "2025-06-17T11:49:45+00:00",
                                "DeleteOnTermination": true,
                                "Status": "attached",
                                "VolumeId": "vol-09a10162f70a3ccd3"
                            }
                        }
                    ],
                    "ClientToken": "8938aef6-28c2-4fd3-8d8f-1b7ef9b79310",
                    "EbsOptimized": false,
                    "EnaSupport": true,
                    "Hypervisor": "xen",
                    "NetworkInterfaces": [
                        {
                            "Association": {
                                "IpOwnerId": "amazon",
                                "PublicDnsName": "ec2-18-220-239-187.us-east-2.compute.amazonaws.com",
                                "PublicIp": "18.220.239.187"
                            },
                            "Attachment": {
                                "AttachTime": "2025-06-17T11:49:44+00:00",
                                "AttachmentId": "eni-attach-0299c659c98ee26fd",
                                "DeleteOnTermination": true,
                                "DeviceIndex": 0,
                                "Status": "attached",
                                "NetworkCardIndex": 0
                            },
                            "Description": "",
                            "Groups": [
                                {
                                    "GroupName": "launch-wizard-2",
                                    "GroupId": "sg-0963e1f6ab4c12e45"
                                }
                            ],
                            "Ipv6Addresses": [],
                            "MacAddress": "02:05:d9:f2:c0:d5",
                            "NetworkInterfaceId": "eni-0c2f9763a779e8b06",
                            "PrivateDnsName": "ip-172-31-14-84.us-east-2.compute.internal",
                            "PrivateIpAddress": "172.31.14.84",
                            "PrivateIpAddresses": [
                                {
                                    "Association": {
                                        "IpOwnerId": "amazon",
                                        "PublicDnsName": "ec2-18-220-239-187.us-east-2.compute.amazonaws.com",
                                        "PublicIp": "18.220.239.187"
                                    },
                                    "Primary": true,
                                    "PrivateDnsName": "ip-172-31-14-84.us-east-2.compute.internal",
                                    "PrivateIpAddress": "172.31.14.84"
                                }
                            ],
                            "SourceDestCheck": true,
                            "Status": "in-use",
                            "SubnetId": "subnet-044a28ad7345aa5f5",
                            "VpcId": "vpc-0645a2dfd0cadf04c",
                            "InterfaceType": "interface"
                        }
                    ],
                    "RootDeviceName": "/dev/xvda",
                    "RootDeviceType": "ebs",
                    "SecurityGroups": [
                        {
                            "GroupName": "launch-wizard-2",
                            "GroupId": "sg-0963e1f6ab4c12e45"
                        }
                    ],
                    "SourceDestCheck": true,
                    "VirtualizationType": "hvm",
                    "CpuOptions": {
                        "CoreCount": 2,
                        "ThreadsPerCore": 1
                    },
                    "CapacityReservationSpecification": {
                        "CapacityReservationPreference": "open"
                    },
                    "HibernationOptions": {
                        "Configured": false
                    },
                    "MetadataOptions": {
                        "State": "applied",
                        "HttpTokens": "required",
                        "HttpPutResponseHopLimit": 2,
                        "HttpEndpoint": "enabled",
                        "HttpProtocolIpv6": "disabled",
                        "InstanceMetadataTags": "disabled"
                    },
                    "EnclaveOptions": {
                        "Enabled": false
                    },
                    "BootMode": "uefi-preferred",
                    "PlatformDetails": "Linux/UNIX",
                    "UsageOperation": "RunInstances",
                    "UsageOperationUpdateTime": "2025-06-17T11:49:44+00:00",
                    "PrivateDnsNameOptions": {
                        "HostnameType": "ip-name",
                        "EnableResourceNameDnsARecord": false,
                        "EnableResourceNameDnsAAAARecord": false
                    },
                    "MaintenanceOptions": {
                        "AutoRecovery": "default"
                    },
                    "CurrentInstanceBootMode": "legacy-bios"
                }
            ],
            "ReservationId": "r-07b434e0ac1118d21"
        }
    ]
};

test("parses correctly", () => {
    assert.equal(extract(output1, 'instance-id'), 'i-0f8572f3f625de186');
    assert.equal(extract(output1, 'public-dns'), '');
    assert.equal(extract(output2, 'instance-id', 'describe'), 'i-0f8572f3f625de186');
    assert.equal(extract(output2, 'public-dns', 'describe'), 'ec2-18-220-239-187.us-east-2.compute.amazonaws.com');
});