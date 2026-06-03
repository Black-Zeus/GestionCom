#!/bin/bash
# scripts/redisinsight/auto-config.sh

mkdir -p /db

if [ -n "$REDIS_PASSWORD_FILE" ] && [ -f "$REDIS_PASSWORD_FILE" ]; then
  REDIS_PASSWORD="$(cat "$REDIS_PASSWORD_FILE")"
fi

cat > /db/redisinsight.db.json << EOF
{
  "connections": [
    {
      "id": "redis-local-connection",
      "name": "Redis Local (Inventario)",
      "host": "redis",
      "port": 6379,
      "password": "${REDIS_PASSWORD}",
      "connectionType": "STANDALONE",
      "nameFromProvider": "Redis Local"
    }
  ]
}
EOF

exec /usr/src/app/redisinsight
