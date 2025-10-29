import React, { useState } from 'react';
import apiClient from '../api'; // Importamos a API

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // O endpoint /api/token espera dados de formulário, não JSON
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await apiClient.post('/api/token', formData);

      // Sucesso! Armazena o token e chama a função de sucesso
      localStorage.setItem('vpn_access_token', response.data.access_token);
      onLoginSuccess();

    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Usuário ou senha inválidos.');
      } else {
        setError('Erro de conexão com a API.');
      }
      console.error(err);
    }
    setLoading(false);
  };

  return (
    // ... (O JSX do Bulma não muda) ...
    <section className="hero is-fullheight is-light">
      <div className="hero-body">
        <div className="container" style={{ maxWidth: '400px' }}>
          <div className="box">
            {/* ... (h2, p) ... */}
            <form onSubmit={handleSubmit}>
              <div className="field">
                {/* ... (label, input username) ... */}
              </div>
              <div className="field">
                {/* ... (label, input password) ... */}
              </div>
              {error && ( /* ... notificação de erro ... */ )}
              <div className="field">
                <div className="control">
                  <button
                    type="submit"
                    className={`button is-primary is-fullwidth ${loading ? 'is-loading' : ''}`}
                    disabled={loading}
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;