import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api'; // Importamos nossa API centralizada

function LiveConnections() {
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState(null);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/connections');
      setConnections(response.data.connected_clients);
    } catch (err) {
      console.error(err);
      setError('Falha ao buscar conexões. Verifique a API Key e a URL.');
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    const interval = setInterval(fetchConnections, 10000); // Auto-atualiza
    return () => clearInterval(interval);
  }, [fetchConnections]);

  return (
    <>
      <h1 className="title">Conexões Ativas ({connections.length})</h1>

      {error && (
        <div className="notification is-danger is-light mb-4">
          <button className="delete" onClick={() => setError(null)}></button>
          {error}
        </div>
      )}

      <div className="box">
        <div className="table-container">
          <table className="table is-fullwidth is-striped is-hoverable">
            <thead>
              <tr>
                <th>Nome</th>
                <th>IP Real</th>
                <th>Conectado Desde</th>
              </tr>
            </thead>
            <tbody>
              {connections.length === 0 ? (
                <tr>
                  <td colSpan="3" className="has-text-centered">Nenhum usuário conectado.</td>
                </tr>
              ) : (
                connections.map(c => (
                  <tr key={c.common_name}>
                    <td>{c.common_name}</td>
                    <td>{c.real_address}</td>
                    <td>{c.connected_since}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default LiveConnections;