CREATE TABLE `estado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(15) NOT NULL,
  `grupo` varchar(50) NOT NULL DEFAULT 'General',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `empresas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `abreviado` varchar(10) NOT NULL,
  `imagenRuta` varchar(255) DEFAULT NULL,
  `estadoId` int DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `abreviado` (`abreviado`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `empresas_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `afectoTurno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(255) NOT NULL,
  `estadoId` int NOT NULL,  -- Columna de clave foránea
  PRIMARY KEY (`id`),
  KEY `estadoId` (`estadoId`),  -- Índice sobre la columna `estadoId`
  CONSTRAINT `afectoTurno_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `estadoTurno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `estadoId` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `estadoturno_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `formularios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `imagenRuta` varchar(255) DEFAULT 'forms_logo.png',
  `enlaceUrl` varchar(255) NOT NULL,
  `empresaId` int NOT NULL,
  `estadoId` int DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `empresaId` (`empresaId`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `formularios_ibfk_1` FOREIGN KEY (`empresaId`) REFERENCES `empresas` (`id`) ,
  CONSTRAINT `formularios_ibfk_2` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `recursos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `archivoRuta` varchar(255) NOT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `fechaSubida` datetime DEFAULT current_timestamp(),
  `estadoId` int DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `recursos_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `estadoId` int NOT NULL,  -- Agregar columna `estadoId`
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `estadoId` (`estadoId`),  -- Índice sobre `estadoId`
  CONSTRAINT `roles_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tipoSolicitud` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estadoId` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `tiposolicitud_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `turno` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estadoId` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `turno_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ubicacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `estadoId` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `estadoId` (`estadoId`),
  CONSTRAINT `ubicacion_ibfk_1` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `colaboradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) NOT NULL,
  `nombre` varchar(150) DEFAULT NULL,
  `apPaterno` varchar(50) DEFAULT NULL,
  `apMaterno` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fechaNacimiento` datetime DEFAULT current_timestamp(),
  `cargo` varchar(50) DEFAULT NULL,
  `rolId` int DEFAULT NULL,
  `fechaCreacion` datetime DEFAULT current_timestamp(),
  `estadoId` int NOT NULL DEFAULT 1,
  `fechaCodificacion` datetime DEFAULT current_timestamp(),
  `afectoTurnoId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rut` (`rut`),
  KEY `rolId` (`rolId`),
  KEY `estadoId` (`estadoId`),
  KEY `afectoTurnoId` (`afectoTurnoId`),
  CONSTRAINT `colaboradores_ibfk_1` FOREIGN KEY (`rolId`) REFERENCES `roles` (`id`) ,
  CONSTRAINT `colaboradores_ibfk_2` FOREIGN KEY (`estadoId`) REFERENCES `estado` (`id`),
  CONSTRAINT `colaboradores_ibfk_3` FOREIGN KEY (`afectoTurnoId`) REFERENCES `afectoTurno` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `colaboradorRoles` (
  `colaboradorId` int NOT NULL,
  `rolId` int NOT NULL,
  PRIMARY KEY (`colaboradorId`,`rolId`),
  KEY `rolId` (`rolId`),
  CONSTRAINT `colaboradorroles_ibfk_1` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores` (`id`) ,
  CONSTRAINT `colaboradorroles_ibfk_2` FOREIGN KEY (`rolId`) REFERENCES `roles` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `historialTurnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `colaboradorId` int DEFAULT NULL,
  `turnoId` int DEFAULT NULL,
  `estadoId` int DEFAULT NULL,
  `ubicacionId` int DEFAULT NULL,
  `timestampAccion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `colaboradorId` (`colaboradorId`),
  KEY `turnoId` (`turnoId`),
  KEY `estadoId` (`estadoId`),
  KEY `ubicacionId` (`ubicacionId`),
  CONSTRAINT `historialturnos_ibfk_1` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores` (`id`),
  CONSTRAINT `historialturnos_ibfk_2` FOREIGN KEY (`turnoId`) REFERENCES `turno` (`id`),
  CONSTRAINT `historialturnos_ibfk_3` FOREIGN KEY (`estadoId`) REFERENCES `estadoTurno` (`id`),
  CONSTRAINT `historialturnos_ibfk_4` FOREIGN KEY (`ubicacionId`) REFERENCES `ubicacion` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `liquidaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) NOT NULL,
  `periodo` varchar(7) NOT NULL,
  `salario` int NOT NULL,
  `fileName` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_liquidaciones_colaborador_rut` (`rut`),
  CONSTRAINT `fk_liquidaciones_colaborador_rut` FOREIGN KEY (`rut`) REFERENCES `colaboradores` (`rut`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `rolTienePermisos` (
  `rolId` int NOT NULL,
  `permisoId` int NOT NULL,
  PRIMARY KEY (`rolId`,`permisoId`),
  KEY `permisoId` (`permisoId`),
  CONSTRAINT `roltienepermisos_ibfk_1` FOREIGN KEY (`rolId`) REFERENCES `roles` (`id`) ,
  CONSTRAINT `roltienepermisos_ibfk_2` FOREIGN KEY (`permisoId`) REFERENCES `permisos` (`id`) 
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `solicitudes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `solicitanteId` int NOT NULL,
  `aprobadorId` int DEFAULT NULL,
  `tipoSolicitudId` int NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('Pendiente','Aprobada','Rechazada') DEFAULT 'Pendiente',
  `fechaCreacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fechaResolucion` timestamp NULL DEFAULT NULL,
  `fechaInicio` date DEFAULT NULL,
  `fechaFin` date DEFAULT NULL,
  `motivoRechazo` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `solicitanteId` (`solicitanteId`),
  KEY `aprobadorId` (`aprobadorId`),
  KEY `tipoSolicitudId` (`tipoSolicitudId`),
  CONSTRAINT `solicitudes_ibfk_1` FOREIGN KEY (`solicitanteId`) REFERENCES `colaboradores` (`id`),
  CONSTRAINT `solicitudes_ibfk_2` FOREIGN KEY (`aprobadorId`) REFERENCES `colaboradores` (`id`),
  CONSTRAINT `solicitudes_ibfk_3` FOREIGN KEY (`tipoSolicitudId`) REFERENCES `tipoSolicitud` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `turnoAsignado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `colaboradorId` int DEFAULT NULL,
  `turnoId` int DEFAULT NULL,
  `estadoActual` int DEFAULT NULL,
  `assignedAt` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `colaboradorId` (`colaboradorId`),
  KEY `turnoId` (`turnoId`),
  KEY `estadoActual` (`estadoActual`),
  CONSTRAINT `turnoasignado_ibfk_1` FOREIGN KEY (`colaboradorId`) REFERENCES `colaboradores` (`id`),
  CONSTRAINT `turnoasignado_ibfk_2` FOREIGN KEY (`turnoId`) REFERENCES `turno` (`id`),
  CONSTRAINT `turnoasignado_ibfk_3` FOREIGN KEY (`estadoActual`) REFERENCES `estadoTurno` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
