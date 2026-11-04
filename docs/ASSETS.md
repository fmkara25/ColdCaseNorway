# Archive illustrations and sound

These are fictional character/atmosphere illustrations, not historical photographs, evidence or a geographic model. Their visible caption is **Illustrasjon – ikke et bevis**. No puzzle solution depends on pixels. The same Ingrid portrait is used in her overview and person record. Other people retain initials rather than speculative appearance clues.

| Asset | Dimensions | Encoded size | Role |
| --- | --- | --- | --- |
| `frontend/public/images/ingrid-1999.webp` | 1064 × 1478 | 36 KB | Fictional Ingrid portrait |
| `frontend/public/images/skardal-winter.webp` | 1536 × 1024 | 137 KB | Fictional town atmosphere |

Created on 2026-11-04 with OpenAI's built-in image generation tool during development, then encoded to WebP at quality 82 without semantic edits. No external source photograph or real person's likeness was supplied. No runtime image generation, AI service, paid hosting or external asset request is required. Original generation prompts are recorded below; regeneration is not expected to be pixel-identical.

## Portrait prompt

Use case: photorealistic-natural. Asset type: fictional browser investigation game archive portrait, not an evidence clue. Primary request: one ordinary 1999 family snapshot portrait of a wholly fictional 23-year-old Norwegian woman, Ingrid Solberg. Subject: shoulder-length medium brown hair, natural unstyled appearance, neutral gently friendly expression, wearing a simple navy wool sweater, head and shoulders, looking toward the camera. Scene/backdrop: plain softly blurred wooden interior, no identifiable location. Style/medium: modest consumer 35mm colour photograph scanned from a print, subtle film grain, slight lens softness, imperfect exposure and natural skin texture, amateur family album rather than fashion or cinematic photography. Composition: vertical portrait, subject centered with modest headroom, image goes to the edges. Lighting: soft window daylight, quiet natural mood. Muted late-1990s colours. Constraints: no lettering, no date stamp, no frame, no watermarks, no police props, no crime scene, no glamour, no clues or narrative objects. Entirely fictional person; no resemblance to a known public figure. This is a character asset for Cold Case Norway.

## Town prompt

Use case: historical-scene. Asset type: atmospheric cover photograph for a fictional Norwegian archive investigation game. Primary request: a modest documentary 35mm snapshot of an entirely fictional small inland Trøndelag town in winter, late 1990s. Scene: a few ordinary low wooden houses and a plain two-storey small hotel among bare birch trees, snow at the edges of a quiet road, dusk sky with remaining cold blue light and a few warm windows. No people or cars. Medium: consumer colour film photo scanned from a print, restrained grain, slight softness, ordinary imperfect composition, realistic subdued colour. Composition: wide landscape establishing shot, no important identifiable landmarks, usable as a quiet background crop. Constraints: illustrative atmosphere only, not a navigable map or evidence scene; do not depict any accident, damage, service site, petrol station, body, police vehicle, clues or suspect. No text, signs, logos, dates or watermark. Avoid cinematic crime-poster effects, dramatic mountains, aurora, fog spectacle or horror. The town is fictional Skardal in Cold Case Norway; it must not reproduce a real town.

## Delivery and failure behavior

Nullable case/person image paths are stored in PostgreSQL and allowlisted in public DTOs. `AddArchiveImages` is additive; development seeding updates art metadata without touching investigation saves. Apply migrations before seeding. The browser accepts only bundled `/images/...webp` paths; missing/failed images fall back to initials or an archive label. Illustration metadata carries no authorization or unlock behavior. Images have explicit dimensions and descriptive Bokmål alternative text; compact duplicate portraits use empty alt text.

## Sound

`features/atmosphere/audio.ts` synthesizes a quiet, low-pass room/wind texture and short high-pass paper cues from a seeded noise buffer using Web Audio. There is no recording, music, speech or dependency on sound to solve the case. AudioContext is created only after the player presses **Slå på lyd**. Sound starts off on every reload; volume and room/paper toggles are session-local. Leaving the tab mutes and requires explicit reactivation, and leaving the workstation closes the context. Unsupported audio fails silently with a Bokmål status message, while gameplay continues.

Unit tests cover consent/resource creation, gain limits, independent cue settings and delayed-resume cancellation. Browser checks cover real Chromium context activation/suspension, default-off reload and unsupported audio. Visibility changes are simulated deterministically in headless Chromium; perceptual loudness/comfort and OS background behavior still require human listening on target devices. There is no claim of audio production/mastering quality based on automated tests.
