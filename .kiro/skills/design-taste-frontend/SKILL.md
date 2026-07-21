---
name: design-taste-frontend
description: Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check.
---

# tasteskill: Anti-Slop Frontend Skill

> Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI.
> Every rule below is **contextual**. None of it fires automatically. First read the brief, then pull only what fits.

---

## 0. BRIEF INFERENCE (Read the Room Before Anything Else)

Before touching code or tweaking dials, **infer what the user actually wants**. Most LLM design output is bad because the model jumps to a default aesthetic instead of reading the room.

### 0.A Read these signals first
1. **Page kind** - landing (SaaS / consumer / agency / event), portfolio (dev / designer / creative studio), redesign (preserve vs overhaul), editorial / blog.
2. **Vibe words** the user used - "minimalist", "calm", "Linear-style", "Awwwards", "brutalist", "premium consumer", "Apple-y", "playful", "serious B2B", "editorial", "agency-y", "glassy", "dark tech".
3. **Reference signals** - URLs they linked, screenshots they pasted, products they named, brands they're competing with.
4. **Audience** - B2B procurement panel vs. design-conscious consumer vs. recruiter scanning a portfolio. The audience picks the aesthetic, not your taste.
5. **Brand assets that already exist** - logo, color, type, photography. For redesigns, these are starting material, not optional input (see Section 11).
6. **Quiet constraints** - accessibility-first audiences, public-sector, regulated industries, trust-first commerce, kids' products. These constraints OVERRIDE aesthetic preference.

### 0.B Output a one-line "Design Read" before generating
Before any code, state in one line: **"Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<design system or aesthetic family>."**

### 0.C If the brief is ambiguous, ask one question, do not guess
Ask exactly **one** clarifying question - never a multi-question dump - and only when the design read genuinely diverges.

If you can confidently infer from context, **do not ask**. Just declare the design read and proceed.

### 0.D Anti-Default Discipline
Do not default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism on everything, infinite-loop micro-animations everywhere, Inter + slate-900.

---

## 1. THE THREE DIALS (Core Configuration)

* **`DESIGN_VARIANCE: 8`** - 1 = Perfect Symmetry, 10 = Artsy Chaos
* **`MOTION_INTENSITY: 6`** - 1 = Static, 10 = Cinematic / Physics
* **`VISUAL_DENSITY: 4`** - 1 = Art Gallery / Airy, 10 = Cockpit / Packed Data

**Baseline:** `8 / 6 / 4`. Use these unless the design read overrides them.

### 1.A Dial Inference
| Signal | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| "minimalist / clean / calm / editorial / Linear-style" | 5-6 | 3-4 | 2-3 |
| "premium consumer / Apple-y / luxury / brand" | 7-8 | 5-7 | 3-4 |
| "playful / wild / Dribbble / Awwwards / experimental / agency" | 9-10 | 8-10 | 3-4 |
| "landing page / portfolio / marketing site (default)" | 7-9 | 6-8 | 3-5 |
| "trust-first / public-sector / regulated / accessibility-critical" | 3-4 | 2-3 | 4-5 |
| "redesign - preserve" | match existing | +1 | match existing |
| "redesign - overhaul" | +2 | +2 | match existing |

---

## 2. BRIEF → DESIGN SYSTEM MAP

### 2.A When to reach for a real design system
| Brief reads as… | Reach for |
|---|---|
| Microsoft / enterprise SaaS | `@fluentui/react-components` |
| Google-ish UI, Material-flavored | `@material/web` + Material 3 tokens |
| IBM-style B2B / enterprise | `@carbon/react` + `@carbon/styles` |
| Shopify app surfaces | `polaris.js` |
| Atlassian / Jira-style | `@atlaskit/*` |
| GitHub-style devtool | `@primer/css` or `@primer/react-brand` |
| Public-sector UK | `govuk-frontend` |
| US public-sector | `uswds` |
| Fast local-business MVP | Bootstrap 5.3 |
| Modern accessible React | `@radix-ui/themes` |
| Modern SaaS own components | shadcn/ui |
| Tailwind-based modern SaaS | Tailwind v4 utilities |

**One system per project.** Do not mix systems.

### 2.B When the brief is an aesthetic, not a system
Build with native CSS + Tailwind + a maintained component library.

---

## 3. DEFAULT ARCHITECTURE & CONVENTIONS

### 3.A Stack
* **Framework:** React or Next.js. Default to Server Components (RSC).
* **Styling:** **Tailwind v4** (default).
* **Animation:** **Motion** (`import { motion } from "motion/react"`).
* **Fonts:** Always use `next/font` or self-host with `@font-face` + `font-display: swap`.

### 3.B State
* Local `useState` / `useReducer` for isolated UI.
* **NEVER** use `useState` for continuous values (mouse position, scroll). Use `useMotionValue` / `useTransform` / `useScroll`.

### 3.C Icons
* **Allowed (priority):** `@phosphor-icons/react`, `hugeicons-react`, `@radix-ui/react-icons`, `@tabler/icons-react`.
* **Discouraged:** `lucide-react` (acceptable only on explicit request or existing dependency).
* **NEVER hand-roll SVG icons.**
* **One family per project.**

### 3.D Emoji Policy
Discouraged by default. Replace with icon-library glyphs. Override only on explicit playful/social brief.

### 3.E Responsiveness
* `max-w-[1400px] mx-auto` or `max-w-7xl`.
* **NEVER `h-screen`** for hero. ALWAYS `min-h-[100dvh]`.
* **Grid over Flex-Math.**

---

## 4. DESIGN ENGINEERING DIRECTIVES

### 4.1 Typography
* Display: `text-4xl md:text-6xl tracking-tighter leading-none`.
* Body: `text-base text-gray-600 leading-relaxed max-w-[65ch]`.
* **Discouraged default:** Inter. Prefer Geist, Outfit, Cabinet Grotesk, Satoshi.
* **SERIF: very discouraged as default.** Only when brand brief names it or aesthetic is genuinely editorial/luxury/publication. Banned defaults: `Fraunces`, `Instrument_Serif`.

### 4.2 Color
* Max 1 accent. Saturation < 80%.
* **THE LILA RULE:** No AI-purple glows by default.
* **One palette per project.**
* **COLOR CONSISTENCY LOCK:** One accent, whole page.
* **PREMIUM-CONSUMER PALETTE BAN:** Banned defaults: beige/cream backgrounds (`#f5f1ea` family), brass/clay accents (`#b08947` family), espresso text (`#1a1714` family).

### 4.3 Layout
* **ANTI-CENTER BIAS** when `DESIGN_VARIANCE > 4`: use Split Screen, Left-aligned, Asymmetric.

### 4.4 Materiality
* Cards only when elevation communicates real hierarchy.
* **SHAPE CONSISTENCY LOCK:** One corner-radius scale for the whole page.

### 4.5 Interactive States
* Loading, Empty, Error, Tactile feedback - always implement full cycles.
* **BUTTON CONTRAST CHECK (mandatory):** WCAG AA 4.5:1 for button text.
* **CTA BUTTON WRAP BAN:** Label must fit one line at desktop.
* **NO DUPLICATE CTA INTENT:** One label per intent on the page.

### 4.6 Forms
* Label ABOVE input. No placeholder-as-label.

### 4.7 Layout Discipline (Hard Rules)
* Hero fits initial viewport: headline ≤ 2 lines, subtext ≤ 20 words, CTA visible.
* Hero top padding max `pt-24`.
* Hero max 4 text elements.
* Nav on ONE line at desktop, height ≤ 80px.
* **EYEBROW RESTRAINT:** Max 1 eyebrow per 3 sections.
* **SPLIT-HEADER BAN:** No "left big headline + right small explainer" pattern.
* **ZIGZAG CAP:** Max 2 consecutive image+text-split sections.
* **BENTO CELL COUNT:** N items → N cells, no empty cells.
* **SECTION-LAYOUT-REPETITION BAN:** At least 4 different layout families across 8 sections.

### 4.8 Images
1. Image-generation tool first.
2. `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` second.
3. Explicit placeholder slots last.

**NO div-based fake screenshots.** **NO hand-rolled decorative SVGs.**

### 4.9 Content Density
* Default per section: headline ≤ 8 words + sub ≤ 25 words + one visual/CTA.
* Long lists (>5 items): use card grid, tabs, accordion, carousel - NOT default `<ul>`.

### 4.10 Quotes
* Max 3 lines. Attribution: name + role + (optionally) company. Real typographic quotes.

### 4.11 Page Theme Lock
* ONE theme for the whole page. No section inversions.

---

## 5. CONTEXT-AWARE PROACTIVITY

### 5.A Sticky-Stack Canonical Skeleton

```tsx
"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

export function StickyStack({ cards }: { cards: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const ctx = gsap.context(() => {
      const cardEls = gsap.utils.toArray<HTMLElement>(".stack-card");
      cardEls.forEach((card, i) => {
        if (i === cardEls.length - 1) return;
        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cardEls[cardEls.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
        });
        gsap.to(card, {
          scale: 0.92,
          opacity: 0.55,
          ease: "none",
          scrollTrigger: {
            trigger: cardEls[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <div ref={ref} className="relative">
      {cards.map((card, i) => (
        <div key={i} className="stack-card sticky top-0 min-h-[100dvh] flex items-center justify-center">
          {card}
        </div>
      ))}
    </div>
  );
}
```

### 5.B Horizontal-Pan Canonical Skeleton

```tsx
"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

export function HorizontalPan({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !wrap.current || !track.current) return;
    const ctx = gsap.context(() => {
      const distance = track.current!.scrollWidth - window.innerWidth;
      gsap.to(track.current, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: () => `+=${distance}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, wrap);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <section ref={wrap} className="relative overflow-hidden">
      <div ref={track} className="flex h-[100dvh] items-center">
        {children}
      </div>
    </section>
  );
}
```

### 5.C Scroll-Reveal Stagger

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";

export function RevealStagger({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-6">
      {items.map((item, i) => (
        <motion.li
          key={item}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {item}
        </motion.li>
      ))}
    </ul>
  );
}
```

### 5.D Forbidden Animation Patterns
* **`window.addEventListener("scroll", ...)`** is banned. Use `useScroll()`, ScrollTrigger, IntersectionObserver, or CSS scroll-driven animations.
* **`requestAnimationFrame` loops that touch React state.**
* **MARQUEE MAX-ONE-PER-PAGE.**

---

## 6. PERFORMANCE & ACCESSIBILITY

* Animate ONLY `transform` and `opacity`.
* **`prefers-reduced-motion` mandatory** for `MOTION_INTENSITY > 3`.
* Dark mode: design for both from the start.
* **LCP** < 2.5s, **INP** < 200ms, **CLS** < 0.1.
* No grain filters on scrolling containers.

---

## 9. AI TELLS (Forbidden Patterns)

### 9.A Visual
* NO neon outer glows, NO pure black `#000000`, NO oversaturated accents, NO excessive gradient text, NO custom mouse cursors.

### 9.B Typography
* AVOID Inter as default. NO oversized H1s.

### 9.C Layout
* NO 3-column equal feature cards.

### 9.D Content
* NO "John Doe" / "Jane Doe". NO generic avatars. NO fake-perfect numbers. NO startup-slop brand names. NO filler verbs ("Elevate", "Seamless", "Unleash").

### 9.E Resources
* NO hand-rolled SVG icons. NO div-based fake screenshots.

### 9.G EM-DASH BAN (non-negotiable)
**Em-dash (`—`) is COMPLETELY banned everywhere.** Headlines, eyebrows, body, quotes, attribution, captions, buttons. Zero. Use hyphen `-`, comma, or period instead.

---

## 11. REDESIGN PROTOCOL

1. Detect mode: Greenfield / Preserve / Overhaul.
2. Audit before touching: brand tokens, IA, content blocks, patterns to preserve/retire.
3. Preserve: IA, slugs, nav labels, copy voice, accessibility wins, analytics events.
4. Modernise in order: typography → spacing → color → motion → hero recomposition → full block replacement.

---

## 14. FINAL PRE-FLIGHT CHECK

Run every box before outputting. If any fails, fix first.

- [ ] Brief inference declared?
- [ ] Dial values explicit?
- [ ] ZERO em-dashes anywhere?
- [ ] Page Theme Lock (one theme)?
- [ ] Color Consistency Lock (one accent)?
- [ ] Shape Consistency Lock (one radius system)?
- [ ] Button Contrast Check (WCAG AA 4.5:1)?
- [ ] CTA Button no wrap at desktop?
- [ ] Serif not Fraunces/Instrument_Serif (without justification)?
- [ ] Premium-consumer palette not beige+brass default?
- [ ] Hero fits viewport (≤2 lines headline, ≤20 words subtext, CTA visible)?
- [ ] Hero top padding ≤ pt-24?
- [ ] Hero max 4 text elements?
- [ ] Eyebrow count ≤ ceil(sectionCount / 3)?
- [ ] No Split-Header pattern?
- [ ] No 3+ consecutive zigzag sections?
- [ ] No duplicate CTA intent?
- [ ] Bento cells have visual diversity (not all white-on-white)?
- [ ] Copy self-audit (no broken grammar, no AI-hallucinated phrases)?
- [ ] Every animation motivated (hierarchy/storytelling/feedback/state)?
- [ ] Max one marquee per page?
- [ ] Nav on one line at desktop, ≤80px?
- [ ] At least 4 different section layout families?
- [ ] Bento has exact cell count (no empty cells)?
- [ ] Long lists use right UI component (not default ul)?
- [ ] Real images used (no fake div screenshots)?
- [ ] No pills/labels overlaid on images?
- [ ] No version footers on marketing pages?
- [ ] No decoration text strips at hero bottom?
- [ ] No scroll cues?
- [ ] No section-numbering eyebrows?
- [ ] No border-t + border-b on every row?
- [ ] Motion claimed = motion shown?
- [ ] Reduced motion wrapped for MOTION_INTENSITY > 3?
- [ ] Dark mode tokens defined and tested?
- [ ] Mobile collapse explicit for high-variance layouts?
- [ ] min-h-[100dvh] never h-screen?
- [ ] useEffect animations have cleanup?
- [ ] Icons from allowed library only?
- [ ] No AI Tells from Section 9?
- [ ] Core Web Vitals plausibly met?
- [ ] One design system per project?
