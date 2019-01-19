#!/bin/bash

# install cron like this
# */10 * * * * /home/your_user_name/BMD-exchange-rate-updater/test.sh

CURR_DIR=$(dirname $0)

docker run --rm \
  --env-file $CURR_DIR/env.file \
  alblockmed/exchange-updater:latest \
  >> $CURR_DIR/test.log 2>&1
