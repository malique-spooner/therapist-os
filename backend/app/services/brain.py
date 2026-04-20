from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.life_data import (
    DailyCheckInDemo,
    AIConversationReal,
    DailyCheckInReal,
    FinanceDataDemo,
    FinanceDataReal,
    HabitLogDemo,
    HabitLogReal,
    HealthDataDemo,
    HealthDataReal,
    LocationDailySummaryDemo,
    LocationDailySummaryReal,
    MusicDataDemo,
    MusicDataReal,
    RelationshipDemo,
    RelationshipInteractionReal,
    RelationshipReal,
    UserProfileReal,
    WeatherDataDemo,
    WeatherDataReal,
)
from .data_mode import read_dataset_model


DEFAULT_LAYERS = [
    {
        "id": "data-quality",
        "name": "Data Quality & Provenance",
        "icon": "🛡️",
        "description": "Checks whether the data is fresh, complete, and trustworthy enough to reason over before any insight is generated.",
        "category": "governance",
        "status": "live",
        "recentContribution": "Suppressed low-confidence interpretation when source coverage is incomplete.",
        "detectors": [
            {"id": "freshness-check", "name": "Freshness Check", "description": "Verifies each domain has recent enough data to be used safely.", "status": "active", "versionAdded": "v2.2"},
            {"id": "missingness-audit", "name": "Missingness Audit", "description": "Flags gaps so silence is not misread as a real behavioural signal.", "status": "active", "versionAdded": "v2.2"},
            {"id": "source-confidence", "name": "Source Confidence", "description": "Assigns a confidence level to each domain before patterns are surfaced.", "status": "experimental", "versionAdded": "v2.2"},
        ],
    },
    {
        "id": "pattern-engine",
        "name": "Pattern Engine",
        "icon": "🧩",
        "description": "Looks for repeated links in your data, like sleep, mood, spending, social contact, and recovery.",
        "category": "detector-driven",
        "status": "live",
        "recentContribution": "Comparing current rhythms against your baseline and surfacing repeatable cross-domain links.",
        "detectors": [
            {"id": "baseline-drift", "name": "Baseline Drift", "description": "Compares current signals to your rolling 30-day baseline.", "status": "active", "versionAdded": "v2.0"},
            {"id": "cross-domain-correlation", "name": "Cross-domain Correlation", "description": "Looks for domains that rise and fall together.", "status": "active", "versionAdded": "v2.0"},
            {"id": "threshold-effects", "name": "Threshold Effects", "description": "Checks whether a variable matters more past a certain level.", "status": "active", "versionAdded": "v2.1"},
            {"id": "recurring-triggers", "name": "Recurring Triggers", "description": "Searches for repeatable pre/post patterns around spending, alcohol, or overstimulation.", "status": "experimental", "versionAdded": "v2.2"},
        ],
    },
    {
        "id": "timeline-engine",
        "name": "Timeline Engine",
        "icon": "🕰️",
        "description": "Tracks sequences and lagged effects, so the app can see how one day spills into the next.",
        "category": "hybrid",
        "status": "live",
        "recentContribution": "Spotting next-day effects and short recovery arcs after harder days.",
        "detectors": [
            {"id": "next-day-effects", "name": "Next-day Effects", "description": "Measures what tends to happen the day after a trigger.", "status": "active", "versionAdded": "v2.0"},
            {"id": "two-day-cascade", "name": "Two-day Cascade", "description": "Checks for patterns that compound across two or more days.", "status": "active", "versionAdded": "v2.1"},
            {"id": "recovery-curves", "name": "Recovery Curves", "description": "Looks at how long it takes to bounce back after strain.", "status": "experimental", "versionAdded": "v2.2"},
        ],
    },
    {
        "id": "unsupervised-engine",
        "name": "Hidden Pattern Discovery",
        "icon": "🌌",
        "description": "Groups similar days together and finds patterns you did not explicitly ask the app to look for.",
        "category": "model-driven",
        "status": "evolving",
        "recentContribution": "Preparing hidden-state discovery across the current dataset.",
        "models": [
            {"id": "day-clustering", "name": "Day Clustering", "purpose": "Groups similar days by behaviour and state.", "status": "experimental", "versionAdded": "v2.2"},
            {"id": "anomaly-scan", "name": "Anomaly Scan", "purpose": "Finds unusual periods that depart from your normal rhythms.", "status": "active", "versionAdded": "v2.1"},
        ],
    },
    {
        "id": "prediction-engine",
        "name": "Prediction Engine",
        "icon": "🔮",
        "description": "Estimates what is likely next, like poor sleep risk, low energy, overspending, or social withdrawal.",
        "category": "model-driven",
        "status": "planned",
        "recentContribution": "Will start ranking likely next-day risks once enough labeled history accumulates.",
        "models": [
            {"id": "next-day-mood", "name": "Next-day Mood Risk", "purpose": "Forecasts next-day emotional state from recent patterns.", "status": "planned", "versionAdded": "v2.3"},
            {"id": "sleep-risk", "name": "Sleep Disruption Risk", "purpose": "Predicts nights most likely to reduce recovery.", "status": "planned", "versionAdded": "v2.3"},
        ],
    },
    {
        "id": "text-intelligence",
        "name": "Text Intelligence",
        "icon": "📝",
        "description": "Pulls themes from therapist sessions, check-ins, and notes to understand what keeps coming up.",
        "category": "hybrid",
        "status": "evolving",
        "recentContribution": "Using session and reflection text to keep profile themes grounded in what you actually say.",
        "detectors": [
            {"id": "theme-extraction", "name": "Theme Extraction", "description": "Finds recurring topics across sessions and check-ins.", "status": "active", "versionAdded": "v2.1"},
            {"id": "goal-drift", "name": "Goal Drift", "description": "Tracks when active goals appear to weaken or disappear.", "status": "experimental", "versionAdded": "v2.2"},
        ],
        "models": [
            {"id": "session-clustering", "name": "Session Clustering", "purpose": "Groups conversations into recurring emotional themes.", "status": "planned", "versionAdded": "v2.3"},
        ],
    },
    {
        "id": "knowledge-layer",
        "name": "Knowledge & Research Layer",
        "icon": "📚",
        "description": "Brings in trusted reference knowledge so insights can be grounded in frameworks and research rather than vague model memory.",
        "category": "hybrid",
        "status": "planned",
        "recentContribution": "Blueprint ready for evidence retrieval and framework matching.",
        "detectors": [
            {"id": "evidence-match", "name": "Evidence Match", "description": "Finds the most relevant research summary for a detected personal pattern.", "status": "planned", "versionAdded": "v2.3"},
        ],
        "models": [
            {"id": "retrieval-engine", "name": "Knowledge Retriever", "purpose": "Pulls curated health, behaviour, and therapy knowledge into context.", "status": "planned", "versionAdded": "v2.3"},
        ],
    },
    {
        "id": "causal-layer",
        "name": "Cause & Intervention Layer",
        "icon": "🧪",
        "description": "Moves beyond correlation toward what may actually help and what is worth trying next.",
        "category": "hybrid",
        "status": "planned",
        "recentContribution": "Preparing intervention and before/after comparisons instead of stopping at pattern spotting.",
        "detectors": [
            {"id": "before-after-tests", "name": "Before / After Tests", "description": "Compares what happens after a behaviour against your usual baseline.", "status": "planned", "versionAdded": "v2.3"},
            {"id": "intervention-tracking", "name": "Intervention Tracking", "description": "Measures whether a specific experiment actually helped over time.", "status": "planned", "versionAdded": "v2.3"},
        ],
        "models": [
            {"id": "causal-ranking", "name": "Causal Ranking", "purpose": "Ranks signals by how actionable and plausibly causal they appear.", "status": "planned", "versionAdded": "v2.3"},
        ],
    },
    {
        "id": "insight-composer",
        "name": "Insight Ranking & Composer",
        "icon": "🧠",
        "description": "Chooses the strongest supported signals and turns them into a fresh daily perspective using private local AI on your Mac.",
        "category": "composition",
        "status": "live",
        "recentContribution": "Ranking the best candidate signals and routing them toward the local Qwen 3.5 35B plan.",
        "models": [
            {"id": "local-llm", "name": "Qwen 3.5 35B Composer", "purpose": "Primary local Ollama model for snapshots, reflections, and therapist responses.", "status": "active", "versionAdded": "v3"},
            {"id": "ranking-engine", "name": "Insight Ranker", "purpose": "Chooses what is most novel, relevant, and worth showing today.", "status": "experimental", "versionAdded": "v2.2"},
            {"id": "local-whisper", "name": "Local Whisper", "purpose": "Transcribes voice before you confirm and send it onward.", "status": "active", "versionAdded": "v2.2"},
        ],
    },
    {
        "id": "feedback-layer",
        "name": "Feedback & Evaluation Layer",
        "icon": "📈",
        "description": "Learns which insights were useful, ignored, stale, corrected, or worth refreshing so the brain improves over time.",
        "category": "governance",
        "status": "planned",
        "recentContribution": "Preparing usefulness, staleness, and false-positive tracking.",
        "detectors": [
            {"id": "usefulness-signals", "name": "Usefulness Signals", "description": "Tracks refreshes, saves, and engagement to learn what matters.", "status": "planned", "versionAdded": "v2.3"},
            {"id": "staleness-check", "name": "Staleness Check", "description": "Flags insights that are repetitive or no longer supported by fresh data.", "status": "planned", "versionAdded": "v2.3"},
        ],
    },
]

DEFAULT_VERSIONS = [
    {
        "id": "v3",
        "label": "Brain v3",
        "dateLabel": "April 2026",
        "headline": "Research-backed launch blueprint with fuller detector and model coverage across all 10 layers.",
        "changes": [
            "Expanded every layer with a broader detector and model inventory.",
            "Added backend-backed overview stats so the Brain page can reflect the current app state.",
            "Positioned the brain as the final architecture for detector, model, and insight coverage.",
        ],
        "state": "current",
    },
    {
        "id": "v2.2",
        "label": "Brain v2.2",
        "dateLabel": "Earlier concept",
        "headline": "Initial 10-layer private intelligence stack.",
        "changes": [
            "Expanded the brain from 6 layers to 10 layers.",
            "Added data quality, research, causal/intervention, and feedback layers.",
            "Framed the brain as a system that detects, ranks, explains, and learns over time.",
        ],
        "state": "previous",
    },
    {
        "id": "v3.1",
        "label": "Brain v3.1",
        "dateLabel": "Planned next",
        "headline": "Connected execution with real runs, confidence, and evidence traces.",
        "changes": [
            "Wire launch blueprint layers into live detector outputs.",
            "Expose recent runs, evidence strength, and detector activity on the Brain page.",
            "Connect Mac-local inference and research retrieval into the live system.",
        ],
        "state": "planned",
    },
]


class BrainService:
    def get_payload(self, db: Session, mode: str | None = None) -> dict:
        health_model = read_dataset_model(mode, HealthDataReal, HealthDataDemo)
        finance_model = read_dataset_model(mode, FinanceDataReal, FinanceDataDemo)
        music_model = read_dataset_model(mode, MusicDataReal, MusicDataDemo)
        location_model = read_dataset_model(mode, LocationDailySummaryReal, LocationDailySummaryDemo)
        weather_model = read_dataset_model(mode, WeatherDataReal, WeatherDataDemo)
        habit_model = read_dataset_model(mode, HabitLogReal, HabitLogDemo)
        checkin_model = read_dataset_model(mode, DailyCheckInReal, DailyCheckInDemo)
        source_coverage = self._source_coverage(db)
        tracked_habits = (
            db.scalar(select(func.count(func.distinct(habit_model.habit_id))).select_from(habit_model)) or 0
        )
        conversations = db.scalar(select(func.count()).select_from(AIConversationReal)) or 0
        relationship_count = db.scalar(
            select(func.count()).select_from(RelationshipReal).where(RelationshipReal.active.is_(True))
        ) or 0
        interaction_count = db.scalar(
            select(func.count()).select_from(RelationshipInteractionReal)
        ) or 0
        checkin_count = db.scalar(select(func.count()).select_from(checkin_model)) or 0
        profile = db.scalar(select(UserProfileReal).limit(1))

        active_systems = sum(len(layer.get("detectors", [])) + len(layer.get("models", [])) for layer in DEFAULT_LAYERS)
        candidate_signals = self._candidate_signals(
            source_coverage=source_coverage,
            tracked_habits=tracked_habits,
            conversations=conversations,
            relationship_count=relationship_count,
            checkin_count=checkin_count,
        )
        surfaced_insights = self._surfaced_insights(
            source_coverage=source_coverage,
            conversations=conversations,
            relationship_count=relationship_count,
            checkin_count=checkin_count,
        )
        total_layers = len(DEFAULT_LAYERS)
        has_meaningful_runtime = source_coverage > 0 or checkin_count > 0 or relationship_count > 0 or conversations > 0
        last_refresh = self._last_refresh_label(profile if has_meaningful_runtime else None)
        mac_status = "Mac available" if has_meaningful_runtime else "Waiting for real data"
        status = "Connected blueprint" if has_meaningful_runtime else "Waiting for real data"

        return {
            "overview": {
                "version": "Brain v3",
                "status": status,
                "lastRefresh": last_refresh,
                "macStatus": mac_status,
                "privacyMode": "Private inference with Qwen 3.5 35B on your Mac through Ollama, with local Whisper and optional local TTS.",
                "candidateSignals": candidate_signals,
                "surfacedInsights": surfaced_insights,
                "totalLayers": total_layers,
                "activeSystems": active_systems,
            },
            "layers": self._layers_with_live_contributions(
                source_coverage=source_coverage,
                tracked_habits=tracked_habits,
                conversations=conversations,
                relationship_count=relationship_count,
                interaction_count=interaction_count,
                checkin_count=checkin_count,
                profile_present=profile is not None,
            ),
            "versions": DEFAULT_VERSIONS,
        }

    @staticmethod
    def _candidate_signals(
        *,
        source_coverage: int,
        tracked_habits: int,
        conversations: int,
        relationship_count: int,
        checkin_count: int,
    ) -> int:
        if source_coverage == 0 and tracked_habits == 0 and conversations == 0 and relationship_count == 0 and checkin_count == 0:
            return 0
        return (source_coverage * 10) + min(tracked_habits, 20) + min(conversations * 2, 12) + (relationship_count * 2) + min(checkin_count, 14)

    @staticmethod
    def _surfaced_insights(
        *,
        source_coverage: int,
        conversations: int,
        relationship_count: int,
        checkin_count: int,
    ) -> int:
        if source_coverage == 0 and checkin_count < 3 and relationship_count == 0 and conversations == 0:
            return 0
        if source_coverage >= 3 or checkin_count >= 14:
            return 4
        if source_coverage >= 1 or checkin_count >= 3 or conversations >= 2 or relationship_count >= 2:
            return 2
        return 1

    @staticmethod
    def _source_coverage(db: Session) -> int:
        counts = [
            db.scalar(select(func.count()).select_from(HealthDataReal)) or 0,
            db.scalar(select(func.count()).select_from(FinanceDataReal)) or 0,
            db.scalar(select(func.count()).select_from(MusicDataReal)) or 0,
            db.scalar(select(func.count()).select_from(LocationDailySummaryReal)) or 0,
            db.scalar(select(func.count()).select_from(WeatherDataReal)) or 0,
        ]
        return sum(1 for count in counts if count > 0)

    @staticmethod
    def _last_refresh_label(profile: UserProfile | None) -> str:
        if not profile or not profile.updated_at:
            return "Profile not refreshed yet"
        delta = datetime.now(UTC) - profile.updated_at.replace(tzinfo=UTC)
        hours = int(delta.total_seconds() // 3600)
        if hours < 1:
            return "Less than 1 hour ago"
        if hours < 24:
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        return f"{days} day{'s' if days != 1 else ''} ago"

    def _layers_with_live_contributions(
        self,
        *,
        source_coverage: int,
        tracked_habits: int,
        conversations: int,
        relationship_count: int,
        interaction_count: int,
        checkin_count: int,
        profile_present: bool,
    ) -> list[dict]:
        contributions = {
            "data-quality": f"Currently monitoring freshness across {source_coverage} data domain{'s' if source_coverage != 1 else ''}.",
            "pattern-engine": f"Ready to compare {tracked_habits} tracked habit signal{'s' if tracked_habits != 1 else ''} and {checkin_count} check-in record{'s' if checkin_count != 1 else ''} against baseline.",
            "timeline-engine": f"Tracking sequences across {checkin_count} check-ins and recent activity windows.",
            "unsupervised-engine": "Prepared for clustering once more multiday history accumulates across the synced domains.",
            "prediction-engine": "Waiting for enough labeled history before next-day forecasting becomes reliable.",
            "text-intelligence": f"Can currently ground themes in {conversations} therapist conversation{'s' if conversations != 1 else ''}.",
            "knowledge-layer": "Blueprint is in place for curated research retrieval and framework matching.",
            "causal-layer": "Preparing before/after comparisons so the app can recommend small experiments, not just observations.",
            "insight-composer": f"Composing from current app state: {source_coverage} data domain{'s' if source_coverage != 1 else ''}, {relationship_count} people, and {interaction_count} logged interaction{'s' if interaction_count != 1 else ''}.",
            "feedback-layer": "Prepared to learn from refreshes, dismissals, and future usefulness signals.",
        }
        layers: list[dict] = []
        for layer in DEFAULT_LAYERS:
            layers.append({**layer, "recentContribution": contributions.get(layer["id"], layer["recentContribution"])})
        if profile_present:
            for layer in layers:
                if layer["id"] == "text-intelligence":
                    layer["recentContribution"] = "Profile memory is present, so text intelligence can feed live themes into the brain."
        return layers
