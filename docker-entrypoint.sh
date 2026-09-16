#!/bin/sh
set -e

# Fly 볼륨은 처음 마운트될 때 root 소유로 붙는다. 앱은 root 로 돌리지 않기 때문에
# 그대로 두면 SQLite 가 DB 파일을 만들지 못하고 EACCES 로 죽는다. 이미지 빌드 때
# chown 해 두는 것으로는 해결되지 않는다. 볼륨이 그 디렉터리를 덮어쓰기 때문이다.
#
# 그래서 컨테이너는 root 로 시작해 마운트된 볼륨의 소유권을 고친 뒤,
# 권한을 node 사용자로 내려놓고 앱을 실행한다.

DB_PATH="${BOKGIBOT_DB_PATH:-/data/bokgibot.db}"
DATA_DIR=$(dirname "$DB_PATH")

mkdir -p "$DATA_DIR"

if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$DATA_DIR"
  # --init-groups 를 빼면 보조 그룹이 비어서 일부 파일 접근이 막힐 수 있다.
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

# 이미 비특권 사용자로 시작된 경우(로컬 docker run --user 등)는 그대로 실행한다.
exec "$@"
