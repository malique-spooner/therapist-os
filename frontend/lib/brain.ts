export interface BrainDetector {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'experimental' | 'planned';
  versionAdded: string;
}

export interface BrainModel {
  id: string;
  name: string;
  purpose: string;
  status: 'active' | 'experimental' | 'planned';
  versionAdded: string;
}

export interface BrainLayer {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'detector-driven' | 'model-driven' | 'hybrid' | 'composition' | 'governance';
  status: 'live' | 'evolving' | 'planned';
  detectors?: BrainDetector[];
  models?: BrainModel[];
  recentContribution: string;
}

export interface BrainVersion {
  id: string;
  label: string;
  dateLabel: string;
  headline: string;
  changes: string[];
  state: 'current' | 'previous' | 'planned';
}

export interface BrainOverview {
  version: string;
  status: string;
  lastRefresh: string;
  macStatus: string;
  privacyMode: string;
  candidateSignals: number;
  surfacedInsights: number;
  totalLayers: number;
  activeSystems: number;
}

export interface BrainPayload {
  overview: BrainOverview;
  layers: BrainLayer[];
  versions: BrainVersion[];
}

export const brainOverview = {
  version: 'Brain v3',
  status: 'Launch blueprint',
  lastRefresh: 'Research pass complete',
  macStatus: 'Mac available',
  privacyMode: 'Private inference with Qwen 3.5 35B on your Mac through Ollama, with local Whisper and optional local TTS',
  candidateSignals: 114,
  surfacedInsights: 4,
  totalLayers: 10,
  activeSystems: 42,
};

export const brainLayers: BrainLayer[] = [
  {
    id: 'data-quality',
    name: 'Data Quality & Provenance',
    icon: '🛡️',
    description: 'Checks whether the data is fresh, complete, and trustworthy enough to reason over before any insight is generated.',
    category: 'governance',
    status: 'live',
    recentContribution: 'Suppressed low-confidence location interpretation when the day had sparse pings.',
    detectors: [
      { id: 'freshness-check', name: 'Freshness Check', description: 'Verifies each domain has recent enough data to be used safely.', status: 'active', versionAdded: 'v2.2' },
      { id: 'missingness-audit', name: 'Missingness Audit', description: 'Flags gaps so silence is not misread as a real behavioural signal.', status: 'active', versionAdded: 'v2.2' },
      { id: 'source-confidence', name: 'Source Confidence', description: 'Assigns a confidence level to each domain before patterns are surfaced.', status: 'experimental', versionAdded: 'v2.2' },
      { id: 'sensor-integrity', name: 'Sensor Integrity', description: 'Checks for broken feeds, impossible values, or suspiciously flat data.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'coverage-map', name: 'Coverage Map', description: 'Shows which domains are strong enough to reason over on any given day.', status: 'planned', versionAdded: 'v2.3' },
    ],
  },
  {
    id: 'pattern-engine',
    name: 'Pattern Engine',
    icon: '🧩',
    description: 'Looks for repeated links in your data, like sleep, mood, spending, social contact, and recovery.',
    category: 'detector-driven',
    status: 'live',
    recentContribution: 'Flagged a repeated Friday spending and Saturday recovery pattern.',
    detectors: [
      { id: 'baseline-drift', name: 'Baseline Drift', description: 'Compares current signals to your rolling 30-day baseline.', status: 'active', versionAdded: 'v2.0' },
      { id: 'cross-domain-correlation', name: 'Cross-domain Correlation', description: 'Looks for domains that rise and fall together.', status: 'active', versionAdded: 'v2.0' },
      { id: 'threshold-effects', name: 'Threshold Effects', description: 'Checks whether a variable matters more past a certain level.', status: 'active', versionAdded: 'v2.1' },
      { id: 'recurring-triggers', name: 'Recurring Triggers', description: 'Searches for repeatable pre/post patterns around spending, alcohol, or overstimulation.', status: 'experimental', versionAdded: 'v2.2' },
      { id: 'weekday-shapes', name: 'Weekday Shapes', description: 'Finds patterns that only show up on certain days like Fridays or Sundays.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'state-clusters-lite', name: 'State Clusters Lite', description: 'Detects simple repeated combinations like low sleep plus low social contact plus overstimulation.', status: 'planned', versionAdded: 'v2.3' },
    ],
  },
  {
    id: 'timeline-engine',
    name: 'Timeline Engine',
    icon: '🕰️',
    description: 'Tracks sequences and lagged effects, so the app can see how one day spills into the next.',
    category: 'hybrid',
    status: 'live',
    recentContribution: 'Linked late-week overstimulation with next-morning HRV softness.',
    detectors: [
      { id: 'next-day-effects', name: 'Next-day Effects', description: 'Measures what tends to happen the day after a trigger.', status: 'active', versionAdded: 'v2.0' },
      { id: 'two-day-cascade', name: 'Two-day Cascade', description: 'Checks for patterns that compound across two or more days.', status: 'active', versionAdded: 'v2.1' },
      { id: 'recovery-curves', name: 'Recovery Curves', description: 'Looks at how long it takes to bounce back after strain.', status: 'experimental', versionAdded: 'v2.2' },
      { id: 'event-windows', name: 'Event Windows', description: 'Compares the days before and after meaningful events like nights out or travel.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'weekly-arcs', name: 'Weekly Arcs', description: 'Detects recurring build-up and collapse patterns across a whole week.', status: 'planned', versionAdded: 'v2.3' },
    ],
  },
  {
    id: 'unsupervised-engine',
    name: 'Hidden Pattern Discovery',
    icon: '🌌',
    description: 'Groups similar days together and finds patterns you did not explicitly ask the app to look for.',
    category: 'model-driven',
    status: 'evolving',
    recentContribution: 'Clustered recent low-energy days into a similar “withdrawn recovery” state.',
    models: [
      { id: 'day-clustering', name: 'Day Clustering', purpose: 'Groups similar days by behaviour and state.', status: 'experimental', versionAdded: 'v2.2' },
      { id: 'anomaly-scan', name: 'Anomaly Scan', purpose: 'Finds unusual periods that depart from your normal rhythms.', status: 'active', versionAdded: 'v2.1' },
      { id: 'hidden-states', name: 'Hidden State Model', purpose: 'Learns repeated modes like “recovery mode,” “socially nourished,” or “stretched thin.”', status: 'planned', versionAdded: 'v2.3' },
      { id: 'novelty-ranker', name: 'Novelty Ranker', purpose: 'Helps the brain prefer genuinely fresh patterns over repetitive ones.', status: 'planned', versionAdded: 'v2.3' },
    ],
  },
  {
    id: 'prediction-engine',
    name: 'Prediction Engine',
    icon: '🔮',
    description: 'Estimates what is likely next, like poor sleep risk, low energy, overspending, or social withdrawal.',
    category: 'model-driven',
    status: 'planned',
    recentContribution: 'Will rank likely next-day risks once enough labeled data accumulates.',
    models: [
      { id: 'next-day-mood', name: 'Next-day Mood Risk', purpose: 'Forecasts next-day emotional state from recent patterns.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'sleep-risk', name: 'Sleep Disruption Risk', purpose: 'Predicts nights most likely to reduce recovery.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'withdrawal-risk', name: 'Withdrawal Risk', purpose: 'Spots patterns that tend to precede lower-contact periods.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'overspend-risk', name: 'Overspend Risk', purpose: 'Forecasts days where spending is more likely to be reactive than intentional.', status: 'planned', versionAdded: 'v2.4' },
      { id: 'low-energy-risk', name: 'Low Energy Risk', purpose: 'Warns when recovery variables suggest an underpowered day ahead.', status: 'planned', versionAdded: 'v2.4' },
    ],
  },
  {
    id: 'text-intelligence',
    name: 'Text Intelligence',
    icon: '📝',
    description: 'Pulls themes from therapist sessions, check-ins, and notes to understand what keeps coming up.',
    category: 'hybrid',
    status: 'evolving',
    recentContribution: 'Surfaced recurring themes of pressure, overstimulation, and wanting steadier rhythms.',
    detectors: [
      { id: 'theme-extraction', name: 'Theme Extraction', description: 'Finds recurring topics across sessions and check-ins.', status: 'active', versionAdded: 'v2.1' },
      { id: 'goal-drift', name: 'Goal Drift', description: 'Tracks when active goals appear to weaken or disappear.', status: 'experimental', versionAdded: 'v2.2' },
      { id: 'relationship-theme-tracker', name: 'Relationship Theme Tracker', description: 'Surfaces the people and situations that recur in sessions over time.', status: 'planned', versionAdded: 'v2.3' },
    ],
    models: [
      { id: 'session-clustering', name: 'Session Clustering', purpose: 'Groups conversations into recurring emotional themes.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'language-shift', name: 'Language Shift Model', purpose: 'Detects shifts in tone, pressure, self-judgment, or hopefulness across time.', status: 'planned', versionAdded: 'v2.4' },
    ],
  },
  {
    id: 'knowledge-layer',
    name: 'Knowledge & Research Layer',
    icon: '📚',
    description: 'Brings in trusted reference knowledge so insights can be grounded in frameworks and research rather than vague model memory.',
    category: 'hybrid',
    status: 'planned',
    recentContribution: 'Will attach evidence summaries and framework context to supported patterns.',
    detectors: [
      { id: 'evidence-match', name: 'Evidence Match', description: 'Finds the most relevant research summary for a detected personal pattern.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'framework-fit', name: 'Framework Fit', description: 'Chooses whether CBT, SDT, behaviourism, or health science best explains a pattern.', status: 'planned', versionAdded: 'v2.3' },
    ],
    models: [
      { id: 'retrieval-engine', name: 'Knowledge Retriever', purpose: 'Pulls curated health, behaviour, and therapy knowledge into context.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'citation-layer', name: 'Citation Layer', purpose: 'Supports insight explanations with compact evidence references when needed.', status: 'planned', versionAdded: 'v2.4' },
    ],
  },
  {
    id: 'causal-layer',
    name: 'Cause & Intervention Layer',
    icon: '🧪',
    description: 'Moves beyond “these travel together” toward “this may be influencing that” and “what should we try next?”',
    category: 'hybrid',
    status: 'planned',
    recentContribution: 'Will test which behaviours look genuinely helpful rather than merely correlated.',
    detectors: [
      { id: 'before-after-tests', name: 'Before / After Tests', description: 'Compares what happens after a behaviour against your usual baseline.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'intervention-tracking', name: 'Intervention Tracking', description: 'Measures whether a specific experiment actually helped over time.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'natural-experiments', name: 'Natural Experiments', description: 'Looks for real-life behaviour changes that created useful comparison windows.', status: 'planned', versionAdded: 'v2.4' },
    ],
    models: [
      { id: 'causal-ranking', name: 'Causal Ranking', purpose: 'Ranks signals by how actionable and plausibly causal they appear.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'intervention-recommender', name: 'Intervention Recommender', purpose: 'Suggests the smallest, safest experiment that could test a promising lever.', status: 'planned', versionAdded: 'v2.4' },
    ],
  },
  {
    id: 'insight-composer',
    name: 'Insight Ranking & Composer',
    icon: '🧠',
    description: 'Chooses the strongest supported signals and turns them into a fresh daily perspective using private local AI on your Mac.',
    category: 'composition',
    status: 'live',
    recentContribution: 'Selected four signals from 114 candidates and wrote today’s insight snapshot.',
    models: [
      { id: 'local-llm', name: 'Qwen 3.5 35B Composer', purpose: 'Runs locally on your Mac through Ollama as the primary model for daily snapshots, weekly reflections, and therapist responses.', status: 'active', versionAdded: 'v3' },
      { id: 'ranking-engine', name: 'Insight Ranker', purpose: 'Chooses what is most novel, relevant, and worth showing today.', status: 'experimental', versionAdded: 'v2.2' },
      { id: 'local-whisper', name: 'Local Whisper', purpose: 'Transcribes voice before you confirm and send it to the therapist.', status: 'active', versionAdded: 'v2.2' },
      { id: 'local-tts', name: 'Local TTS', purpose: 'Speaks the final reply back after you confirm the transcript and the answer is ready.', status: 'planned', versionAdded: 'v2.3' },
    ],
  },
  {
    id: 'feedback-layer',
    name: 'Feedback & Evaluation Layer',
    icon: '📈',
    description: 'Learns which insights were useful, ignored, stale, corrected, or worth refreshing so the brain improves over time.',
    category: 'governance',
    status: 'planned',
    recentContribution: 'Will help the app learn what kinds of insight actually change behaviour or feel valuable.',
    detectors: [
      { id: 'usefulness-signals', name: 'Usefulness Signals', description: 'Tracks refreshes, retries, saves, and engagement to learn what matters.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'staleness-check', name: 'Staleness Check', description: 'Flags insights that are repetitive or no longer supported by fresh data.', status: 'planned', versionAdded: 'v2.3' },
      { id: 'false-positive-audit', name: 'False Positive Audit', description: 'Tracks patterns that looked promising but repeatedly failed to hold up.', status: 'planned', versionAdded: 'v2.4' },
    ],
  },
];

export const brainVersions: BrainVersion[] = [
  {
    id: 'v3',
    label: 'Brain v3',
    dateLabel: 'April 2026',
    headline: 'Research-backed launch blueprint with fuller detector and model coverage across all 10 layers.',
    changes: [
      'Expanded every layer with a broader detector and model inventory.',
      'Shifted the page from concept language to a launch blueprint.',
      'Positioned the brain as the final architecture for detector, model, and insight coverage.',
    ],
    state: 'current',
  },
  {
    id: 'v2.2',
    label: 'Brain v2.2',
    dateLabel: 'Earlier concept',
    headline: 'Initial 10-layer private intelligence stack.',
    changes: [
      'Expanded the brain from 6 layers to 10 layers.',
      'Added data quality, research, causal/intervention, and feedback layers.',
      'Framed the brain as a system that detects, ranks, explains, and learns over time.',
    ],
    state: 'previous',
  },
  {
    id: 'v3.1',
    label: 'Brain v3.1',
    dateLabel: 'Planned next',
    headline: 'Connected execution with real runs, confidence, and evidence traces.',
    changes: [
      'Wire the launch blueprint into real backend computation.',
      'Expose recent runs, evidence strength, and detector outputs on the Brain page.',
      'Connect local Mac inference and research retrieval into the live system.',
    ],
    state: 'planned',
  },
];
