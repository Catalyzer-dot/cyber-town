# 接入现有 degenerates-nginx

赛博小镇通过 `https://degenerates.site/town/` 对外提供服务，不开放新的公网端口。

## 一次性创建共享网络

```bash
docker network create cyber-town-proxy
```

## 修改 degenerates-backend/docker-compose.yml

给 `nginx` 服务追加共享网络：

```yaml
services:
  nginx:
    networks:
      - degenerates-net
      - cyber-town-proxy

networks:
  degenerates-net:
    driver: bridge
  cyber-town-proxy:
    external: true
    name: cyber-town-proxy
```

这项配置必须写入 Compose，不能只执行一次 `docker network connect`。否则现有 Nginx 容器重建后会丢失共享网络。

## 修改 degenerates-backend/nginx.conf

把 `deploy/nginx-town.conf` 中的两个 `location` 加入 HTTPS `server` 块，位置应在现有通用静态页面规则之前。

检查并重建 Nginx：

```bash
docker compose config --quiet
docker compose up -d --no-deps --force-recreate nginx
docker exec degenerates-nginx nginx -t
curl -fsS https://degenerates.site/town/health
```

修改应先提交到 `degenerates-backend` 仓库，避免下次 GitHub Actions 部署把服务器上的手工修改覆盖。
