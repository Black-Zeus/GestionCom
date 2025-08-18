#!/bin/bash

# Script para resetear Git y crear nueva rama de trabajo
# Uso: ./git-reset-and-branch.sh <nombre-de-la-rama>

set -e  # Salir si algún comando falla

# Verificar que se proporcionó el nombre de la rama
if [ $# -eq 0 ]; then
    echo "❌ Error: Debes proporcionar el nombre de la nueva rama"
    echo "Uso: $0 <nombre-de-la-rama>"
    echo "Ejemplo: $0 feat/admin-users"
    exit 1
fi

NUEVA_RAMA="$1"

# Función para mostrar mensajes con colores
print_step() {
    echo "🔄 $1"
}

print_success() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
}

echo "🚀 Iniciando reset de Git y creación de nueva rama: $NUEVA_RAMA"
echo "=================================================="

# 1) Actualizar referencias
print_step "Paso 1: Actualizando referencias..."
git fetch origin --prune
print_success "Referencias actualizadas"

# 2) Ir a main y traer lo último
print_step "Paso 2: Cambiando a main y actualizando..."
git checkout main
git pull --ff-only origin main
print_success "Branch main actualizada"

# 3) Eliminar TODAS las demás ramas locales (excepto main)
print_step "Paso 3: Eliminando todas las ramas locales (excepto main)..."
RAMAS_A_ELIMINAR=$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v '^main$' || true)

if [ -n "$RAMAS_A_ELIMINAR" ]; then
    echo "$RAMAS_A_ELIMINAR" | while read -r rama; do
        if [ -n "$rama" ]; then
            echo "  🗑️  Eliminando rama: $rama"
            git branch -D "$rama" 2>/dev/null || print_warning "No se pudo eliminar la rama: $rama"
        fi
    done
    print_success "Ramas locales eliminadas"
else
    print_success "No hay ramas adicionales para eliminar"
fi

# 4) Limpiar ramas remotas obsoletas
print_step "Paso 4: Limpiando ramas remotas obsoletas..."
git remote prune origin
print_success "Ramas remotas obsoletas limpiadas"

# 5) Crear la nueva rama de trabajo
print_step "Paso 5: Creando nueva rama '$NUEVA_RAMA'..."
git checkout -b "$NUEVA_RAMA"
print_success "Nueva rama '$NUEVA_RAMA' creada"

# 6) Subir y establecer tracking
print_step "Paso 6: Subiendo rama y estableciendo tracking..."
git push -u origin "$NUEVA_RAMA"
print_success "Rama subida y tracking establecido"

echo ""
echo "🎉 ¡Proceso completado exitosamente!"
echo "📍 Ahora estás en la rama: $NUEVA_RAMA"
echo "🔗 Tracking configurado con: origin/$NUEVA_RAMA"
echo ""
echo "Resumen de lo realizado:"
echo "- ✅ Referencias actualizadas"
echo "- ✅ Main actualizado"
echo "- ✅ Ramas locales limpiadas"
echo "- ✅ Ramas remotas limpiadas"
echo "- ✅ Nueva rama '$NUEVA_RAMA' creada y sincronizada"