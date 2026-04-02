from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from statistics import mean

from sqlalchemy.orm import Session

from ..models import FinanceData, HabitLog, HealthData, LocationDailySummary, MusicData, UserProfile, WeatherData
from .periods import date_window


@dataclass
class InsightCard:
    id: str
    category: str
    categoryIcon: str
    lens: str
    narrative: str
    action: str


class InsightsService:
    def load_period_data(self, db: Session, period: str) -> dict:
        start, end = date_window(period)
        return {
            "health": db.query(HealthData).filter(HealthData.date.between(start, end)).order_by(HealthData.date).all(),
            "finance": db.query(FinanceData).filter(FinanceData.date.between(start, end)).order_by(FinanceData.date).all(),
            "habits": db.query(HabitLog).filter(HabitLog.date.between(start, end)).order_by(HabitLog.date).all(),
            "weather": db.query(WeatherData).filter(WeatherData.date.between(start, end)).order_by(WeatherData.date).all(),
            "music": db.query(MusicData).filter(MusicData.date.between(start, end)).order_by(MusicData.date).all(),
            "location": db.query(LocationDailySummary).filter(LocationDailySummary.date.between(start, end)).order_by(LocationDailySummary.date).all(),
            "profile": db.query(UserProfile).limit(1).one_or_none(),
        }

    def generate_dashboard_insights(self, period: str, db: Session) -> list[dict]:
        data = self.load_period_data(db, period)
        health: list[HealthData] = data["health"]
        finance: list[FinanceData] = data["finance"]
        habits: list[HabitLog] = data["habits"]
        weather: list[WeatherData] = data["weather"]
        music: list[MusicData] = data["music"]
        location: list[LocationDailySummary] = data["location"]

        cards: list[InsightCard] = []

        workout_logs = [log for log in habits if log.habit_id == "workout" and log.completed]
        avg_steps = round(mean(item.steps or 0 for item in health)) if health else 0
        cards.append(
            InsightCard(
                id="movement-structure",
                category="Movement",
                categoryIcon="🏃",
                lens="SDT",
                narrative=f"You logged {len(workout_logs)} workout days in this window, and your average step count was {avg_steps:,}. Movement still looks strongest when it is planned before the week gets noisy.",
                action="Protect one movement slot early in the week.",
            )
        )

        avg_sleep_quality = round(mean(item.sleep_quality or 0 for item in health), 1) if health else 0
        cards.append(
            InsightCard(
                id="sleep-leverage",
                category="Sleep",
                categoryIcon="🌙",
                lens="CBT",
                narrative=f"Sleep quality averaged {avg_sleep_quality}/10. When sleep slips, the rest of the dashboard tends to flatten too, which makes sleep one of your highest-leverage inputs.",
                action="Treat tonight as support for tomorrow instead of an isolated task.",
            )
        )

        spend_by_category: dict[str, int] = defaultdict(int)
        for item in finance:
            spend_by_category[item.category] += round(item.amount_pence / 100)
        largest_category = max(spend_by_category, key=spend_by_category.get).replace("_", " ") if spend_by_category else "other"
        total_spend = round(sum(item.amount_pence for item in finance) / 100)
        cards.append(
            InsightCard(
                id="spend-pattern",
                category="Finance",
                categoryIcon="💷",
                lens="Behaviourism",
                narrative=f"Total spend for this period was £{total_spend}. The largest category was {largest_category}, which suggests the main reinforcement loop is still convenience and social momentum rather than careful planning.",
                action="Make one spend this week deliberate before it becomes automatic.",
            )
        )

        mood_logs = [log.scale_value for log in habits if log.habit_id == "mood" and log.scale_value is not None]
        if mood_logs:
            cards.append(
                InsightCard(
                    id="checkin-pattern",
                    category="Mind",
                    categoryIcon="🧠",
                    lens="CBT",
                    narrative=f"Your mood check-ins averaged {mean(mood_logs):.1f}/10. Naming the state still seems to help you catch patterns earlier instead of only noticing them after the week has drifted.",
                    action="Keep the check-in short, but keep it daily.",
                )
            )

        if weather:
            latest = weather[-1]
            avg_daylight = round(mean(item.daylight_hours for item in weather), 1)
            cards.append(
                InsightCard(
                    id="environment-pattern",
                    category="Environment",
                    categoryIcon="⛅",
                    lens="SDT",
                    narrative=f"Recent weather has been mostly {latest.condition} with around {avg_daylight} hours of daylight. Environment is not the whole story, but it clearly changes how easy it feels to get outside and build momentum.",
                    action="Use the brighter part of the day deliberately instead of waiting to feel like it.",
                )
            )

        if music:
            avg_valence = round(mean(item.average_valence or 0 for item in music), 2)
            top_genre = next((genre for genre in (music[-1].top_genres or []) if genre), "your usual rotation")
            cards.append(
                InsightCard(
                    id="music-pattern",
                    category="Consumption",
                    categoryIcon="🎵",
                    lens="Behaviourism",
                    narrative=f"Your listening pattern leaned toward {top_genre}, with an average musical valence of {avg_valence:.2f}. What you reach for sonically still looks like a quiet regulator of mood and energy.",
                    action="Notice whether your soundtrack is reinforcing the state you want or the state you are already in.",
                )
            )

        if location:
            away_days = sum(1 for item in location if (item.time_outdoors_minutes or 0) > 0)
            avg_home_hours = round(mean(item.home_hours or 0 for item in location), 1)
            cards.append(
                InsightCard(
                    id="location-pattern",
                    category="Location",
                    categoryIcon="📍",
                    lens="SDT",
                    narrative=f"You spent about {avg_home_hours} hours at home on an average tracked day, with outside time recorded on {away_days} days. Place still looks tightly linked to both energy and social momentum.",
                    action="Plan one reason to leave the house before the day chooses inertia for you.",
                )
            )

        return [card.__dict__ for card in cards]

    def generate_hero_headline(self, period: str, db: Session) -> str:
        data = self.load_period_data(db, period)
        health: list[HealthData] = data["health"]
        weather: list[WeatherData] = data["weather"]
        music: list[MusicData] = data["music"]
        avg_sleep = round(mean(item.sleep_quality or 0 for item in health), 1) if health else 0
        avg_steps = round(mean(item.steps or 0 for item in health)) if health else 0
        weather_phrase = ""
        if weather:
            latest = weather[-1]
            weather_phrase = f" The weather has mostly been {latest.condition}, with about {round(mean(item.daylight_hours for item in weather), 1)} hours of daylight."
        music_phrase = ""
        if music:
            music_phrase = f" Your music tended toward an energy score of {round(mean(item.average_energy or 0 for item in music), 2):.2f}."
        return (
            f"Your sleep quality averaged {avg_sleep}/10 over this period, and your movement stayed around {avg_steps:,} steps a day."
            f"{weather_phrase}{music_phrase}"
        )
