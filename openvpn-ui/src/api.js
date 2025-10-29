import axios from 'axios';

// 1. A URL da API agora é relativa!
// Assumindo que a API será servida em /api no mesmo domínio.
// Isso resolve TODOS os problemas de CORS em produção.
const apiClient = axios.create({
  baseURL: '/'
});

// 2. Interceptor: Adiciona o Token a CADA requisição
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vpn_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Interceptor: Lida com erros 401 (Token expirado)
// Redireciona para o login se o token for inválido
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Limpa o token e força o recarregamento para a página de login
      localStorage.removeItem('vpn_access_token');
      // O App.jsx (ProtectedRoute) cuidará do redirecionamento
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;