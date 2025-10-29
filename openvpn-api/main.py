import os
import re
import subprocess
from fastapi import FastAPI, HTTPException, Security, Request, Depends
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

# Importamos nossa nova lógica de auth
import auth

# --- Configuração ---
app = FastAPI(
    title="OpenVPN Control API",
    description="API para gerenciar usuários do OpenVPN (baseado no script Nyr/easyrsa)"
)

# Caminhos (ajuste se o seu script instalou em outro lugar)
EASY_RSA_DIR = "/etc/openvpn/server/easy-rsa"
PKI_DIR = os.path.join(EASY_RSA_DIR, "pki")
INDEX_FILE = os.path.join(PKI_DIR, "index.txt")
CLIENT_CONFIG_COMMON = "/etc/openvpn/server/client-common.txt"
STATUS_LOG = "/var/log/openvpn-status.log"

# --- Segurança Simples com Chave de API ---
# Em produção, use OAuth2/JWT.
# Execute a API com: API_KEY="sua-chave-secreta" uvicorn main:app
# API_KEY = os.environ.get("API_KEY", "chave-padrao-insegura")
API_KEY="HwT7HxefMxXGGlx98jGvSDG7JN3KWrJyajiRSN1MP0EghKZBrmqdsaMSwzarCgqV9KVyTYUmONR4v1yGVtEky00ekBp8NkBgxUl8yXBChLlqtXa6btzQQLpcU8ZmKbpG"
api_key_header = APIKeyHeader(name="X-API-Key")


async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == API_KEY:
        return api_key
    else:
        raise HTTPException(status_code=403, detail="Chave de API inválida ou ausente")


class ClientRequest(BaseModel):
    username: str


# --- Funções Auxiliares (Lógica de Negócio) ---
def parse_status_log():
    """Lê o log de status do OpenVPN e extrai os clientes conectados."""
    connections = []
    try:
        with open(STATUS_LOG, 'r') as f:
            content = f.read()

        # O log tem seções. Queremos a "CLIENT LIST"
        client_list_match = re.search(r"CLIENT LIST\n(.*?)\nROUTING TABLE", content, re.DOTALL)
        if not client_list_match:
            return []  # Ninguém conectado ou log ainda não foi escrito

        client_lines = client_list_match.group(1).split('\n')

        # Pula o header e a data de atualização
        for line in client_lines[2:]:
            parts = line.split(',')
            if len(parts) >= 5:
                connections.append({
                    "common_name": parts[0],
                    "real_address": parts[1],
                    "bytes_received": int(parts[2]),
                    "bytes_sent": int(parts[3]),
                    "connected_since": parts[4]
                })
        return connections
    except Exception as e:
        print(f"Erro ao ler log de status: {e}")
        return []  # Retorna lista vazia em caso de erro


def get_existing_clients():
    """Lê o 'banco de dados' index.txt do easy-rsa para listar clientes VÁLIDOS."""
    clients = []
    try:
        with open(INDEX_FILE, 'r') as f:
            for line in f:
                # 'V' significa Válido (não revogado)
                if line.startswith('V'):
                    parts = line.split('=')
                    if len(parts) > 1:
                        # O nome do cliente está após o último '='
                        common_name = parts[-1].strip()
                        if common_name != "server":  # Ignora o próprio servidor
                            clients.append(common_name)
        return clients
    except Exception as e:
        print(f"Erro ao ler index.txt: {e}")
        return []


def run_shell_command(command, cwd):
    """Executa um comando shell com sudo e captura a saída."""
    # Usamos 'sudo' e 'bash -c'
    full_command = f"sudo /bin/bash -c \"{command}\""

    try:
        # 'shell=True' é necessário aqui por causa do 'sudo'.
        # Isso é um risco de segurança se a entrada (username) não for VALIDADA.
        result = subprocess.run(
            full_command,
            cwd=cwd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        return {"success": True, "stdout": result.stdout, "stderr": result.stderr}
    except subprocess.CalledProcessError as e:
        return {"success": False, "stdout": e.stdout, "stderr": e.stderr}


# --- Endpoints da API ---
@app.get("/api/__health")
async def get_health():
    """Endpoint de health check."""
    return {"health": "ok"}

# Endpoint de Login (Token)
@app.post("/api/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_authenticated = auth.authenticate_user(form_data.username, form_data.password)
    if not user_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/status")
async def get_status(user: dict = Depends(auth.get_current_user)):
    """Endpoint de health check."""
    return {"status": "ok", "authenticated_user": user['username']}


@app.get("/api/connections", dependencies=[Depends(auth.get_current_user)])
async def list_connected_clients():
    """Lista todos os clientes ATUALMENTE conectados (do log de status)."""
    connections = parse_status_log()
    return {"connected_clients": connections}

@app.get("/api/users", dependencies=[Depends(auth.get_current_user)])
async def list_existing_clients():
    """Lista todos os clientes que JÁ FORAM CRIADOS (do index.txt)."""
    clients = get_existing_clients()
    return {"existing_clients": clients}

@app.post("/api/users", dependencies=[Depends(auth.get_current_user)])
async def create_client(client: ClientRequest):
    """Cria um novo cliente e retorna seu arquivo .ovpn."""
    # ... (NENHUMA MUDANÇA DENTRO DESTA FUNÇÃO) ...
    # (A lógica de validação, run_shell_command, etc., permanece a mesma)
    username = client.username
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise HTTPException(status_code=400, detail="Nome de usuário inválido...")
    # ... (resto da função) ...
    return FileResponse(path="/tmp/temp.ovpn", filename=f"{username}.ovpn") # Exemplo


@app.delete("/api/users/{username}", dependencies=[Depends(auth.get_current_user)])
async def revoke_client(username: str):
    """Revoga (exclui) um cliente existente."""
    # ... (NENHUMA MUDANÇA DENTRO DESTA FUNÇÃO) ...
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise HTTPException(status_code=400, detail="Nome de usuário inválido.")
    # ... (resto da função) ...
    return {"message": f"Cliente {username} revogado com sucesso."}