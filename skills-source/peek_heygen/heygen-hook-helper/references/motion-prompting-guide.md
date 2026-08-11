# Motion Prompting Guide

Universal prompting principles that apply to both Cinematic (Seedance) and Presenter (Avatar V) modes. Read this alongside the mode-specific rules file.

## The Director's Mindset

The difference between a bad motion prompt and a good one is the difference between "a guy talking about a house" and the blocking notes a director gives talent on set. Motion prompts are director's notes — specific, visual, chronological, and performance-oriented.

Users should think of themselves as a director talking to talent who's already on set and in costume. The avatar is selected, the look is chosen. The prompt tells the talent what to DO, not who they ARE.

## The Three-Lane Framework

Before writing, brainstorm in three parallel lanes:

**Lane 1 — Expression (the face)**
What emotion is on the face? How intense? Does it change during the clip?
- Vocabulary: warm smile, knowing grin, raised eyebrows, serious look that softens, excited eyes, calm composure, smirk, surprise, curiosity
- Transitions are powerful: "serious expression that breaks into a slow grin" is more dynamic than a static "smile"

**Lane 2 — Gestures (the body)**
What are the hands doing? What's the posture? Any physical movement?
- Vocabulary: open palm gesture, point at camera, count on fingers, hand on heart, arms crossed then uncrossed, lean in, step forward, reach toward something, beckoning motion, shrug, nod
- Specificity matters: "open hand gesture to the side as if presenting something" is better than "gestures"

**Lane 3 — Gaze (the eyes)**
Where are the eyes directed? Do they shift?
- Vocabulary: eyes locked on camera, glance off-screen then back, look down then up, eyes shift between camera and something to the side, track an object, knowing look directly into the lens
- Gaze direction controls where the viewer's attention goes — it's the most underrated lane

**After brainstorming all three lanes, collapse them into one chronological sequence.** The output is a single flowing prompt, not three separate sections.

## Prompt Formulas

### Basic (works for both modes)
`Performance direction beat by beat`

> Confident smile, slight nod, open hand gesture to the side, lean-in toward camera.

### Precise — Cinematic Only (adds camera and atmosphere)
`Performance + Scene Context + Camera Language + Atmosphere`

> Approaches the front door with a confident stride. Glances at camera with raised eyebrows and a beckoning nod. Free hand presses flat against the door. Turns to face camera with a slow grin. Warm afternoon light, handheld vlog feel, shallow depth of field.

### With Dialogue — Cinematic Only
`Performance + Scene Context + Camera Language + Atmosphere + Embedded Script`

> Approaches the front door with a curious expression. Pauses, presses palm flat against the door, pulls back quickly. Turns to camera with a knowing grin and says: "Yep. Just what I thought. This listing is hot. You've gotta see the inside." Handheld feel, warm golden light, shallow depth of field.

## Universal Do's

1. **Use clear, direct, visual descriptions.** Every word should paint a picture the model can render.
2. **Use positive phrasing.** Describe what SHOULD happen, never what shouldn't.
3. **Write chronologically.** First beat, then second beat, then third. The model processes sequentially.
4. **Match motion to script rhythm.** If the punchline is "this listing is HOT," the eyebrow raise or emphasis gesture should land at that word.
5. **Keep it to 2–4 major beats** for a 5–8 second clip. Fewer beats = cleaner execution.
6. **Prefer simple physical actions.** Flat palm on a surface, not fingers grasping a small object. A nod, not a complex dance move.
7. **Include transitions between emotions** for dynamic performance. Static emotions read as flat.

## Universal Don'ts

1. **No negative phrasing.** ❌ "No movement, empty sky." ✅ "Stays completely still. Bright, cloudless sky."
2. **No conversational or command tone.** ❌ "Can you please make a video of..." ✅ Direct description starting with action.
3. **No subject description when avatar is selected.** ❌ "A man in a blue shirt..." ✅ Jump straight to the action verb. The avatar look is already chosen.
4. **No over-describing what the reference image shows.** The model sees the image. Describing it again creates conflicting inputs. Only constrain specific architectural details if accuracy matters.
5. **No category labels in the prompt.** ❌ "Expression: smile. Gestures: wave. Gaze: camera." ✅ "Warm smile, gentle wave, eyes on camera."
6. **No bulleted lists.** Write flowing prose, not a checklist.

## Keyword Reference

These keywords help steer specific qualities in the output:

**Mood/Energy:** confident, warm, playful, dramatic, calm, urgent, sincere, enthusiastic, knowing, curious, excited, composed

**Lighting (Cinematic only):** golden hour, warm afternoon, natural light, dramatic contrast, soft diffused, bright and clean, moody, backlit

**Camera (Cinematic only):** handheld, steady, tracking, slow zoom-in, shallow depth of field, documentary feel, vlog style, cinematic, eye-level, low angle, close-up

**Detail (Cinematic only):** ultrarealistic, highly detailed, polished commercial feel, lifestyle aesthetic, editorial quality

**Framing (Cinematic only):** close-up, medium shot, chest-up, selfie-style, 3/4 shot, headshot

## Motion Modes (Cinematic Only)

Cinematic mode offers two motion sub-modes:

**Consistent Motion:** Prioritizes visual stability and fidelity. The avatar and scene look very close to the input image with smooth, predictable movement. Moderate prompt adherence. Best for polished, professional clips where composition matters more than dynamic movement.

**Expressive Motion:** Prioritizes realism and dynamism. Natural, detailed movement with high prompt adherence. Best for emotional storytelling, character-driven performance, and energetic sequences. Recommended for listing hooks.
