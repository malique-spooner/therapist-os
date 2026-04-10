# Therapist OS Location Flagship Vision

## Product Direction

Therapist OS Location should become a flagship product in its own right: a private, emotionally intelligent location tracker that feels world-class as a map experience and uniquely valuable as a life-pattern tool.

The product should operate in two speeds:

- **Daily Location**: practical, private, map-first, and cheap to run.
- **Weekly Cinematic Recap**: premium, emotional, photorealistic 3D, and tightly usage-limited.

This gives us a serious everyday tracker without making expensive 3D the default dependency.

## Core Product Idea

The goal is not just to show dots or routes. The goal is to help answer:

- Where did my life happen?
- What places regulate me, drain me, connect me, or heal me?
- What did my movement mean this week?

Therapist OS should own the meaning layer:

- smart places
- visit memory
- companion/context tagging
- emotional interpretation
- cross-domain links to mood, relationships, habits, spending, and therapy insights

OwnTracks and raw location data should remain the sensing layer, not the interpretation layer.

## Daily Location Experience

The daily product should be the screen used all the time and should not rely on expensive 3D rendering.

Key elements:

- **Story Map**
  - 2D Google map
  - route, visits, dwell points, repeated places
  - animated and premium-feeling, but lightweight
- **Timeline**
  - chronological visit log with arrival, departure, dwell, and transitions
- **Smart Places**
  - auto-detected repeated places
  - editable names, icons, categories, and meaning
  - merge/split controls when inference is wrong
- **Visit Detail**
  - dwell time
  - time of day
  - who you were with
  - context label
  - note
  - reflective interpretation over time
- **Pattern Layer**
  - examples:
    - football tends to regulate you
    - fragmented movement drains you
    - social movement days correlate with better mood
- **Meaning Layer**
  - Therapist OS remains the owner of companion tags, notes, and semantic context

The daily page should feel like a serious location tracker before any 3D exists.

## Weekly Cinematic Recap

This is the hero experience.

Format:

- 30-90 second guided weekly recap
- explicit user action to open
- generated for a completed week window
- never the default view
- short, curated, finite scenes

Target feel:

- aerial rise over home area
- bird-like flyover across the city
- zoom into important places
- short text overlays and narrative beats
- closing takeaway and suggested action

Example sequence:

1. "Your week in place"
2. "You spent 58% of tracked time at home"
3. Fly to football location: "Tuesday 7:08pm: football"
4. Fly to another meaningful place: "Thursday evening: saw friends here"
5. Pattern read: "Movement plus people gave you your best days"
6. Close with one therapist-quality takeaway

Google photorealistic 3D should be used only here, or in very limited replay contexts, so the product gets the wow without becoming expensive.

## Maps Strategy

We should use Google Maps for this flagship direction, with a strict rule:

- **Google for core map quality**
- **Google photorealistic 3D only for selected hero moments**
- **Never make 3D the default location screen**

Why:

- Google gives us premium map polish and access to photorealistic 3D.
- For a private single-user app, this is likely effectively free if we keep usage low.
- The risk comes from making 3D a default browsing mode.

## Cost Guardrails

We want Google quality without paying.

The product must enforce these rules:

- 3D is never the default map
- no free-roam 3D exploration
- no autoplay 3D on page load
- no background preloading of 3D scenes
- 3D only appears in:
  - weekly recap
  - optional replay of that recap
  - maybe monthly recap later
- each recap uses a fixed small number of scenes
- recap generation is on-demand and finite
- internal usage tracking should exist from day one
- include a kill switch so 3D can be disabled instantly if needed

The principle is:

- everyday use stays cheap
- weekly recap carries the cinematic magic

## Build Phases

### Phase 1: Daily Location Redesign

Replace the current lightweight location page with a map-first location product:

- 2D Google map
- visit timeline
- smarter place cards
- visit detail drawer/sheet
- companion/context flow integrated into visits and places

### Phase 2: Place Intelligence

Add the system that makes the product uniquely valuable:

- visit detection
- repeated-place clustering
- editable smart places
- rename/merge/split place controls
- home/work/football/social-style inference
- stronger pattern summaries over time

### Phase 3: Weekly Cinematic Recap

Add the flagship emotional layer:

- weekly scene planner
- short narrative sequence
- selective Google photorealistic 3D flyovers
- explicit replay action
- hard usage limits

## Experience Standard

The product should aim to feel like a blend of:

- Google Maps polish
- Apple-style calm and clarity
- Strava-style narrative and memory
- a therapy-grade reflection layer that normal map apps do not have

The promise should be:

- **Daily**: Where did my life happen?
- **Weekly**: What did my movement mean?
- **Over time**: Which places regulate me, drain me, connect me, or heal me?

## Non-Negotiable Principles

- Therapist OS owns meaning, not OwnTracks.
- The product should prioritize privacy and reflection over surveillance vibes.
- The daily map must be excellent without relying on 3D.
- The weekly recap should feel unforgettable.
- Google 3D is a selective storytelling layer, not the core app architecture.
