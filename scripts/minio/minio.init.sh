#!/bin/sh

# ======================
# Validación de mc
# ======================
if ! command -v mc >/dev/null 2>&1; then
    echo "MinIO Client (mc) no está instalado. Abortando."
    exit 1
fi

# ======================
# Validación de variables de entorno
# ======================
if [ -z "$MINIO_ROOT_USER" ] || [ -z "$MINIO_ROOT_PASSWORD" ]; then
    echo "Las variables MINIO_ROOT_USER o MINIO_ROOT_PASSWORD no están definidas. Abortando."
    exit 1
fi

# ======================
# Iniciar MinIO en segundo plano
# ======================
echo "Iniciando MinIO en segundo plano..."
minio server /data --console-address ":9001" &

# ======================
# Esperar hasta que MinIO esté disponible
# ======================
echo "Esperando a que MinIO esté disponible..."
max_retries=30
retry_count=0

until curl -s http://localhost:9000/minio/health/live; do
    sleep 2
    retry_count=$((retry_count + 1))
    if [ $retry_count -eq $max_retries ]; then
        echo "MinIO no está disponible después de $max_retries intentos. Abortando."
        exit 1
    fi
done

# ======================
# Configurar MinIO Client (mc)
# ======================
echo "Configurando MinIO Client (mc)..."
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# ======================
# Crear Buckets desde buckets.txt
# ======================
if [ -f "/tmp/buckets.txt" ]; then
    echo "$(date) Leyendo y creando buckets desde buckets.txt..."
    while IFS= read -r bucket || [ -n "$bucket" ]; do
        bucket=$(echo "$bucket" | tr -d '[:space:]')  # Elimina espacios y saltos de línea
        if [ -n "$bucket" ]; then
            if mc ls local/$bucket >/dev/null 2>&1; then
                echo "$(date) El bucket '$bucket' ya existe."
            else
                echo "$(date) Creando bucket '$bucket'..."
                mc mb local/$bucket || echo "$(date) Error al crear el bucket '$bucket'."
            fi

            # ======================
            # Aplicar política de ciclo de vida si existe
            # ======================
            if [ -f "/tmp/lifeCicle/$bucket.json" ]; then
                echo "$(date) Aplicando ciclo de vida al bucket '$bucket'..."
                mc ilm import local/$bucket < /tmp/lifeCicle/$bucket.json || echo "$(date) Error al aplicar ciclo de vida al bucket '$bucket'."
            fi
        fi
    done < /tmp/buckets.txt
else
    echo "$(date) Archivo buckets.txt no encontrado en /tmp. Abortando."
    exit 1
fi

# ======================
# Limpiar archivos temporales
# ======================
echo "Limpiando archivos temporales..."
rm -f /tmp/LifecycleConfiguration.json /tmp/buckets.json

# ======================
# Mantener el proceso principal activo
# ======================
wait
