#!/usr/bin/env bash

# Don't launch until 3004 is free
./node_modules/.bin/wait-on -r http-get://localhost:3004

# start test server for this test run
(node test-server.js &)

# Wait for port 3004 to be listening and returning 200
./node_modules/.bin/wait-on http-get://localhost:3004

# run test suite
./node_modules/.bin/mocha ./dist/test/**.js

# cleanup opened processes, assume OSX when not Linux
unamestr=`uname`
if [[ "$unamestr" == 'Linux' ]]; then
   fuser -k -n tcp 3004
else
   lsof -i tcp:3004 | grep LISTEN | awk '{print $2}' | xargs kill
fi
