#!/bin/bash
# Copyright 2022 Cisco and its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0


HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$HERE/../../"

function error
{
    printf "\033[0;31m  » $1\033[0m\n"
}

function info
{
    printf "\033[0;37m  » $1\033[0m\n"
}

function services
{
    echo "\d node [a-z-]*\.js bbk-*"
}

function count
{
    ps -ef | grep "$(services)" | wc -l
}

function status
{
    echo "  ┌────── services running ──────┐"
    echo "  │                              │"

    if [ $(count) -eq "0" ]; then
        echo "  │          none found          │"
    else
        ps -ef | grep "$(services)" | awk '{printf "  │   %-5s » %-16s   │\n", $2, $10 }'
    fi

    echo "  │                              │"
    echo "  └──────────────────────────────┘"
}

function logs
{
    tail -f "$HERE/bbk-coordinator.out" \
            "$HERE/bbk-contributor.out" \
            "$HERE/bbk-consumer.out"    \
            "$HERE/bbk-rate-limit.out"  \
            "$HERE/bbk-auth-service.out"
}

function start
{
    info "starting services..."
    npm start bbk-coordinator     --prefix "$ROOT/services/coordinator" > "$HERE/bbk-coordinator.out"  2>&1 &
    npm start bbk-contributor     --prefix "$ROOT/services/contributor" > "$HERE/bbk-contributor.out"  2>&1 &
    npm start bbk-consumer        --prefix "$ROOT/services/consumer"    > "$HERE/bbk-consumer.out"     2>&1 &
    npm run rate bbk-rate-limit   --prefix "$HERE/../stubs"             > "$HERE/bbk-rate-limit.out"   2>&1 &
    npm run auth bbk-auth-service --prefix "$HERE/../stubs"             > "$HERE/bbk-auth-service.out" 2>&1 &
    sleep 1
}

function stop
{
    info "killing services..."
    ps -ef | grep "$(services)" | awk '{print $2 }' | xargs kill -s INT
    sleep 1
}

function wipe
{
    info "wiping the database..."
    psql -U postgres -a -f "$ROOT/database/schema.sql" > /dev/null
}

function unpack
{
    info "creating .env from .env.example"
    cp "$ROOT/.env.example" "$ROOT/.env" 2>&1

    info "installing service packages"
    npm install --prefix "$ROOT/services/coordinator" > "$HERE/bbk-coordinator.install.out" 2>&1
    npm install --prefix "$ROOT/services/contributor" > "$HERE/bbk-contributor.install.out" 2>&1
    npm install --prefix "$ROOT/services/consumer"    > "$HERE/bbk-consumer.install.out"    2>&1

    info "installing development packages"
    npm install --prefix "$ROOT/development/stubs"    > "$HERE/bbk-tests.install.stubs.out" 2>&1

    info "installing test packages"
    npm install --prefix "$ROOT/tests"                > "$HERE/bbk-tests.install.out"       2>&1

    info "unpack complete"
}

echo

case $1 in

    unpack)
        if [ $(count) -eq "0" ]; then
            unpack
        else
            error "some services are already running - stop those first"
        fi
    ;;

    start)
        if [ $(count) -eq "0" ]; then
            start
        else
            error "some services are already running - stop those first"
        fi

        echo
        status
    ;;

    stop)
        if [ $(count) -eq "0" ]; then
            error "no services are running"
        else
            stop
        fi

        echo
        status
    ;;

    status)
        status
    ;;

    logs)
        if [ $(count) -eq "0" ]; then
            error "no services are running"
        else
            logs
        fi
    ;;

    db)
        psql -U postgres bit_broker
    ;;

    wipe)
        if [ $(count) -eq "0" ]; then
            wipe
            info "wipe complete"
        else
            error "some services are already running - stop those first"
            echo
            status
        fi
    ;;

    bounce)
        if [ $(count) -ne "0" ]; then
            stop
        else
            info "no services running"
        fi

        start
        echo
        status
    ;;

    reset)
        if [ $(count) -ne "0" ]; then
            stop
        else
            info "no services running"
        fi

        wipe
        start
        echo
        status
    ;;

    *)
        echo "  $0 <command>"
        echo
        echo "  command:"
        echo
        echo "    unpack → prepares a fresh git clone"
        echo "    start  → starts bbk services"
        echo "    stop   → stops bbk services"
        echo "    status → show bbk service status"
        echo "    logs   → tails all bbk services logs"
        echo "    db     → start a sql session"
        echo "    wipe   → resets the bbk database"
        echo "    bounce → stop » start"
        echo "    reset  → stop » wipe » start"
    ;;

esac

echo
