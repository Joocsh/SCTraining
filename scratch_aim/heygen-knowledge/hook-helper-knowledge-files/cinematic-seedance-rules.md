# Cinematic (Seedance) Mode Rules

This reference covers HeyGen's Cinematic mode, powered by the Seedance 2.0 video generation engine. This is a completely different system from Avatar V Presenter mode — different capabilities, different prompt structure, different rules.

## What Cinematic Mode Is

Cinematic mode generates short video clips (4–15 seconds) where the avatar is rendered INTO a generated scene with matched lighting, depth, and camera movement. The avatar moves through space, interacts with the environment, and can speak dialogue — all from a single text prompt.

This is NOT a talking-head generator. It's a cinematic scene generator with an avatar composited into AI-generated footage.

## UI Location

Avatar > Avatar Shots > Cinematic tab at `app.heygen.com/avatar/avatar-shots?mode=cinematic`

## Prompt Field

Single field: **"Describe Your Shot"**

There is NO separate script field. If the avatar should speak, include the spoken words in the scene prompt itself. The Seedance engine will lip-sync the dialogue from the prompt text.

## What You CAN Control

- Scene and environment (indoor, outdoor, setting, location context)
- Movement through space (walking, approaching, entering)
- Physical actions and object interaction (reaching, touching, gesturing toward objects)
- Camera motion (zoom, pan, dolly, handheld, steady, tracking)
- Lighting and atmosphere (golden hour, dramatic, natural, warm, cold)
- Facial expressions and body language
- Gaze direction
- Spoken dialogue (embedded in the prompt)

## What You Cannot Reliably Control

- Pixel-perfect reproduction of a reference image (it's a style guide, not a backdrop)
- Complex VFX (explosions, fire, magical effects, particle systems)
- Precise small-object manipulation (grabbing a doorknob, picking up a pen, flipping a switch)
- Multiple sequential actions with precise timing (the model interprets timing loosely)
- Text rendering on objects in the scene

## Reference Images

- Upload via the "+" button in the Cinematic UI
- Up to 9 images and 3 videos can be provided as references
- References steer the generated environment's style, architecture, palette, and lighting
- They do NOT create a composite — Seedance generates a new scene inspired by the reference
- The generated scene will resemble the reference but will not be identical
- Seedance may add, remove, or modify architectural details (windows, railings, landscaping)
- To reduce hallucinated elements: constrain key architectural features in the prompt text AND crop the reference image to just the relevant area

## Settings

- **Enhance prompt:** Turn OFF when the prompt is already precise and directorial. Turn ON only for short, vague prompts where you want the model to flesh out details.
- **Aspect ratio:** 9:16 (vertical, Reels/Shorts), 16:9 (horizontal, YouTube/MLS), 1:1 (square)
- **Resolution:** 720p or 1080p
- **Duration:** 4–15 seconds. "Auto" lets the model decide. For listing hooks, 5–8 seconds is ideal.
- **Credits:** ~125 credits per generation at standard settings. This is expensive — refine the prompt before generating.

## Prompt Structure

Write the prompt as a chronological sequence of beats. Each beat should weave together performance (expression + gesture + gaze), environment context, and camera language — not separate them into categories.

**Formula:**
`Action/Performance + Scene Context + Camera Language + Atmosphere + [Spoken Dialogue]`

**Example:**
> Approaches the front door of a modern townhouse with a confident stride. Glances back at camera with a beckoning nod. Free hand presses flat against the door, pulls back quickly as if it's too hot to touch. Turns to face camera — slow knowing grin, raised eyebrows, subtle lean toward camera. Says: "Yep. Just what I thought. This listing is hot. You've gotta see the inside." Warm afternoon light, handheld vlog feel, shallow depth of field.

## Avatar-Specific Framing Rules

**Selfie-style avatars** (trained from phone selfie, one arm extended out of frame):
- MUST include: "Selfie-style, close-up framing from chest up, as if holding phone with one hand"
- Specify which hand is the camera hand (usually right) and which is the free hand (usually left)
- Do NOT prompt for full-body shots, walking shots showing legs, or wide angles — the model has never seen the avatar's full body and will invent it poorly
- Movement is implied through handheld bounce and environment change, not visible locomotion

**Digital twin avatars** (trained from studio video footage):
- More flexibility in framing since the model has seen more of the body
- Can prompt for medium shots (waist-up) more reliably
- Full-body shots still risky unless the training footage included them

**Photo avatars** (generated from a single photo or text prompt):
- Highly variable — test with simple prompts first before complex choreography
- Expressive motion mode produces more dynamic results than consistent motion mode

## Prompting Rules

1. **Describe action, not the scene the reference image already shows.** The model sees the reference. If you also describe the architecture in detail, you create conflicting inputs.
2. **Use positive phrasing only.** Not "no movement" but "stays completely still." Not "don't look away" but "eyes locked on camera."
3. **No conversational or command-based prompts.** Not "can you please make a video of..." but direct description: "Approaches the front door with a confident stride."
4. **No subject description when avatar is selected.** Don't write "a man" or "a woman" — the avatar look is already chosen. Jump straight to action. If you must reference the subject, use "the presenter" or drop the subject entirely and start with the verb.
5. **Prefer flat surfaces over small objects** for hand interactions to avoid hand artifacts. Palm on a door, not fingers on a knob. Hand on a wall, not picking up a key.
6. **Keep the prompt focused on 2–4 major beats.** More than 4 distinct actions in a 5–8 second clip will result in rushed, unclear motion or dropped beats.
7. **Camera language goes at the end** (or woven naturally into beats), not as a separate section.
8. **Embedded dialogue** should appear at the beat where the avatar speaks, not as a separate block.
