from fastapi import Request, HTTPException
from utils.security import verify_jwt_token  # Validación de JWT

def authenticate_request(request: Request):
    """
    Verifica la autenticación del usuario mediante JWT en los encabezados de la solicitud.
    """
    auth_header = request.headers.get("Authorization")

    # Si no hay token en la cabecera o no comienza con "Bearer ", se rechaza la solicitud
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticación faltante o inválido")

    token = auth_header.split("Bearer ")[-1]

    try:
        # Verificamos el token con la función de `security.py`
        payload = verify_jwt_token(token)
        
        # Si el token es válido, almacenar info del usuario en la solicitud
        request.state.user = payload  

    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
