import React, { useState, useEffect, useCallback } from 'react';
import { saveAs } from 'file-saver';
import apiClient from '../api'; // Importamos nossa API centralizada

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/users');
      setUsers(response.data.existing_clients);
    } catch (err) {
      console.error(err);
      setError('Falha ao buscar lista de usuários.');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName) return;
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/users',
        { username: newUserName },
        { responseType: 'blob' }
      );
      saveAs(response.data, `${newUserName}.ovpn`);
      setNewUserName('');
      fetchUsers();
    } catch (err) {
      // (Lógica de tratamento de erro idêntica à anterior)
      console.error(err);
      if (err.response?.status === 409) {
        setError('Erro: Usuário já existe.');
      } else if (err.response?.status === 400) {
        setError('Erro: Nome de usuário inválido.');
      } else {
        setError(`Falha ao criar usuário.`);
      }
    }
    setLoading(false);
  };

  const handleRevokeUser = async (username) => {
    if (!window.confirm(`Tem certeza que deseja revogar ${username}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/api/users/${username}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Falha ao revogar usuário.');
    }
    setLoading(false);
  };


  return (
    <>
      <h1 className="title">Gerenciar Usuários</h1>

      {error && (
        <div className="notification is-danger is-light mb-4">
          <button className="delete" onClick={() => setError(null)}></button>
          {error}
        </div>
      )}

      {/* Card 1: Criar Usuário */}
      <div className="box">
        <h2 className="title is-5">Criar Novo Usuário</h2>
        <form onSubmit={handleCreateUser}>
          <div className="field has-addons">
            <div className="control is-expanded">
              <input
                className="input"
                type="text"
                placeholder="NomeDoUsuario"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="control">
              <button
                type="submit"
                className={`button is-success ${loading ? 'is-loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar e Baixar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Card 2: Gerenciar Usuários (com a função "deletar") */}
      <div className="box">
        <h2 className="title is-5">Usuários Existentes ({users.length})</h2>
        {users.length === 0 ? (
          <p className="has-text-centered">Nenhum usuário criado.</p>
        ) : (
          users.map(user => (
            <article className="media" key={user}>
              <div className="media-content">
                <div className="content">
                  <p><strong>{user}</strong></p>
                </div>
              </div>
              <div className="media-right">
                <button
                  className={`button is-danger ${loading ? 'is-loading' : ''}`}
                  onClick={() => handleRevokeUser(user)}
                  disabled={loading}
                >
                  Revogar (Deletar)
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}

export default ManageUsers;