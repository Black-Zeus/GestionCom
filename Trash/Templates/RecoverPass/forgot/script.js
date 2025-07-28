// ====================================
// FUNCIONALIDAD DE RECUPERACIÓN DE CONTRASEÑA
// ====================================

// Toggle tema oscuro/claro
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Cargar tema guardado (simulado - en producción usar localStorage real)
let currentTheme = 'light'; // Simular localStorage
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    currentTheme = isDark ? 'dark' : 'light'; // Simular localStorage.setItem('theme', currentTheme);
});

// Manejar envío del formulario
const forgotForm = document.getElementById('forgotForm');
const forgotButton = document.getElementById('forgotButton');
const statusMessage = document.getElementById('statusMessage');
const emailInput = document.getElementById('email');

// Función para mostrar mensajes de estado
function showStatusMessage(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.add('show');

    // Auto-ocultar después de 5 segundos para mensajes de éxito
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 5000);
    }
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    // Validación básica
    if (!email) {
        showStatusMessage('Por favor, ingresa tu correo electrónico.', 'error');
        emailInput.focus();
        return;
    }

    if (!isValidEmail(email)) {
        showStatusMessage('Por favor, ingresa un correo electrónico válido.', 'error');
        emailInput.focus();
        return;
    }

    // Mostrar estado de carga
    forgotButton.classList.add('loading');
    const buttonText = forgotButton.querySelector('.button-text');
    const originalText = buttonText.textContent;
    buttonText.textContent = '';

    // Ocultar mensaje anterior si existe
    statusMessage.classList.remove('show');

    try {
        // Simular llamada a API de recuperación de contraseña
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Simular respuesta exitosa (en producción, manejar respuesta real de API)
        const success = Math.random() > 0.2; // 80% de éxito para demo

        if (success) {
            // Éxito: mostrar mensaje de confirmación
            buttonText.textContent = '¡Enviado!';
            forgotButton.style.background = 'linear-gradient(135deg, var(--success-500), var(--success-600))';

            setTimeout(() => {
                showStatusMessage(
                    `Se ha enviado un enlace de recuperación a ${email}. Revisa tu bandeja de entrada y spam.`,
                    'success'
                );

                // Deshabilitar el formulario temporalmente
                emailInput.disabled = true;
                forgotButton.disabled = true;

                // Cambiar texto del botón
                setTimeout(() => {
                    buttonText.textContent = 'Enlace Enviado ✓';
                }, 500);

                // Rehabilitar después de 30 segundos (simulando rate limiting)
                setTimeout(() => {
                    emailInput.disabled = false;
                    forgotButton.disabled = false;
                    buttonText.textContent = originalText;
                    forgotButton.style.background = 'linear-gradient(135deg, var(--primary-500), var(--primary-600))';
                    forgotButton.classList.remove('loading');
                }, 30000);

            }, 1000);

        } else {
            // Error: email no encontrado o error del servidor
            throw new Error('Email no encontrado');
        }

    } catch (error) {
        // Error: mostrar mensaje de error
        buttonText.textContent = 'Error al enviar';
        forgotButton.style.background = 'linear-gradient(135deg, var(--danger-500), var(--danger-600))';

        setTimeout(() => {
            if (error.message === 'Email no encontrado') {
                showStatusMessage(
                    'No se encontró una cuenta asociada a este correo electrónico. Verifica que sea correcto.',
                    'error'
                );
            } else {
                showStatusMessage(
                    'Hubo un error al enviar el enlace. Inténtalo nuevamente.',
                    'error'
                );
            }
        }, 500);

        setTimeout(() => {
            buttonText.textContent = originalText;
            forgotButton.style.background = 'linear-gradient(135deg, var(--primary-500), var(--primary-600))';
            forgotButton.classList.remove('loading');
        }, 3000);
    }
});

// Manejar botón "Volver al login"
const backToLogin = document.getElementById('backToLogin');
backToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    // En producción, redirigir a la página de login
    alert('Redirigiendo al login...');
    // window.location.href = '/login' o window.history.back();
});

// Efectos adicionales
const formInputs = document.querySelectorAll('.form-input');

formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
    });

    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
    });

    // Limpiar mensajes de error al escribir
    input.addEventListener('input', () => {
        if (statusMessage.classList.contains('error')) {
            statusMessage.classList.remove('show');
        }
    });
});

// Animación de entrada escalonada
const formGroups = document.querySelectorAll('.form-group');
formGroups.forEach((group, index) => {
    group.style.animationDelay = `${0.1 + index * 0.1}s`;
});

// Agregar efecto de typing/writing al subtítulo
const subtitle = document.querySelector('.forgot-subtitle');
const originalSubtitle = subtitle.textContent;
let typewriterTimeout;

function typewriterEffect() {
    subtitle.textContent = '';
    let i = 0;

    function typeNextChar() {
        if (i < originalSubtitle.length) {
            subtitle.textContent += originalSubtitle.charAt(i);
            i++;
            typewriterTimeout = setTimeout(typeNextChar, 30);
        }
    }

    setTimeout(typeNextChar, 800); // Empezar después de la animación de entrada
}

// Ejecutar efecto typewriter al cargar
typewriterEffect();

// Efecto de partículas en el ícono (opcional)
const forgotIcon = document.querySelector('.forgot-icon');
forgotIcon.addEventListener('mouseover', () => {
    forgotIcon.style.transform = 'scale(1.1) rotate(10deg)';
});

forgotIcon.addEventListener('mouseout', () => {
    forgotIcon.style.transform = 'scale(1) rotate(0deg)';
});

// Auto-focus en el campo de email al cargar la página
setTimeout(() => {
    emailInput.focus();
}, 1000);