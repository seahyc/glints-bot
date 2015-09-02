#!/bin/bash

yes | rm -rf /data/db/* && parse -f && npm start
