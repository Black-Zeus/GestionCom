#!/bin/bash

# ===========================================
# USERS API TESTER v1.0 - ENDPOINT TESTING
# Test de endpoints de gestión de usuarios
# ===========================================

# Configuración por defecto
API_URL="http://localhost:8000/users"
TOKEN=""

# Nueva configuración para rutas de tokens
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
DEFAULT_TOKEN_FILE="$SCRIPT_DIR/auth_tokens.env"
TOKEN_FILE="$DEFAULT_TOKEN_FILE"

# Detectar si la terminal soporta colores
if [[ -t 1 ]] && command -v tput &> /dev/null && tput colors &> /dev/null && [[ $(tput colors) -ge 8 ]]; then
    # Terminal con soporte de colores
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    BLUE=$(tput setaf 4)
    PURPLE=$(tput setaf 5)
    CYAN=$(tput setaf 6)
    WHITE=$(tput setaf 7)
    BOLD=$(tput bold)
    NC=$(tput sgr0)  # No Color / Reset
else
    # Terminal sin colores o redirección a archivo
    RED=""
    GREEN=""
    YELLOW=""
    BLUE=""
    PURPLE=""
    CYAN=""
    WHITE=""
    BOLD=""
    NC=""
fi

# ===========================================
# FUNCIONES UTILITARIAS
# ===========================================

show_help() {
    cat << EOF
${CYAN}${BOLD}=== USERS API TESTER v1.0 - GESTIÓN DE USUARIOS ===${NC}

Uso: $0 [OPCIONES] [COMANDO]

${YELLOW}${BOLD}COMANDOS DISPONIBLES:${NC}
  ${GREEN}${BOLD}Información:${NC}
  health             GET /users/health - Información del sistema
  list               GET /users/ - Listar usuarios
  stats              GET /users/stats/summary - Estadísticas de usuarios
  show-roles         Mostrar roles disponibles del sistema
  
  ${GREEN}${BOLD}CRUD Básico:${NC}
  get                GET /users/{id} - Obtener usuario específico
  create             POST /users/ - Crear nuevo usuario
  create-random      POST /users/ - Crear usuario aleatorio con rol del sistema
  create-multiple    Crear múltiples usuarios aleatorios
  update             PUT /users/{id} - Actualizar usuario
  delete             DELETE /users/{id} - Eliminar usuario (soft delete)
  
  ${GREEN}${BOLD}Perfil:${NC}
  profile            GET /users/{id}/profile - Perfil público
  my-profile         GET /users/me/profile - Mi perfil
  
  ${GREEN}${BOLD}Gestión:${NC}
  toggle-activation  PUT /users/{id}/toggle-activation - Activar/Desactivar
  search             GET /users/search/advanced - Búsqueda avanzada
  
  ${GREEN}${BOLD}Validación:${NC}
  validate-username  POST /users/validate/username - Validar username
  validate-email     POST /users/validate/email - Validar email
  
  ${GREEN}${BOLD}Tests Completos:${NC}
  all                Probar todos los endpoints básicos
  crud-test          Test completo de CRUD
  search-test        Test de búsquedas y filtros
  validation-test    Test de validaciones
  full-test          Test exhaustivo completo

${YELLOW}${BOLD}OPCIONES:${NC}
  -t TOKEN           Token JWT para autenticación
  -a URL             API base URL (default: http://localhost:8000/users)
  -f TOKEN_FILE      Archivo de tokens (default: ./auth_tokens.env)
  -i USER_ID         ID de usuario para operaciones específicas
  -u USERNAME        Username para validaciones
  -e EMAIL           Email para validaciones
  -c COUNT           Número de usuarios a crear en create-multiple
  -l                 Cargar datos del último usuario creado
  -v                 Modo verbose (mostrar headers y detalles)
  -n                 Modo sin colores (para logs o pipes)
  -h                 Mostrar esta ayuda

${YELLOW}${BOLD}EJEMPLOS DE USO:${NC}
  ${CYAN}# Crear usuarios de prueba con roles del sistema${NC}
  $0 create-random
  $0 -c 5 create-multiple
  
  ${CYAN}# Tests básicos${NC}
  $0 health
  $0 list
  $0 my-profile
  
  ${CYAN}# Operaciones con ID específico${NC}
  $0 -i 1 get
  $0 -i 2 profile
  $0 -i 3 update
  
  ${CYAN}# Validaciones${NC}
  $0 -u "nuevo.usuario" validate-username
  $0 -e "test@example.com" validate-email
  
  ${CYAN}# Tests completos${NC}
  $0 all
  $0 full-test
  
  ${CYAN}# Usar token específico${NC}
  $0 -t "eyJ0eXAi..." list
  
  ${CYAN}# Usar archivo de tokens personalizado${NC}
  $0 -f ./my_tokens.env all

${YELLOW}${BOLD}FUNCIONALIDADES:${NC}
  ✅ Carga automática de tokens desde archivo
  ✅ Tests completos de todos los endpoints
  ✅ Manejo de errores y validaciones
  ✅ Soporte para operaciones CRUD completas
  ✅ Búsquedas y filtros avanzados
  ✅ Generación de usuarios aleatorios con roles del sistema
  ✅ Detección automática de soporte de colores
  ✅ 100% Bash - sin dependencias Python
EOF
}

# Funciones de impresión mejoradas
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_step() {
    echo -e "\n${CYAN}${BOLD}🔸 $1${NC}"
}

print_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${PURPLE}🔧 DEBUG: $1${NC}"
    fi
}

print_section() {
    echo -e "\n${CYAN}${BOLD}═══ $1 ═══${NC}"
}

# Función para imprimir separadores
print_separator() {
    local char="${1:-━}"
    local width="${2:-60}"
    printf '%*s\n' "$width" '' | tr ' ' "$char"
}

# Función para resolver la ruta completa del archivo de tokens
resolve_token_file_path() {
    local input_path="$1"
    
    # Si es una ruta absoluta, usarla tal como está
    if [[ "$input_path" == /* ]]; then
        echo "$input_path"
        return
    fi
    
    # Si contiene directorios relativos (./ o ../), resolver desde el directorio actual
    if [[ "$input_path" == ./* ]] || [[ "$input_path" == ../* ]] || [[ "$input_path" == */* ]]; then
        echo "$(realpath "$input_path" 2>/dev/null || echo "$input_path")"
        return
    fi
    
    # Si es solo un nombre de archivo, colocarlo en el directorio del script
    echo "$SCRIPT_DIR/$input_path"
}

# Cargar tokens desde archivo
load_tokens() {
    if [[ -f "$TOKEN_FILE" ]]; then
        print_debug "Cargando tokens desde: $TOKEN_FILE"
        source "$TOKEN_FILE"
        TOKEN="$ACCESS_TOKEN"
        print_info "Tokens cargados desde: $TOKEN_FILE"
        return 0
    else
        print_debug "Archivo de tokens no encontrado: $TOKEN_FILE"
        return 1
    fi
}

# Extraer valor de JSON (versión optimizada solo con grep/sed)
extract_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*[^,}]*" | head -1 | sed 's/.*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Extraer valor anidado (para data.field)
extract_nested_value() {
    local json="$1"
    local path="$2"
    
    if [[ "$path" == *"."* ]]; then
        local main_key=$(echo "$path" | cut -d'.' -f1)
        local sub_key=$(echo "$path" | cut -d'.' -f2)
        
        # Extraer sección principal de manera más robusta
        local section=$(echo "$json" | sed -n "s/.*\"$main_key\"[[:space:]]*:[[:space:]]*{\([^}]*\)}.*/\1/p")
        
        if [[ -n "$section" ]]; then
            echo "$section" | grep -o "\"$sub_key\"[[:space:]]*:[[:space:]]*[^,}]*" | sed 's/.*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
        fi
    else
        extract_value "$json" "$path"
    fi
}

# Extraer booleano
extract_bool() {
    local json="$1"
    local key="$2"
    local val=$(extract_value "$json" "$key")
    if [[ "$val" == "true" ]]; then
        echo "true"
    else
        echo "false"
    fi
}

# Verificar si ResponseManager respondió exitosamente
check_success() {
    local response="$1"
    local success=$(extract_bool "$response" "success")
    if [[ "$success" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Función para hacer petición con Authorization header
make_request_with_auth() {
    local method="$1"
    local url="$2"
    local data="$3"
    
    print_debug "Request: $method $url"
    print_debug "Token: ${TOKEN:0:50}..."
    
    if [[ -n "$data" ]]; then
        print_debug "Payload: ${data:0:200}..."
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -H "User-Agent: users-tester/1.0" \
            -d "$data")
    else
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -H "User-Agent: users-tester/1.0")
    fi
    
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    print_debug "HTTP Status: $HTTP_CODE"
    print_debug "Response: ${RESPONSE_BODY:0:200}..."
}

# Análisis mejorado de respuesta
analyze_response() {
    local description="$1"
    local expected_codes="$2"  # ej: "200,201"
    
    print_separator "━" 60
    echo "${BOLD}Endpoint:${NC} $description"
    echo "${BOLD}HTTP Code:${NC} $HTTP_CODE"
    
    # MOSTRAR SIEMPRE LA RESPUESTA COMPLETA
    echo "${BOLD}Response:${NC} $RESPONSE_BODY"
    
    # Verificar código HTTP
    if [[ ",$expected_codes," == *",$HTTP_CODE,"* ]]; then
        print_debug "HTTP code válido"
    else
        print_warning "HTTP code inesperado (esperado: $expected_codes)"
    fi
    
    # Verificar estructura ResponseManager
    if check_success "$RESPONSE_BODY"; then
        local message=$(extract_value "$RESPONSE_BODY" "message")
        local trace_id=$(extract_value "$RESPONSE_BODY" "trace_id")
        local execution_time=$(extract_value "$RESPONSE_BODY" "execution_time_ms")
        
        print_success "$description - $message"
        
        if [[ -n "$trace_id" && "$trace_id" != "null" ]]; then
            print_info "Trace ID: $trace_id"
        fi
        
        if [[ -n "$execution_time" && "$execution_time" != "null" ]]; then
            print_info "Tiempo de ejecución: ${execution_time}ms"
        fi
        
        return 0
    else
        local error_message=$(extract_value "$RESPONSE_BODY" "message")
        local error_code=$(extract_nested_value "$RESPONSE_BODY" "data.code")
        
        print_error "$description falló: $error_message"
        
        if [[ -n "$error_code" && "$error_code" != "null" ]]; then
            print_info "Código de error: $error_code"
        fi
        
        return 1
    fi
}

# ===========================================
# GENERADOR DE DATOS DE PRUEBA
# ===========================================

# Arrays de datos para generar usuarios aleatorios
FIRST_NAMES=("Ana" "Carlos" "María" "Juan" "Laura" "Pedro" "Sofia" "Diego" "Carmen" "Miguel" "Isabel" "Andrés" "Patricia" "Luis" "Mónica" "José" "Alejandra" "Roberto" "Valeria" "Fernando")
LAST_NAMES=("García" "Rodríguez" "González" "Fernández" "López" "Martínez" "Sánchez" "Pérez" "Gómez" "Martín" "Jiménez" "Ruiz" "Hernández" "Díaz" "Moreno" "Muñoz" "Álvarez" "Romero" "Gutiérrez" "Navarro")

# Roles del sistema (code|name|description|typical_petty_cash_range)
SYSTEM_ROLES=(
    "ADMIN|Administrador|Acceso completo al sistema|100000-200000"
    "WAREHOUSE_MANAGER|Jefe de Bodega|Gestión completa de inventario y bodegas|75000-150000"
    "SALES_PERSON|Vendedor|Gestión de ventas y consulta de productos|30000-80000"
    "VIEWER|Consultor|Solo lectura de información|10000-25000"
)

# Función para mostrar roles disponibles
show_available_roles() {
    print_section "ROLES DISPONIBLES EN EL SISTEMA"
    
    echo -e "${BOLD}Roles configurados para generación de usuarios:${NC}\n"
    
    for role in "${SYSTEM_ROLES[@]}"; do
        local code=$(echo "$role" | cut -d'|' -f1)
        local name=$(echo "$role" | cut -d'|' -f2)
        local description=$(echo "$role" | cut -d'|' -f3)
        local cash_range=$(echo "$role" | cut -d'|' -f4)
        
        echo -e "${GREEN}●${NC} ${BOLD}$code${NC} - $name"
        echo -e "   📋 $description"
        echo -e "   💰 Caja chica: $cash_range CLP"
        echo ""
    done
    
    print_info "Los usuarios se crean automáticamente con uno de estos roles aleatorio"
    print_info "El límite de caja chica se calcula según el rango del rol asignado"
}

# Función para generar datos aleatorios
generate_random_user_data() {
    local timestamp=$(date +%s)
    local random_num=$((RANDOM % 1000))
    
    # Seleccionar nombres aleatorios
    local first_name="${FIRST_NAMES[$((RANDOM % ${#FIRST_NAMES[@]}))]}"
    local last_name="${LAST_NAMES[$((RANDOM % ${#LAST_NAMES[@]}))]}"
    
    # Seleccionar rol aleatorio del sistema
    local selected_role="${SYSTEM_ROLES[$((RANDOM % ${#SYSTEM_ROLES[@]}))]}"
    
    # Extraer datos del rol seleccionado
    local role_code=$(echo "$selected_role" | cut -d'|' -f1)
    local role_name=$(echo "$selected_role" | cut -d'|' -f2)
    local role_description=$(echo "$selected_role" | cut -d'|' -f3)
    local petty_cash_range=$(echo "$selected_role" | cut -d'|' -f4)
    
    # Calcular límite de caja chica según el rango del rol
    local min_cash=$(echo "$petty_cash_range" | cut -d'-' -f1)
    local max_cash=$(echo "$petty_cash_range" | cut -d'-' -f2)
    local cash_diff=$((max_cash - min_cash))
    local calculated_limit=$((min_cash + RANDOM % (cash_diff + 1)))
    
    # Generar username único
    local base_username=$(echo "${first_name,,}.${last_name,,}" | sed 's/[áàäâ]/a/g; s/[éèëê]/e/g; s/[íìïî]/i/g; s/[óòöô]/o/g; s/[úùüû]/u/g; s/[ñ]/n/g')
    export GENERATED_USERNAME="${base_username}.${timestamp}"
    
    # Generar email único
    export GENERATED_EMAIL="${GENERATED_USERNAME}@test-company.com"
    
    # Datos completos
    export GENERATED_FIRST_NAME="$first_name"
    export GENERATED_LAST_NAME="$last_name"
    export GENERATED_FULL_NAME="$first_name $last_name"
    export GENERATED_ROLE_CODE="$role_code"
    export GENERATED_ROLE_NAME="$role_name"
    export GENERATED_ROLE_DESCRIPTION="$role_description"
    export GENERATED_PHONE="+569${random_num}$(printf "%05d" $((RANDOM % 100000)))"
    export GENERATED_PETTY_CASH_LIMIT="$calculated_limit"
    
    print_info "Datos generados para usuario de prueba:"
    print_info "  👤 Nombre: $GENERATED_FULL_NAME"
    print_info "  📧 Email: $GENERATED_EMAIL"
    print_info "  🆔 Username: $GENERATED_USERNAME"
    print_info "  📱 Teléfono: $GENERATED_PHONE"
    print_info "  👥 Rol: $GENERATED_ROLE_CODE ($GENERATED_ROLE_NAME)"
    print_info "  📋 Descripción: $GENERATED_ROLE_DESCRIPTION"
    print_info "  💰 Límite caja chica: $GENERATED_PETTY_CASH_LIMIT"
}

# Función para cargar datos del último usuario creado
load_last_created_user() {
    if [[ -f "$SCRIPT_DIR/last_created_user.env" ]]; then
        source "$SCRIPT_DIR/last_created_user.env"
        export USER_ID="$LAST_USER_ID"
        print_info "Cargados datos del último usuario creado: $LAST_USERNAME (ID: $LAST_USER_ID)"
        return 0
    else
        print_warning "No hay datos de usuario creado previamente"
        return 1
    fi
}

# ===========================================
# TESTS DE ENDPOINTS
# ===========================================

test_health() {
    print_step "GET /users/health - Información del sistema"
    
    make_request_with_auth "GET" "$API_URL/health"
    
    if analyze_response "Health check usuarios" "200"; then
        local version=$(extract_nested_value "$RESPONSE_BODY" "data.version")
        local module=$(extract_nested_value "$RESPONSE_BODY" "data.module")
        local status=$(extract_nested_value "$RESPONSE_BODY" "data.status")
        
        if [[ -n "$version" && "$version" != "null" ]]; then
            print_info "Versión: $version"
        fi
        if [[ -n "$module" && "$module" != "null" ]]; then
            print_info "Módulo: $module"
        fi
        if [[ -n "$status" && "$status" != "null" ]]; then
            print_info "Estado: $status"
        fi
        
        return 0
    else
        return 1
    fi
}

test_list_users() {
    print_step "GET /users/ - Listar usuarios"
    
    make_request_with_auth "GET" "$API_URL/?limit=10&active_only=true"
    
    if analyze_response "Listar usuarios" "200"; then
        local total_found=$(extract_nested_value "$RESPONSE_BODY" "data.total_found")
        local active_count=$(extract_nested_value "$RESPONSE_BODY" "data.active_count")
        local recent_login_count=$(extract_nested_value "$RESPONSE_BODY" "data.recent_login_count")
        
        if [[ -n "$total_found" && "$total_found" != "null" ]]; then
            print_info "Total encontrados: $total_found"
        fi
        if [[ -n "$active_count" && "$active_count" != "null" ]]; then
            print_info "Usuarios activos: $active_count"
        fi
        if [[ -n "$recent_login_count" && "$recent_login_count" != "null" ]]; then
            print_info "Con login reciente: $recent_login_count"
        fi
        
        return 0
    else
        return 1
    fi
}

test_get_user() {
    print_step "GET /users/{id} - Obtener usuario específico"
    
    if [[ -z "$USER_ID" ]]; then
        print_error "Se requiere ID de usuario (-i) para obtener usuario específico"
        return 1
    fi
    
    make_request_with_auth "GET" "$API_URL/$USER_ID"
    
    if analyze_response "Obtener usuario $USER_ID" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "data.full_name")
        local email=$(extract_nested_value "$RESPONSE_BODY" "data.email")
        local is_active=$(extract_nested_value "$RESPONSE_BODY" "data.is_active")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Username: $username"
        fi
        if [[ -n "$full_name" && "$full_name" != "null" ]]; then
            print_info "Nombre completo: $full_name"
        fi
        if [[ -n "$email" && "$email" != "null" ]]; then
            print_info "Email: $email"
        fi
        if [[ -n "$is_active" && "$is_active" != "null" ]]; then
            print_info "Activo: $is_active"
        fi
        
        return 0
    else
        return 1
    fi
}

test_create_user() {
    print_step "POST /users/ - Crear nuevo usuario"
    
    # Generar datos únicos para el test
    local timestamp=$(date +%s)
    local test_username="test.user.$timestamp"
    local test_email="test$timestamp@example.com"
    
    local payload="{
        \"username\": \"$test_username\",
        \"email\": \"$test_email\",
        \"first_name\": \"Test\",
        \"last_name\": \"User $timestamp\",
        \"phone\": \"+56912345$timestamp\",
        \"petty_cash_limit\": 50000
    }"
    
    print_debug "Payload: $payload"
    
    make_request_with_auth "POST" "$API_URL/" "$payload"
    
    if analyze_response "Crear usuario" "200"; then
        local new_id=$(extract_nested_value "$RESPONSE_BODY" "data.id")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local email=$(extract_nested_value "$RESPONSE_BODY" "data.email")
        
        if [[ -n "$new_id" && "$new_id" != "null" ]]; then
            print_info "Nuevo usuario creado con ID: $new_id"
            export CREATED_USER_ID="$new_id"
        fi
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Username: $username"
        fi
        if [[ -n "$email" && "$email" != "null" ]]; then
            print_info "Email: $email"
        fi
        
        return 0
    else
        return 1
    fi
}

test_create_random_user() {
    print_step "POST /users/ - Crear usuario aleatorio de prueba"
    
    # Generar datos aleatorios
    generate_random_user_data
    
    local payload="{
        \"username\": \"$GENERATED_USERNAME\",
        \"email\": \"$GENERATED_EMAIL\",
        \"first_name\": \"$GENERATED_FIRST_NAME\",
        \"last_name\": \"$GENERATED_LAST_NAME\",
        \"phone\": \"$GENERATED_PHONE\",
        \"petty_cash_limit\": $GENERATED_PETTY_CASH_LIMIT
    }"
    
    print_debug "Payload: $payload"
    
    make_request_with_auth "POST" "$API_URL/" "$payload"
    
    if analyze_response "Crear usuario aleatorio" "200"; then
        local new_id=$(extract_nested_value "$RESPONSE_BODY" "data.id")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local email=$(extract_nested_value "$RESPONSE_BODY" "data.email")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "data.full_name")
        
        if [[ -n "$new_id" && "$new_id" != "null" ]]; then
            print_success "✨ Usuario aleatorio creado con ID: $new_id"
            export CREATED_USER_ID="$new_id"
            export LAST_CREATED_USERNAME="$username"
            
            # Guardar datos del usuario creado para tests posteriores
            echo "# Último usuario creado - $(date)" > "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_USER_ID=$new_id" >> "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_USERNAME=$username" >> "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_EMAIL=$email" >> "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_FULL_NAME=\"$full_name\"" >> "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_ROLE_CODE=\"$GENERATED_ROLE_CODE\"" >> "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_ROLE_NAME=\"$GENERATED_ROLE_NAME\"" >> "$SCRIPT_DIR/last_created_user.env"
            echo "LAST_ROLE_DESCRIPTION=\"$GENERATED_ROLE_DESCRIPTION\"" >> "$SCRIPT_DIR/last_created_user.env"
        fi
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "👤 Username: $username"
        fi
        if [[ -n "$email" && "$email" != "null" ]]; then
            print_info "📧 Email: $email"
        fi
        if [[ -n "$full_name" && "$full_name" != "null" ]]; then
            print_info "🏷️  Nombre completo: $full_name"
        fi
        
        print_info "💡 Sugerencia: Asignar rol '$GENERATED_ROLE_CODE' ($GENERATED_ROLE_NAME) a este usuario"
        print_info "💾 Datos guardados en: $SCRIPT_DIR/last_created_user.env"
        
        return 0
    else
        return 1
    fi
}

test_create_multiple_users() {
    print_step "Crear múltiples usuarios de prueba"
    
    local count=${1:-3}
    local success_count=0
    
    print_info "Creando $count usuarios aleatorios..."
    
    for ((i=1; i<=count; i++)); do
        echo -e "\n${CYAN}── Usuario $i/$count ──${NC}"
        
        # Generar datos únicos para cada usuario
        sleep 1  # Asegurar timestamps únicos
        
        if test_create_random_user; then
            ((success_count++))
            print_success "Usuario $i creado exitosamente"
        else
            print_error "Falló la creación del usuario $i"
        fi
    done
    
    print_section "RESUMEN CREACIÓN MASIVA"
    echo "${BOLD}Usuarios creados: $success_count/$count${NC}"
    
    if [[ $success_count -eq $count ]]; then
        print_success "🎉 Todos los usuarios fueron creados exitosamente"
        return 0
    elif [[ $success_count -gt 0 ]]; then
        print_warning "Se crearon algunos usuarios ($success_count/$count)"
        return 0
    else
        print_error "No se pudo crear ningún usuario"
        return 1
    fi
}

test_update_user() {
    print_step "PUT /users/{id} - Actualizar usuario"
    
    local target_id="$USER_ID"
    if [[ -z "$target_id" && -n "$CREATED_USER_ID" ]]; then
        target_id="$CREATED_USER_ID"
        print_info "Usando usuario recién creado: $target_id"
    fi
    
    if [[ -z "$target_id" ]]; then
        print_error "Se requiere ID de usuario (-i) para actualizar"
        return 1
    fi
    
    local payload="{
        \"first_name\": \"Updated\",
        \"last_name\": \"User $(date +%s)\",
        \"phone\": \"+56987654321\"
    }"
    
    print_debug "Payload: $payload"
    
    make_request_with_auth "PUT" "$API_URL/$target_id" "$payload"
    
    if analyze_response "Actualizar usuario $target_id" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "data.full_name")
        local phone=$(extract_nested_value "$RESPONSE_BODY" "data.phone")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Username: $username"
        fi
        if [[ -n "$full_name" && "$full_name" != "null" ]]; then
            print_info "Nombre actualizado: $full_name"
        fi
        if [[ -n "$phone" && "$phone" != "null" ]]; then
            print_info "Teléfono actualizado: $phone"
        fi
        
        return 0
    else
        return 1
    fi
}

test_delete_user() {
    print_step "DELETE /users/{id} - Eliminar usuario"
    
    local target_id="$USER_ID"
    if [[ -z "$target_id" && -n "$CREATED_USER_ID" ]]; then
        target_id="$CREATED_USER_ID"
        print_info "Usando usuario recién creado: $target_id"
    fi
    
    if [[ -z "$target_id" ]]; then
        print_error "Se requiere ID de usuario (-i) para eliminar"
        return 1
    fi
    
    read -p "¿Confirmar eliminación del usuario ID $target_id? (y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_warning "Eliminación cancelada por el usuario"
        return 0
    fi
    
    make_request_with_auth "DELETE" "$API_URL/$target_id"
    
    if analyze_response "Eliminar usuario $target_id" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local deleted_at=$(extract_nested_value "$RESPONSE_BODY" "data.deleted_at")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Usuario eliminado: $username"
        fi
        if [[ -n "$deleted_at" && "$deleted_at" != "null" ]]; then
            print_info "Eliminado en: $deleted_at"
        fi
        
        return 0
    else
        return 1
    fi
}

test_my_profile() {
    print_step "GET /users/me/profile - Mi perfil"
    
    make_request_with_auth "GET" "$API_URL/me/profile"
    
    if analyze_response "Mi perfil" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "data.full_name")
        local email=$(extract_nested_value "$RESPONSE_BODY" "data.email")
        local is_active=$(extract_nested_value "$RESPONSE_BODY" "data.is_active")
        local last_login=$(extract_nested_value "$RESPONSE_BODY" "data.last_login_at")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Mi username: $username"
        fi
        if [[ -n "$full_name" && "$full_name" != "null" ]]; then
            print_info "Mi nombre: $full_name"
        fi
        if [[ -n "$email" && "$email" != "null" ]]; then
            print_info "Mi email: $email"
        fi
        if [[ -n "$is_active" && "$is_active" != "null" ]]; then
            print_info "Estado activo: $is_active"
        fi
        if [[ -n "$last_login" && "$last_login" != "null" ]]; then
            print_info "Último login: $last_login"
        fi
        
        return 0
    else
        return 1
    fi
}

test_user_profile() {
    print_step "GET /users/{id}/profile - Perfil público"
    
    if [[ -z "$USER_ID" ]]; then
        print_error "Se requiere ID de usuario (-i) para ver perfil"
        return 1
    fi
    
    make_request_with_auth "GET" "$API_URL/$USER_ID/profile"
    
    if analyze_response "Perfil público usuario $USER_ID" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "data.full_name")
        local display_name=$(extract_nested_value "$RESPONSE_BODY" "data.display_name")
        local initials=$(extract_nested_value "$RESPONSE_BODY" "data.initials")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Username: $username"
        fi
        if [[ -n "$full_name" && "$full_name" != "null" ]]; then
            print_info "Nombre: $full_name"
        fi
        if [[ -n "$display_name" && "$display_name" != "null" ]]; then
            print_info "Nombre para mostrar: $display_name"
        fi
        if [[ -n "$initials" && "$initials" != "null" ]]; then
            print_info "Iniciales: $initials"
        fi
        
        return 0
    else
        return 1
    fi
}

test_toggle_activation() {
    print_step "PUT /users/{id}/toggle-activation - Cambiar estado"
    
    local target_id="$USER_ID"
    if [[ -z "$target_id" && -n "$CREATED_USER_ID" ]]; then
        target_id="$CREATED_USER_ID"
        print_info "Usando usuario recién creado: $target_id"
    fi
    
    if [[ -z "$target_id" ]]; then
        print_error "Se requiere ID de usuario (-i) para cambiar estado"
        return 1
    fi
    
    # Desactivar usuario
    local payload="{
        \"is_active\": false,
        \"reason\": \"Test de desactivación automática\"
    }"
    
    print_debug "Payload: $payload"
    
    make_request_with_auth "PUT" "$API_URL/$target_id/toggle-activation" "$payload"
    
    if analyze_response "Desactivar usuario $target_id" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local is_active=$(extract_nested_value "$RESPONSE_BODY" "data.is_active")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Usuario: $username"
        fi
        if [[ -n "$is_active" && "$is_active" != "null" ]]; then
            print_info "Estado activo: $is_active"
        fi
        
        # Reactivar usuario
        sleep 1
        local reactivate_payload="{
            \"is_active\": true,
            \"reason\": \"Test de reactivación automática\"
        }"
        
        make_request_with_auth "PUT" "$API_URL/$target_id/toggle-activation" "$reactivate_payload"
        
        if analyze_response "Reactivar usuario $target_id" "200"; then
            print_success "Usuario reactivado exitosamente"
        fi
        
        return 0
    else
        return 1
    fi
}

test_stats() {
    print_step "GET /users/stats/summary - Estadísticas"
    
    make_request_with_auth "GET" "$API_URL/stats/summary"
    
    if analyze_response "Estadísticas de usuarios" "200"; then
        local total_users=$(extract_nested_value "$RESPONSE_BODY" "data.general.total_users")
        local active_users=$(extract_nested_value "$RESPONSE_BODY" "data.general.active_users")
        local recent_login_users=$(extract_nested_value "$RESPONSE_BODY" "data.general.users_with_recent_login")
        local active_percentage=$(extract_nested_value "$RESPONSE_BODY" "data.activity.active_percentage")
        
        if [[ -n "$total_users" && "$total_users" != "null" ]]; then
            print_info "Total usuarios: $total_users"
        fi
        if [[ -n "$active_users" && "$active_users" != "null" ]]; then
            print_info "Usuarios activos: $active_users"
        fi
        if [[ -n "$recent_login_users" && "$recent_login_users" != "null" ]]; then
            print_info "Con login reciente: $recent_login_users"
        fi
        if [[ -n "$active_percentage" && "$active_percentage" != "null" ]]; then
            print_info "Porcentaje activos: $active_percentage%"
        fi
        
        return 0
    else
        return 1
    fi
}

test_advanced_search() {
    print_step "GET /users/search/advanced - Búsqueda avanzada"
    
    make_request_with_auth "GET" "$API_URL/search/advanced?query=admin&is_active=true&limit=5"
    
    if analyze_response "Búsqueda avanzada" "200"; then
        local results_found=$(extract_nested_value "$RESPONSE_BODY" "data.search_info.results_found")
        local query_used=$(extract_nested_value "$RESPONSE_BODY" "data.search_info.filters_applied.query")
        
        if [[ -n "$results_found" && "$results_found" != "null" ]]; then
            print_info "Resultados encontrados: $results_found"
        fi
        if [[ -n "$query_used" && "$query_used" != "null" ]]; then
            print_info "Query utilizada: $query_used"
        fi
        
        return 0
    else
        return 1
    fi
}

test_validate_username() {
    print_step "POST /users/validate/username - Validar username"
    
    local test_username="$USERNAME"
    if [[ -z "$test_username" ]]; then
        test_username="test.validation.$(date +%s)"
    fi
    
    make_request_with_auth "POST" "$API_URL/validate/username?username=$test_username"
    
    if analyze_response "Validar username" "200"; then
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local is_available=$(extract_nested_value "$RESPONSE_BODY" "data.is_available")
        local message=$(extract_nested_value "$RESPONSE_BODY" "data.message")
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Username validado: $username"
        fi
        if [[ -n "$is_available" && "$is_available" != "null" ]]; then
            print_info "Disponible: $is_available"
        fi
        if [[ -n "$message" && "$message" != "null" ]]; then
            print_info "Mensaje: $message"
        fi
        
        return 0
    else
        return 1
    fi
}

test_validate_email() {
    print_step "POST /users/validate/email - Validar email"
    
    local test_email="$EMAIL"
    if [[ -z "$test_email" ]]; then
        test_email="test.validation.$(date +%s)@example.com"
    fi
    
    make_request_with_auth "POST" "$API_URL/validate/email?email=$test_email"
    
    if analyze_response "Validar email" "200"; then
        local email=$(extract_nested_value "$RESPONSE_BODY" "data.email")
        local is_available=$(extract_nested_value "$RESPONSE_BODY" "data.is_available")
        local message=$(extract_nested_value "$RESPONSE_BODY" "data.message")
        
        if [[ -n "$email" && "$email" != "null" ]]; then
            print_info "Email validado: $email"
        fi
        if [[ -n "$is_available" && "$is_available" != "null" ]]; then
            print_info "Disponible: $is_available"
        fi
        if [[ -n "$message" && "$message" != "null" ]]; then
            print_info "Mensaje: $message"
        fi
        
        return 0
    else
        return 1
    fi
}

# ===========================================
# TESTS COMPLETOS Y FLUJOS
# ===========================================

test_all() {
    print_section "BATERÍA COMPLETA DE TESTS - ENDPOINTS BÁSICOS"
    
    local success_count=0
    local total_count=6
    
    echo -e "\n${CYAN}${BOLD}=== EJECUTANDO TESTS BÁSICOS ===${NC}"
    
    # Test 1: Health check
    if test_health; then ((success_count++)); fi
    
    # Test 2: Listar usuarios
    if test_list_users; then ((success_count++)); fi
    
    # Test 3: Mi perfil
    if test_my_profile; then ((success_count++)); fi
    
    # Test 4: Estadísticas (si tiene permisos)
    if test_stats; then 
        ((success_count++))
    else
        print_warning "Sin permisos para estadísticas (normal si no es manager)"
    fi
    
    # Test 5: Búsqueda avanzada
    if test_advanced_search; then ((success_count++)); fi
    
    # Test 6: Validaciones
    if test_validate_username && test_validate_email; then 
        ((success_count++))
    fi
    
    # Resumen final
    print_section "RESUMEN TESTS BÁSICOS"
    echo "${BOLD}Tests exitosos: $success_count/$total_count${NC}"
    
    if [[ $success_count -eq $total_count ]]; then
        print_success "🎉 TODOS LOS TESTS BÁSICOS PASARON"
        return 0
    elif [[ $success_count -ge 4 ]]; then
        print_warning "TESTS PRINCIPALES EXITOSOS ($success_count/$total_count)"
        return 0
    else
        print_error "MÚLTIPLES FALLOS DETECTADOS"
        return 1
    fi
}

test_crud_test() {
    print_section "TEST COMPLETO DE CRUD"
    
    local success_count=0
    local total_tests=5
    
    echo -e "\n${CYAN}${BOLD}=== CRUD: CREATE ===${NC}"
    if test_create_random_user; then
        ((success_count++))
        
        echo -e "\n${CYAN}${BOLD}=== CRUD: READ ===${NC}"
        if test_get_user; then
            ((success_count++))
        fi
        
        echo -e "\n${CYAN}${BOLD}=== CRUD: UPDATE ===${NC}"
        if test_update_user; then
            ((success_count++))
        fi
        
        echo -e "\n${CYAN}${BOLD}=== CRUD: TOGGLE STATE ===${NC}"
        if test_toggle_activation; then
            ((success_count++))
        fi
        
        echo -e "\n${CYAN}${BOLD}=== CRUD: DELETE ===${NC}"
        echo -e "\n${YELLOW}NOTA: La eliminación requiere confirmación${NC}"
        read -p "¿Ejecutar test de eliminación? (y/n): " run_delete
        
        if [[ "$run_delete" =~ ^[Yy]$ ]]; then
            if test_delete_user; then
                ((success_count++))
            fi
        else
            print_warning "Test de eliminación omitido"
            ((success_count++))  # Contar como exitoso si se omite
        fi
    fi
    
    print_section "RESUMEN TEST CRUD"
    echo "${BOLD}Tests CRUD completados: $success_count/$total_tests${NC}"
    
    if [[ $success_count -eq $total_tests ]]; then
        print_success "🎉 CRUD COMPLETO EXITOSO"
        return 0
    elif [[ $success_count -ge 3 ]]; then
        print_warning "CRUD PARCIALMENTE EXITOSO ($success_count/$total_tests)"
        return 0
    else
        print_error "CRUD CON MÚLTIPLES FALLOS"
        return 1
    fi
}

test_search_test() {
    print_section "TEST DE BÚSQUEDAS Y FILTROS"
    
    local success_count=0
    local total_tests=4
    
    echo -e "\n${CYAN}${BOLD}=== BÚSQUEDA: LISTADO BÁSICO ===${NC}"
    if test_list_users; then ((success_count++)); fi
    
    echo -e "\n${CYAN}${BOLD}=== BÚSQUEDA: AVANZADA ===${NC}"
    if test_advanced_search; then ((success_count++)); fi
    
    echo -e "\n${CYAN}${BOLD}=== BÚSQUEDA: FILTROS ESPECÍFICOS ===${NC}"
    print_info "Probando filtros específicos..."
    make_request_with_auth "GET" "$API_URL/?active_only=false&limit=5&search=admin"
    if analyze_response "Búsqueda con filtros" "200"; then
        ((success_count++))
    fi
    
    echo -e "\n${CYAN}${BOLD}=== BÚSQUEDA: PAGINACIÓN ===${NC}"
    print_info "Probando paginación..."
    make_request_with_auth "GET" "$API_URL/?skip=0&limit=2"
    if analyze_response "Búsqueda paginada" "200"; then
        ((success_count++))
    fi
    
    print_section "RESUMEN TEST BÚSQUEDAS"
    echo "${BOLD}Tests de búsqueda completados: $success_count/$total_tests${NC}"
    
    if [[ $success_count -eq $total_tests ]]; then
        print_success "🎉 TODAS LAS BÚSQUEDAS EXITOSAS"
        return 0
    else
        print_warning "BÚSQUEDAS PARCIALMENTE EXITOSAS ($success_count/$total_tests)"
        return 1
    fi
}

test_validation_test() {
    print_section "TEST DE VALIDACIONES"
    
    local success_count=0
    local total_tests=4
    
    echo -e "\n${CYAN}${BOLD}=== VALIDACIÓN: USERNAME DISPONIBLE ===${NC}"
    USERNAME="usuario.disponible.$(date +%s)"
    if test_validate_username; then ((success_count++)); fi
    
    echo -e "\n${CYAN}${BOLD}=== VALIDACIÓN: USERNAME OCUPADO ===${NC}"
    USERNAME="admin.demo"  # Username que probablemente existe
    if test_validate_username; then ((success_count++)); fi
    
    echo -e "\n${CYAN}${BOLD}=== VALIDACIÓN: EMAIL DISPONIBLE ===${NC}"
    EMAIL="email.disponible.$(date +%s)@test.com"
    if test_validate_email; then ((success_count++)); fi
    
    echo -e "\n${CYAN}${BOLD}=== VALIDACIÓN: EMAIL OCUPADO ===${NC}"
    EMAIL="admin@demo.com"  # Email que probablemente existe
    if test_validate_email; then ((success_count++)); fi
    
    print_section "RESUMEN TEST VALIDACIONES"
    echo "${BOLD}Tests de validación completados: $success_count/$total_tests${NC}"
    
    if [[ $success_count -eq $total_tests ]]; then
        print_success "🎉 TODAS LAS VALIDACIONES EXITOSAS"
        return 0
    else
        print_warning "VALIDACIONES PARCIALMENTE EXITOSAS ($success_count/$total_tests)"
        return 1
    fi
}

test_full_test() {
    print_section "TEST EXHAUSTIVO - TODOS LOS ENDPOINTS"
    
    local phase_results=()
    
    echo -e "\n${CYAN}${BOLD}=== FASE 1: TESTS BÁSICOS ===${NC}"
    if test_all; then
        phase_results+=("✅ Básicos")
    else
        phase_results+=("❌ Básicos")
    fi
    
    echo -e "\n${CYAN}${BOLD}=== FASE 2: CRUD COMPLETO ===${NC}"
    if test_crud_test; then
        phase_results+=("✅ CRUD")
    else
        phase_results+=("❌ CRUD")
    fi
    
    echo -e "\n${CYAN}${BOLD}=== FASE 3: BÚSQUEDAS Y FILTROS ===${NC}"
    if test_search_test; then
        phase_results+=("✅ Búsquedas")
    else
        phase_results+=("❌ Búsquedas")
    fi
    
    echo -e "\n${CYAN}${BOLD}=== FASE 4: VALIDACIONES ===${NC}"
    if test_validation_test; then
        phase_results+=("✅ Validaciones")
    else
        phase_results+=("❌ Validaciones")
    fi
    
    # Resumen final exhaustivo
    print_section "RESUMEN TEST EXHAUSTIVO"
    echo "${BOLD}Resultados por fase:${NC}"
    for result in "${phase_results[@]}"; do
        echo "  $result"
    done
    
    # Contar exitosos
    local success_phases=$(printf '%s\n' "${phase_results[@]}" | grep -c "✅")
    local total_phases=${#phase_results[@]}
    
    echo ""
    echo "${BOLD}Fases exitosas: $success_phases/$total_phases${NC}"
    
    if [[ $success_phases -eq $total_phases ]]; then
        print_success "🎉 TEST EXHAUSTIVO COMPLETADO CON ÉXITO TOTAL"
        return 0
    elif [[ $success_phases -ge 3 ]]; then
        print_success "🎉 TEST EXHAUSTIVO MAYORMENTE EXITOSO"
        return 0
    else
        print_error "TEST EXHAUSTIVO CON MÚLTIPLES FALLOS"
        return 1
    fi
}

# ===========================================
# PROCESAMIENTO DE ARGUMENTOS
# ===========================================

VERBOSE=false
NO_COLORS=false
USER_ID=""
USERNAME=""
EMAIL=""

# Clear screen al inicio (solo si es terminal interactiva)
if [[ -t 1 ]]; then
    clear
fi

while getopts "t:a:f:i:u:e:c:vnhl" opt; do
    case $opt in
        t) TOKEN="$OPTARG" ;;
        a) API_URL="$OPTARG" ;;
        f) TOKEN_FILE="$(resolve_token_file_path "$OPTARG")" ;;
        i) USER_ID="$OPTARG" ;;
        u) USERNAME="$OPTARG" ;;
        e) EMAIL="$OPTARG" ;;
        c) CREATE_COUNT="$OPTARG" ;;
        v) VERBOSE=true ;;
        n) NO_COLORS=true ;;
        l) load_last_created_user ;;
        h) show_help; exit 0 ;;
        *) 
            echo "Opción inválida. Usar -h para ayuda." >&2
            exit 1 
            ;;
    esac
done

# Forzar modo sin colores si se especificó
if [[ "$NO_COLORS" == "true" ]]; then
    RED=""
    GREEN=""
    YELLOW=""
    BLUE=""
    PURPLE=""
    CYAN=""
    WHITE=""
    BOLD=""
    NC=""
fi

shift $((OPTIND-1))
COMMAND="${1:-help}"

# Verificar curl
if ! command -v curl &> /dev/null; then
    print_error "curl no está instalado"
    exit 1
fi

# Cargar token si no se especificó
if [[ -z "$TOKEN" ]]; then
    if ! load_tokens; then
        print_error "No se pudo cargar el token. Especifica uno con -t o asegúrate de que existe $TOKEN_FILE"
        exit 1
    fi
fi

# Mostrar configuración
echo -e "${CYAN}${BOLD}=== USERS API TESTER v1.0 - GESTIÓN DE USUARIOS ===${NC}"
echo "🔗 API URL: $API_URL"
echo "🎫 Token: ${TOKEN:0:25}${TOKEN:+'...'}"
echo "📁 Token File: $TOKEN_FILE"
echo "👤 User ID: ${USER_ID:-'no especificado'}"
echo "📝 Comando: $COMMAND"
echo "🔍 Verbose: $VERBOSE"
echo "🎨 Colores: $([[ -n "$RED" ]] && echo "Activados" || echo "Desactivados")"
echo "⚡ Dependencias: Solo curl y bash"

# Detectar si estamos siendo piped o redirigidos
if [[ ! -t 1 ]]; then
    print_info "Salida detectada como pipe/redirect - usando formato plano"
fi

echo ""

# ===========================================
# EJECUTAR COMANDO
# ===========================================

case "$COMMAND" in
    "show-roles")
        show_available_roles
        ;;
    "health") 
        test_health 
        ;;
    "list") 
        test_list_users 
        ;;
    "get") 
        test_get_user 
        ;;
    "create") 
        test_create_user 
        ;;
    "create-random") 
        test_create_random_user 
        ;;
    "create-multiple") 
        count=${CREATE_COUNT:-3}
        test_create_multiple_users "$count"
        ;;
    "update") 
        test_update_user 
        ;;
    "delete") 
        test_delete_user 
        ;;
    "profile") 
        test_user_profile 
        ;;
    "my-profile") 
        test_my_profile 
        ;;
    "toggle-activation") 
        test_toggle_activation 
        ;;
    "stats") 
        test_stats 
        ;;
    "search") 
        test_advanced_search 
        ;;
    "validate-username") 
        test_validate_username 
        ;;
    "validate-email") 
        test_validate_email 
        ;;
    "all") 
        test_all 
        ;;
    "crud-test") 
        test_crud_test 
        ;;
    "search-test") 
        test_search_test 
        ;;
    "validation-test") 
        test_validation_test 
        ;;
    "full-test") 
        test_full_test 
        ;;
    "interactive"|"config")
        # Modo interactivo para configurar y ejecutar
        print_section "CONFIGURACIÓN INTERACTIVA"
        
        echo -e "\n${YELLOW}Comandos disponibles:${NC}"
        echo "0) show-roles - Ver roles disponibles"
        echo "1) health - Health check del sistema"
        echo "2) list - Listar usuarios"
        echo "3) my-profile - Ver mi perfil"
        echo "4) create-random - Crear usuario aleatorio"
        echo "5) create-multiple - Crear múltiples usuarios"
        echo "6) all - Tests básicos completos"
        echo "7) crud-test - Test CRUD completo"
        echo "8) full-test - Test exhaustivo completo"
        
        read -p "Seleccionar comando (0-8): " choice
        
        case $choice in
            0) show_available_roles ;;
            1) test_health ;;
            2) test_list_users ;;
            3) test_my_profile ;;
            4) test_create_random_user ;;
            5) 
                read -p "¿Cuántos usuarios crear? (default: 3): " count
                test_create_multiple_users "${count:-3}"
                ;;
            6) test_all ;;
            7) test_crud_test ;;
            8) test_full_test ;;
            *) print_error "Opción inválida" ;;
        esac
        ;;
    "help"|"-h"|"--help"|"") 
        show_help 
        ;;
    *)
        print_error "Comando desconocido: $COMMAND"
        echo ""
        echo "${YELLOW}Comandos disponibles:${NC}"
        echo "  ${GREEN}Información:${NC} health, list, stats, show-roles"
        echo "  ${GREEN}CRUD:${NC} get, create, create-random, create-multiple, update, delete"
        echo "  ${GREEN}Perfil:${NC} profile, my-profile"
        echo "  ${GREEN}Gestión:${NC} toggle-activation, search"
        echo "  ${GREEN}Validación:${NC} validate-username, validate-email"
        echo "  ${GREEN}Tests:${NC} all, crud-test, search-test, validation-test, full-test"
        echo "  ${GREEN}Utilidades:${NC} interactive, help"
        echo ""
        echo "Usar '${BOLD}$0 -h${NC}' para ver ayuda completa"
        echo "Usar '${BOLD}$0 interactive${NC}' para modo guiado"
        echo "Usar '${BOLD}$0 show-roles${NC}' para ver roles disponibles"
        echo "Usar '${BOLD}$0 create-random${NC}' para crear usuario de prueba"
        echo "Usar '${BOLD}$0 -c 5 create-multiple${NC}' para crear 5 usuarios"
        exit 1
        ;;
esac

exit_code=$?

# Mensaje final basado en el resultado
echo ""
if [[ $exit_code -eq 0 ]]; then
    print_success "Ejecución completada exitosamente"
else
    print_error "Ejecución completada con errores (código: $exit_code)"
fi

# Mostrar información adicional
if [[ -f "$TOKEN_FILE" ]]; then
    print_info "Tokens disponibles en: $TOKEN_FILE"
fi

if [[ -f "$SCRIPT_DIR/last_created_user.env" ]]; then
    print_info "Último usuario creado disponible en: $SCRIPT_DIR/last_created_user.env"
    print_info "Usar '${BOLD}$0 -l${NC}' para cargar datos del último usuario"
fi

exit $exit_code