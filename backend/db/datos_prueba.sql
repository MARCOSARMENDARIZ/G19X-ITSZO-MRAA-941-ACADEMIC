BEGIN;
INSERT INTO usuarios (id, nombre, email, password_hash, rol) VALUES
  (1, 'admini', 'bienestarlaboral@gmail.com', 'Administrador123456', 'admin'),
  (2, 'paul', 'p38083051@gmail.com', 'minecraft2435', 'usuario');
INSERT INTO perfiles (usuario_id, puesto, departamento, telefono, fecha_ingreso) VALUES
  (1, 'Administrador', 'Recursos Humanos', '65638802003','2026-03-23'),
  (12, 'Analista', 'Operaciones', '5688754567', '2026-04-04');
INSERT INTO encuestas (id, titulo, descripcion, creado_por, fecha_cierre)
  VALUES (1, 'Clima laboral', 'Encuesta de prueba', 1, NOW() + INTERVAL '30 days');
INSERT INTO preguntas (encuesta_id, texto_pregunta, tipo_respuesta, orden) VALUES
  (1, '¿Qué tan satisfecho estás con tu carga de trabajo?', 'escala', 1),
  (1, '¿Qué mejorarías en tu área?', 'texto', 2);
SELECT setval(pg_get_serial_sequence('usuarios', 'id'), 2);
SELECT setval(pg_get_serial_sequence('encuestas', 'id'), 1);
COMMIT;
