
// ====================================
// FUNCIONALIDAD DE CAMBIO DE CONTRASEÑA
// ====================================

// Toggle tema oscuro/claro
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
let currentTheme = 'light';

if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    currentTheme = isDark ? 'dark' : 'light';
});

// ====================================
// MANEJO DE CÓDIGOS DE VERIFICACIÓN
// ====================================
const codeInputs = document.querySelectorAll('.code-input');
const resetForm = document.getElementById('resetForm');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');

// Función para mostrar mensajes de estado
function showStatusMessage(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.add('show');

    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 5000);
    }
}

// Manejo de inputs de código
codeInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value;

        if (value) {
            e.target.classList.add('filled');
            // Auto-focus al siguiente input
            if (index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        } else {
            e.target.classList.remove('filled');
        }

        checkFormValidity();
    });

    input.addEventListener('keydown', (e) => {
        // Backspace - ir al input anterior si está vacío
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            codeInputs[index - 1].focus();
        }

        // Arrows navigation
        if (e.key === 'ArrowLeft' && index > 0) {
            codeInputs[index - 1].focus();
        }
        if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }

        // Clear on new number
        if (/[0-9]/.test(e.key) && e.target.value) {
            e.target.value = '';
        }
    });

    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');

        if (pastedData.length === 8) {
            codeInputs.forEach((input, i) => {
                if (i < pastedData.length) {
                    input.value = pastedData[i];
                    input.classList.add('filled');
                }
            });
            checkFormValidity();
        }
    });

    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
    });

    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
    });
});

// ====================================
// MANEJO DE CONTRASEÑAS
// ====================================
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordStrength = document.getElementById('passwordStrength');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const targetInput = document.getElementById(targetId);

        if (targetInput.type === 'password') {
            targetInput.type = 'text';
            button.textContent = '🙈';
        } else {
            targetInput.type = 'password';
            button.textContent = '👁️';
        }
    });
});

// Validación de fortaleza de contraseña
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score++;
    else feedback.push('mínimo 8 caracteres');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('minúsculas');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('mayúsculas');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('números');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('símbolos');

    let strength = 'weak';
    let text = 'Muy débil';

    if (score >= 2) {
        strength = 'fair';
        text = 'Débil';
    }
    if (score >= 3) {
        strength = 'good';
        text = 'Buena';
    }
    if (score >= 4) {
        strength = 'strong';
        text = 'Fuerte';
    }

    return { strength, text, score, feedback };
}

newPasswordInput.addEventListener('input', (e) => {
    const password = e.target.value;

    if (password) {
        passwordStrength.classList.add('show');
        const result = checkPasswordStrength(password);

        strengthFill.className = `strength-fill ${result.strength}`;
        strengthText.className = `strength-text ${result.strength}`;
        strengthText.textContent = result.text;
    } else {
        passwordStrength.classList.remove('show');
    }

    checkFormValidity();
});

confirmPasswordInput.addEventListener('input', checkFormValidity);

// ====================================
// VALIDACIÓN DEL FORMULARIO
// ====================================
function checkFormValidity() {
    const codeComplete = Array.from(codeInputs).every(input => input.value);
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
    const passwordStrong = newPassword.length >= 8;

    // Update confirm password styling
    if (confirmPassword) {
        if (passwordsMatch) {
            confirmPasswordInput.style.borderColor = 'var(--success-500)';
            document.getElementById('confirmHelp').style.color = 'var(--success-500)';
            document.getElementById('confirmHelp').textContent = 'Las contraseñas coinciden ✓';
        } else {
            confirmPasswordInput.style.borderColor = 'var(--danger-500)';
            document.getElementById('confirmHelp').style.color = 'var(--danger-500)';
            document.getElementById('confirmHelp').textContent = 'Las contraseñas no coinciden';
        }
    } else {
        confirmPasswordInput.style.borderColor = '';
        document.getElementById('confirmHelp').style.color = 'var(--text-muted)';
        document.getElementById('confirmHelp').textContent = 'Las contraseñas deben coincidir';
    }

    const isValid = codeComplete && passwordStrong && passwordsMatch;
    resetButton.disabled = !isValid;

    if (isValid) {
        resetButton.style.opacity = '1';
        resetButton.style.cursor = 'pointer';
    } else {
        resetButton.style.opacity = '0.6';
        resetButton.style.cursor = 'not-allowed';
    }
}

// ====================================
// ENVÍO DEL FORMULARIO
// ====================================
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = Array.from(codeInputs).map(input => input.value).join('');
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validaciones finales
    if (code.length !== 8) {
        showStatusMessage('Por favor, ingresa el código completo de 8 dígitos.', 'error');
        codeInputs[0].focus();
        return;
    }

    if (newPassword !== confirmPassword) {
        showStatusMessage('Las contraseñas no coinciden.', 'error');
        confirmPasswordInput.focus();
        return;
    }

    if (newPassword.length < 8) {
        showStatusMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
        newPasswordInput.focus();
        return;
    }

    // Mostrar estado de carga
    resetButton.classList.add('loading');
    const buttonText = resetButton.querySelector('.button-text');
    const originalText = buttonText.textContent;
    buttonText.textContent = '';

    statusMessage.classList.remove('show');

    try {
        // Simular llamada a API
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simular validación del código (90% de éxito para demo)
        const success = Math.random() > 0.1;

        if (success) {
            // Éxito
            buttonText.textContent = '¡Contraseña Cambiada!';
            resetButton.style.background = 'linear-gradient(135deg, var(--success-500), var(--success-600))';

            setTimeout(() => {
                showStatusMessage(
                    '¡Tu contraseña ha sido cambiada exitosamente! Serás redirigido al login.',
                    'success'
                );

                // Deshabilitar formulario
                codeInputs.forEach(input => input.disabled = true);
                newPasswordInput.disabled = true;
                confirmPasswordInput.disabled = true;
                resetButton.disabled = true;

                // Simular redirección después de 3 segundos
                setTimeout(() => {
                    alert('Redirigiendo al login...');
                    // window.location.href = '/login';
                }, 3000);

            }, 1000);

        } else {
            // Error: código inválido
            throw new Error('Código inválido');
        }

    } catch (error) {
        buttonText.textContent = 'Error al cambiar';
        resetButton.style.background = 'linear-gradient(135deg, var(--danger-500), var(--danger-600))';

        setTimeout(() => {
            if (error.message === 'Código inválido') {
                showStatusMessage(
                    'El código ingresado no es válido o ha expirado. Verifica el código o solicita uno nuevo.',
                    'error'
                );
                // Limpiar código para intentar de nuevo
                codeInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled');
                });
                codeInputs[0].focus();
            } else {
                showStatusMessage(
                    'Hubo un error al cambiar la contraseña. Inténtalo nuevamente.',
                    'error'
                );
            }
        }, 500);

        setTimeout(() => {
            buttonText.textContent = originalText;
            resetButton.style.background = 'linear-gradient(135deg, var(--primary-500), var(--primary-600))';
            resetButton.classList.remove('loading');
            checkFormValidity();
        }, 3000);
    }
});

// ====================================
// NAVEGACIÓN
// ====================================
const backToLogin = document.getElementById('backToLogin');
backToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Redirigiendo al login...');
    // window.location.href = '/login';
});

// ====================================
// INICIALIZACIÓN
// ====================================
// Auto-focus en el primer campo de código
setTimeout(() => {
    codeInputs[0].focus();
}, 1000);

// Efectos adicionales
const formInputs = document.querySelectorAll('.form-input');
formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
    });

    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
    });
});