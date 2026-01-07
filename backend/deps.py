from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError
from backend.auth.jwt import decode_token
from backend.auth.models import User

security = HTTPBearer()



def get_current_user(credentials=Depends(security)) -> User:
    try:
        payload = decode_token(credentials.credentials)
        return User(
            id=payload["sub"],
            email=payload["email"],
            role=payload["role"],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

def require_role(role: str):
    def checker(user: User = Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(status_code=403)
        return user
    return checker

def require_nda(x_nda_signed: str | None = Header(default=None)):
    if x_nda_signed != "true":
        raise HTTPException(
            status_code=403,
            detail="NDA required before accessing this resource"
        )