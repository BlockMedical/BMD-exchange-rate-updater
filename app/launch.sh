#!/bin/bash

cd $HOME

npm install scrypt > "$HOME/error.log" 2>&1
ret=$?

if [ "x${ret}" != "x0" ] ; then
  echo "fail - npm encounter error, exiting!"
  cat "$HOME/error.log"
  exit $ret
fi

node --max-old-space-size=1024 exchange_updater.js

exit $?
