from __future__ import annotations

import io
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import httpx
from ..config import settings

KOKORO_VOICES = [
    "af_heart",
    "af_bella",
    "af_sky",
    "am_adam",
    "am_michael",
    "bf_emma",
    "bf_isabella",
    "bm_george",
]


class PiperTTSService:
    @property
    def binary_path(self) -> str:
        return settings.PIPER_BINARY

    @property
    def voice_dir(self) -> Path:
        return Path(settings.PIPER_VOICE_DIR)

    @property
    def voice_model_path(self) -> Path:
        filename = settings.PIPER_VOICE_MODEL_URL.rstrip("/").split("/")[-1]
        return self.voice_dir / filename

    @property
    def voice_config_path(self) -> Path:
        filename = settings.PIPER_VOICE_CONFIG_URL.rstrip("/").split("/")[-1]
        return self.voice_dir / filename

    @property
    def is_available(self) -> bool:
        return bool(shutil.which(self.binary_path))

    def _download_if_missing(self, url: str, target: Path) -> None:
        if target.exists():
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        with httpx.stream("GET", url, timeout=60.0, follow_redirects=True) as response:
            response.raise_for_status()
            with target.open("wb") as output:
                for chunk in response.iter_bytes():
                    output.write(chunk)

    def _ensure_voice_assets(self) -> tuple[Path, Path]:
        self._download_if_missing(settings.PIPER_VOICE_MODEL_URL, self.voice_model_path)
        self._download_if_missing(settings.PIPER_VOICE_CONFIG_URL, self.voice_config_path)
        return self.voice_model_path, self.voice_config_path

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        if not self.is_available:
            raise RuntimeError("Piper is not installed on this machine")

        model_path, _ = self._ensure_voice_assets()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as output:
            output_path = output.name

        try:
            process = subprocess.run(
                [self.binary_path, "--model", str(model_path), "--output_file", output_path],
                input=text,
                text=True,
                capture_output=True,
                check=False,
            )
            if process.returncode != 0:
                error = (process.stderr or process.stdout or "unknown Piper error").strip()
                raise RuntimeError(f"Piper synthesis failed: {error}")

            return Path(output_path).read_bytes()
        finally:
            if os.path.exists(output_path):
                os.remove(output_path)


class KokoroTTSService:
    def __init__(self) -> None:
        self._kokoro = None

    @property
    def model_dir(self) -> Path:
        return Path(settings.KOKORO_MODEL_DIR)

    @property
    def model_path(self) -> Path:
        return self.model_dir / settings.KOKORO_MODEL_URL.rstrip("/").split("/")[-1]

    @property
    def voices_path(self) -> Path:
        return self.model_dir / settings.KOKORO_VOICES_URL.rstrip("/").split("/")[-1]

    def _download_if_missing(self, url: str, target: Path) -> None:
        if target.exists():
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        with httpx.stream("GET", url, timeout=120.0, follow_redirects=True) as response:
            response.raise_for_status()
            with target.open("wb") as output:
                for chunk in response.iter_bytes():
                    output.write(chunk)

    def _ensure_model(self):
        if self._kokoro is not None:
            return self._kokoro

        self._download_if_missing(settings.KOKORO_MODEL_URL, self.model_path)
        self._download_if_missing(settings.KOKORO_VOICES_URL, self.voices_path)
        try:
            from kokoro_onnx import Kokoro
        except Exception as exc:  # pragma: no cover - only hit if optional runtime package is missing
            raise RuntimeError("Kokoro TTS is not installed in this environment") from exc

        self._kokoro = Kokoro(str(self.model_path), str(self.voices_path))
        return self._kokoro

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        kokoro = self._ensure_model()
        selected_voice = voice or settings.THERAPIST_DEFAULT_TTS_VOICE
        try:
            samples, sample_rate = kokoro.create(text, voice=selected_voice, speed=0.93, lang="en-us")
        except TypeError:
            samples, sample_rate = kokoro.create(text, voice=selected_voice, speed=0.93)
        import soundfile as sf
        buffer = io.BytesIO()
        sf.write(buffer, samples, sample_rate, format="WAV")
        return buffer.getvalue()


class TherapistTTSService:
    def __init__(self) -> None:
        self.kokoro = KokoroTTSService()
        self.piper = PiperTTSService()

    async def synthesize(self, text: str, provider: str | None = None, voice: str | None = None) -> bytes:
        selected_provider = (provider or settings.THERAPIST_DEFAULT_TTS_PROVIDER or "kokoro").lower()

        if selected_provider == "piper":
            return await self.piper.synthesize(text, voice=voice)

        try:
            return await self.kokoro.synthesize(text, voice=voice or settings.THERAPIST_DEFAULT_TTS_VOICE)
        except Exception as exc:
            try:
                return await self.piper.synthesize(text, voice=None)
            except Exception as fallback_exc:
                raise RuntimeError(f"Kokoro TTS failed and Piper fallback failed: {exc}; {fallback_exc}") from fallback_exc
