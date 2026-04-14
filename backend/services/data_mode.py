from __future__ import annotations

from sqlalchemy.sql.elements import ColumnElement
from sqlalchemy.sql.expression import false


DataMode = str


def normalize_data_mode(mode: str | None) -> DataMode:
    # Legacy mode selection is retired; everything routes through the live dataset.
    return "real-only"


def demo_filter(mode: str | None, column) -> ColumnElement[bool]:
    return false()


def dataset_model(mode: str | None, real_model, demo_model):
    return real_model
