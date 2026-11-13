import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";

function Bienestar() {
  const [usuario, setUsuario] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [misPropuestas, setMisPropuestas] = useState([]);

  const [mostrarModalAlerta, setMostrarModalAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");

  const mostrarAlerta = (mensaje) => {
    setMensajeAlerta(mensaje);
    setMostrarModalAlerta(true);
  };

  const cerrarModalAlerta = () => {
    setMostrarModalAlerta(false);
    setMensajeAlerta("");
  };

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
  }, []);

  const enviarPropuesta = async (e) => {
    e.preventDefault();

    if (!titulo.trim() || !descripcion.trim()) {
      mostrarAlerta("Por favor completa todos los campos.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await apiFetch("/api/propuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
        }),
      });

      const data = await respuesta.json();

      if (respuesta.ok && data.exito) {
        mostrarAlerta("¡Propuesta enviada correctamente!");

        if (data.propuesta) {
          setMisPropuestas((prev) => [data.propuesta, ...prev]);
        }

        setTitulo("");
        setDescripcion("");
      } else {
        mostrarAlerta(data.mensaje || "Error al enviar la propuesta.");
      }
    } catch (error) {
      console.error("Error al enviar propuesta:", error);
      mostrarAlerta("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="inicio-container">
      <main className="main-content">
        <div className="propuestas-header">
          <Link to="/inicio" className="propuestas-btn-volver">
            <i className="bi bi-arrow-left"></i>
          </Link>

          <h1 className="propuestas-titulo">Ideas y Propuestas</h1>
        </div>

        <section className="welcome">
          <form onSubmit={enviarPropuesta} className="form-propuesta">
            <div className="form-grupo">
              <label htmlFor="titulo">Título de la propuesta *</label>
              <br />
              <input
                id="titulo"
                type="text"
                placeholder="Ej. Mejora en la cafetería / Torneo de integración"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={enviando}
                required
              />
            </div>

            <br />

            <div className="form-grupo">
              <label htmlFor="descripcion">Descripción detallada *</label>
              <br />
              <textarea
                id="descripcion"
                type="text2"
                placeholder="Escribe tu propuesta aquí..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={5}
                disabled={enviando}
                required
              ></textarea>
            </div>

            <br />

            <button type="submit" disabled={enviando} className="btn-enviar">
              {enviando ? "Enviando propuesta..." : "Enviar propuesta"}
            </button>
          </form>
        </section>

        {misPropuestas.length > 0 && (
          <section className="welcome" style={{ marginTop: "20px" }}>
            <h3>Propuestas enviadas en esta sesión</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {misPropuestas.map((p, idx) => (
                <li
                  key={p.id || idx}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                    backgroundColor: "#f9fafb"
                  }}
                >
                  <strong>{p.titulo}</strong>
                  <p style={{ margin: "5px 0 0 0", color: "#4b5563" }}>
                    {p.descripcion}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {mostrarModalAlerta && (
          <div className="alerta-overlay">
            <div
              className="alerta-contenido"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="titulo-alerta"
            >
              <div className="alerta-icono">!</div>

              <h2 id="titulo-alerta">Aviso</h2>

              <p>{mensajeAlerta}</p>

              <button
                type="button"
                onClick={cerrarModalAlerta}
                autoFocus
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Bienestar;