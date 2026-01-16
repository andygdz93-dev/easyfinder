from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from core.jwt import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

def require_scope(scope: str):
    def checker(user=Depends(get_current_user)):
        if scope not in user.get("scopes", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing scope: {scope}",
            )
        return user
    return checker
