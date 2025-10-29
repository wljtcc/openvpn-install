import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# --- Configuração de Segurança ---
# Use 'openssl rand -hex 32' para gerar chaves secretas fortes
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "chave-insegura-padrao-mude-isso")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 horas

# Usuário e senha do painel (lidos do ambiente)
ADMIN_USERNAME = os.environ.get("PANEL_ADMIN_USER", "admin")
ADMIN_PASSWORD_HASH = os.environ.get("PANEL_ADMIN_HASH")

# Se o HASH não estiver no ambiente, criamos um e avisamos.
# Em PRD, NUNCA use a senha pura. Gere o hash e coloque-o na variável de ambiente.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if not ADMIN_PASSWORD_HASH:
    print("=" * 50)
    print("AVISO: PANEL_ADMIN_HASH não definido.")
    print("Usando senha padrão 'admin'. ISSO NÃO É SEGURO.")
    print("Gere um hash com o script e defina a variável de ambiente.")
    print("=" * 50)
    # Para fins de exemplo, usamos 'admin' / 'admin'
    ADMIN_PASSWORD = os.environ.get("PANEL_ADMIN_PASS", "admin")
    ADMIN_PASSWORD_HASH = pwd_context.hash(ADMIN_PASSWORD)
else:
    # Verificamos se a senha 'admin' padrão funciona, se o hash estiver definido
    ADMIN_PASSWORD = os.environ.get("PANEL_ADMIN_PASS")


# --- Funções de Verificação ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def authenticate_user(username: str, password: str):
    if username != ADMIN_USERNAME:
        return False

    # Se a senha pura foi fornecida (ex: fallback dev), verifica com ela
    if ADMIN_PASSWORD and verify_password(password, ADMIN_PASSWORD_HASH):
        return True
    # Se apenas o hash foi fornecido, verifica com ele
    elif not ADMIN_PASSWORD and verify_password(password, ADMIN_PASSWORD_HASH):
        return True

    return False


# --- Funções de Token (JWT) ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- Dependência de Segurança ---

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != ADMIN_USERNAME:
            raise credentials_exception
        # Em um app real, aqui você buscaria o usuário no DB
        return {"username": username}

    except JWTError:
        raise credentials_exception


# --- Script para gerar hash de senha ---
if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print(f"Uso: python {sys.argv[0]} <sua-senha-segura>")
    else:
        print(f"Seu HASH BCRYPT (defina como PANEL_ADMIN_HASH):")
        print(get_password_hash(sys.argv[1]))