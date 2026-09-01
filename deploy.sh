#!/bin/sh

set -eu

DEPLOY_DIR="${DEPLOY_DIR:-/opt/cyber-town}"
PROXY_NETWORK="${PROXY_NETWORK:-cyber-town-proxy}"
CYBER_TOWN_IMAGE="${CYBER_TOWN_IMAGE:-ccr.ccs.tencentyun.com/degenerates/cyber-town:latest}"
TCR_REGISTRY="${TCR_REGISTRY:-ccr.ccs.tencentyun.com}"

cd "$DEPLOY_DIR"

if [ ! -f compose.prod.yaml ]; then
  echo "compose.prod.yaml 不存在。"
  exit 1
fi

if [ -n "${TCR_USERNAME:-}" ] && [ -n "${TCR_PASSWORD:-}" ]; then
  echo "$TCR_PASSWORD" | docker login "$TCR_REGISTRY" -u "$TCR_USERNAME" --password-stdin
fi

if ! docker network inspect "$PROXY_NETWORK" >/dev/null 2>&1; then
  docker network create "$PROXY_NETWORK"
fi

export CYBER_TOWN_IMAGE PROXY_NETWORK

docker compose -f compose.prod.yaml pull app
docker compose -f compose.prod.yaml up -d --no-deps --force-recreate app

attempt=1
while [ "$attempt" -le 30 ]; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' cyber-town-app 2>/dev/null || true)"

  if [ "$status" = "healthy" ]; then
    echo "cyber-town-app 已通过健康检查。"
    exit 0
  fi

  if [ "$status" = "unhealthy" ]; then
    docker logs --tail 50 cyber-town-app
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 2
done

docker logs --tail 50 cyber-town-app
echo "等待 cyber-town-app 健康检查超时。"
exit 1
