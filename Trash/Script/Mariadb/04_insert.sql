INSERT INTO estado (descripcion, grupo) VALUES
('Vigente', 'General'),
('No Vigente', 'General');


INSERT INTO recursos (titulo, descripcion, archivoRuta, categoria, estadoId) VALUES 
('Reglamento Interno de Higiene y Seguridad', 'Este reglamento establece las normas básicas para garantizar la seguridad y salud de los trabajador...', 'resources/reglamento_higiene_y_seguridad.pdf', 'Reglamentos', 1),
('Implementos de Seguridad', 'La empresa proporciona los siguientes implementos de seguridad:\n- Cascos de protección\n- Guantes resis...', 'resources/implementos_seguridad.pdf', 'Recursos', 1),
('Información sobre Riesgos y Medidas Preventivas', 'Los principales riesgos en las instalaciones incluyen:\n- Riesgos eléctricos\n- Riesgos por caídas\n- Ex...', 'resources/informacion_riesgos_y_medidas.pdf', 'Riesgos', 1),
('Reglamento General de Convivencia y Ambiente Laboral', 'Este reglamento fomenta un ambiente de respeto y colaboración:\n- Prohibida la discriminación de cualqu...', 'resources/reglamento_convivencia.pdf', 'Reglamentos', 1),
('Manual de Usuario', 'Este manual proporciona a los colaboradores las instrucciones necesarias para utilizar los sistemas y ...', 'resources/manual_usuario.pdf', 'Manuales', 1),
('Política de Privacidad', 'Este documento detalla las prácticas de la empresa en relación con la recopilación, uso y protección d...', 'resources/politica_privacidad.pdf', 'Politicas', 1);


-- Datos de prueba para EMPRESAS
INSERT INTO empresas (nombre, abreviado, imagenRuta, estadoId) VALUES
('Tecnocomp', 'TC', 'images/logo_tc.png', 1),
('Generadora Metropolitana', 'GM', 'images/gm_logo.png', 1),
('GoldFields', 'GF', 'images/gf_logo.svg', 1);

-- Datos de prueba para FORMULARIOS
INSERT INTO formularios (titulo, descripcion, imagenRuta, enlaceUrl, empresaId) VALUES
('E.S. GM', 'Revisión estado de servicios en GM.', 'images/forms_logo.png', 'https://forms.office.com/r/gTD1Rx6rMn', 2),
('E.S. Stgo', 'Vuelta diaria sobre estado de servicios en Santiago.', 'images/forms_logo.png', 'https://forms.office.com/r/HaK0bdps04', 3),
('E.S. Salares - Barrio Cívico', 'Vuelta diaria sobre estado de servicios en Barrio Cívico.', 'images/forms_logo.png', 'https://forms.office.com/r/vS9x1SjVXR', 3),
('E.S. Salares - Campamento', 'Vuelta diaria sobre estado de servicios en Campamento.', 'images/forms_logo.png', 'https://forms.office.com/r/2g5j6jY57g', 3),
('Saldos Redvoiss', 'Formulario respaldo para saldos redvoiss.', 'images/forms_logo.png', 'https://forms.office.com/r/ZFp2b4FXXk', 1);

-- Insertar datos en las tablas
INSERT INTO tipoSolicitud (nombre, descripcion, estadoId) VALUES
('Vacaciones', 'Solicitud para ausentarse durante un período determinado por vacaciones', 1),
('Permiso por Paternidad', 'Solicitud de permiso por nacimiento o adopcion de un hijo', 1),
('Permiso por Matrimonio', 'Solicitud de permiso por celebracion de matrimonio', 1),
('Permiso de Estudios', 'Solicitud para ausentarse por actividades relacionadas con estudios o examenes', 1),
('Permiso por Fallecimiento', 'Solicitud para ausentarse debido al fallecimiento de un familiar cercano', 1),
('Solicitud de Vehículo terreno', 'Solicitud de asignación vehículo para gestión en terreno', 1),
('Insumos', 'Solicitud de asignación de insumos para propósitos específicos.', 1),
('Cambio de Turno', 'Solicitud para realizar un cambio en el turno de trabajo', 1);

INSERT INTO turno (nombre, descripcion) VALUES 
('Turno 1', '08:00 a 17:00'),
('Turno 2', '09:00 a 18:00'),
('Turno 3', '10:00 a 19:00');

INSERT INTO roles (nombre, estadoId) VALUES
('Administrador', 1),
('Aprobador', 1),
('Usuario', 1);

INSERT INTO estadoTurno (nombre, estadoId) VALUES
('Operativo', 1),
('En colacion', 1),
('Fuera de turno', 1),
('Fin colacion', 1);

INSERT INTO ubicacion (nombre, estadoId) VALUES
('Oficina', 1),
('Remoto', 1),
('Terreno', 1);

INSERT INTO afectoTurno (descripcion, estadoId) VALUES 
('AFECTO A TURNO', 1),
('NO AFECTO A TURNO', 1);


INSERT INTO colaboradores (rut, nombre, apPaterno, apMaterno, email, fechaNacimiento, cargo, rolId, estadoId, afectoTurnoId) VALUES
('13029666-1','Alejandro', 'Quinteros', 'Ferrer', 'aquinteros@tecnocomp.cl', '1976-01-20', 'CEO', 2, 1, 2),
('15385993-0','Oscar', 'Quinteros', 'Ferrer', 'oquinteros@tecnocomp.cl', '1973-02-26', 'Gerente Admin y Finanzas', 2, 1, 2),
('15485168-2','Alex', 'Quinteros', 'Ferrer', 'arquinteros@tecnocomp.cl', '1982-09-27', 'Sys Admin JPV', 2, 1, 2),
('15567450-4','Victor', 'Soto', 'Soto', 'vsoto@tecnocomp.cl', '1985-08-13', 'Programacion y Seguridad RED', 1, 1, 2),
('18397789-K','Jorge', 'Torres', 'Ibaceta', 'jtorres@tecnocomp.cl', '1993-01-07', 'Tecnico Soporte Faena Copiapo', 2, 1, 1),
('20015324-3','Gaspar', 'Villarroel', 'Nunez', 'gvillarroel@tecnocomp.cl', '1999-04-24', 'Tecnico Soporte Faena Copiapo', 2, 1, 1),
('19702791-6','Kevin', 'Venegas', 'Martinez', 'kvenegas@tecnocomp.cl', '1990-03-04', 'SYS Admin Generadora', 2, 1, 2),
('20034696-3','Osvaldo', 'Blanco', 'Molina', 'oblanco@tecnocomp.cl', '1998-10-30', 'Soporte Mesa de Ayuda TC', 2, 1, 1),
('20127581-4','Ricardo', 'Marquez', 'Villegas', 'rmarquez@tecnocomp.cl', '1998-11-30', 'Soporte Mesa de Ayuda TC', 2, 1, 1),
('07870522-1','John', 'Swaneck', 'Galleguillos', 'jswaneck@tecnocomp.cl', '1966-06-05', 'Coordinador Golfields TC', 2, 1, 2),
('20915704-7','Claudio', 'Morales', 'Alday', 'cmorales@tecnocomp.cl', '2001-06-21', 'Tecnico Soporte Faena Copiapo', 2, 1, 1),
('20035756-6','Diego', 'Tabali', 'Rojas', 'dtabali@tecnocomp.cl', '1998-10-14', 'Tecnico Soporte Faena Copiapo', 2, 1, 1),
('12215789-K','Juan', 'Munoz', 'Espinoza', 'jmunoz@tecnocomp.cl', '1972-05-25', 'Tecnico Soporte Faena Copiapo', 2, 1, 1),
('22034000-7','Felipe', 'Quinteros', 'Castillo', 'fquinteros@tecnocomp.cl', '1998-08-25', 'Soporte BackOffice GM', 2, 1, 1),
('20496526-9','Ignacio', 'Grumi', 'Duran', 'igrumi@tecnocomp.cl', '2000-09-29', 'Desarrollo y Programacion', 1, 1, 1),
('17667151-3','Marcelo', 'Astudillo', 'San Martin', 'mastudillo@tecnocomp.cl', '1991-04-13', 'Soporte BackOffice Tecnocomp', 2, 1, 2),
('20128690-5','Nicolas', 'Ranilao', 'Hidalgo', 'nranilao@tecnocomp.cl', '1999-01-21', 'Soporte Mesa de Ayuda TC', 2, 1, 1),
('21735360-2','David', 'Quezada', 'Daza', 'dquezada@tecnocomp.cl', '2004-12-20', 'Soporte Mesa de Ayuda TC', 2, 1, 1),
('20245504-2','Patricio', 'Quinteros', 'Castillo', 'pquinteros@tecnocomp.cl', '1990-07-30', 'Tecnico Soporte Faena Copiapo', 2, 1, 2);
