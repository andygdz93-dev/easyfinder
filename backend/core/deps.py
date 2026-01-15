from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from core.jwt import decode_token, JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        return decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_paid(user=Depends(get_current_user)):
    if user.get("tier") != "paid":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Paid plan required",
        )
    return user
