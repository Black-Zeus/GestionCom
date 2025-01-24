#!/bin/sh

# Salir en caso de error
set -e

# Ruta de la plantilla y archivo final de configuración
TEMPLATE_FILE="/etc/nginx/templates/nginx.template.conf"
CONFIG_FILE="/etc/nginx/conf.d/default.conf"

# Verifica que el archivo de plantilla existe
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Error: La plantilla de configuración ($TEMPLATE_FILE) no existe."
  exit 1
fi

# Reemplaza las variables de entorno en la plantilla
echo "Generando configuración de NGINX desde la plantilla..."
envsubst '$PROJECT_NAME $FRONTEND_PORT_INTERNAL $BACKEND_API_PORT_INTERNAL $DOCS_API_PORT_INTERNAL $TASKS_API_PORT_INTERNAL' \
  < "$TEMPLATE_FILE" > "$CONFIG_FILE"

echo "Configuración generada en $CONFIG_FILE:"
#cat "$CONFIG_FILE"

# Inicia el servidor NGINX
echo "Iniciando NGINX..."
nginx -g "daemon off;"
