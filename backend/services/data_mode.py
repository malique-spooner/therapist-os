from __future__ import annotations

from sqlalchemy.sql.elements import ColumnElement


DataMode = str


def normalize_data_mode(mode: str | None) -> DataMode:
    if mode == "real-only":
        return "real-only"
    return "demo-only"


def demo_filter(mode: str | None, column) -> ColumnElement[bool]:
    normalized = normalize_data_mode(mode)
    return column.is_(normalized == "demo-only")


def dataset_model(mode: str | None, real_model, demo_model):
    return demo_model if normalize_data_mode(mode) == "demo-only" else real_model
