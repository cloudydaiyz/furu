# furu

**furu** is a web-based Playwright test editor.

## Prerequisites

Before starting this application, you must have:
- An AWS account with the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) configured
- An [AWS EC2 key pair](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html)
- An [AWS EC2 instance profile](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)
- An [AWS EC2 security group](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html) with inbound rules configured for:
  - SSH, TCP, Port 22, from your IP address range
  - Custom TCP, TCP, Port 8124, from your IP address range
  - Custom TCP, TCP, Port 5901, from your IP address range