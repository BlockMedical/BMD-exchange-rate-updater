#!/bin/bash

CURR_DIR=$(dirname $0)

docker run --rm \
  --env-file $CURR_DIR/env.file \
  alblockmed/exchange-updater:latest \
  >> $CURR_DIR/test.log 2>&1
