#!/bin/bash

# ===========================================
# Simple Auth API Tester - FIXED VERSION
# Test de endpoints de autenticación - UNA SOLA PETICIÓN POR ENDPOINT
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
NC='\033[0m'

# ===========================================
# FUNCIONES UTILITARIAS
# ===========================================

show_help() {
    cat << EOF
Uso: $0 [OPCIONES] [COMANDO]

COMANDOS:
  all          Probar todos los endpoints (requiere -u y -p)
  info         GET /auth/ - Información del sistema
  health       GET /auth/health - Estado del sistema  
  requirements GET /auth/password-requirements - Requisitos de password
  strength     POST /auth/password-strength - Verificar fortaleza (requiere -p)
  login        POST /auth/login - Autenticar usuario (requiere -u y -p)
  validate     POST /auth/validate-token - Validar token (requiere -t)
  logout       POST /auth/logout - Cerrar sesión (requiere -t)

OPCIONES:
  -u USERNAME  Username o email para autenticación
  -p PASSWORD  Password para autenticación
  -t TOKEN     Token JWT para validación/logout
  -a URL       API base URL (default: http://localhost:8000/auth)
  -h           Mostrar esta ayuda

EJEMPLOS:
  $0 -h                                    # Mostrar ayuda
  $0 info                                  # Probar endpoint de info
  $0 health                                # Probar health check
  $0 -u admin -p admin123 login            # Probar login
  $0 -t "eyJ0eXAi..." validate             # Validar token
  $0 -u admin -p admin123 all              # Probar todos los endpoints
  $0 -a http://192.168.1.100:8000/auth health  # Usar otra URL

NOTAS:
  - Para 'all', 'login', 'strength' se requieren -u y -p
  - Para 'validate' y 'logout' se requiere -t
  - OPTIMIZADO: Una sola petición HTTP por endpoint
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

print_step() {
    echo -e "\n${YELLOW}🔸 $1${NC}"
}

# Extraer valor simple de JSON sin jq
extract_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*[^,}]*" | head -1 | sed 's/.*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Extraer booleano de JSON
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

# Verificar si la respuesta fue exitosa
check_success() {
    local response="$1"
    local success=$(extract_bool "$response" "success")
    if [[ "$success" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Función mejorada para hacer UNA SOLA petición y obtener tanto response como HTTP code
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    
    # Archivo temporal para guardar la respuesta completa
    local temp_file="/tmp/curl_complete_$"
    
    # Hacer UNA SOLA petición curl y capturar código HTTP + respuesta
    if [[ -n "$data" ]]; then
        # POST con datos
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        # GET sin datos
        local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$url" \
            -H "Content-Type: application/json")
    fi
    
    # Separar HTTP code y response body
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
}

# Función específica para logout que necesita Authorization header
make_request_with_auth() {
    local method="$1"
    local url="$2"
    local token="$3"
    
    # Hacer petición con Authorization header
    local full_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token")
    
    # Separar HTTP code y response body
    export HTTP_CODE=$(echo "$full_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    export RESPONSE_BODY=$(echo "$full_response" | sed 's/HTTPSTATUS:[0-9]*$//')
}

# ===========================================
# TESTS DE ENDPOINTS - VERSIÓN OPTIMIZADA
# ===========================================

test_info() {
    print_step "Probando GET /auth/ - Información del sistema"
    
    # UNA SOLA petición
    make_request "GET" "$API_URL/"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        print_success "Info endpoint funcionando correctamente"
        local version=$(extract_value "$RESPONSE_BODY" "version")
        print_info "Versión: $version"
        return 0
    else
        print_error "Info endpoint falló"
        return 1
    fi
}

test_health() {
    print_step "Probando GET /auth/health - Estado del sistema"
    
    # UNA SOLA petición
    make_request "GET" "$API_URL/health"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        print_success "Health check exitoso"
        return 0
    else
        print_error "Health check falló"
        return 1
    fi
}

test_password_requirements() {
    print_step "Probando GET /auth/password-requirements"
    
    # UNA SOLA petición
    make_request "GET" "$API_URL/password-requirements"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        print_success "Password requirements obtenidos"
        local min_length=$(extract_value "$RESPONSE_BODY" "min_length")
        print_info "Longitud mínima: $min_length caracteres"
        return 0
    else
        print_error "Password requirements falló"
        return 1
    fi
}

test_password_strength() {
    print_step "Probando POST /auth/password-strength"
    
    if [[ -z "$PASSWORD" ]]; then
        print_error "Se requiere password (-p) para test de fortaleza"
        return 1
    fi
    
    local payload="{\"password\": \"$PASSWORD\"}"
    
    # UNA SOLA petición
    make_request "POST" "$API_URL/password-strength" "$payload"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Payload: $payload"
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        print_success "Password strength verificado"
        local score=$(extract_value "$RESPONSE_BODY" "score")
        local is_valid=$(extract_bool "$RESPONSE_BODY" "is_valid")
        print_info "Score: $score/100, Válida: $is_valid"
        return 0
    else
        print_error "Password strength falló"
        return 1
    fi
}

test_login() {
    print_step "Probando POST /auth/login"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para login"
        return 1
    fi
    
    local payload="{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\", \"remember_me\": false}"
    
    # UNA SOLA petición
    make_request "POST" "$API_URL/login" "$payload"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Payload: $payload"
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        print_success "Login exitoso"
        
        # Extraer token
        local access_token=$(extract_value "$RESPONSE_BODY" "access_token")
        if [[ -n "$access_token" && "$access_token" != "null" ]]; then
            print_info "Access Token: ${access_token:0:50}..."
            
            # Guardar token para uso posterior
            echo "TOKEN=$access_token" > /tmp/auth_token_simple.env
            print_info "Token guardado en /tmp/auth_token_simple.env"
        fi
        
        local user_id=$(extract_value "$RESPONSE_BODY" "id")
        local username=$(extract_value "$RESPONSE_BODY" "username")
        print_info "Usuario: $username (ID: $user_id)"
        
        return 0
    else
        print_error "Login falló"
        return 1
    fi
}

test_validate_token() {
    print_step "Probando POST /auth/validate-token"
    
    # Si no hay token como parámetro, intentar cargar del archivo
    if [[ -z "$TOKEN" ]] && [[ -f /tmp/auth_token_simple.env ]]; then
        source /tmp/auth_token_simple.env
        print_info "Token cargado desde archivo temporal"
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para validación"
        return 1
    fi
    
    local payload="{\"token\": \"$TOKEN\"}"
    
    # UNA SOLA petición
    make_request "POST" "$API_URL/validate-token" "$payload"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Token: ${TOKEN:0:30}..."
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        local valid=$(extract_bool "$RESPONSE_BODY" "valid")
        local status=$(extract_value "$RESPONSE_BODY" "status")
        
        if [[ "$valid" == "true" ]]; then
            print_success "Token válido (status: $status)"
            return 0
        else
            print_error "Token inválido (status: $status)"
            return 1
        fi
    else
        print_error "Validate token falló"
        return 1
    fi
}

test_logout() {
    print_step "Probando POST /auth/logout"
    
    # Si no hay token como parámetro, intentar cargar del archivo
    if [[ -z "$TOKEN" ]] && [[ -f /tmp/auth_token_simple.env ]]; then
        source /tmp/auth_token_simple.env
        print_info "Token cargado desde archivo temporal"
    fi
    
    if [[ -z "$TOKEN" ]]; then
        print_error "Se requiere token (-t) para logout"
        return 1
    fi
    
    # UNA SOLA petición con Authorization header
    make_request_with_auth "POST" "$API_URL/logout" "$TOKEN"
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Token: ${TOKEN:0:30}..."
    echo "Response: $RESPONSE_BODY"
    
    if [[ "$HTTP_CODE" == "200" ]] && check_success "$RESPONSE_BODY"; then
        print_success "Logout exitoso"
        
        # Limpiar archivo temporal
        rm -f /tmp/auth_token_simple.env
        print_info "Token temporal eliminado"
        
        return 0
    else
        print_error "Logout falló"
        return 1
    fi
}

test_all() {
    print_step "EJECUTANDO TODOS LOS TESTS - VERSIÓN OPTIMIZADA"
    
    if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
        print_error "Se requieren username (-u) y password (-p) para test completo"
        return 1
    fi
    
    local success_count=0
    local total_count=7
    
    echo -e "\n${BLUE}=== INICIANDO BATERÍA DE TESTS (UNA PETICIÓN POR ENDPOINT) ===${NC}"
    
    # Test 1: Info
    if test_info; then
        ((success_count++))
    fi
    
    # Test 2: Health
    if test_health; then
        ((success_count++))
    fi
    
    # Test 3: Password Requirements
    if test_password_requirements; then
        ((success_count++))
    fi
    
    # Test 4: Password Strength
    if test_password_strength; then
        ((success_count++))
    fi
    
    # Test 5: Login
    if test_login; then
        ((success_count++))
        
        # Test 6: Validate Token (usando token del login)
        source /tmp/auth_token_simple.env 2>/dev/null || true
        if test_validate_token; then
            ((success_count++))
        fi
        
        # Test 7: Logout
        if test_logout; then
            ((success_count++))
        fi
    else
        print_error "Login falló - saltando tests que requieren token"
    fi
    
    # Resumen
    echo -e "\n${BLUE}=== RESUMEN DE TESTS ===${NC}"
    echo "Tests exitosos: $success_count/$total_count"
    echo "Peticiones HTTP totales: $total_count"
    
    if [[ $success_count -eq $total_count ]]; then
        print_success "TODOS LOS TESTS PASARON"
        return 0
    else
        print_error "ALGUNOS TESTS FALLARON ($((total_count - success_count)) fallos)"
        return 1
    fi
}

# ===========================================
# PROCESAMIENTO DE ARGUMENTOS
# ===========================================

# Procesar opciones
clear
while getopts "u:p:t:a:h" opt; do
    case $opt in
        u) USERNAME="$OPTARG" ;;
        p) PASSWORD="$OPTARG" ;;
        t) TOKEN="$OPTARG" ;;
        a) API_URL="$OPTARG" ;;
        h) show_help; exit 0 ;;
        *) echo "Opción inválida. Usar -h para ayuda."; exit 1 ;;
    esac
done

# Remover opciones procesadas
shift $((OPTIND-1))

# Obtener comando
COMMAND="${1:-help}"

# Verificar curl
if ! command -v curl &> /dev/null; then
    print_error "curl no está instalado. Instalar con: sudo apt-get install curl"
    exit 1
fi

# Mostrar configuración
echo -e "${BLUE}=== AUTH API TESTER - OPTIMIZADO ===${NC}"
echo "API URL: $API_URL"
echo "Username: ${USERNAME:-'no especificado'}"
echo "Password: ${PASSWORD:+'[OCULTO]'}"
echo "Token: ${TOKEN:0:20}${TOKEN:+...}"
echo "Comando: $COMMAND"

# ===========================================
# EJECUTAR COMANDO
# ===========================================

case "$COMMAND" in
    "info")
        test_info
        ;;
    "health")
        test_health
        ;;
    "requirements")
        test_password_requirements
        ;;
    "strength")
        test_password_strength
        ;;
    "login")
        test_login
        ;;
    "validate")
        test_validate_token
        ;;
    "logout")
        test_logout
        ;;
    "all")
        test_all
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "Comando desconocido: $COMMAND"
        echo "Usar '$0 -h' para ver ayuda"
        exit 1
        ;;
esac

exit $?