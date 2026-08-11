# Presenter (Avatar V) Mode Rules

This reference covers HeyGen's Presenter mode, powered by the Avatar V engine. This is a completely different system from Cinematic (Seedance) mode — different capabilities, different prompt structure, different rules.

## What Presenter Mode Is

Presenter mode generates talking-head videos where the avatar stays in place and delivers a scripted line with controlled facial performance, hand gestures, body posture, and gaze direction. The avatar does NOT move through space, interact with objects, or appear in generated environments.

This is a performance controller, not a scene generator.

## UI Location

Avatar > Avatar Shots > Presenter / Avatar V tab at `app.heygen.com/avatar/avatar-shots?mode=presenter`

## Prompt Fields

Two separate fields:

1. **Video Script** — the spoken words only. No stage directions, no motion cues. Just what the avatar says.
2. **Apply Custom Motion (BETA)** — performance direction only. How the avatar delivers the script. One continuous text block — not separated into categories.

## What You CAN Control

- **Facial expressions** — calm, enthusiastic, sincere, confident, serious, warm, smile. Also transitions between expressions (e.g., "serious expression that breaks into a grin").
- **Hand gestures** — wave, point, hand on heart, open palm, counting on fingers, arms crossed then uncrossed.
- **Body posture** — lean in, warm and open, composed, relaxed, shoulders back.
- **Stillness** — no hand gestures, barely move, composed stillness.
- **Gaze** — look at camera, look away, glance off-screen then back, look down then up.

## What You CANNOT Control

- **Camera motion** — no zoom, pan, dolly, tracking, or handheld effects.
- **Location or scene** — no walking to a location, going outside, entering a room, changing environment.
- **Props or actions** — no drinking coffee, picking up a phone, touching a door, interacting with any object.
- **Background or lighting changes** — no golden hour, no dramatic lighting, no environment shifts.

These are hard limitations. Prompting for any of these will either be ignored or produce unpredictable results. Never include camera language, scene descriptions, prop interactions, or environmental details in a Presenter motion prompt.

## Settings

- **More expressive toggle:** ON for energetic, dynamic hooks. OFF for calm, measured delivery.
- **Expression presets:** Calm, Confident, Enthusiastic, Serious, Sincere, Smile, Warm — these are quick-select buttons that populate the motion field. You can use them as starting points and then customize.
- **Gestures and Gaze tabs:** Additional preset options for hand movements and eye direction.
- **Voice:** Select the cloned voice or a stock voice.
- **Aspect ratio and resolution:** Same options as Cinematic.

## Custom Motion Prompt Structure

Write as one fluid, chronological sentence. Weave expression, gestures, and gaze together — do not separate them into labeled categories.

**Think in three lanes, write in one take:**

- **Expression** (the face) — emotion, intensity, transitions between emotions
- **Gestures** (the body) — hand movements, posture shifts, physical emphasis
- **Gaze** (the eyes) — where the avatar looks, shifts in attention

These are the mental brainstorming categories. The actual prompt fuses all three into a single flowing direction, beat by beat.

**Good example:**
> Warm smile building throughout. Raised eyebrows on the key line. Open hand gesture to the side as if presenting something just off-screen. Slight lean-in toward camera at the end. Eyes locked on camera with a knowing look.

**Bad example (separated into categories — don't do this):**
> Expression: smile, confident. Gestures: wave, point. Gaze: look at camera.

**Bad example (includes forbidden elements):**
> Walk toward the house and point at the door. Camera zooms in. Golden hour lighting.

## Prompting Rules

1. **Performance only.** No scene, no camera, no environment, no props. Only face, hands, posture, and eyes.
2. **Positive phrasing.** Not "don't gesture" but "composed stillness, hands at sides."
3. **Chronological beats.** Match the motion to the script timing. If the key word is "hot," the raised eyebrows or emphasis gesture should land at that beat.
4. **One fluid sentence.** Not a bulleted list, not category labels. A director's note that flows naturally.
5. **Don't over-direct.** 3–5 motion cues for a 5–8 second clip is plenty. More than that and the beats compete with each other.
6. **Script goes in the Script field.** Motion goes in the Motion field. Don't mix them.

## When to Use Presenter vs. Cinematic

Use Presenter when:
- The hook is a direct-to-camera delivery (talking head)
- Expressive facial performance matters more than environmental immersion
- You want precise control over gesture timing relative to script delivery
- The background is secondary (solid color, branded gradient, or generic setting)

Use Cinematic (Seedance) when:
- The hook involves movement through space (walking up to a property)
- Environmental immersion matters (appearing to be at the listing)
- Physical interactions are part of the concept (touching a door, gesturing toward the house)
- Cinematic camera work is desired (handheld, tracking, shallow DOF)
