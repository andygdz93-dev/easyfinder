from fastapi import Request, HTTPException, status

def require_nda(request: Request):
    """
    Blocks access unless NDA is signed.
    Later this will read from JWT / DB.
    """

    nda_signed = request.headers.get("X-NDA-SIGNED")

    if nda_signed != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="NDA required before accessing this resource"
        )

    return True
