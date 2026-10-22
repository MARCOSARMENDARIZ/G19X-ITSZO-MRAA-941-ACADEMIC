
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RutaProtegida from './RutaProtegida'

import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Perfil from './pages/Perfil'
import Configuracion from './pages/configuracion'
import Evaluaciones from './pages/Evaluaciones'
import Bienestar from './pages/Bienestar'
import Chatbot from './pages/Chatbot'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RutaProtegida />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/evaluaciones" element={<Evaluaciones />} />
          <Route path="/bienestar" element={<Bienestar />} />
          <Route path="/chat" element={<Chatbot />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
