import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const MENSAJE_INICIAL = {
  remitente: "bot",
  texto: "¡Hola! 👋 Soy tu asistente de Bienestar IA. ¿En qué te puedo ayudar hoy?"
};

const crearChat = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  titulo: "Nuevo chat",
  mensajes: [{ ...MENSAJE_INICIAL }],
  fecha: new Date().toISOString()
});

function cargarChats() {
  try {
    const guardados = localStorage.getItem("bienestar_chats");
    const chats = guardados ? JSON.parse(guardados) : [];

    if (Array.isArray(chats) && chats.length > 0) {
      return chats;
    }
  } catch (error) {
    console.error("Error al cargar el historial:", error);
  }

  return [crearChat()];
}

function Chatbot() {
  const navigate = useNavigate();
  const [chats, setChats] = useState(cargarChats);

  const [chatActivoId, setChatActivoId] = useState(() => {
    return localStorage.getItem("bienestar_chat_activo") || null;
  });

  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const finChatRef = useRef(null);

  const chatActivo = chats.find((chat) => chat.id === chatActivoId);
  const mensajes = chatActivo?.mensajes || [];

  useEffect(() => {
    localStorage.setItem("bienestar_chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    const existe = chats.some((chat) => chat.id === chatActivoId);

    if (!existe && chats.length > 0) {
      setChatActivoId(chats[0].id);
    }
  }, [chats, chatActivoId]);

  useEffect(() => {
    if (chatActivoId) {
      localStorage.setItem("bienestar_chat_activo", chatActivoId);
    }
  }, [chatActivoId]);

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const nuevoChat = () => {
    if (cargando) return;

    const nuevo = crearChat();

    setChats((prev) => [nuevo, ...prev]);
    setChatActivoId(nuevo.id);
    setInput("");
  };

  const seleccionarChat = (id) => {
    if (cargando) return;

    setChatActivoId(id);
    setInput("");
  };

  const eliminarChat = (id) => {
    if (cargando && id === chatActivoId) return;

    const restantes = chats.filter((chat) => chat.id !== id);

    if (restantes.length === 0) {
      const nuevo = crearChat();
      setChats([nuevo]);
      setChatActivoId(nuevo.id);
      return;
    }

    setChats(restantes);

    if (id === chatActivoId) {
      setChatActivoId(restantes[0].id);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();

    if (!input.trim() || cargando || !chatActivo) return;

    const mensajeUsuario = input.trim();
    const idChat = chatActivo.id;

    const nuevosMensajes = [
      ...chatActivo.mensajes,
      { remitente: "usuario", texto: mensajeUsuario }
    ];

    setInput("");
    setCargando(true);

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === idChat
          ? {
            ...chat,
            titulo:
              chat.titulo === "Nuevo chat"
                ? mensajeUsuario.slice(0, 35) +
                (mensajeUsuario.length > 35 ? "..." : "")
                : chat.titulo,
            mensajes: nuevosMensajes,
            fecha: new Date().toISOString()
          }
          : chat
      )
    );

    try {
      const respuesta = await apiFetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mensaje: mensajeUsuario,
          historial: nuevosMensajes
        })
      });

      const data = await respuesta.json();

      const textoRespuesta =
        respuesta.ok && data.respuesta
          ? data.respuesta
          : "Lo siento, ocurrió un error al procesar tu mensaje.";

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === idChat
            ? {
              ...chat,
              mensajes: [
                ...chat.mensajes,
                { remitente: "bot", texto: textoRespuesta }
              ],
              fecha: new Date().toISOString()
            }
            : chat
        )
      );
    } catch (error) {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === idChat
            ? {
              ...chat,
              mensajes: [
                ...chat.mensajes,
                {
                  remitente: "bot",
                  texto: "No se pudo conectar con el servidor del chatbot."
                }
              ]
            }
            : chat
        )
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
         <button
            type="button"
            className="btn-regresar-inicio"
            onClick={() => navigate("/inicio")}
          >
            <i className="bi bi-arrow-left"></i>
            Regresar al inicio
          </button>

        <button
          type="button"
          className="nuevo-chat-btn"
          onClick={nuevoChat}
          disabled={cargando}
        >
          + Nuevo chat
        </button>

        <div className="historial-lista">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`historial-item ${chat.id === chatActivoId ? "historial-activo" : ""
                }`}
            >
              <button
                type="button"
                className="historial-seleccionar"
                onClick={() => seleccionarChat(chat.id)}
                disabled={cargando}
                title={chat.titulo}
              >
                <span className="historial-titulo">{chat.titulo}</span>
                <small>
                  {new Date(chat.fecha).toLocaleDateString("es-MX")}
                </small>
              </button>

              <button
                type="button"
                className="eliminar-chat-btn"
                onClick={() => eliminarChat(chat.id)}
                disabled={cargando && chat.id === chatActivoId}
                title="Eliminar conversación"
                aria-label={`Eliminar ${chat.titulo}`}
              >
                <i class="bi bi-trash3-fill" style={{ color: "#2563EB"}}></i>
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-container">
        <div className="chat-header">
          

          <h3><i
              className="bi bi-chat-left-dots-fill"
              style={{ color: "#2563EB" }}
            ></i> Chatbot Bienestar IA</h3>
          <span>Asistente de bienestar organizacional</span>
        </div>

        <div className="chat-box">
          {mensajes.map((msg, index) => (
            <div
              key={`${chatActivoId}-${index}`}
              className={`mensaje ${msg.remitente === "usuario"
                ? "mensaje-usuario"
                : "mensaje-bot"
                }`}
            >
              {msg.texto}
            </div>
          ))}

          {cargando && (
            <div className="mensaje mensaje-bot">
              Escribiendo... 
            </div>
          )}

          <div ref={finChatRef} />
        </div>

        <form onSubmit={enviarMensaje} className="chat-input-form">
          <input
            type="text"
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={cargando}
          />

          <button type="submit" disabled={cargando || !input.trim()}>
            {cargando ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Chatbot;