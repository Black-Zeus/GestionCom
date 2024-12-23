## Convenciones de Commit (Conventional Commits)

### 1. **feat** (Feature)
- **Uso:** Añade una nueva característica o funcionalidad.  
- **Impacto:** Aumenta la versión menor (`minor`) en SemVer.  
- **Ejemplo:**
  ```bash
  feat: Añadir autenticación con JWT
  ```

---

### 2. **fix** (Bug Fix)
- **Uso:** Corrige un error o bug.  
- **Impacto:** Aumenta la versión de parche (`patch`) en SemVer.  
- **Ejemplo:**
  ```bash
  fix: Corregir error en la validación del formulario de login
  ```

---

### 3. **refactor** (Refactoring)
- **Uso:** Modifica el código para mejorar su estructura sin cambiar la funcionalidad.  
- **Impacto:** No afecta la lógica del proyecto ni corrige bugs.  
- **Ejemplo:**
  ```bash
  refactor: Simplificar lógica de cálculo de impuestos
  ```

---

### 4. **docs** (Documentation)
- **Uso:** Actualiza o agrega documentación.  
- **Impacto:** No afecta el código fuente.  
- **Ejemplo:**
  ```bash
  docs: Actualizar README con nuevas instrucciones de despliegue
  ```

---

### 5. **style** (Styling)
- **Uso:** Cambios relacionados con formato (indentación, espacios, comas) sin afectar la lógica.  
- **Impacto:** No afecta la funcionalidad.  
- **Ejemplo:**
  ```bash
  style: Formatear archivo main.py según PEP8
  ```

---

### 6. **test** (Testing)
- **Uso:** Añade o actualiza pruebas (unitarias, de integración).  
- **Impacto:** No afecta la funcionalidad.  
- **Ejemplo:**
  ```bash
  test: Agregar pruebas unitarias para el módulo de usuarios
  ```

---

### 7. **build** (Build System)
- **Uso:** Cambios que afectan el sistema de compilación o herramientas externas (npm, pip, docker).  
- **Impacto:** Relacionado con infraestructura, no con lógica.  
- **Ejemplo:**
  ```bash
  build: Actualizar Dockerfile para usar Python 3.11
  ```

---

### 8. **ci** (Continuous Integration)
- **Uso:** Cambios en configuraciones de CI/CD (GitHub Actions, GitLab CI).  
- **Impacto:** No afecta el código fuente.  
- **Ejemplo:**
  ```bash
  ci: Agregar job de linting en GitHub Actions
  ```

---

### 9. **chore** (Maintenance)
- **Uso:** Tareas de mantenimiento, actualización de dependencias, etc.  
- **Impacto:** No afecta la funcionalidad.  
- **Ejemplo:**
  ```bash
  chore: Actualizar dependencias de npm
  ```

---

### 10. **perf** (Performance)
- **Uso:** Mejoras de rendimiento o optimización.  
- **Impacto:** Puede cambiar la implementación pero sin alterar la funcionalidad.  
- **Ejemplo:**
  ```bash
  perf: Optimizar consulta SQL para mejorar tiempos de respuesta
  ```

---

### 11. **revert** (Reversiones)
- **Uso:** Revertir un cambio anterior.  
- **Ejemplo:**
  ```bash
  revert: Revertir commit abc123 por error en despliegue
  ```

---

### 12. **BREAKING CHANGE** (Cambios Críticos)
- **Uso:** Indica que el cambio no es retrocompatible y puede romper implementaciones anteriores.  
- **Impacto:** Aumenta la versión mayor (`major`) en SemVer.  
- **Ejemplo:**
  ```bash
  feat: Refactor completo del sistema de autenticación
  BREAKING CHANGE: La autenticación ahora requiere tokens JWT
  ```

---

### Ejemplo Completo:
```bash
feat: Añadir API de pagos
- Se implementa un endpoint para procesar pagos con tarjeta.
- Se añade validación de campos y manejo de errores.
- La respuesta incluye el ID de la transacción.

BREAKING CHANGE: Se requiere una nueva clave en el archivo .env para procesar pagos.
```