#!/bin/sh
# wait-for-redis.sh

set -e

host="$1"
shift
cmd="$@"

until nc -z "$host" 6379; do
  >&2 echo "Redis is unavailable - sleeping"
  sleep 1
done

>&2 echo "Redis is up - executing command"
exec $cmd
