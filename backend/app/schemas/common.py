from typing import Literal

from pydantic import BaseModel


Period = Literal["today", "this-week", "last-week", "this-month", "last-month", "3-months"]


class MessageResponse(BaseModel):
    detail: str
