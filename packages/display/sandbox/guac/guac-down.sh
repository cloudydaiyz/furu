#!/usr/bin/env bash

# guac-down.sh
# Shuts down docker containers related to Apache Guacamole that were created by
# guac-up.sh

docker stop guac-db
docker rm guac-db

docker stop guacd
docker rm guacd

docker stop guacamole
docker rm guacamole

docker volume rm guac-db-data

### NOTE: Can also use docker compose
# docker-compose down -v