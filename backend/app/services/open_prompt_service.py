from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..models import (
    AppOpenPromptState,
)
from ..models.life_data import (
    DailyCheckInDemo as DailyCheckIn,
    FinanceDataDemo as FinanceData,
    HealthDataDemo as HealthData,
    LocationCompanionLogDemo as LocationCompanionLog,
    LocationDailySummaryDemo as LocationDailySummary,
    MusicDataDemo as MusicData,
    RelationshipDemo as Relationship,
    RelationshipInteractionDemo as RelationshipInteraction,
)


@dataclass
class PromptCandidate:
    prompt_key: str
    category: str
    title: str
    question: str
    supporting_text: str
    primary_label: str
    target_page: str
    priority: int
    target_date: date | None = None
    person_ids: list[str] | None = None


class OpenPromptService:
    def get_current_prompt(self, db: Session) -> dict | None:
        today = datetime.now(UTC).date()
        candidates = self._candidate_prompts(db, today)
        if not candidates:
            return None

        candidates.sort(key=lambda item: item.priority, reverse=True)

        for candidate in candidates:
            state = db.scalar(select(AppOpenPromptState).where(AppOpenPromptState.prompt_key == candidate.prompt_key))
            if state and state.completed_at and state.completed_at.date() >= today:
                continue
            if state and state.dismissed_at and state.dismissed_at.date() >= today:
                continue

            if not state:
                state = AppOpenPromptState(prompt_key=candidate.prompt_key, category=candidate.category)
                db.add(state)

            state.category = candidate.category
            state.last_shown_at = datetime.utcnow()
            db.commit()

            return {
                "promptKey": candidate.prompt_key,
                "category": candidate.category,
                "title": candidate.title,
                "question": candidate.question,
                "supportingText": candidate.supporting_text,
                "primaryLabel": candidate.primary_label,
                "targetPage": candidate.target_page,
                "targetDate": candidate.target_date.isoformat() if candidate.target_date else None,
                "personIds": candidate.person_ids,
            }

        return None

    def dismiss_prompt(self, prompt_key: str, db: Session) -> None:
        state = db.scalar(select(AppOpenPromptState).where(AppOpenPromptState.prompt_key == prompt_key))
        if not state:
            state = AppOpenPromptState(prompt_key=prompt_key, category="other")
            db.add(state)
        state.dismissed_at = datetime.utcnow()
        db.commit()

    def complete_prompt(self, prompt_key: str, db: Session) -> None:
        state = db.scalar(select(AppOpenPromptState).where(AppOpenPromptState.prompt_key == prompt_key))
        if not state:
            state = AppOpenPromptState(prompt_key=prompt_key, category="other")
            db.add(state)
        state.completed_at = datetime.utcnow()
        db.commit()

    def _candidate_prompts(self, db: Session, today: date) -> list[PromptCandidate]:
        candidates: list[PromptCandidate] = []

        latest_checkin = db.scalar(select(DailyCheckIn).order_by(desc(DailyCheckIn.date)))
        if latest_checkin and latest_checkin.date == today and latest_checkin.emotional_state <= 2:
            candidates.append(
                PromptCandidate(
                    prompt_key=f"mood_reflection_{today.isoformat()}",
                    category="mood",
                    title="Emotional follow-up",
                    question="Your last check-in looked heavier than usual. What felt most influential on your mood today?",
                    supporting_text="Short reflective follow-ups improve emotional granularity and make later insight generation more reliable.",
                    primary_label="Reflect",
                    target_page="therapist",
                    priority=98,
                )
            )

        latest_location = db.scalar(select(LocationDailySummary).order_by(desc(LocationDailySummary.date)))
        if latest_location:
            companion_log = db.scalar(select(LocationCompanionLog).where(LocationCompanionLog.date == latest_location.date))
            if companion_log is None:
                candidates.append(
                    PromptCandidate(
                        prompt_key=f"location_people_{latest_location.date.isoformat()}",
                        category="location",
                        title="Location tagging",
                        question=f"Who were you with during your main outing on {latest_location.date.strftime('%a %d %b')}?",
                        supporting_text="Adding people to location data helps the brain connect places, relationships, and mood more accurately.",
                        primary_label="Tag location",
                        target_page="location",
                        priority=96,
                        target_date=latest_location.date,
                    )
                )

        people = db.scalars(select(Relationship).where(Relationship.active.is_(True))).all()
        interactions = db.scalars(select(RelationshipInteraction).order_by(desc(RelationshipInteraction.timestamp))).all()
        last_by_person: dict[str, date] = {}
        for interaction in interactions:
            for person_id in interaction.person_ids or []:
                last_by_person.setdefault(person_id, interaction.date)
        overdue_person = next(
            (
                person for person in people
                if ((today - last_by_person[person.id]).days if person.id in last_by_person else person.desired_frequency_days + 1) >= person.desired_frequency_days
            ),
            None,
        )
        if overdue_person:
            candidates.append(
                PromptCandidate(
                    prompt_key=f"relationship_nudge_{overdue_person.id}_{today.isoformat()}",
                    category="relationships",
                    title="Relationship reflection",
                    question=f"You may be overdue with {overdue_person.name}. Do you want to update the log or plan a small touchpoint?",
                    supporting_text="Keeping contact logs current helps the brain notice which relationships most strongly support you.",
                    primary_label="Review relationships",
                    target_page="relationships",
                    priority=88,
                    person_ids=[overdue_person.id],
                )
            )

        latest_health = db.scalar(select(HealthData).order_by(desc(HealthData.date)))
        if latest_health and latest_health.sleep_duration_hours and latest_health.sleep_duration_hours < 6:
            candidates.append(
                PromptCandidate(
                    prompt_key=f"health_recovery_{latest_health.date.isoformat()}",
                    category="health",
                    title="Recovery check",
                    question="Sleep was short on your latest health day. Was there anything unusual that might explain the dip?",
                    supporting_text="Recovery context makes sleep and HRV changes much more interpretable.",
                    primary_label="Review health",
                    target_page="health",
                    priority=84,
                    target_date=latest_health.date,
                )
            )

        recent_spend = db.scalars(
            select(FinanceData)
            .where(FinanceData.date >= today - timedelta(days=2))
            .order_by(desc(FinanceData.date))
        ).all()
        if sum(item.amount_pence for item in recent_spend) >= 12000:
            candidates.append(
                PromptCandidate(
                    prompt_key=f"finance_review_{today.isoformat()}",
                    category="finance",
                    title="Spending review",
                    question="Spending has been a bit higher over the last few days. Do you want to review what drove it?",
                    supporting_text="Quick financial tagging helps separate social spending, stress spending, and one-off purchases.",
                    primary_label="Review spending",
                    target_page="finance",
                    priority=78,
                )
            )

        latest_music = db.scalar(select(MusicData).order_by(desc(MusicData.date)))
        if latest_music and latest_music.listening_hours and latest_music.listening_hours >= 3.5:
            candidates.append(
                PromptCandidate(
                    prompt_key=f"consumption_reflection_{latest_music.date.isoformat()}",
                    category="consumption",
                    title="Consumption reflection",
                    question="You listened more than usual recently. Did that feel regulating, distracting, or energising?",
                    supporting_text="Consumption meaning matters more than raw hours when the brain explains your patterns.",
                    primary_label="Review consumption",
                    target_page="consumption",
                    priority=72,
                    target_date=latest_music.date,
                )
            )

        return candidates
