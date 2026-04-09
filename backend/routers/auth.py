from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..middleware.auth import get_current_admin_user, get_session_token_from_request
from ..schemas.auth import AuthStatusSchema, AuthUserSchema, LoginRequestSchema, LoginResponseSchema
from ..services.auth import any_admin_users, authenticate_admin, create_auth_session, revoke_session_by_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_secure() -> bool:
    return settings.ENVIRONMENT == "production" or settings.FRONTEND_URL.startswith("https://")


def _cookie_max_age(expires_at: datetime) -> int:
    expiry = expires_at.replace(tzinfo=timezone.utc)
    seconds = int((expiry - datetime.now(timezone.utc)).total_seconds())
    return max(seconds, 0)


def _set_auth_cookie(response: Response, token: str, expires_at: datetime) -> None:
    expires_utc = expires_at.replace(tzinfo=timezone.utc)
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=_cookie_max_age(expires_at),
        expires=expires_utc,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        path="/",
    )


@router.get("/status", response_model=AuthStatusSchema)
def auth_status(db: Session = Depends(get_db)) -> dict:
    return {"configured": any_admin_users(db)}


@router.post("/login", response_model=LoginResponseSchema)
def login(payload: LoginRequestSchema, response: Response, db: Session = Depends(get_db)) -> dict:
    user = authenticate_admin(db, payload.email, payload.password)
    if user is None:
        if not any_admin_users(db):
            raise HTTPException(status_code=503, detail="Admin account is not configured on the server.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token, auth_session = create_auth_session(db, user, remember=payload.remember)
    _set_auth_cookie(response, token, auth_session.expires_at)
    return {"user": {"id": user.id, "email": user.email, "displayName": user.display_name}}


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user=Depends(get_current_admin_user),
) -> dict:
    token = get_session_token_from_request(request)
    if token:
        revoke_session_by_token(db, token)
    _clear_auth_cookie(response)
    return {"detail": "Logged out"}


@router.get("/me", response_model=AuthUserSchema)
def me(user=Depends(get_current_admin_user)) -> dict:
    return {"id": user.id, "email": user.email, "displayName": user.display_name}
