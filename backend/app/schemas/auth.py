from pydantic import BaseModel, Field


class LoginRequestSchema(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=255)
    remember: bool = False


class AuthUserSchema(BaseModel):
    id: int
    email: str
    displayName: str


class LoginResponseSchema(BaseModel):
    user: AuthUserSchema


class AuthStatusSchema(BaseModel):
    configured: bool
