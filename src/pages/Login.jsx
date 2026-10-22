import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)

  const [mostrarModalRecuperar, setMostrarModalRecuperar] = useState(false)
  const [paso, setPaso] = useState(1)

  const [emailRecuperacion, setEmailRecuperacion] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [procesando, setProcesando] = useState(false)

  const navigate = useNavigate()

  // INICIAR SESIÓN
  const iniciarSesion = async (e) => {
    e.preventDefault()

    if (!usuario.trim() || !password) {
      alert('Completa todos los campos')
      return
    }

    setCargando(true)

    try {
      const respuesta = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      })

      const texto = await respuesta.text()
      let data = {}

      try {
        data = JSON.parse(texto)
      } catch {
        console.error('La respuesta del servidor no es JSON')
      }

      if (respuesta.ok && data.exito) {
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        navigate('/inicio')
      } else {
        alert(data.mensaje || 'Usuario o contraseña incorrectos')
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      alert('No se pudo conectar con el servidor')
    } finally {
      setCargando(false)
    }
  }

  // PASO 1: SOLICITAR CÓDIGO POR CORREO
  const handleVerificarEmail = async (e) => {
    e.preventDefault()

    if (!emailRecuperacion.trim()) {
      alert('Ingresa tu correo electrónico')
      return
    }

    setProcesando(true)

    try {
      const res = await fetch('http://localhost:5000/api/verificar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperacion.trim()
        })
      })

      const data = await res.json()

      if (res.ok && data.exito) {
        setPaso(2)
        setCodigo('')
        alert(
          data.mensaje ||
          'Si el correo está registrado, recibirás un código de verificación. Revisa tu bandeja de entrada y spam.'
        )
      } else {
        alert(data.mensaje || 'No se pudo solicitar el código')
      }
    } catch (error) {
      console.error('Error al solicitar el código:', error)
      alert('Error de conexión con el servidor')
    } finally {
      setProcesando(false)
    }
  }

  // PASO 2: VERIFICAR CÓDIGO
  const handleVerificarCodigo = async (e) => {
    e.preventDefault()

    if (!/^\d{6}$/.test(codigo)) {
      alert('Ingresa el código de verificación de 6 dígitos')
      return
    }

    setProcesando(true)

    try {
      const res = await fetch('http://localhost:5000/api/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperacion.trim(),
          codigo
        })
      })

      const data = await res.json()

      if (res.ok && data.exito) {
        setPaso(3)
      } else {
        alert(data.mensaje || 'El código es incorrecto o ha expirado')
      }
    } catch (error) {
      console.error('Error al verificar el código:', error)
      alert('Error de conexión con el servidor')
    } finally {
      setProcesando(false)
    }
  }

  // PASO 3: CAMBIAR CONTRASEÑA
  const handleCambiarPassword = async (e) => {
    e.preventDefault()

    if (nuevaPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (nuevaPassword !== confirmarPassword) {
      alert('Las contraseñas no coinciden')
      return
    }

    setProcesando(true)

    try {
      const res = await fetch(
        'http://localhost:5000/api/cambiar-password-directo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailRecuperacion.trim(),
            codigo,
            nuevaPassword
          })
        }
      )

      const data = await res.json()

      if (res.ok && data.exito) {
        alert('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
        cerrarModalRecuperacion()
      } else {
        alert(data.mensaje || 'No se pudo actualizar la contraseña')
      }
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error)
      alert('Error de conexión con el servidor')
    } finally {
      setProcesando(false)
    }
  }

  // CERRAR Y LIMPIAR EL MODAL
  const cerrarModalRecuperacion = () => {
    setMostrarModalRecuperar(false)
    setPaso(1)
    setEmailRecuperacion('')
    setCodigo('')
    setNuevaPassword('')
    setConfirmarPassword('')
    setProcesando(false)
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Bienestar IA</h1>
        <p>Inicia sesión para continuar</p>

        <form onSubmit={iniciarSesion}>
          <label>Usuario</label>
          <input
            type="text"
            placeholder="Ingresa tu usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={cargando}>
            {cargando ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>

        <a
          href="#olvidaste-password"
          onClick={(e) => {
            e.preventDefault()
            setMostrarModalRecuperar(true)
          }}
          className="link-olvidaste"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      {/* MODAL DE RECUPERACIÓN */}
      {mostrarModalRecuperar && (
        <div className="modal-overlay">
          <div
            className="modal-contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-recuperacion"
          >
            <div className="modal-header">
              <h2 id="titulo-recuperacion">
                {paso === 1 && 'Verificar cuenta'}
                {paso === 2 && 'Código de verificación'}
                {paso === 3 && 'Nueva contraseña'}
              </h2>

              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={cerrarModalRecuperacion}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* PASO 1: CORREO */}
            {paso === 1 && (
              <form
                onSubmit={handleVerificarEmail}
                className="modal-form"
              >
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9rem',
                    gridColumn: 'span 2'
                  }}
                >
                  Ingresa el correo electrónico asociado a tu cuenta.
                  Si está registrado, recibirás un código de verificación.
                </p>

                <div
                  className="form-grupo"
                  style={{ gridColumn: 'span 2' }}
                >
                  <label>Correo electrónico *</label>
                  <input
                    type="email"
                    value={emailRecuperacion}
                    onChange={(e) =>
                      setEmailRecuperacion(e.target.value)
                    }
                    autoComplete="email"
                    required
                    placeholder="ejemplo@empresa.com"
                  />
                </div>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={cerrarModalRecuperacion}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn-guardar"
                    disabled={procesando}
                  >
                    {procesando ? 'Enviando...' : 'Enviar código'}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: CÓDIGO */}
            {paso === 2 && (
              <form
                onSubmit={handleVerificarCodigo}
                className="modal-form"
              >
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9rem',
                    gridColumn: 'span 2'
                  }}
                >
                  Ingresa el código de 6 dígitos enviado a{' '}
                  <b>{emailRecuperacion}</b>. Revisa también la carpeta
                  de correo no deseado.
                </p>

                <div
                  className="form-grupo"
                  style={{ gridColumn: 'span 2' }}
                >
                  <label>Código de verificación *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={codigo}
                    onChange={(e) =>
                      setCodigo(
                        e.target.value.replace(/\D/g, '').slice(0, 6)
                      )
                    }
                    required
                    placeholder="123456"
                  />
                </div>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={() => {
                      setPaso(1)
                      setCodigo('')
                    }}
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    className="btn-guardar"
                    disabled={procesando}
                  >
                    {procesando ? 'Verificando...' : 'Verificar código'}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 3: NUEVA CONTRASEÑA */}
            {paso === 3 && (
              <form
                onSubmit={handleCambiarPassword}
                className="modal-form"
              >
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.9rem',
                    gridColumn: 'span 2'
                  }}
                >
                  Código verificado. Ahora puedes crear una nueva
                  contraseña para tu cuenta.
                </p>

                <div
                  className="form-grupo"
                  style={{ gridColumn: 'span 2' }}
                >
                  <label>Nueva contraseña *</label>
                  <input
                    type="password"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div
                  className="form-grupo"
                  style={{ gridColumn: 'span 2' }}
                >
                  <label>Confirmar nueva contraseña *</label>
                  <input
                    type="password"
                    value={confirmarPassword}
                    onChange={(e) =>
                      setConfirmarPassword(e.target.value)
                    }
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={cerrarModalRecuperacion}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn-guardar"
                    disabled={procesando}
                  >
                    {procesando ? 'Guardando...' : 'Cambiar contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login