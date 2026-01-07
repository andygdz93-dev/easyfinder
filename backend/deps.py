from fastapi import Depends, HTTPException, status
from backend.auth.models import User


def require_nda(user: User = Depends()):
    if not user.nda_signed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="NDA required before accessing this resource"
        )
    return user
