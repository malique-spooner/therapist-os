from pydantic import BaseModel


class NutritionDaySchema(BaseModel):
    date: str
    meals: dict[str, bool]
    foodQuality: int
    caffeine: dict[str, int | bool]
    alcohol: dict[str, int]


class NutritionCreateSchema(BaseModel):
    meals: dict[str, bool]
    foodQuality: int
    caffeine: dict[str, int | bool]
    alcohol: dict[str, int]
