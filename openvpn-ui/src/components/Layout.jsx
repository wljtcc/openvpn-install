import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="columns is-gapless">
      {/* Coluna 1: Sidebar (Menu) */}
      <div className="column is-2-desktop is-3-tablet">
        <aside className="menu p-4" style={{ height: '100vh', backgroundColor: '#f5f5f5' }}>
          <p className="menu-label">
            OpenVPN
          </p>
          <ul className="menu-list">
            <li>
              {/* NavLink é como um <a>, mas que sabe qual rota está ativa */}
              <NavLink to="/" end>
                Gerenciar Usuários
              </NavLink>
            </li>
            <li>
              <NavLink to="/connections">
                Conexões Ativas
              </NavLink>
            </li>
          </ul>
          {/* Adicione mais links aqui, como "Sair" */}
        </aside>
      </div>

      {/* Coluna 2: Conteúdo da Página */}
      <div className="column is-10-desktop is-9-tablet">
        {/* 'Outlet' é onde o React Router renderizará a página ativa */}
        <section className="section">
          <div className="container is-fluid">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}

export default Layout;