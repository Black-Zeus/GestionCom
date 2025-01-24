-- Crear vista para obtener la información básica de los colaboradores junto con su rol
CREATE VIEW vw_colaboradores_roles AS
SELECT 
    c.id AS colaboradorId,
    c.nombre AS colaboradorNombre,
    c.rut,
    c.telefono,
    r.nombre AS rol
FROM 
    colaboradores c
JOIN 
    colaboradorRoles cr ON c.id = cr.colaboradorId
JOIN 
    roles r ON cr.rolId = r.id;

-- Crear vista para obtener la información de turnos asignados con el estado actual
CREATE VIEW vw_turnos_asignados AS
SELECT 
    ta.id AS turnoAsignadoId,
    ta.colaboradorID,
    ta.turnoId,
    t.nombre AS turnoNombre,
    ta.estadoActual,
    et.nombre AS estadoTurno,
    ta.assignedAt
FROM 
    turnoAsignado ta
JOIN 
    turno t ON ta.turnoId = t.id
JOIN 
    estadoTurno et ON ta.estadoActual = et.id;

-- Crear vista para obtener el historial de turnos con información completa
CREATE VIEW vw_historial_turnos AS
SELECT 
    ht.id AS historialId,
    ht.colaboradorID,
    ht.turnoId,
    t.nombre AS turnoNombre,
    ht.estadoId,
    et.nombre AS estadoTurno,
    ht.ubicacionId,
    u.nombre AS ubicacionNombre,
    ht.timestampAccion
FROM 
    historialTurnos ht
JOIN 
    turno t ON ht.turnoId = t.id
JOIN 
    estadoTurno et ON ht.estadoId = et.id
JOIN 
    ubicacion u ON ht.ubicacionId = u.id;

-- Crear vista para obtener las solicitudes con su estado y tipo de solicitud
CREATE VIEW vw_solicitudes_estado AS
SELECT 
    s.id AS solicitudId,
    s.solicitanteId,
    s.aprobadorId,
    ts.nombre AS tipoSolicitud,
    s.descripcion,
    s.estado AS estadoSolicitud,
    s.fechaCreacion,
    s.fechaResolucion,
    s.fechaInicio,
    s.fechaFin,
    s.motivoRechazo
FROM 
    solicitudes s
JOIN 
    tipoSolicitud ts ON s.tipoSolicitudId = ts.id;

-- Crear vista para obtener los formularios y su estado
CREATE VIEW vw_formularios_estado AS
SELECT 
    f.id AS formularioId,
    f.titulo,
    f.descripcion,
    f.imagenRuta,
    f.enlaceUrl,
    e.nombre AS empresaNombre,
    es.descripcion AS estadoFormulario
FROM 
    formularios f
JOIN 
    empresas e ON f.empresaId = e.id
JOIN 
    estado es ON f.estadoId = es.id;

-- Crear vista para obtener los recursos con su categoría
CREATE VIEW vw_recursos_categoria AS
SELECT 
    r.id AS recursoId,
    r.titulo,
    r.descripcion,
    r.archivoRuta,
    r.categoria,
    r.fechaSubida
FROM 
    recursos r;

-- Crear vista para obtener las liquidaciones con el nombre del colaborador
CREATE VIEW vw_liquidaciones_colaborador AS
SELECT 
    l.rut, 
    CONCAT(c.nombre, ' ', c.appaterno) AS nombre,
    c.email,
    l.periodo,
    CONCAT('$', REPLACE(FORMAT(l.salario, 0), ',', '.')) AS salary, 
    l.fileName 
FROM 
    liquidaciones l
JOIN 
    colaboradores c ON l.rut = c.rut;

-- Crear vista para obtener las empresas con su estado
CREATE VIEW vw_empresas_estado AS
SELECT 
    e.id AS empresaId,
    e.nombre AS empresaNombre,
    e.abreviado,
    e.imagenRuta,
    es.descripcion AS estadoEmpresa
FROM 
    empresas e
JOIN 
    estado es ON e.estadoId = es.id;

-- Crear vista para obtener la información de los colaboradores junto con el estado de su tipo de solicitud más reciente
CREATE VIEW vw_colaboradores_solicitudes_recientes AS
SELECT 
    c.id AS colaboradorId,
    c.nombre AS colaboradorNombre,
    s.id AS solicitudId,
    ts.nombre AS tipoSolicitud,
    s.estado AS estadoSolicitud,
    s.fechaCreacion
FROM 
    colaboradores c
JOIN 
    solicitudes s ON c.id = s.solicitanteId
JOIN 
    tipoSolicitud ts ON s.tipoSolicitudId = ts.id
WHERE 
    s.fechaCreacion = (SELECT MAX(fechaCreacion) FROM solicitudes WHERE solicitanteId = c.id);

-- Crear vista para obtener el estado de los colaboradores, incluyendo el turno asignado y su última actualización
CREATE VIEW vw_estado_colaboradores AS
SELECT
    c.id AS id_colaborador,
    c.nombre,
    c.appaterno,
    c.apmaterno,
    c.email,
    ta.estadoActual AS id_estado,
    et.nombre AS estado_nombre,
    ta.assignedAt AS turno_asignado,
    MAX(ht.timestampAccion) AS ultima_actualizacion
FROM
    colaboradores c
LEFT JOIN
    turnoAsignado ta ON c.id = ta.colaboradorID
LEFT JOIN
    historialTurnos ht ON c.id = ht.colaboradorID
LEFT JOIN
    estadoTurno et ON ta.estadoActual = et.id
GROUP BY
    c.id;

