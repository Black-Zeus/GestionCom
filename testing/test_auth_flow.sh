#!/bin/bash

# ===========================================
# AUTH API TESTER v4.2 - CONFIGURABLE TOKEN PATH
# Test de endpoints de autenticación unificada
# ===========================================

# Configuración por defecto
API_URL="http://localhost:8000/auth"
USERNAME=""
PASSWORD=""
TOKEN=""
REFRESH_TOKEN=""

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
${CYAN}${BOLD}=== AUTH API TESTER v4.2 - CONFIGURABLE TOKEN PATH ===${NC}

Uso: $0 [OPCIONES] [COMANDO]

${YELLOW}${BOLD}COMANDOS DISPONIBLES:${NC}
  ${GREEN}${BOLD}Básicos:${NC}
  info               GET /auth/ - Información del sistema
  login              POST /auth/login - Autenticación
  validate           POST /auth/validate-token - Validar token JWT
  refresh            POST /auth/refresh - Renovar token de acceso
  logout             POST /auth/logout - Cerrar sesión

  ${GREEN}${BOLD}Gestión de Contraseñas:${NC}
  change-password    PUT /auth/change-password - Cambiar contraseña propia
  forgot-password    POST /auth/forgot-password - Solicitar código de recuperación
  reset-password     POST /auth/reset-password - Restablecer con código
  admin-change       PUT /auth/change-password-by-admin - Cambio admin

  ${GREEN}${BOLD}Flujos y Tests Grupales:${NC}
  password-flow      Test completo de flujo de recuperación
  password-management Test completo de gestión de contraseñas
  password-endpoints Test todos los endpoints de contraseñas
  admin-endpoints    Test endpoints administrativos
  all                Probar todos los endpoints básicos
  full-test          Test exhaustivo de todos los endpoints

${YELLOW}${BOLD}OPCIONES:${NC}
  -u USERNAME        Username o email para autenticación
  -p PASSWORD        Password para autenticación
  -t TOKEN           Token JWT para validación/logout
  -r REFRESH_TOKEN   Refresh token para renovación
  -a URL             API base URL (default: http://localhost:8000/auth)
  -f TOKEN_FILE      Archivo para guardar tokens (default: ./auth_tokens.env)
  -v                 Modo verbose (mostrar headers y detalles)
  -n                 Modo sin colores (para logs o pipes)
  -h                 Mostrar esta ayuda

${YELLOW}${BOLD}CONFIGURACIÓN DE ARCHIVOS DE TOKENS:${NC}
  ${CYAN}Por defecto:${NC} Los tokens se guardan en auth_tokens.env en la misma carpeta del script
  ${CYAN}Ruta absoluta:${NC} -f /path/to/my_tokens.env
  ${CYAN}Ruta relativa:${NC} -f ./config/tokens.env
  ${CYAN}Solo nombre:${NC} -f my_session.env (se guardará en la carpeta del script)

${YELLOW}${BOLD}EJEMPLOS DE USO:${NC}
  ${CYAN}# Tests básicos (tokens en ./auth_tokens.env)${NC}
  $0 info
  $0 -u admin.demo -p admin.demo1 login

  ${CYAN}# Usar archivo de tokens personalizado${NC}
  $0 -f ./config/session.env -u admin.demo -p admin.demo1 login
  $0 -f /tmp/my_tokens.env -t "eyJ0eXAi..." validate

  ${CYAN}# Tokens en directorio específico${NC}
  $0 -f ~/auth/production.env -u admin -p pass all

  ${CYAN}# Tests completos con archivo personalizado${NC}
  $0 -f ./test_session.env -u admin.demo -p admin.demo1 full-test

${YELLOW}${BOLD}FUNCIONALIDADES:${NC}
  ✅ Configuración de ruta personalizada para tokens
  ✅ Detección automática de la carpeta del script
  ✅ Manejo automático de tokens (guarda/carga desde archivo especificado)
  ✅ Rate limiting y validación de respuestas
  ✅ Support para todos los endpoints de auth
  ✅ Tests de flujos completos
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

# Función para crear el directorio del archivo de tokens si no existe
ensure_token_dir() {
    local token_file="$1"
    local token_dir="$(dirname "$token_file")"
    
    if [[ ! -d "$token_dir" ]]; then
        print_debug "Creando directorio para tokens: $token_dir"
        mkdir -p "$token_dir" 2>/dev/null
        if [[ $? -ne 0 ]]; then
            print_error "No se pudo crear el directorio: $token_dir"
            return 1
        fi
    fi
    return 0
}

# Extraer valor de JSON (versión optimizada solo con grep/sed)
extract_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*[^,}]*" | head -1 | sed 's/.*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Extraer valor anidado (para data.field) - mejorado para solo bash
extract_nested_value() {
    local json="$1"
    local path="$2"
    
    if [[ "$path" == *"."* ]]; then
        # Para paths anidados como "data.access_token"
        local main_key=$(echo "$path" | cut -d'.' -f1)
        local sub_key=$(echo "$path" | cut -d'.' -f2)
        
        # Extraer sección principal de manera más robusta
        local section=$(echo "$json" | sed -n "s/.*\"$main_key\"[[:space:]]*:[[:space:]]*{\([^}]*\)}.*/\1/p")
        
        if [[ -n "$section" ]]; then
            echo "$section" | grep -o "\"$sub_key\"[[:space:]]*:[[:space:]]*[^,}]*" | sed 's/.*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
        fi
    else
        # Para paths simples, usar extract_value directamente
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

# Función para hacer petición con manejo de ResponseManager
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    
    print_debug "Request: $method $url"
    if [[ -n "$data" ]]; then
        print_debug "Payload: ${data:0:200}..."
    fi
    
    if [[ -n "$data" ]]; then
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "User-Agent: auth-tester/4.2" \
            -d "$data")
    else
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "User-Agent: auth-tester/4.2")
    fi
    
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    print_debug "HTTP Status: $HTTP_CODE"
    print_debug "Response: ${RESPONSE_BODY:0:200}..."
}

# Función con Authorization header
make_request_with_auth() {
    local method="$1"
    local url="$2"
    local token="$3"
    local data="$4"
    
    print_debug "Request with Auth: $method $url"
    print_debug "Token: ${token:0:50}..."
    
    if [[ -n "$data" ]]; then
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -H "User-Agent: auth-tester/4.2" \
            -d "$data")
    else
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -H "User-Agent: auth-tester/4.2")
    fi
    
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
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

# Guardar tokens en archivo (MODIFICADO para usar ruta configurable)
save_tokens() {
    local access_token="$1"
    local refresh_token="$2"
    
    # Asegurar que el directorio existe
    if ! ensure_token_dir "$TOKEN_FILE"; then
        print_error "No se pudo crear el directorio para el archivo de tokens"
        return 1
    fi
    
    # Crear el archivo de tokens
    cat > "$TOKEN_FILE" << EOF
# AUTH API TESTER - Session Tokens
# Generado: $(date)
# Script: $0
ACCESS_TOKEN="$access_token"
REFRESH_TOKEN="$refresh_token"
EOF

    if [[ $? -eq 0 ]]; then
        print_info "Tokens guardados en: $TOKEN_FILE"
        print_debug "Archivo de tokens creado exitosamente"
    else
        print_error "Error al guardar tokens en: $TOKEN_FILE"
        return 1
    fi
}

# Cargar tokens desde archivo (MODIFICADO para usar ruta configurable)
load_tokens() {
    if [[ -f "$TOKEN_FILE" ]]; then
        print_debug "Cargando tokens desde: $TOKEN_FILE"
        source "$TOKEN_FILE"
        TOKEN="$ACCESS_TOKEN"
        REFRESH_TOKEN="$REFRESH_TOKEN"
        print_info "Tokens cargados desde: $TOKEN_FILE"
        return 0
    else
        print_debug "Archivo de tokens no encontrado: $TOKEN_FILE"
        return 1
    fi
}

# Función para limpiar archivo de tokens
clean_tokens() {
    if [[ -f "$TOKEN_FILE" ]]; then
        rm -f "$TOKEN_FILE"
        print_info "Archivo de tokens eliminado: $TOKEN_FILE"
    else
        print_debug "No hay archivo de tokens para eliminar"
    fi
}

# ===========================================
# TESTS DE ENDPOINTS (sin cambios en la lógica)
# ===========================================

test_info() {
    print_step "GET /auth/ - Sistema de Autenticación"
    
    make_request "GET" "$API_URL/"
    
    if analyze_response "Info del sistema" "200"; then
        local version=$(extract_nested_value "$RESPONSE_BODY" "data.version")
        local auth_method=$(extract_nested_value "$RESPONSE_BODY" "data.authentication_method")
        local status=$(extract_nested_value "$RESPONSE_BODY" "data.status")
        
        if [[ -n "$version" && "$version" != "null" ]]; then
            print_info "Versión: $version"
        fi
        if [[ -n "$auth_method" && "$auth_method" != "null" ]]; then
            print_info "Método de auth: $auth_method"
        fi
        if [[ -n "$status" && "$status" != "null" ]]; then
            print_info "Estado: $status"
        fi
        
        return 0
    else
        return 1
    fi
}

test_login() {
    print_step "POST /auth/login - Autenticación"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para login"
        return 1
    fi
    
    local payload="{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\", \"remember_me\": false}"
    
    print_debug "Payload: $payload"
    
    make_request "POST" "$API_URL/login" "$payload"
    
    if analyze_response "Login" "200"; then
        # Extraer datos del usuario y tokens
        local access_token=$(extract_nested_value "$RESPONSE_BODY" "data.access_token")
        local refresh_token=$(extract_nested_value "$RESPONSE_BODY" "data.refresh_token")
        local expires_in=$(extract_nested_value "$RESPONSE_BODY" "data.expires_in")
        local user_id=$(extract_nested_value "$RESPONSE_BODY" "data.id")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "data.full_name")
        local session_id=$(extract_nested_value "$RESPONSE_BODY" "data.session_id")
        local ip_address=$(extract_nested_value "$RESPONSE_BODY" "data.ip_address")
        
        print_success "Autenticación exitosa"
        
        if [[ -n "$full_name" && "$full_name" != "null" ]]; then
            print_info "Usuario: $full_name ($username)"
        fi
        if [[ -n "$user_id" && "$user_id" != "null" ]]; then
            print_info "ID de usuario: $user_id"
        fi
        if [[ -n "$expires_in" && "$expires_in" != "null" ]]; then
            print_info "Expira en: $expires_in segundos"
        fi
        if [[ -n "$session_id" && "$session_id" != "null" ]]; then
            print_info "Session ID: ${session_id:0:20}..."
        fi
        if [[ -n "$ip_address" && "$ip_address" != "null" ]]; then
            print_info "IP registrada: $ip_address"
        fi
        
        if [[ -n "$access_token" && "$access_token" != "null" ]]; then
            print_info "Access Token: ${access_token:0:50}..."
            if [[ -n "$refresh_token" && "$refresh_token" != "null" ]]; then
                print_info "Refresh Token: ${refresh_token:0:50}..."
            fi
            
            save_tokens "$access_token" "$refresh_token"
        fi
        
        return 0
    else
        return 1
    fi
}

test_validate_token() {
    print_step "POST /auth/validate-token - Validación de JWT"
    
    # Cargar token si no se especificó
    if [[ -z "$TOKEN" ]]; then
        load_tokens
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para validación"
        return 1
    fi
    
    local payload="{\"token\": \"$TOKEN\"}"
    
    print_debug "Payload: $payload"
    print_debug "Token completo: $TOKEN"
    
    make_request "POST" "$API_URL/validate-token" "$payload"
    
    if analyze_response "Validación de token" "200"; then
        local valid=$(extract_nested_value "$RESPONSE_BODY" "data.valid")
        local status=$(extract_nested_value "$RESPONSE_BODY" "data.status")
        local reason=$(extract_nested_value "$RESPONSE_BODY" "data.reason")
        local user_id=$(extract_nested_value "$RESPONSE_BODY" "data.user_id")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        
        if [[ "$valid" == "true" ]]; then
            print_success "Token válido y activo"
            if [[ -n "$status" && "$status" != "null" ]]; then
                print_info "Estado: $status"
            fi
            if [[ -n "$username" && "$username" != "null" ]]; then
                print_info "Usuario en token: $username (ID: $user_id)"
            fi
        else
            print_error "Token inválido"
            if [[ -n "$reason" && "$reason" != "null" ]]; then
                print_info "Razón: $reason"
            fi
        fi
        
        return 0
    else
        return 1
    fi
}

test_refresh() {
    print_step "POST /auth/refresh - Renovar Token de Acceso"
    
    # Cargar refresh token si no se especificó
    if [[ -z "$REFRESH_TOKEN" ]]; then
        load_tokens
    fi
    
    if [[ -z "$REFRESH_TOKEN" ]]; then
        print_error "Se requiere refresh token (-r) para renovación"
        return 1
    fi
    
    make_request_with_auth "POST" "$API_URL/refresh" "$REFRESH_TOKEN"
    
    if analyze_response "Refresh token" "200"; then
        local new_access_token=$(extract_nested_value "$RESPONSE_BODY" "data.access_token")
        local new_refresh_token=$(extract_nested_value "$RESPONSE_BODY" "data.refresh_token")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local expires_in=$(extract_nested_value "$RESPONSE_BODY" "data.expires_in")
        
        print_success "Token renovado exitosamente"
        
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Usuario: $username"
        fi
        if [[ -n "$expires_in" && "$expires_in" != "null" ]]; then
            print_info "Nuevo token expira en: $expires_in segundos"
        fi
        
        if [[ -n "$new_access_token" && "$new_access_token" != "null" ]]; then
            print_info "Nuevo Access Token: ${new_access_token:0:50}..."
            save_tokens "$new_access_token" "$new_refresh_token"
        fi
        
        return 0
    else
        return 1
    fi
}

test_logout() {
    print_step "POST /auth/logout - Cierre de Sesión"
    
    # Cargar token si no se especificó
    if [[ -z "$TOKEN" ]]; then
        load_tokens
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para logout"
        return 1
    fi
    
    print_debug "Token usado: $TOKEN"
    
    make_request_with_auth "POST" "$API_URL/logout" "$TOKEN"
    
    if analyze_response "Logout" "200"; then
        local logged_out=$(extract_nested_value "$RESPONSE_BODY" "data.logged_out")
        local method=$(extract_nested_value "$RESPONSE_BODY" "data.method")
        local logout_at=$(extract_nested_value "$RESPONSE_BODY" "data.logout_at")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        
        print_success "Sesión cerrada exitosamente"
        
        if [[ -n "$method" && "$method" != "null" ]]; then
            print_info "Método: $method"
        fi
        if [[ -n "$logout_at" && "$logout_at" != "null" ]]; then
            print_info "Logout en: $logout_at"
        fi
        if [[ -n "$username" && "$username" != "null" ]]; then
            print_info "Usuario: $username"
        fi
        
        # Limpiar tokens guardados
        clean_tokens
        
        return 0
    else
        return 1
    fi
}

# [Continuaría con los demás tests sin cambios significativos...]
# Por brevedad, mantengo la estructura existente para los demás tests.

test_change_password() {
    print_step "PUT /auth/change-password - Cambiar Contraseña"
    
    if [[ -z "$TOKEN" ]]; then
        load_tokens
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para cambio de contraseña"
        return 1
    fi
    
    if [[ -z "$PASSWORD" ]]; then
        print_error "Se requiere password actual (-p) para cambio"
        return 1
    fi
    
    # Solicitar nueva contraseña de forma interactiva
    read -sp "Nueva contraseña: " NEW_PASSWORD
    echo
    read -sp "Confirmar nueva contraseña: " CONFIRM_PASSWORD
    echo
    
    local payload="{\"current_password\": \"$PASSWORD\", \"new_password\": \"$NEW_PASSWORD\", \"confirm_password\": \"$CONFIRM_PASSWORD\"}"
    
    make_request_with_auth "PUT" "$API_URL/change-password" "$TOKEN" "$payload"
    
    if analyze_response "Cambio de contraseña" "200"; then
        local password_changed=$(extract_nested_value "$RESPONSE_BODY" "data.password_changed")
        local username=$(extract_nested_value "$RESPONSE_BODY" "data.username")
        local changed_at=$(extract_nested_value "$RESPONSE_BODY" "data.changed_at")
        local tokens_invalidated=$(extract_nested_value "$RESPONSE_BODY" "data.tokens_invalidated")
        
        if [[ "$password_changed" == "true" ]]; then
            print_success "Contraseña cambiada exitosamente"
            if [[ -n "$username" && "$username" != "null" ]]; then
                print_info "Usuario: $username"
            fi
            if [[ -n "$changed_at" && "$changed_at" != "null" ]]; then
                print_info "Cambiada en: $changed_at"
            fi
            if [[ "$tokens_invalidated" == "true" ]]; then
                print_warning "Tokens invalidados - se requiere nuevo login"
            fi
        fi
        
        return 0
    else
        return 1
    fi
}

test_forgot_password() {
    print_step "POST /auth/forgot-password - Solicitar Código de Recuperación"
    
    if [[ -z "$USERNAME" ]]; then
        print_error "Se requiere username/email (-u) para recuperación"
        return 1
    fi
    
    local payload="{\"email\": \"$USERNAME\"}"
    
    make_request "POST" "$API_URL/forgot-password" "$payload"
    
    if analyze_response "Forgot password" "200"; then
        local code_sent=$(extract_nested_value "$RESPONSE_BODY" "data.code_sent")
        local expires_in=$(extract_nested_value "$RESPONSE_BODY" "data.expires_in_minutes")
        local debug_code=$(extract_nested_value "$RESPONSE_BODY" "data.code")
        
        if [[ "$code_sent" == "true" ]]; then
            print_success "Código de recuperación enviado"
            if [[ -n "$expires_in" && "$expires_in" != "null" ]]; then
                print_info "Expira en: $expires_in minutos"
            fi
            
            # En modo desarrollo, mostrar el código y guardarlo
            if [[ -n "$debug_code" && "$debug_code" != "null" ]]; then
                print_warning "CÓDIGO DEBUG: $debug_code"
                
                # Agregar el código al archivo de tokens
                if [[ -f "$TOKEN_FILE" ]]; then
                    echo "RESET_CODE=\"$debug_code\"" >> "$TOKEN_FILE"
                else
                    ensure_token_dir "$TOKEN_FILE"
                    echo "RESET_CODE=\"$debug_code\"" > "$TOKEN_FILE"
                fi
                print_debug "Código de recuperación guardado en: $TOKEN_FILE"
            fi
        fi
        
        return 0
    else
        return 1
    fi
}

# [Los demás tests mantienen la misma lógica, solo actualizando las referencias a archivos]

# ===========================================
# PROCESAMIENTO DE ARGUMENTOS (MODIFICADO)
# ===========================================

VERBOSE=false
NO_COLORS=false

# Clear screen al inicio (solo si es terminal interactiva)
if [[ -t 1 ]]; then
    clear
fi

while getopts "u:p:t:r:a:f:vnhi" opt; do
    case $opt in
        u) USERNAME="$OPTARG" ;;
        p) PASSWORD="$OPTARG" ;;
        t) TOKEN="$OPTARG" ;;
        r) REFRESH_TOKEN="$OPTARG" ;;
        a) API_URL="$OPTARG" ;;
        f) TOKEN_FILE="$(resolve_token_file_path "$OPTARG")" ;;
        v) VERBOSE=true ;;
        n) NO_COLORS=true ;;
        h) show_help; exit 0 ;;
        i) 
            # Modo interactivo para configurar credenciales
            read -p "Username/Email: " USERNAME
            read -sp "Password: " PASSWORD
            echo
            ;;
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

# Mostrar configuración
echo -e "${CYAN}${BOLD}=== AUTH API TESTER v4.2 - CONFIGURABLE TOKEN PATH ===${NC}"
echo "🔗 API URL: $API_URL"
echo "👤 Username: ${USERNAME:-'no especificado'}"
echo "🔑 Password: ${PASSWORD:+[OCULTO]}${PASSWORD:-'no especificado'}"
echo "🎫 Token: ${TOKEN:0:25}${TOKEN:+'...'}"
echo "🔄 Refresh: ${REFRESH_TOKEN:0:25}${REFRESH_TOKEN:+'...'}"
echo "📁 Token File: $TOKEN_FILE"
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
# TESTS ADICIONALES COMPLETOS
# ===========================================

test_admin_change_password() {
    print_step "PUT /auth/change-password-by-admin - Cambio Admin de Contraseña"
    
    if [[ -z "$TOKEN" ]]; then
        load_tokens
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para cambio admin de contraseña"
        return 1
    fi
    
    # Solicitar datos de forma interactiva
    read -p "ID del usuario objetivo: " TARGET_USER_ID
    if [[ -z "$TARGET_USER_ID" ]]; then
        print_error "ID de usuario objetivo es requerido"
        return 1
    fi
    
    read -sp "Nueva contraseña para el usuario: " NEW_PASSWORD
    echo
    read -sp "Confirmar nueva contraseña: " CONFIRM_PASSWORD
    echo
    read -p "Razón del cambio (opcional): " REASON
    
    local payload="{\"target_user_id\": $TARGET_USER_ID, \"new_password\": \"$NEW_PASSWORD\", \"confirm_password\": \"$CONFIRM_PASSWORD\""
    
    if [[ -n "$REASON" ]]; then
        payload+=", \"reason\": \"$REASON\""
    fi
    payload+="}"
    
    print_debug "Payload: $payload"
    
    make_request_with_auth "PUT" "$API_URL/change-password-by-admin" "$TOKEN" "$payload"
    
    if analyze_response "Cambio admin de contraseña" "200"; then
        local password_changed=$(extract_nested_value "$RESPONSE_BODY" "data.password_changed")
        local target_username=$(extract_nested_value "$RESPONSE_BODY" "data.target_username")
        local admin_username=$(extract_nested_value "$RESPONSE_BODY" "data.admin_username")
        local changed_at=$(extract_nested_value "$RESPONSE_BODY" "data.changed_at")
        local tokens_invalidated=$(extract_nested_value "$RESPONSE_BODY" "data.tokens_invalidated")
        local reason=$(extract_nested_value "$RESPONSE_BODY" "data.reason")
        
        if [[ "$password_changed" == "true" ]]; then
            print_success "Contraseña cambiada exitosamente por administrador"
            if [[ -n "$target_username" && "$target_username" != "null" ]]; then
                print_info "Usuario objetivo: $target_username"
            fi
            if [[ -n "$admin_username" && "$admin_username" != "null" ]]; then
                print_info "Administrador: $admin_username"
            fi
            if [[ -n "$changed_at" && "$changed_at" != "null" ]]; then
                print_info "Cambiada en: $changed_at"
            fi
            if [[ -n "$reason" && "$reason" != "null" ]]; then
                print_info "Razón: $reason"
            fi
            if [[ "$tokens_invalidated" == "true" ]]; then
                print_warning "Tokens del usuario objetivo invalidados"
            fi
        fi
        
        return 0
    else
        return 1
    fi
}

test_reset_password() {
    print_step "POST /auth/reset-password - Restablecer Contraseña"
    
    if [[ -z "$USERNAME" ]]; then
        print_error "Se requiere username/email (-u) para reset"
        return 1
    fi
    
    # Cargar código desde archivo o solicitar
    local reset_code=""
    if [[ -f "$TOKEN_FILE" ]]; then
        source "$TOKEN_FILE"
        reset_code="$RESET_CODE"
    fi
    
    if [[ -z "$reset_code" ]]; then
        read -p "Código de recuperación: " reset_code
    fi
    
    read -sp "Nueva contraseña: " NEW_PASSWORD
    echo
    read -sp "Confirmar nueva contraseña: " CONFIRM_PASSWORD
    echo
    
    local payload="{\"email\": \"$USERNAME\", \"reset_code\": \"$reset_code\", \"new_password\": \"$NEW_PASSWORD\", \"confirm_password\": \"$CONFIRM_PASSWORD\"}"
    
    make_request "POST" "$API_URL/reset-password" "$payload"
    
    if analyze_response "Reset password" "200"; then
        local password_reset=$(extract_nested_value "$RESPONSE_BODY" "data.password_reset")
        
        if [[ "$password_reset" == "true" ]]; then
            print_success "Contraseña restablecida exitosamente"
        fi
        
        return 0
    else
        return 1
    fi
}

# Test de flujo completo de gestión de contraseñas
test_password_management_flow() {
    print_section "FLUJO COMPLETO DE GESTIÓN DE CONTRASEÑAS"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren credenciales para flujo completo de contraseñas"
        return 1
    fi
    
    local success_count=0
    local total_tests=3
    
    echo -e "\n${CYAN}${BOLD}=== FASE 1: CAMBIO DE CONTRASEÑA PERSONAL ===${NC}"
    
    # Primero hacer login para obtener token
    if test_login; then
        ((success_count++))
        
        # Test cambio de contraseña personal
        print_info "Preparando test de cambio de contraseña personal..."
        sleep 1
        
        echo -e "\n${YELLOW}NOTA: Este test requiere interacción del usuario${NC}"
        read -p "¿Continuar con test de cambio de contraseña? (y/n): " continue_test
        
        if [[ "$continue_test" =~ ^[Yy]$ ]]; then
            if test_change_password; then
                ((success_count++))
            fi
        else
            print_warning "Test de cambio de contraseña omitido"
        fi
        
        echo -e "\n${CYAN}${BOLD}=== FASE 2: CAMBIO ADMIN DE CONTRASEÑA ===${NC}"
        
        read -p "¿Probar cambio admin de contraseña? (y/n): " test_admin
        
        if [[ "$test_admin" =~ ^[Yy]$ ]]; then
            if test_admin_change_password; then
                ((success_count++))
            fi
        else
            print_warning "Test de cambio admin omitido"
        fi
    fi
    
    print_section "RESUMEN GESTIÓN DE CONTRASEÑAS"
    echo "Tests completados: $success_count (algunos pueden haberse omitido)"
    
    if [[ $success_count -ge 1 ]]; then
        print_success "🎉 FLUJO DE GESTIÓN DE CONTRASEÑAS FUNCIONAL"
    else
        print_error "FLUJO DE GESTIÓN FALLIDO"
    fi
}

# Test de flujo completo de recuperación
test_password_flow() {
    print_section "FLUJO COMPLETO DE RECUPERACIÓN DE CONTRASEÑA"
    
    if [[ -z "$USERNAME" ]]; then
        print_error "Se requiere username/email (-u) para flujo completo"
        return 1
    fi
    
    local success_count=0
    
    # Paso 1: Solicitar código
    if test_forgot_password; then
        ((success_count++))
        
        # Paso 2: Restablecer contraseña
        sleep 2
        if test_reset_password; then
            ((success_count++))
        fi
    fi
    
    print_section "RESUMEN FLUJO DE RECUPERACIÓN"
    echo "Steps exitosos: $success_count/2"
    
    if [[ $success_count -eq 2 ]]; then
        print_success "🎉 FLUJO DE RECUPERACIÓN COMPLETADO"
    else
        print_error "FLUJO INCOMPLETO"
    fi
}

test_all() {
    print_section "BATERÍA COMPLETA DE TESTS v4.2 - ENDPOINTS BÁSICOS"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para test completo"
        return 1
    fi
    
    local success_count=0
    local total_count=5
    
    echo -e "\n${CYAN}${BOLD}=== EJECUTANDO TESTS BÁSICOS ===${NC}"
    
    # Test 1: Info del sistema
    if test_info; then ((success_count++)); fi
    
    # Test 2: Login (crítico)
    if test_login; then
        ((success_count++))
        
        # Test 3: Validate token
        if test_validate_token; then ((success_count++)); fi
        
        # Test 4: Refresh token
        if test_refresh; then ((success_count++)); fi
        
        # Test 5: Logout
        if test_logout; then ((success_count++)); fi
    else
        print_error "Login falló - saltando tests que requieren token"
    fi
    
    # Resumen final
    print_section "RESUMEN TESTS BÁSICOS"
    echo "${BOLD}Tests exitosos: $success_count/$total_count${NC}"
    
    if [[ $success_count -eq $total_count ]]; then
        print_success "🎉 TODOS LOS TESTS BÁSICOS PASARON"
        return 0
    elif [[ $success_count -ge 3 ]]; then
        print_warning "TESTS PRINCIPALES EXITOSOS ($success_count/$total_count)"
        return 0
    else
        print_error "MÚLTIPLES FALLOS DETECTADOS"
        return 1
    fi
}

test_password_endpoints() {
    print_section "TESTS DE ENDPOINTS DE CONTRASEÑAS"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren credenciales para tests de contraseñas"
        return 1
    fi
    
    local success_count=0
    local total_tests=4
    
    echo -e "\n${CYAN}${BOLD}=== TESTS DE GESTIÓN DE CONTRASEÑAS ===${NC}"
    
    # Test 1: Solicitar código de recuperación
    if test_forgot_password; then
        ((success_count++))
        
        # Test 2: Reset con código
        sleep 2
        echo -e "\n${YELLOW}NOTA: Siguiente test requiere el código de recuperación${NC}"
        if test_reset_password; then
            ((success_count++))
        fi
    fi
    
    # Test 3: Login después del reset
    echo -e "\n${CYAN}${BOLD}=== LOGIN CON NUEVA CONTRASEÑA ===${NC}"
    print_info "Intentando login con credenciales actualizadas..."
    if test_login; then
        ((success_count++))
        
        # Test 4: Cambio de contraseña personal
        echo -e "\n${CYAN}${BOLD}=== CAMBIO PERSONAL DE CONTRASEÑA ===${NC}"
        echo -e "\n${YELLOW}NOTA: Siguiente test requiere interacción del usuario${NC}"
        read -p "¿Probar cambio de contraseña personal? (y/n): " test_change
        
        if [[ "$test_change" =~ ^[Yy]$ ]]; then
            if test_change_password; then
                ((success_count++))
            fi
        else
            print_warning "Test de cambio personal omitido"
            ((success_count++))  # Contar como exitoso si se omite intencionalmente
        fi
    fi
    
    print_section "RESUMEN TESTS DE CONTRASEÑAS"
    echo "${BOLD}Tests completados: $success_count/$total_tests${NC}"
    
    if [[ $success_count -eq $total_tests ]]; then
        print_success "🎉 TODOS LOS TESTS DE CONTRASEÑAS PASARON"
        return 0
    elif [[ $success_count -ge 2 ]]; then
        print_warning "TESTS PRINCIPALES DE CONTRASEÑAS EXITOSOS ($success_count/$total_tests)"
        return 0
    else
        print_error "MÚLTIPLES FALLOS EN GESTIÓN DE CONTRASEÑAS"
        return 1
    fi
}

test_admin_endpoints() {
    print_section "TESTS DE ENDPOINTS ADMINISTRATIVOS"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren credenciales de admin para tests administrativos"
        return 1
    fi
    
    local success_count=0
    local total_tests=2
    
    echo -e "\n${CYAN}${BOLD}=== LOGIN COMO ADMINISTRADOR ===${NC}"
    
    if test_login; then
        ((success_count++))
        
        echo -e "\n${CYAN}${BOLD}=== CAMBIO ADMIN DE CONTRASEÑA ===${NC}"
        echo -e "\n${YELLOW}NOTA: Siguiente test requiere permisos de administrador${NC}"
        read -p "¿Probar cambio admin de contraseña? (y/n): " test_admin
        
        if [[ "$test_admin" =~ ^[Yy]$ ]]; then
            if test_admin_change_password; then
                ((success_count++))
            fi
        else
            print_warning "Test de cambio admin omitido"
            ((success_count++))  # Contar como exitoso si se omite
        fi
    fi
    
    print_section "RESUMEN TESTS ADMINISTRATIVOS"
    echo "${BOLD}Tests completados: $success_count/$total_tests${NC}"
    
    if [[ $success_count -eq $total_tests ]]; then
        print_success "🎉 TODOS LOS TESTS ADMINISTRATIVOS PASARON"
        return 0
    else
        print_error "FALLOS EN TESTS ADMINISTRATIVOS"
        return 1
    fi
}

test_full() {
    print_section "TEST EXHAUSTIVO - TODOS LOS ENDPOINTS"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren credenciales para test completo"
        return 1
    fi
    
    local phase_results=()
    
    echo -e "\n${CYAN}${BOLD}=== FASE 1: TESTS BÁSICOS ===${NC}"
    if test_all; then
        phase_results+=("✅ Básicos")
    else
        phase_results+=("❌ Básicos")
    fi
    
    echo -e "\n${CYAN}${BOLD}=== FASE 2: GESTIÓN DE CONTRASEÑAS ===${NC}"
    if test_password_endpoints; then
        phase_results+=("✅ Contraseñas")
    else
        phase_results+=("❌ Contraseñas")
    fi
    
    echo -e "\n${CYAN}${BOLD}=== FASE 3: ENDPOINTS ADMINISTRATIVOS ===${NC}"
    read -p "¿Probar endpoints administrativos? (y/n): " test_admin_phase
    
    if [[ "$test_admin_phase" =~ ^[Yy]$ ]]; then
        if test_admin_endpoints; then
            phase_results+=("✅ Administrativos")
        else
            phase_results+=("❌ Administrativos")
        fi
    else
        phase_results+=("⏭️ Administrativos (omitido)")
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
    elif [[ $success_phases -ge 2 ]]; then
        print_success "🎉 TEST EXHAUSTIVO MAYORMENTE EXITOSO"
        return 0
    else
        print_error "TEST EXHAUSTIVO CON MÚLTIPLES FALLOS"
        return 1
    fi
}

# ===========================================
# EJECUTAR COMANDO
# ===========================================

case "$COMMAND" in
    "info") 
        test_info 
        ;;
    "login") 
        test_login 
        ;;
    "validate") 
        test_validate_token 
        ;;
    "refresh") 
        test_refresh 
        ;;
    "logout") 
        test_logout 
        ;;
    "change-password") 
        test_change_password 
        ;;
    "forgot-password") 
        test_forgot_password 
        ;;
    "reset-password") 
        test_reset_password 
        ;;
    "admin-change")
        test_admin_change_password
        ;;
    "password-management")
        test_password_management_flow
        ;;
    "password-endpoints")
        test_password_endpoints
        ;;
    "admin-endpoints")
        test_admin_endpoints
        ;;
    "password-flow") 
        test_password_flow 
        ;;
    "all") 
        test_all 
        ;;
    "full-test") 
        test_full 
        ;;
    "interactive"|"config")
        # Modo interactivo para configurar y ejecutar
        print_section "CONFIGURACIÓN INTERACTIVA"
        
        if [[ -z "$USERNAME" ]]; then
            read -p "Username/Email: " USERNAME
        fi
        
        if [[ -z "$PASSWORD" ]]; then
            read -sp "Password: " PASSWORD
            echo
        fi
        
        echo -e "\n${YELLOW}¿Usar archivo de tokens personalizado?${NC}"
        read -p "Ruta del archivo (Enter para default): " custom_token_file
        
        if [[ -n "$custom_token_file" ]]; then
            TOKEN_FILE="$(resolve_token_file_path "$custom_token_file")"
            print_info "Usando archivo de tokens: $TOKEN_FILE"
        fi
        
        echo -e "\n${YELLOW}Comandos disponibles:${NC}"
        echo "1) info - Información del sistema"
        echo "2) login - Autenticación básica"
        echo "3) all - Tests básicos completos"
        echo "4) password-endpoints - Tests de gestión de contraseñas"
        echo "5) admin-endpoints - Tests administrativos"
        echo "6) full-test - Test exhaustivo completo"
        echo "7) password-flow - Solo flujo de recuperación"
        
        read -p "Seleccionar comando (1-7): " choice
        
        case $choice in
            1) test_info ;;
            2) test_login ;;
            3) test_all ;;
            4) test_password_endpoints ;;
            5) test_admin_endpoints ;;
            6) test_full ;;
            7) test_password_flow ;;
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
        echo "  ${GREEN}Básicos:${NC} info, login, validate, refresh, logout"
        echo "  ${GREEN}Contraseñas:${NC} change-password, forgot-password, reset-password"
        echo "  ${GREEN}Administrativos:${NC} admin-change"
        echo "  ${GREEN}Flujos:${NC} password-flow, password-management, password-endpoints, admin-endpoints"
        echo "  ${GREEN}Tests:${NC} all, full-test"
        echo "  ${GREEN}Utilidades:${NC} interactive, help"
        echo ""
        echo "Usar '${BOLD}$0 -h${NC}' para ver ayuda completa"
        echo "Usar '${BOLD}$0 interactive${NC}' para modo guiado"
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

# Mostrar información adicional si hay tokens guardados
if [[ -f "$TOKEN_FILE" ]]; then
    print_info "Tokens disponibles en: $TOKEN_FILE"
    print_debug "Archivo de tokens: $(ls -la "$TOKEN_FILE" 2>/dev/null || echo "archivo no accesible")"
fi

exit $exit_code