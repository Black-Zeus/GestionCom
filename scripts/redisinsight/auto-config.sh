#!/bin/bash
# scripts/redisinsight/auto-config.sh

# Crear directorio de configuración
mkdir -p /db

# Configuración de conexión automática para RedisInsight
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

# Iniciar RedisInsight
exec /usr/src/app/redisinsight