# ASCEND.EXE Avatar System Spec

## Objective
Build a deterministic, customizable tactical body avatar that:
- Responds visibly to user profile inputs without photo upload.
- Optionally improves body proportions from a local front-photo calibration.
- Reflects short-term readiness and long-term development trends.
- Stays aligned with ASCEND.EXE product scope and tone.

## System Boundaries
- No paid APIs.
- No cloud image processing.
- No face identity generation.
- No social/avatar sharing system.
- No medical claims.

## Core Architecture
1. `Body Model Engine` in `app/lib/system/avatar-profile.ts`.
2. `Avatar Rig Geometry` in `app/components/system/body-recovery-diagram.tsx`.
3. `Photo Calibration Module` as optional local tool inside body diagram panel.
4. `State Integration` through `SessionLogInput` and existing readiness view.

## Data Contract
Add and maintain these profile inputs in `SessionLogInput`:
- `heightCm: number`
- `bodyWeightKg: number`
- `targetWeightKg: number`
- `fitnessBaselinePct: number`

Maintain optional calibration payload:
- Storage key: `ascend.avatar.photo.calibration.v1`
- Type:
  - `shoulderToHeight`
  - `waistToHeight`
  - `hipToHeight`
  - `legToHeight`
  - `armToHeight`
  - `source: "PHOTO"`

## Morph Parameter Model
Compute these normalized render parameters every frame/state update:
- `shoulderScale`
- `waistScale`
- `hipScale`
- `armScale`
- `legScale`
- `torsoScale`
- `postureLeanDeg`
- `confidencePct`

Calculation rules:
- Use user profile, readiness/load averages, inactivity, target delta.
- Use photo ratios only as modifiers, not hard overrides.
- Clamp all outputs to safe ranges.
- Keep deterministic and pure for testability.

## Visual Rig
Render layers in this order:
1. Background tactical frame and rings.
2. Base anatomy asset image.
3. Parametric shell contour path.
4. Region overlays and glows.
5. Callout connectors and labels.
6. Selected muscle modal window.

Morph application rules:
- Apply global transform to base anatomy asset for obvious profile change.
- Apply region-specific transforms for shoulders/chest/arms/core/hips/legs.
- Keep anchors/callouts aligned to transformed region points.

## Interactivity
Required interactions:
- Click region to open muscle mini-window.
- Click same region again to close.
- Switch front/back view.
- Toggle photo calibration mode.
- Upload front photo and place landmark points in guided sequence.
- Apply or clear photo-derived calibration ratios.

## Photo Calibration Flow
1. User uploads one front-facing image.
2. App displays point-order instruction.
3. User clicks landmarks in fixed sequence:
   - `HEAD_TOP`, `CHIN`
   - `LEFT/RIGHT_SHOULDER`
   - `LEFT/RIGHT_WAIST`
   - `LEFT/RIGHT_HIP`
   - `LEFT/RIGHT_ANKLE`
   - `LEFT/RIGHT_WRIST`
4. App computes ratio set.
5. App stores ratio numbers only in localStorage.
6. Raw image is not persisted by default.

## UX Requirements
- Customization must be clearly visible at extremes.
- Show diagnostic metrics that confirm morph is active:
  - `AVATAR WIDTH`
  - `AVATAR HEIGHT`
  - `AVATAR CONFIDENCE`
- Keep tactical language concise and consumer-readable.
- Maintain minimal, sharp-border visual identity.

## Testing Requirements
Add and maintain tests in `app/lib/system/avatar-profile.test.ts`:
- Ratio derivation from landmark set.
- Confidence increase when photo ratios exist.
- Distinct morph outputs for very different user profiles.

Maintain existing project quality gates:
- `npm run lint` must pass.
- `npm run test` must pass.

## Performance Constraints
- Keep SVG rendering under real-time interaction thresholds on consumer devices.
- Avoid heavy per-frame computations in render path.
- Use memoization for morph and path derivation.
- Keep calibration UI optional and closed by default.

## Security and Privacy
- Photo calibration runs local-only in browser.
- No automatic upload endpoints.
- Do not store raw photos in localStorage.
- Provide explicit `CLEAR PHOTO DATA` control.

## Implementation Milestones
1. Stabilize data and morph formulas.
2. Expand rig to include true segment deformation.
3. Improve photo calibration UX with guided overlay and snapping hints.
4. Add trend playback mode:
   - current state
   - projected +30 days consistent
   - projected +30 days inactive
5. Final polish pass for mobile scaling and visual consistency.

## Non-Goals For This Phase
- Real-time camera capture pipeline.
- Full 3D mesh avatars.
- Face reconstruction or likeness generation.
- Multiplayer or public profile features.

## Definition of Done
- Non-photo users see clear body-shape changes from profile edits.
- Photo users can calibrate proportions and observe additional improvement.
- Region overlays remain aligned after morph transforms.
- All tests and lint pass.
- Experience remains tactical, minimal, and performant.
