# ASCEND.EXE Sound Design Spec (v1)

## Goals
- Reinforce tactical UI feedback without becoming distracting.
- Keep sounds lightweight and instant with no external asset downloads.
- Give users direct control over mute and volume from Settings.

## Sound Events
- `tap`: Default for buttons and links.
- `toggle`: Selects and toggles.
- `confirm`: Successful updates and explicit preview action.
- `navigate`: Route changes between pages.
- `alert`: Destructive actions (for example, clear history).

## Mix Targets
- Master volume default: 72%.
- Effects bus default: 84%.
- Event balance:
  - `tap`: short, low-medium loudness.
  - `toggle`: medium loudness with upward motion.
  - `confirm`: three-note ascending cue.
  - `navigate`: subtle two-step sweep.
  - `alert`: low two-hit warning tone.

## Implementation Notes
- Engine: Web Audio API, procedurally generated oscillators.
- Routing: `effects -> master -> destination`.
- Persistence: `localStorage` key `ascend.audio.preferences.v1`.
- Global listeners:
  - `click` for buttons/links (with optional `data-sound` override).
  - `change` for select/checkbox/radio controls.

## Future Extensions
- Add ambient session bed with independent volume bus.
- Add ducking on alert/confirm events.
- Replace procedural tones with branded `.ogg` sprite set if needed.
