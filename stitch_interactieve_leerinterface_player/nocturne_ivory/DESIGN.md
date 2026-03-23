# Design System Specification: The Nocturne Framework

## 1. Overview & Creative North Star
**Creative North Star: "The Resonant Stage"**

This design system moves away from the sterile, "app-like" feel of generic learning platforms and instead adopts a high-end editorial aesthetic. Imagine a darkened concert hall where the only light falls precisely on the sheet music and the keys. The interface should feel like a premium instrument: weighted, intentional, and quiet until it needs to speak.

We break the "template" look by utilizing **intentional asymmetry**—shifting song metadata slightly off-axis from images—and **tonal depth**. Rather than using lines to box in the user, we use light and shadow to guide them. The experience is not just about "learning an app"; it’s about a professional immersion into the world of music.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the deep shadows of a grand piano (`surface: #0b1326`), accented by the mechanical precision of blue and the organic warmth of gold.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Structural boundaries must be defined solely through background color shifts or subtle tonal transitions. 
- Use `surface-container-low` (#131b2e) for secondary sections.
- Use `surface-container-high` (#222a3d) to draw the eye to interactive panels.
- *Lines create friction; color shifts create flow.*

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create "nested" depth.
- **Base Layer:** `surface` (#0b1326)
- **Primary Layout Blocks:** `surface-container-low` (#131b2e)
- **Interactive Cards:** `surface-container-highest` (#2d3449)

### The "Glass & Gradient" Rule
Floating elements (like playback controls or metronome settings) should use **Glassmorphism**. Apply `surface-variant` (#2d3449) at 60% opacity with a `backdrop-blur` of 12px. This ensures the musical notation "glows" behind the UI, keeping the user connected to the music.

### Signature Textures
For main CTAs or Hero backgrounds, use a subtle linear gradient:
- `primary-container` (#2f63e6) → `primary` (#b5c4ff) at a 135-degree angle.
- This adds a "visual soul" and a sense of movement that flat fills lack.

---

## 3. Typography: Editorial Authority
We use a high-contrast typographic scale to differentiate between the *interface* (utility) and the *instruction* (narrative).

*   **Display & Headlines (Manrope):** Used for song titles and progress milestones. The wider aperture of Manrope feels modern and expansive.
    *   `display-lg`: 3.5rem (For achievement "Bravo!" moments)
    *   `headline-md`: 1.75rem (For song titles in the player)
*   **Title & Body (Inter):** Inter provides the precision needed for musical instructions and settings. Its tall x-height ensures readability even at small sizes during intense practice sessions.
    *   `title-md`: 1.125rem (For sidebar navigation)
    *   `body-md`: 0.875rem (For descriptions and tooltips)

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too heavy for a sophisticated musical interface. We achieve depth through **Layering and Light.**

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural "recessed" look without shadows.
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use an extra-diffused shadow:
    *   `box-shadow: 0 20px 40px rgba(6, 14, 32, 0.4);`
    *   The shadow is a tinted version of the background, making it feel like a natural light obstruction rather than a "drop shadow."
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` (#434656) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** A gradient fill (Primary to Primary-Container). Roundedness: `full` (9999px). This creates a "pill" shape that feels approachable and soft.
*   **Secondary:** No background. A `Ghost Border` using `outline` (#8e90a2). On hover, fill with `surface-container-highest`.
*   **States:** Use `on-tertiary-container` (#c1ffcb) for success states (e.g., "Lesson Complete").

### Song Cards & Lists
*   **Rule:** No dividers. Separate song items in a list using `8 (2rem)` of vertical whitespace.
*   **Hover State:** Shift the background from `surface-container` to `surface-bright` (#31394d). Add a subtle 2px vertical scale transform to simulate a "key press."

### Musical Feedback (Note Markers)
*   **Correct Note:** `tertiary` (#66dd8b). Use an outer glow effect (`box-shadow: 0 0 12px #66dd8b`) to signify the note "vibrating" in harmony.
*   **Incorrect Note:** `error` (#ffb4ab). Sharp, no glow, signifying a break in the resonance.

### Progress Inputs (Sliders)
*   **Track:** `surface-container-highest`.
*   **Indicator:** `secondary` (#e9c349). The gold accent signifies the "valuable" path of the student's progress.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., `margin-left: 10`, `margin-right: 12`) for hero headers to create a custom, editorial feel.
*   **Do** use the `24 (6rem)` spacing token between major content blocks to allow the "music to breathe."
*   **Do** use `tertiary` (#66dd8b) sparingly as a "reward" color—only when the user succeeds.

### Don't
*   **Don't** use pure black (#000). Always use `surface` (#0b1326) to maintain tonal depth.
*   **Don't** use 90-degree corners. Everything must have a minimum of `DEFAULT (0.5rem)` or `lg (1rem)` roundedness to feel premium and "human."
*   **Don't** use dividers. If you feel the need for a line, increase the `spacing` scale or change the `surface-container` tier instead.

---

## 7. Accessibility
Ensure all `label-sm` text uses `on-surface` (#dae2fd) to maintain a high contrast ratio against the dark background. While we favor "ghost borders," ensure that interactive inputs have a clear focus state using a 2px solid `primary` (#b5c4ff) ring with a 4px offset.