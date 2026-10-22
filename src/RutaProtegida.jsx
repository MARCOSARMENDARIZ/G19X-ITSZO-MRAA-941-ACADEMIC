
import { Navigate, Outlet } from 'react-router-dom'

function RutaProtegida() {
  let usuario = null

  try {
    const datos = localStorage.getItem('usuario')

    if (datos) {
      const usuarioParseado = JSON.parse(datos)

      if (usuarioParseado && usuarioParseado.id) {
        usuario = usuarioParseado
      }
    }
  } catch (error) {
    localStorage.removeItem('usuario')
  }

  if (!usuario) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default RutaProtegida
