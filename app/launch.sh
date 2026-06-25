#!/bin/bash

cd $HOME

node --max-old-space-size=1024 exchange_updater.js

exit $?
