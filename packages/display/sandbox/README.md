# guac-sandbox

Sandbox for Apache Guacamole testing.

## Prerequisites

- Ensure you have Docker and AWS CLI installed
- Ensure you have a key-pair named "guac-key" created
  - Ensure the location to the `.pem` file associated with that key-pair
    is at `$GUAC_KEY`
  - Run `chmod 400 $GUAC_KEY` on your keyfile if you haven't already

## Running Apache Guacamole

### Creating the Remote Desktop Server
1. Run `rds/crds.sh`
2. Copy the shell commands that were displayed at the end of `rds/crds.sh`
   under `Shell commands: ...` and run them in your shell.
    - The ssh command is optional, but if you have your own dedicated VNC client
      and want to test the server with it, run the SSH command to open a tunnel,
      then connect to your remote desktop server using your client in a separate
      process (e.g. if you use your client via the terminal, open you client in a
      separate terminal)

### Connecting to the Remote Desktop Server
1. Run `guac/guac-init.sh`
    - If you have ran this command before, skip this step
2. Run `guac/guac-up.sh`
3. Open Guacamole at `http://localhost:8080/guacamole`
4. Log in to guacamole using username `guacadmin` and password `guacadmin`
5. Navigate to Settings (Username in top right corner > Settings)
6. Navigate to Connections > New Connection
7. Run `guac/guac-info.sh` to get configuration details to use for guacamole
8. Fill the information from `guac/guac-info.sh` in the New Connection setup, and save
9. Navigate to Home (Username in top right corner > Home)
10. Click on the newly created connection
    - At this step, the remote desktop should be shown on your browser

### Shutting down
1. Run `guac/guac-down.sh $INSTANCE_ID`
2. Run `rds/drds.sh $INSTANCE_ID`

## Running Sample Guacamole App

### Creating the Remote Desktop Server
Same instructions as [above](#creating-the-remote-desktop-server).

### Running the Server

1. Run `npm run guacd:up`.
2. Run `npm run server:start`.

### Running the Client

1. Run `npm run client:dev`.

### Shutting down

1. Ensure the client and server applications, and all Guacamole connections are closed.
2. Run `rds/drds.sh $INSTANCE_ID`.
3. Run `npm run guacd:down`.

## Troubleshooting

- Any version of Apache Guacamole past v1.5.3 may not work.

### `rds/rds.sh`

- To confirm that the TigerVNC service runs, run the following command:
  `sudo systemctl status vncserver@:1.service`
- Get username of fileowner: `stat -c '%U' "/home/ec2-user/.config/tigervnc/passwd"`
- Get user ID of fileowner: `stat -c '%u' "/home/ec2-user/.config/tigervnc/passwd"`
- Be careful with using `vi` -- any misconfiguration with the file (e.g. mistyping the 
  letter "g" somewhere), and starting the service may not work
- To confirm that the TigerVNC is listening on TCP port 5901, run the following command:
  `ss -lnp '( sport = :5901 )'`

## Additional Resources

### Installing GNOME Desktop Environment

  - https://docs.aws.amazon.com/linux/al2023/ug/installing-gnome-al2023.html

### Installing and Running TigerVNC

  - https://docs.aws.amazon.com/linux/al2023/ug/vnc-configuration-al2023.html
  - https://repost.aws/knowledge-center/ec2-linux-2-install-gui