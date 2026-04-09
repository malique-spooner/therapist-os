from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..services.auth import get_authenticated_session


def get_session_token_from_request(request: Request) -> str | None:
    return request.cookies.get(settings.AUTH_COOKIE_NAME)


def get_current_admin_user(request: Request, db: Session = Depends(get_db)):
    token = get_session_token_from_request(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    authenticated = get_authenticated_session(db, token)
    if authenticated is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return authenticated.user


async def verify_api_key(
    request: Request,
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None),
) -> None:
    if x_api_key and x_api_key == settings.API_SECRET_KEY:
        return

    token = get_session_token_from_request(request)
    if token:
        authenticated = get_authenticated_session(db, token)
        if authenticated is not None:
            request.state.current_admin_user = authenticated.user
            return

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
