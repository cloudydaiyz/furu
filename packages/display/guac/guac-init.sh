#!/usr/bin/env bash

# guac-init.sh
# Initalizes Apache Guacamole. Run this script once before any others if you haven't already
# set up Apache Guacamole.

## Create the network

docker network create guac-network

## Create the SQL initialization scripts
## May be unnecessary now that they're in the repository

docker run --rm guacamole/guacamole:1.5.3 /opt/guacamole/bin/initdb.sh --postgresql > initdb.sql

## FUTURE: Create the SQL initialization scripts for future Apache Guacamole version that's
## compatible with my device
# docker run --rm guacamole/guacamole:1.6.0-RC2 /opt/guacamole/bin/initdb.sh --postgresql > initdb.sql