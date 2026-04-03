from __future__ import annotations

from base64 import urlsafe_b64encode
import hashlib

from cryptography.fernet import Fernet

from ..config import settings


class SecretBox:
    def __init__(self, secret: str) -> None:
        material = secret or settings.API_SECRET_KEY
        digest = hashlib.sha256(material.encode("utf-8")).digest()
        self._fernet = Fernet(urlsafe_b64encode(digest))

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt(self, value: str) -> str:
        return self._fernet.decrypt(value.encode("utf-8")).decode("utf-8")


secret_box = SecretBox(settings.DATA_SOURCE_ENCRYPTION_KEY)
