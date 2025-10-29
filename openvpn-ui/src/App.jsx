import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import ManageUsers from './pages/ManageUsers';
import LiveConnections from './pages/LiveConnections';
import './App.css';

// Este componente wrapper verifica se o usuário está logado
// Se não estiver, ele o redireciona para a página de login
function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  // Verifica se o token já existe no localStorage ao carregar
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('vpn_access_token')
  );
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    navigate('/');
  };

  // Precisamos de uma função de Logout no Layout agora
  // const handleLogout = () => {
  //   localStorage.removeItem('vpn_access_token');
  //   setIsAuthenticated(false);
  //   navigate('/login');
  // };

  return (
    <Routes>
      <Route
        path="/login"
        element={<Login onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {/* Passe a função de logout para o layout */}
            <Layout /* onLogout={handleLogout} */ />
          </ProtectedRoute>
        }
      >
        {/* ... (Rotas filhas idênticas) ... */}
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;