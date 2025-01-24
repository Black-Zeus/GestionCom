-- 02_createUsers.sql

-- Asignar privilegios completos al usuario 'remoto' en la base de datos 'tecnocomp'
GRANT ALL PRIVILEGES ON tecnocomp.* TO 'remoto'@'%';

-- Asignar privilegios completos al usuario 'root' en todas las bases de datos, pero solo desde 'localhost'
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;

-- Aplicar cambios en privilegios
FLUSH PRIVILEGES;
