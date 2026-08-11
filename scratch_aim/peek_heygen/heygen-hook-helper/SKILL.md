---
name: heygen-hook-helper
description: Creates attention-grabbing HeyGen avatar video hooks for real estate listing videos. Two-phase skill — Phase 1 brainstorms creative hook concepts (visual gags, pattern interrupts, curiosity hooks) tailored to a specific property, and Phase 2 writes production-ready Seedance Cinematic or Avatar V Presenter prompts with correct motion direction, script, and settings guidance. Use this skill whenever a user asks to create a listing video hook, write a HeyGen prompt, brainstorm video intros for a property, create an avatar shot for a listing, write a Seedance prompt, write a motion prompt, or anything involving HeyGen avatar videos for real estate listings. Also trigger when the user says "hook idea," "listing video intro," "Seedance prompt," "cinematic prompt," "avatar shot prompt," "motion prompt for my listing," or references creating short-form video hooks that feature an AI avatar at a property.
---

# HeyGen Hook Helper

Creates scroll-stopping avatar video hooks for real estate listing videos using HeyGen's Avatar Shots.

## How This Skill Works

This skill runs in two phases. Phase 1 is creative — brainstorming hook concepts. Phase 2 is technical — writing the actual HeyGen prompt. The user may enter at either phase. If they already have a hook concept, skip straight to Phase 2.

**Before writing any prompt, read the correct reference file for the mode the user is targeting:**
- Cinematic (Seedance): `references/cinematic-seedance-rules.md`
- Presenter (Avatar V): `references/presenter-avatar-v-rules.md`

Always read `references/motion-prompting-guide.md` regardless of mode — it covers universal prompting craft.

These two modes are completely different engines with different capabilities, different prompt fields, and different rules. Never blend their rules or suggest capabilities from one mode while writing for the other.

---

## Phase 1: Hook Ideation

The goal is to generate 3–5 creative hook concepts tailored to a specific property.

### Gather Context

Ask the user for:
1. **Property type** — townhouse, single-family, condo, luxury estate, etc.
2. **Standout features** — what makes this listing interesting? (price point, views, renovation, neighborhood, equity position, lot size, etc.)
3. **Neighborhood/market** — where is it, what's the market vibe?
4. **Tone** — playful, dramatic, confident, urgent, luxurious?
5. **Platform** — Reels/Shorts (9:16) or YouTube/MLS (16:9)?

If the user provides a listing URL, photos, or MLS data, extract these details from what's available rather than asking.

### Generate Hook Concepts

For each hook concept, provide:
- **Hook name** — a short label (e.g., "The Vault," "The Walk-Up," "The Hot Take")
- **Visual concept** — what the viewer sees in the first 3–5 seconds
- **Script sketch** — the spoken line (1–2 sentences max)
- **Transition** — how it bridges into the listing tour footage
- **Mood/energy** — the emotional register

Good hooks share these traits:
- They stop the scroll in the first 1–2 seconds with a visual or verbal pattern interrupt
- The script is short enough for a 5–8 second clip
- They create a natural bridge into the property tour
- They work with AI avatar limitations (no complex VFX, no tiny prop manipulation)

Read `references/hook-examples.md` for example patterns to riff on. Don't copy them verbatim — adapt to the specific property.

### After Ideation

Ask the user which hook they want to develop. Then move to Phase 2.

---

## Phase 2: Prompt Engineering

The goal is to output a production-ready prompt the user can paste directly into HeyGen.

### Determine the Mode

Ask which HeyGen mode they're using:
- **Cinematic (Seedance)** — for scene immersion, movement through space, environmental context. The avatar appears IN a generated scene. Single prompt field combines motion direction and spoken script. No separate script field.
- **Presenter (Avatar V)** — for talking-head delivery with controlled performance. Avatar stays in place. Separate script field and custom motion field. Cannot change location, interact with props, move camera, or change lighting.

If the user doesn't know, help them decide: if the hook involves walking, approaching a property, interacting with the environment, or cinematic framing — it's Cinematic. If it's a direct-to-camera delivery with expressive gestures and facial performance — it's Presenter.

Read the corresponding reference file before writing the prompt.

### Gather Avatar Details

Ask:
1. **Avatar type** — selfie (phone-held, one arm extended), digital twin (studio-filmed), or photo avatar?
2. **Framing constraints** — for selfie avatars, the model has only seen chest-up with one arm extended. The prompt MUST lock framing to match training data and specify which hand is the "camera hand" vs. the "free hand."
3. **Reference image** — are they uploading a listing photo? If so, remind them: the reference image is a style guide, not a pixel-perfect backdrop. Seedance will generate an environment inspired by it, not composite the avatar onto it.

### Write the Prompt

**For Cinematic (Seedance):**

Output a single block of text that fuses motion direction and spoken script. Structure it chronologically, beat by beat. Follow every rule in `references/cinematic-seedance-rules.md`.

The prompt should include:
- Performance direction (expression, gestures, gaze woven together — not separated into categories)
- Scene and environment cues (only what the reference image doesn't already show)
- Camera language (handheld, steady, zoom, DOF)
- Atmosphere/lighting
- The spoken script embedded naturally at the right beat

If the user has a selfie-style avatar, include framing instructions: "Selfie-style, close-up framing from chest up, as if holding phone with one hand."

**For Presenter (Avatar V):**

Output TWO separate blocks:

1. **Script** (goes in the "Video Script" field) — the spoken words only, no stage directions.
2. **Custom Motion** (goes in the "Apply Custom Motion" field) — performance direction only, written as one fluid sentence covering expression, gestures, and gaze. No scene descriptions, no camera directions, no prop interactions, no location changes.

### Settings Guidance

After the prompt, include a settings checklist:
- **Enhance prompt:** OFF (the prompt is already precise)
- **Aspect ratio:** 9:16 for Reels/Shorts/TikTok, 16:9 for YouTube/MLS tours
- **Resolution:** 1080p
- **Duration (Cinematic):** 5–8 seconds for a hook
- **More expressive toggle (Presenter):** ON for energetic hooks, OFF for calm/serious delivery
- **Credit cost heads-up:** Cinematic runs ~125 credits per generation. Get the prompt right before generating.

### Reference Image Guidance

If the user is uploading a listing photo as a reference:
- Crop to just the relevant area (e.g., front entry, not full property with sky and street)
- Don't over-describe the property in the prompt — the reference image handles visual details
- DO constrain key architectural features in the prompt if accuracy matters (e.g., "brick townhouse with dark front door, no side windows near entry") to prevent Seedance from inventing elements
- Expect AI interpretation, not reproduction — the generated scene will resemble the property but won't be identical

---

## Important Constraints

- Never suggest capabilities from Presenter mode when writing for Cinematic, or vice versa
- Never write prompts that use negative phrasing ("don't move," "no gestures") — always use positive descriptions
- Never write prompts in conversational or command tone ("can you please make," "add snow to the image")
- For selfie avatars, always specify framing and camera-hand position to prevent the model from inventing unseen body parts
- Prefer flat surface interactions over small object manipulation (palm on a door, not fingers on a doorknob) to avoid hand artifacts
- Keep spoken scripts to 1–2 sentences for hooks — shorter is better for scroll-stopping content
- The hook must create a natural transition point into listing tour footage
