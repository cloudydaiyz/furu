# furu

**furu** is a web-based platform for Playwright test creation. This project is a continuation of [`apollo`](https://github.com/cloudydaiyz/apollo).

## Prerequisites

Before starting this application, you must have:
- An AWS account with the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) configured
- An [AWS EC2 key pair](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html)
- An [AWS EC2 instance profile](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)
  - This EC2 instance profile must have the `ssm:GetParameter` action allowed for the following parameters: `/furu/github-user`, `/furu/github-pat`, `/furu/commit-id`, `/furu/furu-controller-access-key`, and `/furu/vnc-password`
- An [AWS EC2 security group](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html) with inbound rules configured for:
  - SSH, TCP, Port 22, from your IP address range
  - Custom TCP, TCP, Port 8124, from your IP address range
  - Custom TCP, TCP, Port 5901, from your IP address range

## Getting started

### Deploying the Remote Desktop Server

1. Ensure you have your environment variables set according to [`.env.example`](./.env.example). Also define these variables in a `.env` file in the root of the repository.
2. Run `seed-ssm.sh`
3. Run `scripts/crds.sh` to create a new EC2 instance. Update the `INSTANCE_ID` and `PUBLIC_DNS` environment variables.
4. Run `scripts/srds.sh` to SSH into the newly created instance and set up the VNC server and controller.

### Running the local components

1. Run `docker compose up -d` to run the web, API, and display servers locally

### Cleanup

1. Run `docker compose down` to tear down web, API, and display servers
2. Run `scripts.drds.sh` to tear down the remote desktop server.