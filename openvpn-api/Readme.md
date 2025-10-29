## Backend
### Requisitos

```shell
    pip install fastapi "uvicorn[standard]"
    
    # No seu venv do backend
    pip install "passlib[bcrypt]" "python-jose[cryptography]" "python-multipart"
```


## Frontend

### Requisitos

1. Download and install nvm:
```shell
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```
2. restarting the shell
```shell
    \. "$HOME/.nvm/nvm.sh"
```
3. Download and install Node.js:
```shell
    nvm install 24
```
4. Verify the Node.js version:
    
```shell
  node -v # Should print "v24.11.0".
```
5. Verify npm version:
```shell
  npm -v # Should print "11.6.1".
```

## Install em PRD

#### Parte 3: Implantação em Produção (Infraestrutura)

Agora que a aplicação está segura, podemos implantá-la.

1. Segurança do Servidor (sudoers) - O MAIS IMPORTANTE

A API não pode rodar como root. Criaremos um usuário para ela e daremos permissão NOPASSWD apenas para os comandos necessários.

a. Crie um usuário de serviço:

Bash

sudo adduser --system --no-create-home --group openvpnapi
b. Edite as permissões sudo (use sudo visudo): Adicione esta linha no final do arquivo /etc/sudoers. Isso permite que o usuário openvpnapi rode os comandos do easyrsa e manipule a CRL sem senha.

# Permissões para o serviço da API OpenVPN
openvpnapi ALL=(ALL) NOPASSWD: /etc/openvpn/server/easy-rsa/easyrsa, \
                           /usr/bin/cp /etc/openvpn/server/easy-rsa/pki/crl.pem /etc/openvpn/server/crl.pem, \
                           /usr/bin/chown nobody:nogroup /etc/openvpn/server/crl.pem, \
                           /usr/bin/rm /tmp/*.ovpn, \
                           /usr/bin/rm /etc/openvpn/server/easy-rsa/pki/inline/private/*.inline
(Nota: Ajuste nobody:nogroup para seu OS se for diferente, ex: nobody:nobody)

2. O Backend (Gunicorn + Systemd)

a. Instale o Gunicorn no seu venv:

Bash

# na pasta ~/openvpn-api e com o venv ativado
pip install gunicorn
b. Crie um arquivo de serviço systemd:

Arquivo: /etc/systemd/system/openvpn-api.service

Ini, TOML

[Unit]
Description=Gunicorn service for OpenVPN API
After=network.target

[Service]
# Usuário e Grupo que criamos
User=openvpnapi
Group=openvpnapi

WorkingDirectory=/home/seu_usuario/openvpn-api
# Arquivo de ambiente para nossas chaves secretas
EnvironmentFile=/etc/openvpn-api.env 

ExecStart=/home/seu_usuario/openvpn-api/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind unix:/run/openvpn-api.sock \
    main:app

Restart=on-failure

[Install]
WantedBy=multi-user.target
c. Crie o arquivo de ambiente para as chaves secretas (NÃO COLOQUE NO GIT):

Arquivo: /etc/openvpn-api.env

Bash

# Gere um hash para a senha 'admin123' rodando:
# python3 /home/seu_usuario/openvpn-api/auth.py 'admin123'
# E cole o hash aqui.
PANEL_ADMIN_USER="admin"
PANEL_ADMIN_HASH="$2b$12$Ea...seu-hash-aqui..." 

# Gere uma chave secreta rodando: openssl rand -hex 32
JWT_SECRET_KEY="sua-chave-secreta-de-32-bytes-aqui"
d. Inicie o serviço:

Bash

sudo systemctl daemon-reload
sudo systemctl start openvpn-api
sudo systemctl enable openvpn-api
# Verifique o status:
sudo systemctl status openvpn-api
3. O Frontend (npm run build)

a. Navegue até a pasta do frontend (~/openvpn-ui). b. IMPORTANTE: Apague o .env antigo. Ele não é mais usado para login. c. Execute o build:

Bash

npm run build
Isso cria uma pasta dist com todos os seus arquivos estáticos otimizados.

4. O Servidor Web (Nginx + HTTPS)

Finalmente, configuramos o Nginx para servir o frontend estático e fazer proxy da API.

a. Instale o Nginx e o Certbot (para HTTPS):

Bash

sudo apt install nginx python3-certbot-nginx
b. Crie uma configuração do Nginx:

Arquivo: /etc/nginx/sites-available/openvpn-panel

Nginx

server {
    # Mude para seu domínio
    server_name vpn.seuservidor.com;

    # Localização dos arquivos estáticos do React (o resultado do 'npm run build')
    root /home/seu_usuario/openvpn-ui/dist;
    index index.html;

    # Bloco 1: Servir o Frontend (React)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Bloco 2: Fazer o proxy da API
    # Todas as requisições para /api/ (ex: /api/token)
    # serão enviadas para o nosso socket Gunicorn
    location /api/ {
        proxy_pass http://unix:/run/openvpn-api.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Configurações de limite de upload, logs, etc.
    client_max_body_size 1M;
    error_log /var/log/nginx/vpn-panel.error.log;
    access_log /var/log/nginx/vpn-panel.access.log;
}
c. Ative o site e rode o Certbot para HTTPS:

Bash

# Ativa a configuração
sudo ln -s /etc/nginx/sites-available/openvpn-panel /etc/nginx/sites-enabled/
# Remove o site padrão se existir
sudo rm /etc/nginx/sites-enabled/default 
# Testa a configuração
sudo nginx -t
# Reinicia o Nginx
sudo systemctl restart nginx
# Roda o Certbot para obter o SSL (siga as instruções)
sudo certbot --nginx -d vpn.seuservidor.com