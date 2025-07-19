"""
volumes/backend-api/core/password_manager.py
Sistema de gestión de contraseñas con bcrypt integrado a tu arquitectura
"""
import re
import secrets
import bcrypt
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from .exceptions import ValidationException, SystemException
from .constants import ErrorCode


class PasswordStrengthResult:
    """Resultado de validación de fortaleza de contraseña"""
    
    def __init__(
        self,
        is_valid: bool,
        score: int,
        errors: list = None,
        suggestions: list = None
    ):
        self.is_valid = is_valid
        self.score = score  # 0-100
        self.errors = errors or []
        self.suggestions = suggestions or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "score": self.score,
            "errors": self.errors,
            "suggestions": self.suggestions
        }


class PasswordManager:
    """
    Manejador de contraseñas con bcrypt integrado a tu sistema
    """
    
    # ==========================================
    # CONFIGURACIÓN
    # ==========================================
    
    # Configuración bcrypt
    BCRYPT_ROUNDS = 12  # Aumenta según capacidad del servidor
    
    # Reglas de contraseña
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    
    # Patrones de validación
    PATTERNS = {
        'lowercase': re.compile(r'[a-z]'),
        'uppercase': re.compile(r'[A-Z]'),
        'digit': re.compile(r'\d'),
        'special': re.compile(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\?]'),
        'space': re.compile(r'\s'),
        'common_sequences': [
            '123456', 'password', 'qwerty', 'abc123', 'admin',
            '000000', '111111', 'iloveyou', 'welcome', 'monkey'
        ]
    }
    
    @classmethod
    def hash_password(cls, password: str) -> str:
        """
        Crear hash bcrypt de contraseña
        
        Args:
            password: Contraseña en texto plano
            
        Returns:
            Hash bcrypt como string
            
        Raises:
            ValidationException: Si la contraseña no es válida
            SystemException: Si hay error en el proceso de hash
        """
        # Validar contraseña antes de hacer hash
        validation_result = cls.validate_password_strength(password)
        if not validation_result.is_valid:
            mensajes = validation_result.errors + validation_result.suggestions
            raise ValidationException(
                message=mensajes,
                error_code=ErrorCode.VALIDATION_PASSWORD_WEAK,
                details=f"{validation_result.score} - {validation_result.errors} - {validation_result.suggestions}"
            )
        
        try:
            # Convertir a bytes si es necesario
            if isinstance(password, str):
                password_bytes = password.encode('utf-8')
            else:
                password_bytes = password
            
            # Generar salt y hash
            salt = bcrypt.gensalt(rounds=cls.BCRYPT_ROUNDS)
            password_hash = bcrypt.hashpw(password_bytes, salt)
            
            # Retornar como string
            return password_hash.decode('utf-8')
            
        except Exception as e:
            raise SystemException(
                message="Error al procesar contraseña",
                details=f"Error interno en hash: {str(e)}"
            )
    
    @classmethod
    def verify_password(cls, password: str, password_hash: str) -> bool:
        """
        Verificar contraseña contra hash bcrypt
        
        Args:
            password: Contraseña en texto plano
            password_hash: Hash bcrypt guardado en BD
            
        Returns:
            True si la contraseña coincide, False si no
            
        Raises:
            SystemException: Si hay error en el proceso de verificación
        """
        try:
            # Validar inputs
            if not password or not password_hash:
                return False
            
            # Convertir a bytes si es necesario
            if isinstance(password, str):
                password_bytes = password.encode('utf-8')
            else:
                password_bytes = password
                
            if isinstance(password_hash, str):
                hash_bytes = password_hash.encode('utf-8')
            else:
                hash_bytes = password_hash
            
            # Verificar con bcrypt
            return bcrypt.checkpw(password_bytes, hash_bytes)
            
        except Exception as e:
            raise SystemException(
                message="Error al verificar contraseña",
                details=f"Error interno en verificación: {str(e)}"
            )
    
    @classmethod
    def validate_password_strength(cls, password: str) -> PasswordStrengthResult:
        """
        Validar fortaleza de contraseña según reglas de seguridad
        
        Args:
            password: Contraseña a validar
            
        Returns:
            PasswordStrengthResult con detalles de validación
        """
        errors = []
        suggestions = []
        score = 0
        
        if not password:
            return PasswordStrengthResult(
                is_valid=False,
                score=0,
                errors=["Contraseña es requerida"],
                suggestions=["Ingrese una contraseña válida"]
            )
        
        # ==========================================
        # VALIDACIONES BÁSICAS
        # ==========================================
        
        # Longitud
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Debe tener al menos {cls.MIN_LENGTH} caracteres")
            suggestions.append("Aumente la longitud de la contraseña")
        elif len(password) >= cls.MIN_LENGTH:
            score += 20
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"No puede exceder {cls.MAX_LENGTH} caracteres")
        
        # ==========================================
        # VALIDACIONES DE COMPOSICIÓN
        # ==========================================
        
        # Minúsculas
        if not cls.PATTERNS['lowercase'].search(password):
            errors.append("Debe contener al menos una letra minúscula")
            suggestions.append("Agregue letras minúsculas (a-z)")
        else:
            score += 15
        
        # Mayúsculas
        if not cls.PATTERNS['uppercase'].search(password):
            errors.append("Debe contener al menos una letra mayúscula")
            suggestions.append("Agregue letras mayúsculas (A-Z)")
        else:
            score += 15
        
        # Números
        if not cls.PATTERNS['digit'].search(password):
            errors.append("Debe contener al menos un número")
            suggestions.append("Agregue números (0-9)")
        else:
            score += 15
        
        # Caracteres especiales
        if not cls.PATTERNS['special'].search(password):
            errors.append("Debe contener al menos un carácter especial")
            suggestions.append("Agregue caracteres especiales (!@#$%^&*)")
        else:
            score += 15
        
        # ==========================================
        # VALIDACIONES DE SEGURIDAD AVANZADA
        # ==========================================
        
        # Espacios en blanco
        if cls.PATTERNS['space'].search(password):
            errors.append("No debe contener espacios en blanco")
            suggestions.append("Remueva los espacios en blanco")
        
        # Contraseñas comunes
        password_lower = password.lower()
        for common in cls.PATTERNS['common_sequences']:
            if common in password_lower:
                errors.append("No debe contener secuencias comunes")
                suggestions.append("Evite contraseñas predecibles")
                break
        
        # Repetición de caracteres
        if cls._has_repeated_chars(password):
            errors.append("Evite repetir el mismo carácter muchas veces")
            suggestions.append("Use variedad de caracteres")
        
        # Secuencias numéricas o alfabéticas
        if cls._has_sequences(password):
            errors.append("Evite secuencias como 123 o abc")
            suggestions.append("Use combinaciones aleatorias")
        
        # ==========================================
        # BONIFICACIONES POR COMPLEJIDAD
        # ==========================================
        
        # Longitud extra
        if len(password) >= 12:
            score += 10
        if len(password) >= 16:
            score += 10
        
        # Variedad de caracteres
        unique_chars = len(set(password))
        if unique_chars >= len(password) * 0.7:  # 70% de caracteres únicos
            score += 10
        
        # Determinar si es válida
        is_valid = len(errors) == 0
        
        return PasswordStrengthResult(
            is_valid=is_valid,
            score=min(score, 100),
            errors=errors,
            suggestions=suggestions
        )
    
    @classmethod
    def generate_secure_password(
        cls,
        length: int = 16,
        include_symbols: bool = True,
        exclude_ambiguous: bool = True
    ) -> str:
        """
        Generar contraseña segura aleatoria
        
        Args:
            length: Longitud de la contraseña (mínimo 8)
            include_symbols: Si incluir símbolos especiales
            exclude_ambiguous: Si excluir caracteres ambiguos (0, O, l, I)
            
        Returns:
            Contraseña segura generada
        """
        if length < cls.MIN_LENGTH:
            length = cls.MIN_LENGTH
        
        # Definir conjuntos de caracteres
        lowercase = 'abcdefghijklmnopqrstuvwxyz'
        uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        digits = '0123456789'
        symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        
        # Excluir caracteres ambiguos si se requiere
        if exclude_ambiguous:
            lowercase = lowercase.replace('l', '')
            uppercase = uppercase.replace('O', '').replace('I', '')
            digits = digits.replace('0', '')
        
        # Construir conjunto de caracteres
        charset = lowercase + uppercase + digits
        if include_symbols:
            charset += symbols
        
        # Generar contraseña asegurando diversidad
        password = []
        
        # Garantizar al menos un carácter de cada tipo
        password.append(secrets.choice(lowercase))
        password.append(secrets.choice(uppercase))
        password.append(secrets.choice(digits))
        
        if include_symbols:
            password.append(secrets.choice(symbols))
        
        # Llenar el resto aleatoriamente
        remaining_length = length - len(password)
        for _ in range(remaining_length):
            password.append(secrets.choice(charset))
        
        # Mezclar la contraseña
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)
    
    @classmethod
    def is_password_expired(
        cls,
        password_changed_at: Optional[datetime],
        max_age_days: int = 90
    ) -> bool:
        """
        Verificar si una contraseña ha expirado
        
        Args:
            password_changed_at: Fecha del último cambio de contraseña
            max_age_days: Días máximos antes de considerar expirada
            
        Returns:
            True si la contraseña ha expirado
        """
        if not password_changed_at:
            return True  # Si no hay fecha, considerar expirada
        
        now = datetime.now(timezone.utc)
        
        # Manejar fechas naive
        if password_changed_at.tzinfo is None:
            password_changed_at = password_changed_at.replace(tzinfo=timezone.utc)
        
        expiry_date = password_changed_at + timedelta(days=max_age_days)
        return now > expiry_date
    
    @classmethod
    def get_password_requirements(cls) -> Dict[str, Any]:
        """
        Obtener requisitos de contraseña para mostrar al usuario
        
        Returns:
            Diccionario con los requisitos de contraseña
        """
        return {
            "min_length": cls.MIN_LENGTH,
            "max_length": cls.MAX_LENGTH,
            "requirements": [
                "Al menos una letra minúscula (a-z)",
                "Al menos una letra mayúscula (A-Z)",
                "Al menos un número (0-9)",
                "Al menos un carácter especial (!@#$%^&*)",
                "Sin espacios en blanco",
                "Evitar contraseñas comunes",
                "Evitar secuencias obvias (123, abc)"
            ],
            "suggestions": [
                "Use 12+ caracteres para mayor seguridad",
                "Combine palabras con números y símbolos",
                "Use una frase memorable modificada",
                "Considere usar un gestor de contraseñas"
            ]
        }
    
    # ==========================================
    # MÉTODOS PRIVADOS DE UTILIDAD
    # ==========================================
    
    @classmethod
    def _has_repeated_chars(cls, password: str, max_repeat: int = 3) -> bool:
        """Verificar si tiene muchos caracteres repetidos consecutivos"""
        count = 1
        for i in range(1, len(password)):
            if password[i] == password[i-1]:
                count += 1
                if count >= max_repeat:
                    return True
            else:
                count = 1
        return False
    
    @classmethod
    def _has_sequences(cls, password: str, min_sequence: int = 3) -> bool:
        """Verificar si tiene secuencias numéricas o alfabéticas"""
        password = password.lower()
        
        for i in range(len(password) - min_sequence + 1):
            # Verificar secuencia numérica
            if password[i:i+min_sequence].isdigit():
                nums = [int(c) for c in password[i:i+min_sequence]]
                if all(nums[j] == nums[j-1] + 1 for j in range(1, len(nums))):
                    return True
                if all(nums[j] == nums[j-1] - 1 for j in range(1, len(nums))):
                    return True
            
            # Verificar secuencia alfabética
            if password[i:i+min_sequence].isalpha():
                chars = [ord(c) for c in password[i:i+min_sequence]]
                if all(chars[j] == chars[j-1] + 1 for j in range(1, len(chars))):
                    return True
                if all(chars[j] == chars[j-1] - 1 for j in range(1, len(chars))):
                    return True
        
        return False


# ==========================================
# FUNCIONES DE UTILIDAD PARA TU APLICACIÓN
# ==========================================

def hash_user_password(password: str) -> str:
    """
    Función de conveniencia para hashear contraseña de usuario
    Integrada con tu sistema de excepciones
    """
    return PasswordManager.hash_password(password)


def verify_user_password(password: str, password_hash: str) -> bool:
    """
    Función de conveniencia para verificar contraseña de usuario
    """
    return PasswordManager.verify_password(password, password_hash)


def validate_user_password(password: str) -> PasswordStrengthResult:
    """
    Función de conveniencia para validar contraseña de usuario
    """
    return PasswordManager.validate_password_strength(password)


# ==========================================
# INTEGRACIÓN CON TU MODELO USER
# ==========================================

def update_user_password_hash(user_model, new_password: str) -> None:
    """
    Actualizar hash de contraseña en modelo de usuario
    
    Args:
        user_model: Instancia del modelo User de SQLAlchemy
        new_password: Nueva contraseña en texto plano
    """
    # Validar y hashear nueva contraseña
    password_hash = hash_user_password(new_password)
    
    # Actualizar modelo
    user_model.password_hash = password_hash
    user_model.password_changed_at = datetime.now(timezone.utc)
    
    # Nota: El commit debe hacerse en el servicio que llama esta función


def check_user_password(user_model, password: str) -> bool:
    """
    Verificar contraseña contra modelo de usuario
    
    Args:
        user_model: Instancia del modelo User de SQLAlchemy
        password: Contraseña a verificar
        
    Returns:
        True si la contraseña es correcta
    """
    if not user_model or not user_model.password_hash:
        return False
    
    return verify_user_password(password, user_model.password_hash)