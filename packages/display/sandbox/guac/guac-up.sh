#!/usr/bin/env bash

# guac-up.sh
# Spins up an instance of Apache Guacamole in Docker containers
docker run -d \
  --name guac-db \
  --network guac-network \
  -e POSTGRES_DB=guacamole_db \
  -e POSTGRES_USER=guacamole \
  -e POSTGRES_PASSWORD=helloworld \
  -v guac-db-data:/var/lib/postgresql/data \
  postgres:15

sleep 5

## FUTURE: Run the SQL initialization scripts for future Apache Guacamole version that's
## compatible with my device
cat initdb.sql | docker exec -i guac-db psql -U guacamole -d guacamole_db

docker run -d \
  --name guacd \
  --network guac-network \
  guacamole/guacd:1.5.3
#   guacamole/guacd:1.6.0-RC2

docker run -d \
  --name guacamole \
  --network guac-network \
  -e POSTGRES_HOSTNAME=guac-db \
  -e POSTGRES_DATABASE=guacamole_db \
  -e POSTGRES_USER=guacamole \
  -e POSTGRES_PASSWORD=helloworld \
  -e GUACD_HOSTNAME=guacd \
  -p 8080:8080 \
  guacamole/guacamole:1.5.3
#   guacamole/guacamole:1.6.0-RC2

### NOTE: Can also use docker compose

# mkdir -p ./container-data/db-init
# docker run --rm guacamole/guacamole:1.6.0-RC2 /opt/guacamole/bin/initdb.sh --postgresql > ./container-data/db-init/initdb.sql
# mkdir -p ./container-data/guacamole-home
# cp guac/guacamole.properties container-data/guacamole-home/guacamole.properties
# docker-compose up -d

# AFTER RUNNING THIS
# 1. Open Guacamole at http://localhost:8080/guacamole
# 2. Log in to guacamole using username "guacadmin" and password "guacadmin"
# 3. Navigate to Settings (Username in top right corner > Settings)
# 4. Navigate to Connections > New Connection
# 5. Run guac/guac-info.sh to get information to use for guacamole and input the information in the New Connection setup, and save
# 6. Navigate to Home (Username in top right corner > Home)
# 7. Click on the newly created connection