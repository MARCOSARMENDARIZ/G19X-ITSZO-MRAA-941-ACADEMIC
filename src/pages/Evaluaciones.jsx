import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

function Encuestas({ usuario }) {
  const [encuestas, setEncuestas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [mostrarModalResponder, setMostrarModalResponder] = useState(false);
  const [mostrarModalResultados, setMostrarModalResultados] = useState(false);

  const [analisisIA, setAnalisisIA] = useState(null);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);

  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState(null);
  const [preguntasEncuesta, setPreguntasEncuesta] = useState([]);
  const [respuestasForm, setRespuestasForm] = useState({});

  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");

  const [nuevasPreguntas, setNuevasPreguntas] = useState([
    { texto_pregunta: "", tipo_respuesta: "escala", opciones: ["", ""] }
  ]);

  const [relojActual, setRelojActual] = useState(Date.now());
  const [enviandoRespuestas, setEnviandoRespuestas] = useState(false);
  const [guardandoEncuesta, setGuardandoEncuesta] = useState(false);

  const usuarioActual =
    usuario || JSON.parse(localStorage.getItem("usuario") || "{}");

  const esAdmin = usuarioActual?.rol === "admin";

  const backendHost = window.location.hostname;
  const API_URL = `http://${backendHost}:5000/api/encuestas`;

  // Actualizar los temporizadores cada segundo.
  useEffect(() => {
    const intervalo = setInterval(() => {
      setRelojActual(Date.now());
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Consultar encuestas (pasando el usuario_id para que el backend sepa cuáles ya respondió).
  const cargarEncuestas = useCallback(async () => {
    setCargando(true);

    try {
      const userId = usuarioActual?.id ? `?usuario_id=${usuarioActual.id}` : "";
      const res = await fetch(`${API_URL}${userId}`);
      const data = await res.json();

      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || "No se pudieron cargar las encuestas.");
      }

      setEncuestas(data.encuestas || []);
    } catch (error) {
      console.error("Error al obtener las encuestas:", error);
    } finally {
      setCargando(false);
    }
  }, [API_URL, usuarioActual?.id]);

  useEffect(() => {
    cargarEncuestas();
  }, [cargarEncuestas]);

  // Determinar si una encuesta ya venció.
  const encuestaVencida = (encuesta) => {
    if (!encuesta?.fecha_cierre) return false;

    const fecha = new Date(encuesta.fecha_cierre).getTime();

    return Number.isFinite(fecha) && fecha <= relojActual;
  };

  // Mostrar días, horas, minutos y segundos.
  const obtenerTiempoRestante = (fecha) => {
    if (!fecha) return "Sin fecha límite";

    const diferencia = new Date(fecha).getTime() - relojActual;

    if (!Number.isFinite(diferencia) || diferencia <= 0) {
      return "Encuesta vencida";
    }

    const dias = Math.floor(diferencia / 86400000);
    const horas = Math.floor((diferencia % 86400000) / 3600000);
    const minutos = Math.floor((diferencia % 3600000) / 60000);
    const segundos = Math.floor((diferencia % 60000) / 1000);

    return `${dias}d ${horas}h ${minutos}m ${segundos}s`;
  };

  // Convertir una fecha a formato local para datetime-local.
  const convertirFechaLocal = (fecha) => {
    if (!fecha) return "";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "";

    const ajustarZona = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return ajustarZona.toISOString().slice(0, 16);
  };

  // Abrir el modal para crear encuesta.
  const abrirCrearEncuesta = () => {
    setNuevoTitulo("");
    setNuevaDescripcion("");
    setFechaCierre("");
    setNuevasPreguntas([
      { texto_pregunta: "", tipo_respuesta: "escala", opciones: ["", ""] }
    ]);

    setMostrarModalCrear(true);
  };

  // Abrir el modal para responder.
  const abrirResponder = async (encuesta) => {
    if (encuestaVencida(encuesta)) {
      alert("Esta encuesta ya venció y no admite nuevas respuestas.");
      return;
    }

    if (encuesta.yaRespondida) {
      alert("Ya has respondido esta encuesta anteriormente.");
      return;
    }

    setEncuestaSeleccionada(encuesta);
    setRespuestasForm({});

    try {
      const res = await fetch(`${API_URL}/${encuesta.id}`);
      const data = await res.json();

      if (!res.ok || !data.exito) {
        throw new Error(data.mensaje || "No se pudieron cargar las preguntas.");
      }

      const encuestaCompleta = data.encuesta;

      if (encuestaVencida(encuestaCompleta)) {
        alert("Esta encuesta ya venció.");
        await cargarEncuestas();
        return;
      }

      setEncuestaSeleccionada(encuestaCompleta);
      setPreguntasEncuesta(encuestaCompleta.preguntas || []);
      setMostrarModalResponder(true);
    } catch (error) {
      console.error("Error al cargar la encuesta:", error);
      alert(error.message || "No se pudieron cargar las preguntas.");
    }
  };

  // Abrir resultados y solicitar análisis de IA para administradores.
  const abrirResultados = async (encuesta) => {
    setEncuestaSeleccionada(encuesta);
    setAnalisisIA(null);
    setPreguntasEncuesta([]);
    setMostrarModalResultados(true);

    setCargandoAnalisis(esAdmin);

    try {
      const res = await fetch(`${API_URL}/${encuesta.id}`);
      const data = await res.json();

      if (data.exito) {
        setEncuestaSeleccionada(data.encuesta);
        setPreguntasEncuesta(data.encuesta.preguntas || []);
      }

      if (esAdmin) {
        const resIA = await fetch(
          `${API_URL}/${encuesta.id}/analizar-ia`
        );

        const dataIA = await resIA.json();

        if (dataIA.exito) {
          setAnalisisIA(dataIA.analisis);
        } else {
          console.error(
            "No se pudo obtener el análisis de la IA:",
            dataIA.mensaje
          );
        }
      }
    } catch (error) {
      console.error("Error al cargar resultados:", error);
    } finally {
      setCargandoAnalisis(false);
    }
  };

  // Actualizar una respuesta.
  const handleRespuestaChange = (preguntaId, campo, valor) => {
    setRespuestasForm((prev) => ({
      ...prev,
      [preguntaId]: {
        ...prev[preguntaId],
        pregunta_id: preguntaId,
        [campo]: valor
      }
    }));
  };

  // Enviar respuestas.
  const enviarRespuestas = async (e) => {
    e.preventDefault();

    if (enviandoRespuestas) return;

    if (encuestaVencida(encuestaSeleccionada)) {
      alert("El tiempo para responder esta encuesta ha terminado.");
      setMostrarModalResponder(false);
      cargarEncuestas();
      return;
    }

    const preguntasObligatorias = preguntasEncuesta.filter((pregunta) => {
      if (pregunta.tipo_respuesta === "escala") {
        return !respuestasForm[pregunta.id]?.valor_numero;
      }

      if (pregunta.tipo_respuesta === "opcion") {
        return !respuestasForm[pregunta.id]?.opcion_id;
      }

      if (pregunta.tipo_respuesta === "texto") {
        return !respuestasForm[pregunta.id]?.valor_texto?.trim();
      }

      return true;
    });

    if (preguntasObligatorias.length > 0) {
      alert("Por favor, responde todas las preguntas antes de enviar.");
      return;
    }

    const payloadRespuestas = Object.values(respuestasForm);

    if (payloadRespuestas.length === 0) {
      alert("Debes responder las preguntas antes de enviar.");
      return;
    }

    setEnviandoRespuestas(true);

    try {
      const res = await fetch(
        `${API_URL}/${encuestaSeleccionada.id}/respuestas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario_id: usuarioActual?.id || null,
            respuestas: payloadRespuestas
          })
        }
      );

      const data = await res.json();

      if (res.status === 409) {
        alert(data.mensaje || "Ya has respondido esta encuesta anteriormente.");
        setMostrarModalResponder(false);
        await cargarEncuestas();
        return;
      }

      if (res.status === 403 && data.vencida) {
        alert("La encuesta venció. Ya no se pueden enviar respuestas.");
        setMostrarModalResponder(false);
        await cargarEncuestas();
        return;
      }

      if (!res.ok || !data.exito) {
        alert(data.mensaje || "Error al enviar las respuestas.");
        return;
      }

      alert("¡Respuestas enviadas con éxito!");

      setMostrarModalResponder(false);
      setRespuestasForm({});
      await cargarEncuestas();
    } catch (error) {
      console.error("Error al enviar respuestas:", error);
      alert("No se pudieron enviar las respuestas. Intenta nuevamente.");
    } finally {
      setEnviandoRespuestas(false);
    }
  };

  // Agregar una pregunta.
  const handleAgregarPregunta = () => {
    setNuevasPreguntas((prev) => [
      ...prev,
      { texto_pregunta: "", tipo_respuesta: "escala", opciones: ["", ""] }
    ]);
  };

  const handlePreguntaChange = (index, field, value) => {
    setNuevasPreguntas((prev) =>
      prev.map((pregunta, i) =>
        i === index ? { ...pregunta, [field]: value } : pregunta
      )
    );
  };

  const handleOpcionChange = (pIndex, oIndex, value) => {
    setNuevasPreguntas((prev) =>
      prev.map((pregunta, i) =>
        i === pIndex
          ? {
              ...pregunta,
              opciones: pregunta.opciones.map((opcion, j) =>
                j === oIndex ? value : opcion
              )
            }
          : pregunta
      )
    );
  };

  const handleAgregarOpcion = (pIndex) => {
    setNuevasPreguntas((prev) =>
      prev.map((pregunta, i) =>
        i === pIndex
          ? { ...pregunta, opciones: [...pregunta.opciones, ""] }
          : pregunta
      )
    );
  };

  // Crear encuesta.
  const guardarNuevaEncuesta = async (e) => {
    e.preventDefault();

    if (guardandoEncuesta) return;

    if (!nuevoTitulo.trim()) {
      alert("El título de la encuesta es obligatorio.");
      return;
    }

    if (
      nuevasPreguntas.some((pregunta) => !pregunta.texto_pregunta.trim())
    ) {
      alert("Todas las preguntas deben tener un texto.");
      return;
    }

    for (const pregunta of nuevasPreguntas) {
      if (pregunta.tipo_respuesta === "opcion") {
        const opcionesValidas = pregunta.opciones.filter((opcion) =>
          opcion.trim()
        );

        if (opcionesValidas.length < 2) {
          alert("Cada pregunta de opción múltiple debe tener al menos dos opciones.");
          return;
        }
      }
    }

    let fechaCierreISO = null;

    if (fechaCierre) {
      const fecha = new Date(fechaCierre);

      if (
        Number.isNaN(fecha.getTime()) ||
        fecha.getTime() <= Date.now()
      ) {
        alert("Selecciona una fecha y hora de cierre futuras.");
        return;
      }

      fechaCierreISO = fecha.toISOString();
    }

    const preguntasPreparadas = nuevasPreguntas.map((pregunta) => ({
      ...pregunta,
      texto_pregunta: pregunta.texto_pregunta.trim(),
      opciones:
        pregunta.tipo_respuesta === "opcion"
          ? pregunta.opciones.filter((opcion) => opcion.trim())
          : []
    }));

    setGuardandoEncuesta(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: nuevoTitulo.trim(),
          descripcion: nuevaDescripcion.trim(),
          creado_por: usuarioActual?.id || null,
          fecha_cierre: fechaCierreISO,
          preguntas: preguntasPreparadas
        })
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        alert(data.mensaje || "Error al crear la encuesta.");
        return;
      }

      alert("¡Encuesta publicada correctamente!");

      setMostrarModalCrear(false);
      setNuevoTitulo("");
      setNuevaDescripcion("");
      setFechaCierre("");
      setNuevasPreguntas([
        { texto_pregunta: "", tipo_respuesta: "escala", opciones: ["", ""] }
      ]);

      await cargarEncuestas();
    } catch (error) {
      console.error("Error al guardar encuesta:", error);
      alert("No se pudo crear la encuesta.");
    } finally {
      setGuardandoEncuesta(false);
    }
  };

  const encuestasActivas = encuestas.filter(
    (encuesta) =>
      encuesta.estado === "Activa" && !encuestaVencida(encuesta)
  ).length;

  const totalRespuestas = encuestas.reduce(
    (total, encuesta) => total + (encuesta.respuestasCount || 0),
    0
  );

  return (
    <div className="evaluaciones-container">
      <div className="config-header">
        <Link to="/inicio" className="btn-volver">←</Link>
        <div>
          <h1>📋 Encuestas y Cuestionarios</h1>
          <p>Crea encuestas para los usuarios y analiza sus respuestas con IA</p>
        </div>
      </div>

      <div className="evaluaciones-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">📝</div>
          <div>
            <h3>Encuestas Activas</h3>
            <p className="kpi-numero">{encuestasActivas}</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">💬</div>
          <div>
            <h3>Respuestas Recibidas</h3>
            <p className="kpi-numero">{totalRespuestas}</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon orange">📊</div>
          <div>
            <h3>Total Registradas</h3>
            <p className="kpi-numero">{encuestas.length}</p>
          </div>
        </div>
      </div>

      <div className="config-card full-width">
        <div className="card-header">
          <h2>LISTA DE ENCUESTAS</h2>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {esAdmin && (
              <button
                className="btn-agregar-usuario"
                onClick={abrirCrearEncuesta}
              >
                ➕ Crear Nueva Encuesta
              </button>
            )}

            <span className="badge-contador">
              {encuestas.length} encuestas
            </span>
          </div>
        </div>

        {cargando ? (
          <p style={{ textAlign: "center", padding: "20px" }}>
            Cargando encuestas...
          </p>
        ) : encuestas.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px" }}>
            No hay encuestas registradas.
          </p>
        ) : (
          <div className="encuestas-grid">
            {encuestas.map((enc) => {
              const vencida = encuestaVencida(enc);

              return (
                <div key={enc.id} className="encuesta-card">
                  <div className="encuesta-card-header">
                    <span
                      className={`status-pill ${
                        vencida ? "vencida" : (enc.estado || "").toLowerCase()
                      }`}
                    >
                      {vencida ? "Vencida" : enc.estado}
                    </span>

                    <span className="subtexto-puesto">
                      {enc.fechaCreacion}
                    </span>
                  </div>

                  <h3>{enc.titulo}</h3>
                  <p className="encuesta-desc">{enc.descripcion}</p>

                  <div
                    className={`encuesta-temporizador ${
                      vencida ? "vencido" : ""
                    }`}
                  >
                    <span>{vencida ? "🔒" : "⏳"}</span>
                    <div>
                      <strong>
                        {!enc.fecha_cierre
                          ? "Sin fecha límite"
                          : vencida
                            ? "Encuesta vencida"
                            : "Tiempo restante"}
                      </strong>
                      <p>{obtenerTiempoRestante(enc.fecha_cierre)}</p>

                      {enc.fecha_cierre && (
                        <small>
                          Cierre: {new Date(enc.fecha_cierre).toLocaleString()}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="encuesta-meta">
                    <span>❓ {enc.preguntasCount} Preguntas</span>
                    <span>💬 {enc.respuestasCount} Respuestas</span>
                  </div>

                  <div className="encuesta-acciones">
                    {enc.estado === "Activa" && !vencida && !enc.yaRespondida && (
                      <button
                        className="btn-responder"
                        onClick={() => abrirResponder(enc)}
                      >
                        ✏️ Responder Encuesta
                      </button>
                    )}

                    {enc.yaRespondida && (
                      <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: "0.9rem" }}>
                        ✅ Ya respondida
                      </span>
                    )}

                    <button
                      className="btn-resultados"
                      onClick={() => abrirResultados(enc)}
                    >
                      📊 Ver Resultados
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA CREAR ENCUESTA */}
      {mostrarModalCrear && esAdmin && (
        <div className="modal-overlay">
          <div className="modal-contenido">
            <div className="modal-header">
              <h2>➕ Crear Nueva Encuesta</h2>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalCrear(false)}
              >
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit={guardarNuevaEncuesta}>
              <div className="form-grupo">
                <label>Título de la Encuesta *</label>
                <input
                  type="text"
                  placeholder="Ej. Clima Organizacional"
                  className="input-estilizado"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>Descripción / Instrucciones</label>
                <textarea
                  placeholder="Explica el objetivo de la encuesta..."
                  rows="2"
                  className="input-estilizado"
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                />
              </div>

              <div className="form-grupo">
                <label>📅 Fecha y hora límite para responder</label>
                <input
                  type="datetime-local"
                  className="input-estilizado"
                  value={fechaCierre}
                  min={convertirFechaLocal(new Date(Date.now() + 60000))}
                  onChange={(e) => setFechaCierre(e.target.value)}
                />
                <small style={{ color: "#6b7280" }}>
                  Opcional. Si no seleccionas una fecha, la encuesta no tendrá
                  un cierre programado.
                </small>
              </div>

              <hr />

              {nuevasPreguntas.map((p, pIdx) => (
                <div
                  key={pIdx}
                  className="pregunta-box"
                  style={{
                    marginBottom: "15px",
                    border: "1px solid #e5e7eb",
                    padding: "12px",
                    borderRadius: "8px"
                  }}
                >
                  <div className="form-grupo">
                    <label>Pregunta #{pIdx + 1} *</label>
                    <input
                      type="text"
                      placeholder="Escribe la pregunta..."
                      className="input-estilizado"
                      value={p.texto_pregunta}
                      onChange={(e) =>
                        handlePreguntaChange(
                          pIdx,
                          "texto_pregunta",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-grupo">
                    <label>Tipo de Respuesta</label>
                    <select
                      className="input-estilizado"
                      value={p.tipo_respuesta}
                      onChange={(e) =>
                        handlePreguntaChange(
                          pIdx,
                          "tipo_respuesta",
                          e.target.value
                        )
                      }
                    >
                      <option value="escala">Escala de 1 a 5 estrellas</option>
                      <option value="opcion">Opción múltiple</option>
                      <option value="texto">Texto abierto</option>
                    </select>
                  </div>

                  {p.tipo_respuesta === "opcion" && (
                    <div style={{ marginLeft: "10px" }}>
                      <label>Opciones:</label>

                      {p.opciones.map((op, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Opción ${oIdx + 1}`}
                          className="input-estilizado"
                          style={{ marginTop: "4px" }}
                          value={op}
                          onChange={(e) =>
                            handleOpcionChange(pIdx, oIdx, e.target.value)
                          }
                        />
                      ))}

                      <button
                        type="button"
                        style={{ marginTop: "6px", cursor: "pointer" }}
                        onClick={() => handleAgregarOpcion(pIdx)}
                      >
                        ➕ Agregar Opción
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn-agregar-pregunta"
                onClick={handleAgregarPregunta}
              >
                ➕ Agregar otra pregunta
              </button>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModalCrear(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={guardandoEncuesta}
                >
                  {guardandoEncuesta ? "Publicando..." : "Publicar Encuesta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA RESPONDER */}
      {mostrarModalResponder && encuestaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-contenido">
            <div className="modal-header">
              <h2>✏️ {encuestaSeleccionada.titulo}</h2>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalResponder(false)}
              >
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit={enviarRespuestas}>
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                {encuestaSeleccionada.descripcion}
              </p>

              {encuestaSeleccionada.fecha_cierre && (
                <div
                  className={`encuesta-temporizador ${
                    encuestaVencida(encuestaSeleccionada) ? "vencido" : ""
                  }`}
                >
                  <span>
                    {encuestaVencida(encuestaSeleccionada) ? "🔒" : "⏳"}
                  </span>
                  <div>
                    <strong>
                      {encuestaVencida(encuestaSeleccionada)
                        ? "Tiempo terminado"
                        : "Tiempo para responder"}
                    </strong>
                    <p>
                      {obtenerTiempoRestante(
                        encuestaSeleccionada.fecha_cierre
                      )}
                    </p>
                  </div>
                </div>
              )}

              {preguntasEncuesta.map((preg, idx) => (
                <div key={preg.id} className="pregunta-box">
                  <label className="pregunta-titulo">
                    {idx + 1}. {preg.texto_pregunta}
                  </label>

                  {preg.tipo_respuesta === "escala" && (
                    <div className="rating-options">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          disabled={encuestaVencida(encuestaSeleccionada)}
                          className={`btn-rating ${
                            respuestasForm[preg.id]?.valor_numero === num
                              ? "activo"
                              : ""
                          }`}
                          onClick={() =>
                            handleRespuestaChange(
                              preg.id,
                              "valor_numero",
                              num
                            )
                          }
                        >
                          {num} ⭐
                        </button>
                      ))}
                    </div>
                  )}

                  {preg.tipo_respuesta === "opcion" && (
                    <div className="radio-group">
                      {preg.opciones?.map((opc) => (
                        <label key={opc.id}>
                          <input
                            type="radio"
                            name={`pregunta_${preg.id}`}
                            disabled={encuestaVencida(encuestaSeleccionada)}
                            checked={
                              respuestasForm[preg.id]?.opcion_id === opc.id
                            }
                            onChange={() =>
                              handleRespuestaChange(
                                preg.id,
                                "opcion_id",
                                opc.id
                              )
                            }
                          />
                          {opc.texto_opcion}
                        </label>
                      ))}
                    </div>
                  )}

                  {preg.tipo_respuesta === "texto" && (
                    <textarea
                      rows="3"
                      placeholder="Escribe tus comentarios..."
                      className="input-estilizado"
                      disabled={encuestaVencida(encuestaSeleccionada)}
                      value={respuestasForm[preg.id]?.valor_texto || ""}
                      onChange={(e) =>
                        handleRespuestaChange(
                          preg.id,
                          "valor_texto",
                          e.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModalResponder(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-guardar"
                  disabled={
                    enviandoRespuestas ||
                    encuestaVencida(encuestaSeleccionada)
                  }
                >
                  {encuestaVencida(encuestaSeleccionada)
                    ? "Encuesta vencida"
                    : enviandoRespuestas
                      ? "Enviando..."
                      : "Enviar Respuestas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RESULTADOS */}
      {mostrarModalResultados && encuestaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-contenido" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h2>
                {esAdmin
                  ? `🤖 Análisis con IA: ${encuestaSeleccionada.titulo}`
                  : `👤 Mi Resumen: ${encuestaSeleccionada.titulo}`}
              </h2>

              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalResultados(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "15px 0" }}>
              {esAdmin ? (
                <div>
                  <p style={{ color: "#4b5563", marginBottom: "15px" }}>
                    <strong>Modo Administrador:</strong> Diagnóstico generado
                    a partir de las respuestas recopiladas.
                  </p>

                  {cargandoAnalisis ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <p style={{ fontWeight: "bold", color: "#2563eb" }}>
                        🤖 La IA está analizando las respuestas...
                      </p>
                      <p style={{ color: "#6b7280" }}>
                        Sintetizando conclusiones y recomendaciones.
                      </p>
                    </div>
                  ) : analisisIA ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px"
                        }}
                      >
                        <div
                          style={{
                            padding: "12px",
                            background: "#f3f4f6",
                            borderRadius: "8px",
                            textAlign: "center"
                          }}
                        >
                          <span>Sentimiento Predominante</span>
                          <p style={{ fontWeight: "bold", color: "#2563eb" }}>
                            {analisisIA.sentimiento_predominante || "Neutro"}
                          </p>
                        </div>

                        <div
                          style={{
                            padding: "12px",
                            background: "#f3f4f6",
                            borderRadius: "8px",
                            textAlign: "center"
                          }}
                        >
                          <span>Puntuación Estimada</span>
                          <p style={{ fontWeight: "bold", color: "#16a34a" }}>
                            {analisisIA.puntuacion_promedio || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3>📝 Resumen Ejecutivo</h3>
                        <p>{analisisIA.resumen_ejecutivo}</p>
                      </div>

                      <div>
                        <h3>✅ Hallazgos Clave / Puntos Fuertes</h3>
                        <ul>
                          {analisisIA.hallazgos_clave?.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p style={{ textAlign: "center", color: "#6b7280" }}>
                      No se pudo generar el análisis en este momento.
                    </p>
                  )}
                </div>
              ) : (
                <p>Tus respuestas han sido registradas correctamente.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Encuestas;