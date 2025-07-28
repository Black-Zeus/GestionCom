// ====================================
// FUNCIONALIDAD DEL LOGIN
// ====================================

// Toggle tema oscuro/claro
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Manejar envío del formulario
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Mostrar estado de carga
    loginButton.classList.add('loading');
    const buttonText = loginButton.querySelector('.button-text');
    const originalText = buttonText.textContent;
    buttonText.textContent = '';

    // Simular autenticación (reemplazar con llamada real a API)
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Éxito: mostrar mensaje y redirigir
        buttonText.textContent = '¡Acceso Concedido!';
        loginButton.style.background = 'linear-gradient(135deg, var(--success-500), var(--success-600))';

        setTimeout(() => {
            alert('¡Login exitoso! Redirigiendo al dashboard...');
            // Aquí harías la redirección real
            // window.location.href = '/dashboard';
        }, 1000);

    } catch (error) {
        // Error: mostrar mensaje
        buttonText.textContent = 'Error de acceso';
        loginButton.style.background = 'linear-gradient(135deg, var(--danger-500), var(--danger-600))';

        setTimeout(() => {
            buttonText.textContent = originalText;
            loginButton.style.background = 'linear-gradient(135deg, var(--primary-500), var(--primary-600))';
            loginButton.classList.remove('loading');
        }, 2000);
    }
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
});

// Animación de entrada escalonada
const formGroups = document.querySelectorAll('.form-group');
formGroups.forEach((group, index) => {
    group.style.animationDelay = `${0.1 + index * 0.1}s`;
});