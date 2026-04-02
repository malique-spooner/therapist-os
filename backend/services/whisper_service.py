from __future__ import annotations

from pathlib import Path

import httpx

from ..config import settings
from ..core.logging import get_logger

logger = get_logger(__name__)


class WhisperService:
    MODEL_URLS = {
        "base.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
        "small.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
        "medium.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin",
    }

    def __init__(self) -> None:
        self._model = None

    @property
    def model_path(self) -> Path:
        return Path("/models") / f"ggml-{settings.WHISPER_MODEL}.bin"

    @property
    def is_available(self) -> bool:
        try:
            from whisper_cpp_python import Whisper  # noqa: F401
        except Exception:
            return False
        return True

    def _ensure_model_file(self) -> Path:
        target = self.model_path
        if target.exists():
            return target

        target.parent.mkdir(parents=True, exist_ok=True)
        url = self.MODEL_URLS.get(settings.WHISPER_MODEL)
        if not url:
            raise RuntimeError(f"Unsupported Whisper model: {settings.WHISPER_MODEL}")

        logger.info(
            "whisper_model_download_start",
            extra={"event": "whisper_model_download_start", "extra_data": {"model": settings.WHISPER_MODEL}},
        )
        with httpx.stream("GET", url, timeout=60.0, follow_redirects=True) as response:
            response.raise_for_status()
            with target.open("wb") as output:
                for chunk in response.iter_bytes():
                    output.write(chunk)
        return target

    def _ensure_model(self):
        if not self.is_available:
            raise RuntimeError("Whisper transcription is not available in this environment")
        if self._model is None:
            from whisper_cpp_python import Whisper

            model_path = self._ensure_model_file()
            self._model = Whisper(model_path=str(model_path))
        return self._model

    async def transcribe(self, audio_file_path: str) -> str:
        model = self._ensure_model()
        result = model.transcribe(audio_file_path)
        text = (result.get("text") or "").strip()
        if not text:
            raise RuntimeError("Whisper did not return any transcription text")
        return text
