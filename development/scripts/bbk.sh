#!/bin/bash

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
    tail -f bbk-coordinator.out bbk-contributor.out bbk-consumer.out bbk-rate-limit.out bbk-auth-service.out
}

function start
{
    info "starting services..."
    npm start bbk-coordinator     --prefix ../../services/coordinator > bbk-coordinator.out  2>&1 &
    npm start bbk-contributor     --prefix ../../services/contributor > bbk-contributor.out  2>&1 &
    npm start bbk-consumer        --prefix ../../services/consumer    > bbk-consumer.out     2>&1 &
    npm run rate bbk-rate-limit   --prefix ../stubs                   > bbk-rate-limit.out   2>&1 &
    npm run auth bbk-auth-service --prefix ../stubs                   > bbk-auth-service.out 2>&1 &
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
    psql -U postgres -a -f ../../database/schema.sql > /dev/null
}

echo

case $1 in

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
        echo "    start  → starts bbk services"
        echo "    stop   → stops bbk services"
        echo "    status → show bbk service status"
        echo "    logs   → tails all bbk services logs"
        echo "    db     → start a sql session"
        echo "    wipe   → resets the bbk database"
        echo "    reset  → stop » wipe » start"
    ;;

esac

echo
