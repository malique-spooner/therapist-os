# Brain

## Purpose

The Brain is the intended intelligence architecture for Therapist OS.

It is meant to turn raw life data into:
- candidate signals
- ranked insights
- therapist context
- experiments and possible interventions
- evolving personal understanding over time

## Important Clarification

The Brain page in the frontend is currently a blueprint.

That means:
- it reflects the intended architecture
- it explains the planned layers and detector/model coverage
- it is not yet the same thing as full backend implementation

## Brain v3

The current target architecture is **Brain v3**, a 10-layer system:

1. Data Quality & Provenance
2. Pattern Engine
3. Timeline Engine
4. Hidden Pattern Discovery
5. Prediction Engine
6. Text Intelligence
7. Knowledge & Research Layer
8. Cause & Intervention Layer
9. Insight Ranking & Composer
10. Feedback & Evaluation Layer

## How The Brain Is Supposed To Work

High-level flow:
1. collect real data from all domains
2. check whether that data is trustworthy enough to use
3. generate many candidate signals
4. discover hidden clusters and anomalies
5. forecast likely next-day risks where appropriate
6. bring in text themes from sessions and check-ins
7. attach research/framework knowledge where relevant
8. identify possible levers and interventions
9. rank the strongest signals
10. generate the final insight output
11. learn from what proved useful or stale

## Key Principle

The Brain should not hard-code the final insight.

Instead:
- code and models produce many candidate signals
- the strongest supported ones are ranked
- the composer writes a human-readable final perspective

That is how the system avoids:
- repetitive canned insights
- unsupported “magical” conclusions
- brittle one-rule explanations

## Data vs AI

The Brain is not meant to be “AI does everything.”

The intended split is:
- structured code and models detect or score signals
- the composer explains and shapes them into readable output

This matters because Therapist OS needs both:
- rigor
- novelty

## Cause & Intervention Layer

This layer means:
- move from “these things happen together”
- toward “what might actually help?”

Example:
- pattern layer:
  alcohol nights and lower HRV often appear together
- cause/intervention layer:
  a low-alcohol Friday may be a reasonable experiment to test whether recovery improves

It does not claim perfect causality.
It helps the app suggest safer, smaller, more testable behaviour changes.

## Where The Brain Should Run

The intended architecture is:
- VPS stores data, syncs sources, and serves the app
- Mac runs local private inference for the Brain composer, therapist, Whisper, and optional TTS
- phone reads the latest saved outputs from the VPS

## Next Implementation Goal

The next major step is turning Brain v3 from frontend blueprint into backend execution:
- tables
- detector registry
- candidate signal schema
- ranking logic
- local Mac orchestration
