#!/bin/bash

# ===========================================
# AUTH API TESTER  - ESTRUCTURA REFACTORIZADA
# Test de endpoints de autenticación unificada
# ===========================================

# Configuración por defecto
API_URL="http://localhost:8000/auth"
USERNAME=""
PASSWORD=""
TOKEN=""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ===========================================
# FUNCIONES UTILITARIAS
# ===========================================

show_help() {
    cat << EOF
${CYAN}=== AUTH API TESTER  - ENDPOINTS EXISTENTES ===${NC}

Uso: $0 [OPCIONES] [COMANDO]

${YELLOW}COMANDOS DISPONIBLES (solo endpoints que existen):${NC}
  all          Probar todos los endpoints disponibles (requiere -u y -p)
  info         GET /auth/ - Información del sistema de Autenticacion
  login        POST /auth/login - Autenticación  (requiere -u y -p)
  validate     POST /auth/validate-token - Validar token JWT (requiere -t)
  logout       POST /auth/logout - Cerrar sesión y revocar token (requiere -t)

${YELLOW}OPCIONES:${NC}
  -u USERNAME  Username o email para autenticación
  -p PASSWORD  Password para autenticación (visible en logs internos)
  -t TOKEN     Token JWT para validación/logout
  -a URL       API base URL (default: http://localhost:8000/auth)
  -v           Modo verbose (mostrar headers y detalles)
  -h           Mostrar esta ayuda

${YELLOW}EJEMPLOS:${NC}
  $0 -h                                    # Mostrar ayuda
  $0 info                                  # Info del sistema 
  $0 -u admin.demo -p admin.demo1 login    # Login 
  $0 -t "eyJ0eXAi..." validate             # Validar token JWT
  $0 -u admin.demo -p admin.demo1 all      # Probar todos los endpoints
  $0 -v -u admin.demo -p admin.demo1 all   # Test completo en modo verbose

${YELLOW}ENDPOINTS IMPLEMENTADOS:${NC}
  ✅ GET /auth/ - Información del sistema
  ✅ POST /auth/login - Autenticación
  ✅ POST /auth/validate-token - Validación de JWT
  ✅ POST /auth/logout - Cierre de sesión

${YELLOW}NOTAS:${NC}
  - Script de automatización para testing interno
  - Passwords visibles para debugging y logs internos
EOF
}

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
    echo -e "\n${CYAN}🔸 $1${NC}"
}

print_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${YELLOW}🔧 DEBUG: $1${NC}"
    fi
}

# Extraer valor de JSON (mejorado para ResponseManager)
extract_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*[^,}]*" | head -1 | sed 's/.*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Extraer valor anidado (para data.field)
extract_nested_value() {
    local json="$1"
    local path="$2"
    
    # Buscar patrón "data":{...} y extraer el contenido
    local data_content=$(echo "$json" | grep -o '"data"[[:space:]]*:[[:space:]]*{[^}]*}' | sed 's/"data"[[:space:]]*:[[:space:]]*{//' | sed 's/}$//')
    
    if [[ -n "$data_content" ]]; then
        extract_value "$data_content" "$path"
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

# Función para hacer petición con manejo de ResponseManager
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    
    print_debug "Request: $method $url"
    if [[ -n "$data" ]]; then
        print_debug "Payload: $data"
    fi
    
    if [[ -n "$data" ]]; then
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "User-Agent: auth-tester/3.0" \
            -d "$data")
    else
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -H "User-Agent: auth-tester/3.0")
    fi
    
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    print_debug "HTTP Status: $HTTP_CODE"
    print_debug "Response: ${RESPONSE_BODY:0:200}..."
}

# Función para logout con Authorization header
make_request_with_auth() {
    local method="$1"
    local url="$2"
    local token="$3"
    
    print_debug "Request with Auth: $method $url"
    print_debug "Token: ${token:0:50}..."
    
    local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "User-Agent: auth-tester/3.0")
    
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
}

# Análisis mejorado de respuesta
analyze_response() {
    local description="$1"
    local expected_codes="$2"  # ej: "200,201"
    
    echo "Endpoint: $description"
    echo "HTTP Code: $HTTP_CODE"
    
    # MOSTRAR SIEMPRE LA RESPUESTA COMPLETA
    echo "Response: $RESPONSE_BODY"
    
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
        
        if [[ -n "$trace_id" ]]; then
            print_info "Trace ID: $trace_id"
        fi
        
        if [[ -n "$execution_time" ]]; then
            print_info "Tiempo de ejecución: ${execution_time}ms"
        fi
        
        return 0
    else
        local error_message=$(extract_value "$RESPONSE_BODY" "message")
        local error_code=$(extract_nested_value "$RESPONSE_BODY" "code")
        
        print_error "$description falló: $error_message"
        
        if [[ -n "$error_code" ]]; then
            print_info "Código de error: $error_code"
        fi
        
        return 1
    fi
}

# ===========================================
# TESTS DE ENDPOINTS - VERSIÓN REFACTORIZADA
# ===========================================

test_info() {
    print_step "GET /auth/ - Sistema de Autenticación "
    
    make_request "GET" "$API_URL/"
    
    if analyze_response "Info del sistema" "200"; then
        local version=$(extract_nested_value "$RESPONSE_BODY" "version")
        local auth_method=$(extract_nested_value "$RESPONSE_BODY" "authentication_method")
        local status=$(extract_nested_value "$RESPONSE_BODY" "status")
        
        print_info "Versión: $version"
        print_info "Método de auth: $auth_method"
        print_info "Estado: $status"
        
        # Verificar dependencias
        print_debug "Verificando estado de dependencias..."
        return 0
    else
        return 1
    fi
}

test_health() {
    print_step "GET /auth/health - Estado del Sistema de Autenticación"
    
    make_request "GET" "$API_URL/health"
    
    if analyze_response "Health check" "200,503"; then
        local status=$(extract_nested_value "$RESPONSE_BODY" "status")
        local health_percentage=$(extract_nested_value "$RESPONSE_BODY" "health_percentage")
        
        if [[ "$status" == "healthy" ]]; then
            print_success "Sistema completamente saludable"
        elif [[ "$status" == "degraded" ]]; then
            print_warning "Sistema en estado degradado ($health_percentage%)"
        else
            print_error "Sistema no saludable"
        fi
        
        return 0
    else
        return 1
    fi
}

test_password_requirements() {
    print_step "GET /auth/password-requirements"
    
    make_request "GET" "$API_URL/password-requirements"
    
    if analyze_response "Requisitos de contraseña" "200"; then
        local min_length=$(extract_nested_value "$RESPONSE_BODY" "min_length")
        local require_special=$(extract_nested_value "$RESPONSE_BODY" "require_special")
        
        print_info "Longitud mínima: $min_length caracteres"
        print_info "Requiere caracteres especiales: $require_special"
        return 0
    else
        return 1
    fi
}

test_password_strength() {
    print_step "POST /auth/password-strength"
    
    if [[ -z "$PASSWORD" ]]; then
        print_error "Se requiere password (-p) para test de fortaleza"
        return 1
    fi
    
    local payload="{\"password\": \"$PASSWORD\"}"
    
    make_request "POST" "$API_URL/password-strength" "$payload"
    
    if analyze_response "Verificación de fortaleza" "200"; then
        local score=$(extract_nested_value "$RESPONSE_BODY" "score")
        local is_valid=$(extract_nested_value "$RESPONSE_BODY" "is_valid")
        
        print_info "Score de fortaleza: $score/100"
        print_info "Contraseña válida: $is_valid"
        
        if [[ "$is_valid" == "true" ]]; then
            print_success "Contraseña cumple requisitos"
        else
            print_warning "Contraseña no cumple todos los requisitos"
        fi
        
        return 0
    else
        return 1
    fi
}

test_login() {
    print_step "POST /auth/login - Autenticación "
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para login"
        return 1
    fi
    
    local payload="{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\", \"remember_me\": false}"
    
    echo "Payload: $payload"
    
    make_request "POST" "$API_URL/login" "$payload"
    
    if analyze_response "Login " "200"; then
        # Extraer datos del usuario y tokens
        local access_token=$(extract_nested_value "$RESPONSE_BODY" "access_token")
        local refresh_token=$(extract_nested_value "$RESPONSE_BODY" "refresh_token")
        local expires_in=$(extract_nested_value "$RESPONSE_BODY" "expires_in")
        local user_id=$(extract_nested_value "$RESPONSE_BODY" "id")
        local username=$(extract_nested_value "$RESPONSE_BODY" "username")
        local full_name=$(extract_nested_value "$RESPONSE_BODY" "full_name")
        local session_id=$(extract_nested_value "$RESPONSE_BODY" "session_id")
        local ip_address=$(extract_nested_value "$RESPONSE_BODY" "ip_address")
        
        print_success "Autenticación exitosa "
        print_info "Usuario: $full_name ($username)"
        print_info "ID de usuario: $user_id"
        print_info "Expira en: $expires_in segundos"
        print_info "Session ID: ${session_id:0:20}..."
        print_info "IP registrada: $ip_address"
        
        if [[ -n "$access_token" && "$access_token" != "null" ]]; then
            print_info "Access Token: ${access_token:0:50}..."
            print_info "Refresh Token: ${refresh_token:0:50}..."
            
            # Guardar token para tests posteriores
            echo "TOKEN=$access_token" > /tmp/auth_token_unified.env
            print_info "Token guardado en /tmp/auth_token_unified.env"
        fi
        
        return 0
    else
        return 1
    fi
}

test_validate_token() {
    print_step "POST /auth/validate-token - Validación de JWT"
    
    # Cargar token si no se especificó
    if [[ -z "$TOKEN" ]] && [[ -f /tmp/auth_token_unified.env ]]; then
        source /tmp/auth_token_unified.env
        print_info "Token cargado desde archivo"
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para validación"
        return 1
    fi
    
    local payload="{\"token\": \"$TOKEN\"}"
    
    echo "Payload: $payload"
    echo "Token completo: $TOKEN"
    
    make_request "POST" "$API_URL/validate-token" "$payload"
    
    if analyze_response "Validación de token" "200"; then
        local valid=$(extract_nested_value "$RESPONSE_BODY" "valid")
        local status=$(extract_nested_value "$RESPONSE_BODY" "status")
        local reason=$(extract_nested_value "$RESPONSE_BODY" "reason")
        local user_id=$(extract_nested_value "$RESPONSE_BODY" "user_id")
        local username=$(extract_nested_value "$RESPONSE_BODY" "username")
        
        if [[ "$valid" == "true" ]]; then
            print_success "Token válido y activo"
            print_info "Estado: $status"
            print_info "Usuario en token: $username (ID: $user_id)"
        else
            print_error "Token inválido"
            print_info "Razón: $reason"
        fi
        
        return 0
    else
        return 1
    fi
}

test_logout() {
    print_step "POST /auth/logout - Cierre de Sesión"
    
    # Cargar token si no se especificó
    if [[ -z "$TOKEN" ]] && [[ -f /tmp/auth_token_unified.env ]]; then
        source /tmp/auth_token_unified.env
        print_info "Token cargado desde archivo"
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para logout"
        return 1
    fi
    
    echo "Token usado: $TOKEN"
    
    make_request_with_auth "POST" "$API_URL/logout" "$TOKEN"
    
    if analyze_response "Logout" "200"; then
        local logged_out=$(extract_nested_value "$RESPONSE_BODY" "logged_out")
        local method=$(extract_nested_value "$RESPONSE_BODY" "method")
        local logout_at=$(extract_nested_value "$RESPONSE_BODY" "logout_at")
        local username=$(extract_nested_value "$RESPONSE_BODY" "username")
        
        print_success "Sesión cerrada exitosamente"
        print_info "Método: $method"
        print_info "Logout en: $logout_at"
        
        if [[ -n "$username" ]]; then
            print_info "Usuario: $username"
        fi
        
        # Limpiar token guardado
        rm -f /tmp/auth_token_unified.env
        print_info "Token temporal eliminado"
        
        return 0
    else
        return 1
    fi
}

test_debug() {
    print_step "POST /auth/debug-login - Diagnóstico Detallado"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para debug"
        return 1
    fi
    
    local payload="{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}"
    
    make_request "POST" "$API_URL/debug-login" "$payload"
    
    if analyze_response "Debug de login" "200,403"; then
        if [[ "$HTTP_CODE" == "403" ]]; then
            print_warning "Debug endpoint no disponible (probablemente en producción)"
            return 0
        fi
        
        local user_found=$(extract_nested_value "$RESPONSE_BODY" "user_found")
        local modules_available=$(extract_nested_value "$RESPONSE_BODY" "modules_available")
        
        print_info "Usuario encontrado en BD: $user_found"
        print_info "Módulos disponibles: $modules_available"
        
        if [[ "$user_found" == "true" ]]; then
            print_success "Usuario existe en base de datos"
        else
            print_warning "Usuario no encontrado en base de datos"
        fi
        
        return 0
    else
        return 1
    fi
}

test_all() {
    print_step "EJECUTANDO BATERÍA COMPLETA DE TESTS v3.0 - SOLO ENDPOINTS EXISTENTES"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para test completo"
        return 1
    fi
    
    local success_count=0
    local total_count=4  # Solo 4 endpoints que existen
    
    echo -e "\n${CYAN}=== BATERÍA DE TESTS - ENDPOINTS IMPLEMENTADOS ===${NC}"
    
    # Test 1: Info del sistema
    if test_info; then ((success_count++)); fi
    
    # Test 2: Login (crítico)
    if test_login; then
        ((success_count++))
        
        # Test 3: Validate token
        source /tmp/auth_token_unified.env 2>/dev/null || true
        if test_validate_token; then ((success_count++)); fi
        
        # Test 4: Logout
        if test_logout; then ((success_count++)); fi
    else
        print_error "Login falló - saltando tests que requieren token"
    fi
    
    # Resumen final
    echo -e "\n${CYAN}=== RESUMEN DE TESTS v3.0 ===${NC}"
    echo "Tests exitosos: $success_count/$total_count"
    echo "Endpoints implementados: $total_count"
    echo "Arquitectura: Sistema de autenticación "
    
    if [[ $success_count -eq $total_count ]]; then
        print_success "🎉 TODOS LOS TESTS PASARON - SISTEMA FUNCIONANDO PERFECTAMENTE"
        return 0
    elif [[ $success_count -ge 3 ]]; then
        print_warning "TESTS PRINCIPALES EXITOSOS ($success_count/$total_count)"
        return 0
    else
        print_error "MÚLTIPLES FALLOS DETECTADOS ($((total_count - success_count)) fallos)"
        return 1
    fi
}

# ===========================================
# PROCESAMIENTO DE ARGUMENTOS
# ===========================================

VERBOSE=false

# Clear screen al inicio
clear

while getopts "u:p:t:a:vh" opt; do
    case $opt in
        u) USERNAME="$OPTARG" ;;
        p) PASSWORD="$OPTARG" ;;
        t) TOKEN="$OPTARG" ;;
        a) API_URL="$OPTARG" ;;
        v) VERBOSE=true ;;
        h) show_help; exit 0 ;;
        *) echo "Opción inválida. Usar -h para ayuda."; exit 1 ;;
    esac
done

shift $((OPTIND-1))
COMMAND="${1:-help}"

# Verificar curl
if ! command -v curl &> /dev/null; then
    print_error "curl no está instalado"
    exit 1
fi

# Mostrar configuración (ya con clear ejecutado arriba)
echo -e "${CYAN}=== AUTH API TESTER  - ENDPOINTS IMPLEMENTADOS ===${NC}"
echo "🔗 API URL: $API_URL"
echo "👤 Username: ${USERNAME:-'no especificado'}"
echo "🔑 Password: ${PASSWORD:-'no especificado'}"
echo "🎫 Token: ${TOKEN:0:25}${TOKEN:+'...'}"
echo "📝 Comando: $COMMAND"
echo "🔍 Verbose: $VERBOSE"
echo "📋 Endpoints: info, login, validate, logout (4 total)"
echo ""

# ===========================================
# EJECUTAR COMANDO
# ===========================================

case "$COMMAND" in
    "info") test_info ;;
    "login") test_login ;;
    "validate") test_validate_token ;;
    "logout") test_logout ;;
    "all") test_all ;;
    "help"|"-h"|"--help") show_help ;;
    *)
        echo "Comando desconocido: $COMMAND"
        echo ""
        echo "Comandos disponibles: info, login, validate, logout, all"
        echo "Usar '$0 -h' para ver ayuda completa"
        exit 1
        ;;
esac

exit $?