from pydantic import BaseModel


class WeatherDaySchema(BaseModel):
    date: str
    sunriseTime: str
    sunsetTime: str
    daylightHours: float
    temperatureHighC: float | None = None
    temperatureLowC: float | None = None
    condition: str | None = None
    uvIndex: float | None = None
