#!/bin/bash

# Variables iniciales
ENV="dev"
LABEL_FILTER="stack=inventario"
COMPOSE_FILE=""

# Define el archivo de configuración de Docker Compose según el entorno
define_compose_file() {
  case "$ENV" in
    "dev")
      COMPOSE_FILE="docker-compose-dev.yml"
      ;;
    "qa")
      COMPOSE_FILE="docker-compose-qa.yml"
      ;;
    "prd")
      COMPOSE_FILE="docker-compose.yml"
      ;;
    *)
      echo "Entorno no válido. Se usará el archivo por defecto: docker-compose-dev.yml"
      COMPOSE_FILE="docker-compose-dev.yml"
      ;;
  esac
}

# Menú principal
menu() {
  clear
  define_compose_file
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "======================================="
  echo "1. Iniciar contenedores y construir imagenes"
  echo "2. Detener y eliminar contenedores"
  echo "3. Reiniciar contenedores"
  echo "4. Reiniciar contenedor unico"
  echo "5. Construir imágenes"
  echo "6. Ver logs"
  echo "7. Estado de los contenedores"
  echo "8. Listar contenedores de stack"
  echo "9. Abrir terminal en contenedor de stack"
  echo "10. Limpiar contenedores, redes, imágenes y volúmenes"
  echo "11. Limpiar imágenes no utilizadas"
  echo "12. Limpiar volúmenes no utilizados"
  echo "13. Limpiar todo (contenedores, imágenes y volúmenes)"
  echo "14. Cambiar entorno (dev, qa, prd)"
  echo "15. Salir"
  echo "======================================="
  read -p "Seleccione una opción [1-15]: " choice

  case "$choice" in
    1) up ;;
    2) down ;;
    3) restart ;;
    4) restart_single_container  ;;
    5) build ;;
    6) logs ;;
    7) ps ;;
    8) list_stack ;;
    9) exec_stack ;;
    10) clean ;;
    11) clean_images ;;
    12) clean_volumes ;;
    13) clean_all ;;
    14) change_env ;;
    15) exit_script ;;
    *)
      echo "Opción inválida. Inténtelo de nuevo."
      sleep 2
      menu
      ;;
  esac
}

# Funciones
up() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Iniciando Contenedores"
  echo "======================================="
  echo ""
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV up -d --build
  pause
  menu
}

down() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Deteniendo y eliminando contenedores"
  echo "======================================="
  echo ""
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV down
  pause
  menu
}

restart() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Reiniciando contenedores"
  echo "======================================="
  echo ""
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV down
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV up -d --build
  pause
  menu
}

restart_single_container() {
  clear
  echo "======================================="
  echo "Docker Tools - Reiniciar Contenedor Único"
  echo "Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "======================================="
  echo ""

  # Listar contenedores activos con la etiqueta del stack
  mapfile -t containers < <(docker ps --filter "label=$LABEL_FILTER" --format "{{.ID}} {{.Names}} {{.Image}} {{.Status}}")

  if [ ${#containers[@]} -eq 0 ]; then
    echo "No se encontraron contenedores activos con la etiqueta $LABEL_FILTER."
    sleep 2
    menu
  fi

  echo " # | ID               | NOMBRE                          | IMAGEN                              | ESTADO"
  echo "---|------------------|---------------------------------|-------------------------------------|------------"

  for i in "${!containers[@]}"; do
    container=(${containers[$i]})
    printf "%2d | %-16s | %-31s | %-35s | %-10s\n" $((i+1)) "${container[0]}" "${container[1]}" "${container[2]}" "${container[3]}"
  done

  echo
  read -p "Seleccione el índice del contenedor a reiniciar: " index

  if ! [[ "$index" =~ ^[0-9]+$ ]] || [ "$index" -lt 1 ] || [ "$index" -gt ${#containers[@]} ]; then
    echo "Índice inválido."
    sleep 2
    menu
  fi

  container_id=$(echo ${containers[$((index-1))]} | awk '{print $1}')
  container_name=$(echo ${containers[$((index-1))]} | awk '{print $2}')

  echo ""
  echo "Reiniciando el contenedor $container_name..."
  docker restart "$container_id" > /dev/null 2>&1 && \
    echo "Contenedor $container_name reiniciado correctamente." || \
    echo "Error al reiniciar el contenedor $container_name."

  pause
  menu
}

build() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Construyendo imágenes"
  echo "======================================="
  echo ""
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV build
  pause
  menu
}

logs() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Mostrando logs"
  echo "======================================="
  echo ""
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV logs -f
  pause
  menu
}

ps() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Estado de los contenedores"
  echo "======================================="
  echo ""

  # Obtener la lista de contenedores con el separador personalizado
  mapfile -t containers < <(docker ps --filter "label=$LABEL_FILTER" --format "{{.ID}}#{{.Names}}#{{.Image}}#{{.Ports}}#{{.Command}}")

  if [ ${#containers[@]} -eq 0 ]; then
    echo "No se encontraron contenedores activos con la etiqueta $LABEL_FILTER."
    sleep 2
    menu
  fi

  # Encabezado de la tabla
  echo " # | SERVICIO                 | IMAGEN                                | PUERTO(S)                 | COMANDO"
  echo "---|--------------------------|---------------------------------------|---------------------------|-------------------------------"

  # Iterar sobre los contenedores y mostrarlos con índices
  for i in "${!containers[@]}"; do
    # Dividir la información del contenedor usando el separador #
    IFS="#" read -r id name image ports command <<< "${containers[$i]}"

    # Formatear las columnas
    formatted_name=$(printf "%-24s" "$name")
    formatted_image=$(printf "%-37s" "$image")
    formatted_ports=$(echo "$ports" | cut -c1-25)   # Limitar a 25 caracteres
    formatted_command=$(echo "$command" | cut -c1-30) # Limitar a 30 caracteres

    # Imprimir fila formateada
    printf "%2d | %s | %s | %-25s | %-30s\n" \
      $((i+1)) "$formatted_name" "$formatted_image" "${formatted_ports:-"N/A"}" "${formatted_command:-"N/A"}"
  done

  pause
  menu
}

list_stack() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Listando contenedores"
  echo "======================================="
  echo ""

  # Obtener la lista de contenedores en formato personalizado
  mapfile -t containers < <(docker ps --filter "label=$LABEL_FILTER" --format "{{.ID}} {{.Names}} {{.Image}} {{.Status}}")

  if [ ${#containers[@]} -eq 0 ]; then
    echo "No se encontraron contenedores activos con la etiqueta $LABEL_FILTER."
    sleep 2
    menu
  fi

  # Encabezado de la tabla
  echo " # | ID               | NOMBRE                          | IMAGEN                              | ESTADO"
  echo "---|------------------|---------------------------------|-------------------------------------|------------"

  # Iterar sobre los contenedores y mostrarlos con índices
  for i in "${!containers[@]}"; do
    container=(${containers[$i]})
    printf "%2d | %-16s | %-31s | %-35s | %-10s\n" $((i+1)) "${container[0]}" "${container[1]}" "${container[2]}" "${container[3]}"
  done

  pause
  menu
}

exec_stack() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Listando contenedores $LABEL_FILTER"
  echo "======================================="
  echo ""
  mapfile -t containers < <(docker ps --filter "label=$LABEL_FILTER" --format "{{.ID}} {{.Names}} {{.Image}} {{.Status}}")

  if [ ${#containers[@]} -eq 0 ]; then
    echo "No se encontraron contenedores con la etiqueta $LABEL_FILTER."
    sleep 2
    menu
  fi

  echo " # | ID               | NOMBRE                          | IMAGEN                              | ESTADO"
  echo "---|------------------|---------------------------------|-------------------------------------|------------"

  for i in "${!containers[@]}"; do
    container=(${containers[$i]})
    printf "%2d | %-16s | %-31s | %-35s | %-10s\n" $((i+1)) "${container[0]}" "${container[1]}" "${container[2]}" "${container[3]}"
  done

  echo
  read -p "Seleccione el índice del contenedor: " index

  if ! [[ "$index" =~ ^[0-9]+$ ]] || [ "$index" -lt 1 ] || [ "$index" -gt ${#containers[@]} ]; then
    echo "Índice inválido."
    sleep 2
    menu
  fi

  container_id=$(echo ${containers[$((index-1))]} | awk '{print $1}')
  container_name=$(echo ${containers[$((index-1))]} | awk '{print $2}')

  echo ""
  echo "Conectando al contenedor $container_name..."

  echo "Verificando shell disponible..."
  if docker exec "$container_id" bash -c "echo Bash disponible" 2&>/dev/null; then
    echo "Abriendo terminal con bash..."
    echo ""
    docker exec -it "$container_id" bash
  elif docker exec "$container_id" sh -c "echo SH disponible" 2&>/dev/null; then
    echo "Bash no disponible. Abriendo terminal con sh..."
    echo ""
    docker exec -it "$container_id" sh
  else
    echo "No se pudo abrir una terminal en el contenedor $container_name."
  fi
  pause
  menu
}

clean() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Limpiando contenedores, redes, imágenes y volúmenes"
  echo "======================================="
  echo ""
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV down --rmi all --volumes --remove-orphans
  pause
  menu
}

clean_images() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Limpiando imágenes no utilizadas"
  echo "======================================="
  echo ""
  docker image prune -af
  pause
  menu
}

clean_volumes() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Limpiando volúmenes no utilizados"
  echo "======================================="
  echo ""
  docker volume prune -f
  pause
  menu
}

clean_all() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Limpieza Completa"
  echo "======================================="
  echo ""

  # Limpiar contenedores, imágenes, redes y volúmenes relacionados con el stack
  echo "======================================="
  echo "Limpiando contenedores, redes, imágenes y volúmenes del stack..."
  echo "======================================="
  docker-compose -f "$COMPOSE_FILE" --env-file .env --env-file .env.$ENV down --rmi all --volumes --remove-orphans

  # Verificar y eliminar volúmenes huérfanos
  echo "======================================="
  echo "Verificando volúmenes huérfanos relacionados con el stack..."
  echo "======================================="
  mapfile -t stack_volumes < <(docker volume ls --filter "dangling=true" --filter "label=$LABEL_FILTER" --format "{{.Name}}")

  if [ ${#stack_volumes[@]} -gt 0 ]; then
    echo "Los siguientes volúmenes serán eliminados:"
    for volume in "${stack_volumes[@]}"; do
      echo " - $volume"
    done

    # Eliminar volúmenes relacionados con el stack
    for volume in "${stack_volumes[@]}"; do
      docker volume rm "$volume"
    done
  else
    echo "No se encontraron volúmenes huérfanos relacionados con el stack."
  fi

  # Eliminar imágenes no utilizadas
  echo "======================================="
  echo "Limpiando imágenes no utilizadas..."
  echo "======================================="
  docker image prune -af

  # Eliminar caché de builds generadas
  echo "======================================="
  echo "Limpiando caché de builds generadas..."
  echo "======================================="
  docker builder prune -af

  echo ""
  echo "======================================="
  echo "Limpieza completada."
  echo "======================================="
  pause
  menu
}

change_env() {
  clear
  echo "======================================="
  echo "Docker Tools - Entorno: $ENV"
  echo "Archivo de configuración: $COMPOSE_FILE"
  echo "Cambiar entorno actual (dev, qa, prd)"
  echo "======================================="
  echo ""
  read -p "Ingrese el nuevo entorno: " new_env
  if [ -z "$new_env" ]; then
    echo "El entorno no puede estar vacío."
    sleep 2
    menu
  fi
  ENV="$new_env"
  define_compose_file
  echo "Entorno cambiado a: $ENV"
  sleep 2
  menu
}

exit_script() {
  clear
  echo "======================================="
  echo "Gracias por usar Docker Tools v1."
  echo "Todos los procesos han sido cerrados correctamente."
  echo "======================================="
  exit 0
}

pause() {
  read -p "Presione Enter para continuar..."
}

# Ejecutar menú
menu
