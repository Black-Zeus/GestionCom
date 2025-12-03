class ProfessionalModalSystem {
    constructor() {
        this.overlay = document.getElementById('modalOverlay');
        this.modal = document.getElementById('modalContent');
        this.title = document.getElementById('modalTitle');
        this.body = document.getElementById('modalBody');
        this.footer = document.getElementById('modalFooter');
        this.wizardStep = 0;
        this.progressValue = 0;
    }

    show(type) {
        // Reset modal size
        this.modal.className = 'modal medium';
        
        switch(type) {
            case 'info':
                this.showInfo();
                break;
            case 'confirm':
                this.showConfirm();
                break;
            case 'success':
                this.showSuccess();
                break;
            case 'warning':
                this.showWarning();
                break;
            case 'error':
                this.showError();
                break;
            case 'notification':
                this.showNotification();
                return; // No abrir modal para notificaciones
            case 'form':
                this.showForm();
                break;
            case 'image':
                this.showImage();
                break;
            case 'video':
                this.showVideo();
                break;
            case 'loading':
                this.showLoading();
                break;
            case 'wizard':
                this.showWizard();
                break;
            case 'gallery':
                this.showGallery();
                break;
            case 'search':
                this.showSearch();
                break;
            case 'datatable':
                this.showDataTable();
                break;
            case 'calendar':
                this.showCalendar();
                break;
            case 'login':
                this.showLogin();
                break;
            case 'filemanager':
                this.showFileManager();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'help':
                this.showHelp();
                break;
            case 'custom':
                this.showCustom();
                break;
        }
        
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset after animation
        setTimeout(() => {
            this.modal.className = 'modal medium';
            this.wizardStep = 0;
        }, 200);
    }

    showInfo() {
        this.title.textContent = 'Información del Sistema';
        this.body.innerHTML = `
            <div class="alert alert-info">
                <strong>Información importante:</strong> El sistema realizará una actualización programada el próximo martes a las 02:00 AM.
            </div>
            <p>Durante este período, los servicios estarán temporalmente no disponibles. La actualización incluye mejoras de seguridad y nuevas funcionalidades.</p>
            <p>Tiempo estimado de inactividad: <strong>30 minutos</strong></p>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
        `;
    }

    showConfirm() {
        this.title.textContent = 'Confirmar Acción';
        this.body.innerHTML = `
            <p>¿Está seguro de que desea eliminar este elemento?</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">Esta acción no se puede deshacer. Todos los datos asociados se perderán permanentemente.</p>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cancelar</button>
            <button class="btn btn-danger" onclick="confirmDelete()">Eliminar</button>
        `;
    }

    showSuccess() {
        this.title.textContent = 'Operación Completada';
        this.body.innerHTML = `
            <div class="alert alert-success">
                <strong>Éxito:</strong> La operación se ha completado correctamente.
            </div>
            <p>Los cambios han sido guardados y aplicados al sistema. Puede continuar con su trabajo normalmente.</p>
        `;
        this.footer.innerHTML = `
            <button class="btn btn-primary" onclick="modalSystem.close()">Continuar</button>
        `;
    }

    showWarning() {
        this.title.textContent = 'Advertencia de Seguridad';
        this.body.innerHTML = `
            <div class="alert alert-warning">
                <strong>Atención:</strong> Se ha detectado un intento de acceso no autorizado.
            </div>
            <p>Por motivos de seguridad, recomendamos cambiar su contraseña inmediatamente.</p>
            <p><strong>Ubicación del intento:</strong> Madrid, España<br>
            <strong>Fecha y hora:</strong> 27 Jul 2025, 14:32</p>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Revisar Más Tarde</button>
            <button class="btn btn-warning" onclick="changePassword()">Cambiar Contraseña</button>
        `;
    }

    showError() {
        this.title.textContent = 'Error del Sistema';
        this.body.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> No se pudo completar la operación solicitada.
            </div>
            <p>Ha ocurrido un error inesperado. El equipo técnico ha sido notificado automáticamente.</p>
            <details style="margin-top: 16px;">
                <summary style="cursor: pointer; color: #6b7280;">Detalles técnicos</summary>
                <pre style="background: #f9fafb; padding: 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; color: #4b5563;">Error Code: ERR_500_INTERNAL
Connection timeout after 30s
Timestamp: 2025-07-27T14:32:15Z</pre>
            </details>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="retryOperation()">Reintentar</button>
        `;
    }

    showNotification() {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <svg style="width: 24px; height: 24px; color: #3b82f6;" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                </svg>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #374151;">Nueva notificación</div>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 2px;">Su solicitud ha sido procesada correctamente</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 18px;">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    showForm() {
        this.title.textContent = 'Configuración de Usuario';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <form id="userForm">
                <div class="form-group">
                    <label class="form-label">Nombre completo</label>
                    <input type="text" class="form-input" placeholder="Ingrese su nombre completo" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Correo electrónico</label>
                    <input type="email" class="form-input" placeholder="usuario@empresa.com" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Departamento</label>
                    <select class="form-input" required>
                        <option value="">Seleccione un departamento</option>
                        <option value="desarrollo">Desarrollo</option>
                        <option value="marketing">Marketing</option>
                        <option value="ventas">Ventas</option>
                        <option value="soporte">Soporte</option>
                        <option value="rrhh">Recursos Humanos</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Notas adicionales</label>
                    <textarea class="form-input" rows="3" placeholder="Información adicional (opcional)"></textarea>
                </div>
            </form>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cancelar</button>
            <button class="btn btn-primary" onclick="saveUserForm()">Guardar</button>
        `;
    }

    showImage() {
        this.title.textContent = 'Vista Previa de Archivo';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 100%; height: 300px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
                    <div>
                        <svg style="width: 48px; height: 48px; margin-bottom: 12px;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                        </svg>
                        <div>documento-ejemplo.pdf</div>
                        <small style="opacity: 0.7;">1.2 MB • 1920x1080</small>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div style="text-align: left;">
                        <div style="font-weight: 500; color: #374151;">documento-ejemplo.pdf</div>
                        <div style="font-size: 12px; color: #6b7280;">Subido el 27 Jul 2025 • 1.2 MB</div>
                    </div>
                    <button class="btn btn-primary" onclick="downloadFile()">Descargar</button>
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
        `;
    }

    showVideo() {
        this.title.textContent = 'Reproductor Multimedia';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div>
                <div class="video-container">
                    <div style="text-align: center;">
                        <svg style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.7;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </svg>
                        <div>Video Tutorial - Configuración Inicial</div>
                        <small style="opacity: 0.7;">Duración: 05:23</small>
                    </div>
                </div>
                <div class="video-controls">
                    <button class="btn btn-primary" onclick="playVideo()">
                        <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </svg>
                        Reproducir
                    </button>
                    <button class="btn" onclick="pauseVideo()">
                        <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/>
                        </svg>
                        Pausar
                    </button>
                    <button class="btn" onclick="stopVideo()">
                        <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z"/>
                        </svg>
                        Detener
                    </button>
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
        `;
    }

    showLoading() {
        this.title.textContent = 'Procesando Solicitud';
        this.modal.className = 'modal small';
        this.body.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <div style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="margin-bottom: 8px; font-weight: 500; color: #374151;">Procesando información...</p>
                <p style="font-size: 14px; color: #6b7280;">Por favor espere mientras completamos su solicitud</p>
                
                <div class="progress-container" style="margin-top: 20px;">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <p id="progressText" style="font-size: 12px; color: #6b7280; margin-top: 8px;">0%</p>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="cancelLoading()">Cancelar</button>
        `;
        
        this.simulateProgress();
    }

    showWizard() {
        this.title.textContent = 'Asistente de Configuración';
        this.modal.className = 'modal large';
        this.wizardStep = 0;
        this.renderWizardStep();
    }

    renderWizardStep() {
        const steps = ['Información Básica', 'Configuración', 'Revisión'];
        const stepContent = [
            `<div class="form-group">
                <label class="form-label">Nombre del Proyecto</label>
                <input type="text" class="form-input" placeholder="Ingrese el nombre del proyecto" value="Proyecto Demo">
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea class="form-input" rows="3" placeholder="Breve descripción del proyecto">Sistema de gestión empresarial para optimizar procesos internos</textarea>
            </div>`,
            
            `<div class="form-group">
                <label class="form-label">Tipo de Implementación</label>
                <select class="form-input">
                    <option>Aplicación Web</option>
                    <option>Sistema Desktop</option>
                    <option>Aplicación Móvil</option>
                    <option>API Backend</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Framework Tecnológico</label>
                <select class="form-input">
                    <option>React + Node.js</option>
                    <option>Vue.js + Express</option>
                    <option>Angular + .NET</option>
                    <option>Laravel + PHP</option>
                </select>
            </div>`,
            
            `<div>
                <h4 style="margin-bottom: 16px; color: #374151;">Resumen de Configuración</h4>
                <div style="background: #f9fafb; padding: 20px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Proyecto:</span>
                            <span style="font-weight: 500;">Proyecto Demo</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Tipo:</span>
                            <span style="font-weight: 500;">Aplicación Web</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Framework:</span>
                            <span style="font-weight: 500;">React + Node.js</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">Estado:</span>
                            <span style="color: #10b981; font-weight: 500;">Listo para implementar</span>
                        </div>
                    </div>
                </div>
                <div class="alert alert-info" style="margin-top: 16px;">
                    <strong>Confirmación:</strong> Revise la configuración antes de continuar. Una vez confirmado, se iniciará el proceso de implementación.
                </div>
            </div>`
        ];

        this.body.innerHTML = `
            <div class="wizard-steps">
                ${steps.map((step, index) => `
                    <div class="wizard-step ${index === this.wizardStep ? 'active' : ''} ${index < this.wizardStep ? 'completed' : ''}">
                        <div class="step-circle">${index < this.wizardStep ? '✓' : index + 1}</div>
                        <div class="step-label">${step}</div>
                    </div>
                `).join('')}
            </div>
            <div>
                ${stepContent[this.wizardStep]}
            </div>
        `;

        this.footer.innerHTML = `
            ${this.wizardStep > 0 ? '<button class="btn" onclick="wizardPrevious()">← Anterior</button>' : ''}
            <button class="btn" onclick="modalSystem.close()">Cancelar</button>
            ${this.wizardStep < steps.length - 1 ? 
                '<button class="btn btn-primary" onclick="wizardNext()">Siguiente →</button>' : 
                '<button class="btn btn-success" onclick="wizardComplete()">Finalizar</button>'
            }
        `;
    }

    showGallery() {
        this.title.textContent = 'Biblioteca de Recursos';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <p style="color: #6b7280; font-size: 14px;">Seleccione un archivo de la biblioteca</p>
                    <button class="btn btn-primary" onclick="uploadFile()">
                        <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 001.09 1.03L9.25 4.636v8.614z"/>
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.25 2.25 0 004.25 17.5h11.5A2.25 2.25 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .414-.336.75-.75.75H4.25a.75.75 0 01-.75-.75v-2.5z"/>
                        </svg>
                        Subir Archivo
                    </button>
                </div>
                <div class="gallery-container">
                    ${Array.from({length: 12}, (_, i) => `
                        <div class="gallery-item" onclick="selectGalleryItem(${i + 1})">
                            <div style="text-align: center;">
                                <svg style="width: 24px; height: 24px; margin-bottom: 4px;" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                                </svg>
                                <div style="font-size: 10px;">IMG_${String(i + 1).padStart(3, '0')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="selectAllItems()">Seleccionar Todo</button>
        `;
    }

    showSearch() {
        this.title.textContent = 'Búsqueda Avanzada';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Buscar</label>
                <div style="position: relative;">
                    <input type="text" class="form-input" placeholder="Ingrese términos de búsqueda..." style="padding-right: 40px;">
                    <svg style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #6b7280;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
                    </svg>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                    <label class="form-label">Categoría</label>
                    <select class="form-input">
                        <option>Todas las categorías</option>
                        <option>Documentos</option>
                        <option>Imágenes</option>
                        <option>Videos</option>
                        <option>Usuarios</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha</label>
                    <select class="form-input">
                        <option>Cualquier fecha</option>
                        <option>Última semana</option>
                        <option>Último mes</option>
                        <option>Último año</option>
                    </select>
                </div>
            </div>
            <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-top: 16px;">
                <h4 style="margin-bottom: 12px; color: #374151;">Resultados recientes:</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">📄 Documento_Proyecto_2025.pdf</div>
                    <div style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">🖼️ imagen_presentacion.jpg</div>
                    <div style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb;">👤 Usuario: Maria Rodriguez</div>
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="performSearch()">Buscar</button>
        `;
    }

    showDataTable() {
        this.title.textContent = 'Gestión de Usuarios';
        this.modal.className = 'modal xlarge';
        this.body.innerHTML = `
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <input type="text" class="form-input" placeholder="Filtrar usuarios..." style="width: 300px; margin: 0;">
                </div>
                <button class="btn btn-primary" onclick="addNewUser()">
                    <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
                    </svg>
                    Nuevo Usuario
                </button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Departamento</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>001</td>
                        <td>Juan Pérez</td>
                        <td>juan.perez@empresa.com</td>
                        <td>Desarrollo</td>
                        <td><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Activo</span></td>
                        <td>
                            <button class="btn" style="padding: 4px 8px; margin-right: 4px;">Editar</button>
                            <button class="btn btn-danger" style="padding: 4px 8px;">Eliminar</button>
                        </td>
                    </tr>
                    <tr>
                        <td>003</td>
                        <td>Carlos Silva</td>
                        <td>carlos.silva@empresa.com</td>
                        <td>Ventas</td>
                        <td><span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Inactivo</span></td>
                        <td>
                            <button class="btn" style="padding: 4px 8px; margin-right: 4px;">Editar</button>
                            <button class="btn btn-danger" style="padding: 4px 8px;">Eliminar</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="exportData()">Exportar</button>
        `;
    }

    showCalendar() {
        this.title.textContent = 'Calendario de Eventos';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #374151;">Julio 2025</h3>
                <div style="display: flex; justify-content: center; gap: 16px; margin-top: 12px;">
                    <button class="btn" onclick="previousMonth()">← Anterior</button>
                    <button class="btn btn-primary" onclick="goToToday()">Hoy</button>
                    <button class="btn" onclick="nextMonth()">Siguiente →</button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e5e7eb; border-radius: 6px; overflow: hidden;">
                ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => 
                    `<div style="background: #f9fafb; padding: 12px; text-align: center; font-weight: 600; color: #374151;">${day}</div>`
                ).join('')}
                ${Array.from({length: 35}, (_, i) => {
                    const day = i - 5; // Simulando que el mes empieza en martes
                    const isCurrentMonth = day > 0 && day <= 31;
                    const isToday = day === 27;
                    const hasEvent = [15, 20, 27].includes(day);
                    
                    return `<div style="background: white; padding: 12px; min-height: 60px; position: relative; ${isCurrentMonth ? '' : 'opacity: 0.3;'}">
                        ${isCurrentMonth ? `
                            <div style="font-weight: ${isToday ? '600' : '400'}; color: ${isToday ? '#3b82f6' : '#374151'};">${day}</div>
                            ${hasEvent ? '<div style="background: #3b82f6; color: white; font-size: 10px; padding: 2px 4px; border-radius: 2px; margin-top: 4px;">Evento</div>' : ''}
                        ` : ''}
                    </div>`;
                }).join('')}
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="addEvent()">Nuevo Evento</button>
        `;
    }

    showLogin() {
        this.title.textContent = 'Iniciar Sesión';
        this.modal.className = 'modal medium';
        this.body.innerHTML = `
            <form id="loginForm">
                <div class="form-group">
                    <label class="form-label">Usuario o Email</label>
                    <input type="text" class="form-input" placeholder="usuario@empresa.com" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Contraseña</label>
                    <input type="password" class="form-input" placeholder="••••••••" required>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" style="margin: 0;">
                        <span style="font-size: 14px; color: #6b7280;">Recordarme</span>
                    </label>
                    <a href="#" style="font-size: 14px; color: #3b82f6; text-decoration: none;">¿Olvidaste tu contraseña?</a>
                </div>
            </form>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
                <p style="text-align: center; font-size: 14px; color: #6b7280;">
                    ¿No tienes cuenta? <a href="#" style="color: #3b82f6; text-decoration: none;">Regístrate aquí</a>
                </p>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cancelar</button>
            <button class="btn btn-primary" onclick="performLogin()">Iniciar Sesión</button>
        `;
    }

    showFileManager() {
        this.title.textContent = 'Gestor de Archivos';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn" onclick="goBack()">← Atrás</button>
                    <span style="color: #6b7280; font-size: 14px;">/documentos/proyectos/</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn" onclick="createFolder()">📁 Nueva Carpeta</button>
                    <button class="btn btn-primary" onclick="uploadFiles()">⬆️ Subir Archivos</button>
                </div>
            </div>
            <div style="background: #f9fafb; border-radius: 6px; padding: 16px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;">
                    ${[
                        { name: 'Proyecto 2025', type: 'folder', icon: '📁' },
                        { name: 'Imágenes', type: 'folder', icon: '📁' },
                        { name: 'documento.pdf', type: 'file', icon: '📄' },
                        { name: 'presentacion.pptx', type: 'file', icon: '📊' },
                        { name: 'imagen.jpg', type: 'file', icon: '🖼️' },
                        { name: 'video.mp4', type: 'file', icon: '🎬' }
                    ].map(item => `
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.15s ease;" 
                             onmouseover="this.style.background='#f3f4f6'" 
                             onmouseout="this.style.background='white'"
                             onclick="selectFile('${item.name}')">
                            <div style="font-size: 32px; margin-bottom: 8px;">${item.icon}</div>
                            <div style="font-size: 12px; color: #374151; word-break: break-word;">${item.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 14px; color: #1e40af;">
                    <strong>Espacio utilizado:</strong> 2.3 GB de 10 GB disponibles
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="managePermissions()">Gestionar Permisos</button>
        `;
    }

    showSettings() {
        this.title.textContent = 'Configuración del Sistema';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 24px;">
                <div style="border-right: 1px solid #e5e7eb; padding-right: 16px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn" style="justify-content: flex-start;" onclick="showSettingsTab('general')">⚙️ General</button>
                        <button class="btn" style="justify-content: flex-start;" onclick="showSettingsTab('security')">🔒 Seguridad</button>
                        <button class="btn" style="justify-content: flex-start;" onclick="showSettingsTab('notifications')">🔔 Notificaciones</button>
                        <button class="btn" style="justify-content: flex-start;" onclick="showSettingsTab('appearance')">🎨 Apariencia</button>
                    </div>
                </div>
                <div id="settingsContent">
                    <h4 style="margin-bottom: 16px; color: #374151;">Configuración General</h4>
                    <div class="form-group">
                        <label class="form-label">Idioma del sistema</label>
                        <select class="form-input">
                            <option>Español</option>
                            <option>English</option>
                            <option>Français</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Zona horaria</label>
                        <select class="form-input">
                            <option>UTC-3 (Santiago)</option>
                            <option>UTC-5 (Lima)</option>
                            <option>UTC+1 (Madrid)</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 6px; margin: 16px 0;">
                        <div>
                            <div style="font-weight: 500; color: #374151;">Actualizaciones automáticas</div>
                            <div style="font-size: 14px; color: #6b7280;">Instalar actualizaciones de seguridad automáticamente</div>
                        </div>
                        <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
                            <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #3b82f6; border-radius: 24px; transition: 0.3s;"></span>
                            <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; transform: translateX(20px);"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cancelar</button>
            <button class="btn btn-primary" onclick="saveSettings()">Guardar Cambios</button>
        `;
    }

    showHelp() {
        this.title.textContent = 'Centro de Ayuda';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="position: relative;">
                    <input type="text" class="form-input" placeholder="¿En qué podemos ayudarte?" style="padding-right: 40px;">
                    <svg style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #6b7280;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
                    </svg>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: #f9fafb; padding: 16px; border-radius: 6px; cursor: pointer;" onclick="showHelpSection('getting-started')">
                    <div style="font-size: 24px; margin-bottom: 8px;">🚀</div>
                    <h4 style="color: #374151; margin-bottom: 4px;">Primeros Pasos</h4>
                    <p style="font-size: 14px; color: #6b7280;">Aprende lo básico para comenzar</p>
                </div>
                <div style="background: #f9fafb; padding: 16px; border-radius: 6px; cursor: pointer;" onclick="showHelpSection('tutorials')">
                    <div style="font-size: 24px; margin-bottom: 8px;">📚</div>
                    <h4 style="color: #374151; margin-bottom: 4px;">Tutoriales</h4>
                    <p style="font-size: 14px; color: #6b7280;">Guías paso a paso detalladas</p>
                </div>
                <div style="background: #f9fafb; padding: 16px; border-radius: 6px; cursor: pointer;" onclick="showHelpSection('faq')">
                    <div style="font-size: 24px; margin-bottom: 8px;">❓</div>
                    <h4 style="color: #374151; margin-bottom: 4px;">Preguntas Frecuentes</h4>
                    <p style="font-size: 14px; color: #6b7280;">Respuestas a dudas comunes</p>
                </div>
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                <h4 style="margin-bottom: 12px; color: #374151;">Artículos Populares</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <a href="#" style="text-decoration: none; color: #3b82f6; font-size: 14px;">• Cómo crear un nuevo proyecto</a>
                    <a href="#" style="text-decoration: none; color: #3b82f6; font-size: 14px;">• Gestión de usuarios y permisos</a>
                    <a href="#" style="text-decoration: none; color: #3b82f6; font-size: 14px;">• Configuración de notificaciones</a>
                    <a href="#" style="text-decoration: none; color: #3b82f6; font-size: 14px;">• Solución de problemas comunes</a>
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-primary" onclick="contactSupport()">Contactar Soporte</button>
        `;
    }

    showCustom() {
        this.title.textContent = 'Modal Personalizado';
        this.modal.className = 'modal large';
        this.body.innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 40px; height: 40px; color: white;" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                </div>
                <h3 style="color: #374151; margin-bottom: 16px;">¡Modal Completamente Personalizable!</h3>
                <p style="color: #6b7280; margin-bottom: 24px;">Este modal demuestra las capacidades de personalización del sistema. Puedes configurar:</p>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; text-align: left; margin: 20px 0;">
                    <h4 style="color: #374151; margin-bottom: 12px;">Características personalizables:</h4>
                    <ul style="color: #6b7280; line-height: 1.8;">
                        <li>Tamaños de modal (small, medium, large, xlarge)</li>
                        <li>Contenido HTML completamente flexible</li>
                        <li>Botones personalizados con diferentes estilos</li>
                        <li>Animaciones y transiciones suaves</li>
                        <li>Integración con formularios y validaciones</li>
                        <li>Soporte para multimedia y contenido interactivo</li>
                    </ul>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 20px 0;">
                    <div style="background: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                        <div style="font-weight: 600; color: #1e40af;">Fácil de usar</div>
                        <div style="font-size: 14px; color: #3730a3; margin-top: 4px;">API simple e intuitiva</div>
                    </div>
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; border-left: 4px solid #10b981;">
                        <div style="font-weight: 600; color: #065f46;">Responsive</div>
                        <div style="font-size: 14px; color: #047857; margin-top: 4px;">Funciona en todos los dispositivos</div>
                    </div>
                    <div style="background: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        <div style="font-weight: 600; color: #92400e;">Accesible</div>
                        <div style="font-size: 14px; color: #b45309; margin-top: 4px;">Navegación por teclado y ARIA</div>
                    </div>
                </div>
            </div>
        `;
        this.footer.innerHTML = `
            <button class="btn btn-secondary" onclick="modalSystem.close()">Cerrar</button>
            <button class="btn btn-warning" onclick="showAdvancedOptions()">Opciones Avanzadas</button>
            <button class="btn btn-primary" onclick="createCustomModal()">Crear Modal</button>
        `;
    }

    simulateProgress() {
        this.progressValue = 0;
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        const interval = setInterval(() => {
            this.progressValue += Math.random() * 15;
            if (this.progressValue >= 100) {
                this.progressValue = 100;
                clearInterval(interval);
                setTimeout(() => {
                    this.showSuccess();
                }, 500);
            }
            
            if (progressBar && progressText) {
                progressBar.style.width = this.progressValue + '%';
                progressText.textContent = Math.round(this.progressValue) + '%';
            }
        }, 300);
    }
}

// Inicializar el sistema de modales
const modalSystem = new ProfessionalModalSystem();

// Función principal para mostrar modales
function showModal(type) {
    modalSystem.show(type);
}

// Función para cerrar modales
function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    modalSystem.close();
}

// Funciones específicas de modales
function confirmDelete() {
    alert('Elemento eliminado correctamente');
    modalSystem.close();
}

function changePassword() {
    alert('Redirigiendo a cambio de contraseña...');
    modalSystem.close();
}

function retryOperation() {
    alert('Reintentando operación...');
    modalSystem.close();
}

function saveUserForm() {
    const form = document.getElementById('userForm');
    if (form.checkValidity()) {
        alert('Configuración guardada correctamente');
        modalSystem.close();
    } else {
        alert('Por favor complete todos los campos obligatorios');
    }
}

function downloadFile() {
    alert('Iniciando descarga del archivo...');
}

function playVideo() {
    alert('Reproduciendo video...');
}

function pauseVideo() {
    alert('Video pausado');
}

function stopVideo() {
    alert('Video detenido');
}

function cancelLoading() {
    alert('Operación cancelada por el usuario');
    modalSystem.close();
}

function wizardNext() {
    if (modalSystem.wizardStep < 2) {
        modalSystem.wizardStep++;
        modalSystem.renderWizardStep();
    }
}

function wizardPrevious() {
    if (modalSystem.wizardStep > 0) {
        modalSystem.wizardStep--;
        modalSystem.renderWizardStep();
    }
}

function wizardComplete() {
    alert('Configuración completada exitosamente');
    modalSystem.close();
}

function selectGalleryItem(index) {
    alert(`Archivo IMG_${String(index).padStart(3, '0')} seleccionado`);
}

function uploadFile() {
    alert('Abriendo selector de archivos...');
}

function selectAllItems() {
    alert('Todos los elementos seleccionados');
}

function performSearch() {
    alert('Ejecutando búsqueda...');
}

function addNewUser() {
    alert('Abriendo formulario de nuevo usuario...');
}

function exportData() {
    alert('Exportando datos...');
}

function previousMonth() {
    alert('Navegando al mes anterior...');
}

function nextMonth() {
    alert('Navegando al mes siguiente...');
}

function goToToday() {
    alert('Navegando a hoy...');
}

function addEvent() {
    alert('Creando nuevo evento...');
}

function performLogin() {
    const form = document.getElementById('loginForm');
    if (form.checkValidity()) {
        alert('Iniciando sesión...');
        modalSystem.close();
    } else {
        alert('Por favor complete todos los campos');
    }
}

function selectFile(filename) {
    alert(`Archivo seleccionado: ${filename}`);
}

function goBack() {
    alert('Navegando hacia atrás...');
}

function createFolder() {
    alert('Creando nueva carpeta...');
}

function uploadFiles() {
    alert('Subiendo archivos...');
}

function managePermissions() {
    alert('Gestionando permisos...');
}

function showSettingsTab(tab) {
    alert(`Mostrando configuración: ${tab}`);
}

function saveSettings() {
    alert('Configuración guardada');
    modalSystem.close();
}

function showHelpSection(section) {
    alert(`Mostrando sección de ayuda: ${section}`);
}

function contactSupport() {
    alert('Contactando con soporte técnico...');
}

function showAdvancedOptions() {
    alert('Mostrando opciones avanzadas...');
}

function createCustomModal() {
    alert('Creando modal personalizado...');
}

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        modalSystem.close();
    }
});

// Prevenir el cierre del modal al hacer clic dentro del contenido
document.addEventListener('DOMContentLoaded', function() {
    const modalContent = document.getElementById('modalContent');
    if (modalContent) {
        modalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
}); 