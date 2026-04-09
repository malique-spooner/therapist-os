from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import hashlib
import secrets

from passlib.context import CryptContext
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models.auth import AdminUser, AuthSession

password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


@dataclass
class AuthenticatedSession:
    user: AdminUser
    session: AuthSession


def normalize_email(value: str) -> str:
    return value.strip().lower()


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_session_expiry(remember: bool) -> datetime:
    if remember:
        return datetime.now(UTC).replace(tzinfo=None) + timedelta(days=settings.AUTH_REMEMBER_DAYS)
    return datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.AUTH_SESSION_HOURS)


def ensure_admin_user(db: Session) -> None:
    email = normalize_email(settings.ADMIN_EMAIL)
    password = settings.ADMIN_PASSWORD.strip()
    if not email or not password:
        return

    user = db.scalar(select(AdminUser).where(AdminUser.email == email))
    if user is None:
        db.add(
            AdminUser(
                email=email,
                display_name=settings.ADMIN_NAME.strip() or "Admin",
                password_hash=hash_password(password),
                is_active=True,
            )
        )
        db.commit()
        return

    changed = False
    desired_name = settings.ADMIN_NAME.strip() or user.display_name
    if user.display_name != desired_name:
        user.display_name = desired_name
        changed = True
    if not verify_password(password, user.password_hash):
        user.password_hash = hash_password(password)
        changed = True
    if not user.is_active:
        user.is_active = True
        changed = True
    if changed:
        db.commit()


def any_admin_users(db: Session) -> bool:
    return db.scalar(select(AdminUser.id).limit(1)) is not None


def authenticate_admin(db: Session, email: str, password: str) -> AdminUser | None:
    normalized = normalize_email(email)
    user = db.scalar(select(AdminUser).where(AdminUser.email == normalized))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        return None
    return user


def create_auth_session(db: Session, user: AdminUser, remember: bool) -> tuple[str, AuthSession]:
    token = secrets.token_urlsafe(48)
    auth_session = AuthSession(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=build_session_expiry(remember),
    )
    db.add(auth_session)
    db.commit()
    db.refresh(auth_session)
    return token, auth_session


def get_authenticated_session(db: Session, token: str) -> AuthenticatedSession | None:
    auth_session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_session_token(token)))
    if auth_session is None:
        return None
    if auth_session.expires_at <= datetime.utcnow():
        db.delete(auth_session)
        db.commit()
        return None
    user = db.get(AdminUser, auth_session.user_id)
    if user is None or not user.is_active:
        db.delete(auth_session)
        db.commit()
        return None

    auth_session.last_seen_at = datetime.utcnow()
    db.commit()
    return AuthenticatedSession(user=user, session=auth_session)


def revoke_session_by_token(db: Session, token: str) -> None:
    db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_session_token(token)))
    db.commit()
