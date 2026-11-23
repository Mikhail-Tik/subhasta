# The luxury interface — research for Subhasta v31

Prepared 23 November 2026. Scope: how the houses, the museums, the auction rooms and the best interaction designers actually behave on screen, and what Subhasta should copy. Every claim is tied to a page that was opened for this note. Where a recommendation rests on practice rather than an opened page, it says so in brackets.

A note on what the fetches could see. The house sites were read as text extractions. They expose navigation, copy, captions, alt text and meta tags. They do not expose stylesheets. Claims about their typefaces therefore come from type-industry sources, not from the sites themselves.

---

## 1. The ten laws

### Law 1 — Motion: brief, purposeful, cancellable

Motion exists to explain a state change. It never decorates. Apple's guideline is blunt: "Add motion purposefully, supporting the experience without overshadowing it", and "Aim for brevity and precision in feedback animations" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)). The same page says "Let people cancel motion" and warns that gratuitous animation "may make them feel disconnected or physically uncomfortable".

Emil Kowalski's rule for product UI is that animations "should also usually be shorter than 300ms", and that a 500 ms entrance on a frequently used tool is frustrating ([Emil Kowalski, Great Animations](https://emilkowal.ski/ui/great-animations)). Rauno Freiberg's observation of macOS is the model for a quiet interface: context menus "appear without motion, fade out subtly", and keyboard or mouse input "feel less visceral than touch, so they tolerate less animation" ([Rauno Freiberg, Invisible Details](https://rauno.me/craft/interaction-design)).

### Law 2 — Pacing: one proposition per screen

The houses present one idea, one or two sentences, one link. On the Hermès homepage each section has "a headline, one or two sentences of copy, and a single call-to-action link", with verbs such as "Discover" and "Explore the new pieces" ([Hermès homepage, Sept 2025 edition](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/)). Patek Philippe presents eleven collections, each with a three-to-six-word tagline and one "Discover more" link ([Patek Philippe, Collection](https://www.patek.com/collection)). Pictet introduces its Geneva services as four cards, each "with a bold title, a one-line summary, and a 'More about' link" ([Pictet, Wealth Management Geneva](https://www.pictet.com/ch/en/wealth-management/geneva)).

Pacing also means not changing things under the client. Bloomberg's UX team says "We have to balance innovation with familiarity", ships redesigns "in small monthly steps", and treats "stability" as "job number one" ([Bloomberg, How Terminal UX designers conceal complexity](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity)).

### Law 3 — Whitespace and restraint: structure felt, not seen

Linear's design note puts it in one line: "Structure should be felt not seen". Dividers help orientation "without adding clutter"; the refresh used "fewer separators", "rounded" their edges and "softened" their contrast ([Linear, Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh.md)). Fontfabric's survey of luxury branding names "minimalist tight tracking, restrained weight, and generous whitespace" as the default of modern luxury, and says excessive decoration, rounded casual forms and condensed proportions "all undermine a premium feel" ([Fontfabric, Fonts for luxury branding](https://www.fontfabric.com/blog/fonts-for-luxury-branding/)). Monotype describes the visual norms of luxury as "subtle yet refined" and Hermès as having "a refined and understated approach" ([Monotype, Luxury and typography](https://cms-prod.monotype.com/resources/luxury-and-typography)).

### Law 4 — Typography: a display serif cut for size, a neutral text face, optical sizes respected

The dominant luxury pattern is a serif display face with a quiet sans for everything else. Fontfabric: "Many brands use a serif logo paired with a sans-serif supporting face"; Tiffany sets a thin serif logo against Verdana for product descriptions and prices; Chanel pairs its spaced-out sans logo with Helvetica ([Fontfabric](https://www.fontfabric.com/blog/fonts-for-luxury-branding/)). Monotype reports that Hermès uses Orator and Helvetica on its website, and that its logo was historically set in Memphis Bold ([Monotype](https://cms-prod.monotype.com/resources/luxury-and-typography)). Hermès print work pairs a serif with a grotesque: Molitor with SangBleu Kingdom, Media Sans with ABC Monument Grotesk, Bourrasque with GT Sectra ([Fonts in Use, Hermès tag](https://fontsinuse.com/tags/17302/hermes-brand)).

Optical sizing is the part amateurs skip. Klim explains that "it's often undesirable to enlarge a text typeface beyond its intended size range" because "the spacing is usually too loose"; Tiempos Headline was "drawn specifically for large sizes" with "snug spacing", and Tiempos Text was narrowed and tightened for "economy and legibility" ([Klim, Tiempos design information](https://klim.co.nz/blog/tiempos-design-information)). Linear applies the same logic: Inter Display for headings, regular Inter for everything else ([Linear, How we redesigned the Linear UI](https://linear.app/blog/how-we-redesigned-the-linear-ui)).

### Law 5 — Colour: paper ground, neutral chrome, perceptual palette

The houses sit on white. Both the Hermès and Patek pages declare a meta theme colour of `#FFFFFF` ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/); [Patek](https://www.patek.com/collection)). Chrome colour must not compete with content. Linear limited "how much chrome (blue in our case) was used" to reach "a more neutral and timeless appearance", built its themes in LCH because it is perceptually uniform, and moved its default greys "toward a warmer, less saturated gray" while warning that "going too warm can look muddy" ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui); [Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)). Stripe built its palette in CIELAB because "different hues are inherently perceived as different levels of lightness", and holds to WCAG's "minimum contrast ratio of 4.5 for small text, and 3.0 for large text" ([Stripe, Designing accessible color systems](https://stripe.com/cn/blog/accessible-color-systems)).

### Law 6 — Imagery: the object is the hero; the caption is archival

Auction rooms show the work large, with a full-screen option, and surround it with facts, not adjectives. Sotheby's shows "one main image, labelled 'View 1 of Lot 107', with a full-screen option", and copy that is "neutral and archival" ([Sotheby's, Monet Nymphéas, L26006](https://www.sothebys.com/en/buy/auction/2026/modern-contemporary-evening-auction-l26006/nympheas)). Christie's sets the artist in capitals with dates above the title, then "Signed and dated 'Claude Monet 88' (lower left) / Oil on canvas / 36 3/8 x 28 5/8 in. (92.5 x 72.8 cm.) / Painted in 1888" ([Christie's, Monet lot 6482945](https://www.christies.com.cn/en/lot/lot-6482945)). Museums promise depth: the Rijksmuseum's 717-gigapixel Night Watch lets viewers zoom "even further on minute, pin-sharp particles of pigment" ([Rijksmuseum press release](https://www.rijksmuseum.nl/en/press/press-releases/rijksmuseum-publishes-717-gigapixel-photograph-of-the-night-watch)).

### Law 7 — Sound and silence: the client controls every channel

Sound, where it exists, sits under the client's hand. The Hermès homepage exposes its video with explicit "Mute", "play" and "pause" controls ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/)). Patek puts a "Reduce motion" control in its site header ([Patek](https://www.patek.com/collection)). Apple's rule is that motion must be optional, and that no message may depend on one channel alone: "Make motion optional" and "avoid using it as the only way to communicate important information" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)).

### Law 8 — Feedback: immediate, realistic, interruptible

Apple: "Strive for realistic feedback motion that follows people's gestures and expectations", and "don't make people wait for an animation to complete before they can do anything" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)). Rauno's rule for pinch: "Apply the scale delta immediately and animate only past a threshold", because a naive zoom "gives zero affordance or confidence"; destructive actions wait for gesture end, lightweight ones may trigger mid-gesture ([Rauno Freiberg](https://rauno.me/craft/interaction-design)). Emil's press feedback is `transform: scale(0.97)` on `:active` over 160 ms, and he insists on CSS transitions for rapidly triggered UI because they can be redirected mid-flight while keyframes "restart from zero when interrupted" ([Emil Kowalski, Animation standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).

### Law 9 — Density: dense is fine; loud is not

Bloomberg keeps thousands of functions usable by "hiding complexity": windows are resizable to show "more or fewer rows and columns", the old four-panel maximum "has gone away" in favour of tabbed panels, and the design conversation "is almost never about desirability; it's about what value the users will get" ([Bloomberg](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity)). Linear's hierarchy rule is "Don't compete for attention you haven't earned": the sidebar is "dimmed by a few levels so the main content area takes precedence", icons are reduced and scaled down, coloured icon backgrounds removed ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)). Its earlier redesign increased "the hierarchy and density of navigation elements" while reducing "visual noise", and separated surfaces by elevation rather than by colour ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui)).

### Law 10 — Copy: short, concrete, declarative; archival where facts matter

Hermès writes two sentences for a watch: "The Hermès H08 watch etches each moment. It is attuned to the pulse of its wearer." ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/)). Pictet writes in the first person plural and promises conduct, not adjectives: "Partnership is how we work with clients: we take the time to listen to them and understand their goals." ([Pictet](https://www.pictet.com/ch/en/wealth-management/geneva)). Cucinelli opens a 350-word page with an epigraph from Vauvenargues and the line "Advanced technology is always seen as a tool, never as an end" ([Brunello Cucinelli, Craftsmanship](https://www.brunellocucinelli.com/en/craftsmanship.html)). Where facts matter, the auction rooms drop prose entirely: Sotheby's estimate line is simply "30,000,000 - 40,000,000 GBP" ([Sotheby's](https://www.sothebys.com/en/buy/auction/2026/modern-contemporary-evening-auction-l26006/nympheas)).

---

## 2. Motion

### 2.1 Durations

The published numbers converge.

| Interaction | Duration | Source |
|---|---|---|
| Button press feedback | 100–160 ms | [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md) |
| Tooltips, small popovers | 125–200 ms | same |
| Dropdowns, selects | 150–250 ms | same |
| Desktop transitions generally | 150–200 ms | [Material, Duration & easing](https://m1.material.io/motion/duration-easing.html) |
| Modals, drawers, sheets | 200–500 ms | [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md) |
| Element entering (mobile) | 225 ms | [Material](https://m1.material.io/motion/duration-easing.html) |
| Element leaving (mobile) | 195 ms | same |
| Full-screen transition (mobile) | 375 ms | same |
| Toast | 400 ms, `ease` | [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md) |
| Ceiling for product UI | under 300 ms; over 400 ms "may feel too slow" | [Emil, Great Animations](https://emilkowal.ski/ui/great-animations); [Material](https://m1.material.io/motion/duration-easing.html) |

Material 3 publishes a token scale to pick from: short 50/100/150/200 ms, medium 250/300/350/400 ms, long 450/500/550/600 ms, extra-long 700/800/900/1000 ms, with the rule "duration should increase as the area/traversal of an animation increases" ([Material Components, Motion](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)). Material also scales by device: tablets about 30 % longer than mobile, wearables about 30 % shorter, desktop shortest of all ([Material](https://m1.material.io/motion/duration-easing.html)). Leaving elements may be quicker than entering ones "because they need less attention" (same page).

For Subhasta, a desktop-first terminal, that gives three tokens:

```css
:root {
  --dur-micro: 140ms;   /* press, hover colour, toggle */
  --dur-ui:    220ms;   /* menus, popovers, card open */
  --dur-scene: 360ms;   /* section change, card over globe, image crossfade */
}
```

### 2.2 Easing

Three families appear in the guidelines.

Material 1: standard `cubic-bezier(0.4, 0.0, 0.2, 1)`, deceleration `cubic-bezier(0.0, 0.0, 0.2, 1)`, acceleration `cubic-bezier(0.4, 0.0, 1, 1)`, sharp `cubic-bezier(0.4, 0.0, 0.6, 1)` ([Material](https://m1.material.io/motion/duration-easing.html)).

Material 3: standard `cubic-bezier(0.2, 0, 0, 1)`, standard-decelerate `cubic-bezier(0, 0, 0, 1)`, standard-accelerate `cubic-bezier(0.3, 0, 1, 1)`, emphasized-decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)`, emphasized-accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)`. Standard is for "utility focused animations that begin and end on screen" ([Material Components, Motion](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)).

Emil Kowalski's practitioner set: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Rules: ease-out for entering or exiting; ease-in-out for things that move or morph while on screen; plain `ease` for hover and colour; `linear` only for constant motion such as a marquee; and "Never `ease-in` on UI" ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).

Springs versus Bézier. A Bézier has a fixed duration; a spring is physics. Josh Comeau: spring motion "slows to a stop in a way that CSS transitions can't replicate", most springs he uses "are not bouncy at all", and "Springs are most impactful when it comes to motion; I wouldn't use them for color or opacity changes" ([Josh Comeau, Spring physics](https://joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)). Material 3 publishes spring presets that embody the same split: a default spatial spring at damping 0.9 and stiffness 700, and an effects spring for colour and opacity at damping 1.0 and stiffness 1600, which "should not overshoot" ([Material Components, Motion](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)). Emil's Apple-style preset is `{ type: "spring", duration: 0.5, bounce: 0.2 }`, with bounce kept between 0.1 and 0.3 and reserved for drag-to-dismiss ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).

Recommendation. Use Bézier for everything the client triggers with a click or key. Use a critically damped spring (no overshoot) only for continuous input: the globe's zoom and drag. That matches Comeau's "motion, not colour" rule and Material's effects-spring rule.

```css
:root {
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);     /* enter, exit */
  --ease-move:   cubic-bezier(0.77, 0, 0.175, 1);    /* reposition on screen */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* panels, sheets */
}
```

### 2.3 What to animate, and how to keep it interruptible

Animate only `transform` and `opacity`; they skip layout and paint. Avoid `padding`, `margin`, `height`, `width`, `top`, `left` ([Emil, Great Animations](https://emilkowal.ski/ui/great-animations); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)). web.dev says the same from the layout-shift side: "Changing the `top` and `left` properties also cause layout shifts"; use `transform` to "translate, scale, rotate, or skew" ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)). Prefer CSS transitions or WAAPI to `requestAnimationFrame` libraries for UI, because compositor animations keep running when the main thread is busy ([Emil, Great Animations](https://emilkowal.ski/ui/great-animations)).

Entrances start from `scale(0.9–0.97)` plus `opacity: 0`, never `scale(0)`. Popovers scale from their trigger via `transform-origin`; modals stay centred ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).

Frequency decides whether to animate at all. Actions used 100+ times a day, such as keyboard shortcuts and command palettes: "No animation. Ever." Tens of times a day: remove or drastically reduce. Occasional: standard. Rare: may delight ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)). Apple agrees: "generally avoid adding motion to UI interactions that occur frequently" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)). Rauno found that removing motion from his tool's keyboard interactions made it feel faster ([Rauno Freiberg](https://rauno.me/craft/interaction-design)).

### 2.4 Wheel and trackpad zoom

Three facts from the platform.

First, delta units vary. MDN: "You must check the `deltaMode` property to determine the unit of the `deltaX`, `deltaY`, and `deltaZ` values. Do not assume that those values are specified in pixels." `DOM_DELTA_PIXEL` is 0, `DOM_DELTA_LINE` is 1, `DOM_DELTA_PAGE` is 2. Some browsers return different units depending on whether `deltaMode` has been read ([MDN, WheelEvent.deltaMode](https://developer.mozilla.org/docs/Web/API/WheelEvent/deltaMode)).

Second, wheel listeners on `window`, `document` or `body` are passive by default since Chrome 73, so `preventDefault()` there "will be ignored". To cancel scrolling for a zoom, "pass `{passive: false}` to `addEventListener()`" ([Chrome, Making wheel scrolling fast by default](https://developer.chrome.com/blog/scrolling-intervention-2/)). Register the listener on the canvas element, not the window, and keep the rest of the page passive.

Third, the feel. Rauno: apply the delta immediately, animate only the remainder ([Rauno Freiberg](https://rauno.me/craft/interaction-design)). Comeau: let the motion slow to a stop like a spring, not a timer ([Josh Comeau](https://joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)). Apple: never make the client wait for the animation ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)).

The pattern that satisfies all three is a target value updated instantly on every event, and a displayed value that chases the target with a critically damped exponential approach each frame. It has no fixed duration, never overshoots, and absorbs any new input mid-flight.

```js
// Zoom on a canvas globe. Practice pattern built on the cited rules above.
const LINE_PX = 16;                       // one "line" in pixels; tune to layout
let target = 1, shown = 1, anchor = { x: 0, y: 0 }, raf = 0;

function toPixels(e) {                    // MDN: never assume pixels
  if (e.deltaMode === 1) return e.deltaY * LINE_PX;           // lines
  if (e.deltaMode === 2) return e.deltaY * canvas.clientHeight; // pages
  return e.deltaY;                                            // pixels
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();                     // allowed: listener is on the canvas, passive:false
  const px = Math.max(-100, Math.min(100, toPixels(e)));  // clamp wheel bursts
  // [practice, no opened source] trackpad pinch arrives as wheel + ctrlKey; use a finer gain
  const gain = e.ctrlKey ? 0.010 : 0.0025;
  target = clamp(target * Math.exp(-px * gain), MIN_ZOOM, MAX_ZOOM);
  anchor = { x: e.offsetX, y: e.offsetY };  // zoom about the cursor, not the centre
  if (!raf) raf = requestAnimationFrame(step);
}, { passive: false });

let last = performance.now();
function step(now) {
  const dt = Math.min(now - last, 50); last = now;   // cap dt after tab switches
  const k = 1 - Math.exp(-dt / 90);                  // 90 ms time constant, no overshoot
  shown += (target - shown) * k;
  draw(shown, anchor);
  raf = Math.abs(target - shown) > 1e-4 ? requestAnimationFrame(step) : 0;
}
```

Pinch on touch uses pointer events, not touch events. MDN's reference pattern caches up to two pointers on `pointerdown`, updates them on `pointermove`, measures `Math.hypot(dx, dy)` between them, compares with the previous distance, and resets on `pointerup`, `pointercancel`, `pointerout` and `pointerleave`; the element carries `touch-action: none` so the browser's own pan and zoom do not compete ([MDN, Pinch zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)). Feed the ratio of current to previous distance into the same `target` as the wheel handler, anchored at the midpoint of the two pointers. Rauno's note applies: pinch "is an act of precision", and fingers that start close together give "a deliberate anchor point" ([Rauno Freiberg](https://rauno.me/craft/interaction-design)). Apply `touch-action: none` to the canvas only, never to `body`.

### 2.5 Crossfades for images

Two stacked layers, opacity only, a hint of blur. Emil: add `filter: blur(2px)` during a crossfade that shows two overlapping states, and keep any blur under 20 px ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)). Apple's visionOS guidance prefers a fade to a move: "you can fade the object out before moving it and fade it back in after it's in the new location" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)).

```css
.plate { position: relative; aspect-ratio: var(--w) / var(--h); background: var(--ground); }
.plate img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
  opacity: 0; filter: blur(2px);
  transition: opacity var(--dur-scene) var(--ease-out), filter var(--dur-scene) var(--ease-out);
}
.plate img.is-ready { opacity: 1; filter: none; }
```

### 2.6 Staggering

Delay 30–80 ms between items. Stagger is "decorative and must never block interaction" ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)). Use it once, on first reveal of a list, never on re-sorts.

```css
.lots > li { animation: rise var(--dur-ui) var(--ease-out) both; animation-delay: calc(var(--i) * 40ms); }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
```

### 2.7 What `prefers-reduced-motion` must do

The media query reports that the user has asked the OS to "minimize the amount of animation or motion it uses". web.dev calls this a "medical necessity" for people with vestibular disorders, and says interfaces should minimise movement "preferably to the point where all non-essential movement is removed". JavaScript animations do not update themselves, so listen to the query's `change` event with `matchMedia` ([web.dev, prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)). Emil's refinement: keep opacity and colour changes, remove transform-based movement; reduced motion "means fewer and gentler animations, not none" ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)). Apple's rule, "Make motion optional", applies to the turning globe above all ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)). Patek goes further and offers an in-page "Reduce motion" control ([Patek](https://www.patek.com/collection)).

```css
@media (prefers-reduced-motion: reduce) {
  :root { --dur-scene: 0ms; }                     /* movement collapses; fades stay via --dur-ui */
  .plate img { filter: none; }
  [data-motion="translate"], [data-motion="scale"] { transition-property: opacity; }
}
```

```js
const rm = matchMedia('(prefers-reduced-motion: reduce)');
const apply = () => globe.setAutoRotate(!rm.matches);   // stop the globe; keep drag and zoom
apply(); rm.addEventListener('change', apply);
```

---

## 3. Imagery of paintings

### 3.1 The reveal and the zoom

Museums sell depth, not spectacle. Google's Art Camera stitches "hundreds of high-resolution close-ups" into a gigapixel image so viewers can zoom "to the level of individual brushstrokes and paint dabs"; people explore these images "inch by inch" and "spot something new every time" ([Google, Art Camera](https://blog.google/company-news/outreach-and-initiatives/arts-culture/art-camera-cultural-institute/)). The Rijksmuseum's Night Watch is 717 gigapixels, 8,439 photographs, 5 micrometre pixels, 5.6 terabytes, and the point of publishing it is that the public can keep admiring the painting "in the minutest detail" even while the front is off view ([Rijksmuseum](https://www.rijksmuseum.nl/en/press/press-releases/rijksmuseum-publishes-717-gigapixel-photograph-of-the-night-watch)). The lesson for a daily picture game is that zoom is the content. A picture that cannot be entered is a thumbnail.

The zoom itself should follow the wheel rules in §2.4: immediate response, cursor-anchored, no fixed duration ([Rauno Freiberg](https://rauno.me/craft/interaction-design)). Scale the image with `transform`, never by resizing the box ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).

### 3.2 Background, ground and frame

The auction rooms show the object on a neutral page and let the client go full screen. Sotheby's: one main image, "View 1 of Lot 107", with a full-screen option ([Sotheby's](https://www.sothebys.com/en/buy/auction/2026/modern-contemporary-evening-auction-l26006/nympheas)). Christie's: captioned thumbnails with "1 More" and "4 More" overflow indicators ([Christie's](https://www.christies.com.cn/en/lot/lot-6482945)). The Hermès and Patek pages declare white as their theme colour ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/); [Patek](https://www.patek.com/collection)).

The opened pages do not state a rule on frames. [Practice, no opened source]: show the frame only when the frame is part of the object's history or the lot photograph includes it; in the game, show the unframed plate so the puzzle is the paint.

For the ground beneath a picture, the colour guidance in §4 applies: a warm, desaturated near-white in light mode, with Linear's warning that too warm "can look muddy" ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)).

### 3.3 The caption

Copy the auction rooms exactly. Christie's order: artist in capitals with dates; title; "Signed and dated 'Claude Monet 88' (lower left)"; "Oil on canvas"; "36 3/8 x 28 5/8 in. (92.5 x 72.8 cm.)"; "Painted in 1888". Then sections in this order: Details, Provenance, Literature, Exhibited, Sale Room Notice, specialist contact, Lot Essay of about 2,000 words ([Christie's](https://www.christies.com.cn/en/lot/lot-6482945)). Sotheby's gives dimensions in both units, "93.7 by 89.5 cm; 36⅞ by 35¼ in", a provenance chain from the artist in 1909 to the present owner, a bibliography, and gates the condition report behind a login ([Sotheby's](https://www.sothebys.com/en/buy/auction/2026/modern-contemporary-evening-auction-l26006/nympheas)). Gagosian's listing format is artist heading, exhibition title, dates, location, with copy that is "minimal and transactional" ([Gagosian, Upcoming](https://gagosian.com/exhibitions/upcoming/)).

Buyers want scale. Baymard finds that 37 % of product pages lack an "In Scale" image although 42 % of users try to judge size from images, and 23 % lack a human-model image ([Baymard, Product page UX](https://baymard.com/blog/current-state-ecommerce-product-page-ux)). For a painting the equivalent is the dimension line and, where possible, a room or figure for scale.

### 3.4 Delivery: formats, srcset, space reservation, blur-up

Use `<picture>` with AVIF first, WebP second, JPEG fallback, because "the browser picks the first `<source>` element specified that matches", and AVIF "tests have shown greater than 50% savings when compared to JPEG in some cases". Width descriptors need `sizes`: "`srcset` width descriptors must have both `sizes` attribute and width descriptors, or they don't work." Use `decoding="async"` on very large images. Lazy-load with `loading="lazy"` only what is off screen, so bandwidth goes to critical content ([web.dev, Image performance](https://web.dev/learn/performance/image-performance)). Do not lazy-load the day's picture; it is the LCP element [inference from the same page].

```html
<picture>
  <source type="image/avif" srcset="/p/1200.avif 1200w, /p/1800.avif 1800w, /p/2400.avif 2400w" sizes="(min-width: 1024px) 60vw, 100vw">
  <source type="image/webp" srcset="/p/1200.webp 1200w, /p/1800.webp 1800w, /p/2400.webp 2400w" sizes="(min-width: 1024px) 60vw, 100vw">
  <img src="/p/1800.jpg" width="1800" height="1399" alt="Claude Monet, Nymphéas, 1907" decoding="async" fetchpriority="high">
</picture>
```

Reserve the box before the bytes arrive. "Always include `width` and `height` size attributes on your images and video elements", or reserve space with CSS `aspect-ratio`; the target is a CLS of 0.1 or less ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)). Then crossfade the full image over the reserved ground with the 2 px blur from §2.5 ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)). [Practice, no opened source]: a 20–32 px inline placeholder (LQIP) under that blur gives the plate a colour before the first byte of the real image; the cited pages document the reservation and the crossfade, not the placeholder itself.

---

## 4. Typography and colour

### 4.1 Pairings

The luxury default is a serif for the voice and a grotesque for the facts. Fontfabric: a striking display face for the wordmark, "a neutral, highly legible sans-serif for everything else"; supporting type should be "versatile and legible first, elegant second" ([Fontfabric](https://www.fontfabric.com/blog/fonts-for-luxury-branding/)). The named examples: Armani in Didot, Vogue in Bodoni, Louis Vuitton in Futura, Estée Lauder in Optima, Tiffany's thin serif with Verdana for prices, Chanel's spaced sans with Helvetica (same page). Hermès: Orator and Helvetica on the website per Monotype ([Monotype](https://cms-prod.monotype.com/resources/luxury-and-typography)); in print, Molitor with SangBleu Kingdom, Media Sans with ABC Monument Grotesk, Bourrasque with GT Sectra ([Fonts in Use](https://fontsinuse.com/tags/17302/hermes-brand)).

Monotype's Neurons study attaches numbers: serifs lifted perceived quality by 13 % and reliability by 9 %; humanist sans lifted perceived sincerity by 10 % and honesty by 5 %; geometric sans lifted memorability by 6 % ([Monotype](https://cms-prod.monotype.com/resources/luxury-and-typography)). For a terminal that must read as both house and instrument, that argues for a serif headline voice and a humanist or neutral grotesque for data.

### 4.2 Sizes, tracking and measure

Use an optical size for display. A text cut enlarged looks loose; a headline cut is drawn with "snug spacing" and lengthened extenders ([Klim](https://klim.co.nz/blog/tiempos-design-information)). Luxury tracking is "tight" at display size with "restrained weight" ([Fontfabric](https://www.fontfabric.com/blog/fonts-for-luxury-branding/)). The Tiempos Text notes give the reason to keep body type economical: narrowed glyphs and tightened spacing yield "more words per column without sacrificing legibility" and allow tighter leading "without crowding" ([Klim](https://klim.co.nz/blog/tiempos-design-information)). [Practice, no opened source]: a measure of 60–75 characters for the reading sections.

Protect first paint from the font swap. Use `font-display: optional` so the web font is used only if ready at first layout; name a fallback; narrow the fallback's metrics with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`; preload the critical fonts ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).

```css
@font-face { font-family: "Display"; src: url(display.woff2) format("woff2"); font-display: optional; }
@font-face { font-family: "Display Fallback"; src: local("Georgia"); size-adjust: 104%; ascent-override: 92%; descent-override: 24%; line-gap-override: 0%; }
h1, h2 { font-family: "Display", "Display Fallback", serif; letter-spacing: -0.01em; font-weight: 400; }
```

### 4.3 Palette

Ink on paper. The houses declare white as theme colour ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/); [Patek](https://www.patek.com/collection)). Build the neutrals in a perceptual space. Linear uses LCH and reduced its themes to three variables, base colour, accent and contrast; its content text is "darker in light mode and lighter in dark mode", and the default greys moved warmer and less saturated ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui); [Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)). Stripe uses CIELAB so that equal steps look equally light, and guarantees that colours at least five levels apart meet 4.5:1 for small text ([Stripe](https://stripe.com/cn/blog/accessible-color-systems)).

Dark mode. None of the opened house pages exposes a dark theme. The only documented dark modes here are Linear's, where chrome colour is limited for a "neutral and timeless appearance" and surfaces are separated by elevation rather than hue ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui)). For Subhasta's dark mode, follow that: a warm near-black, text lifted rather than pure white, elevation by lightness steps, one accent.

```css
:root {
  --paper: oklch(98.5% 0.004 80);   --ink: oklch(18% 0.01 60);
  --rule:  oklch(90% 0.006 80);     --muted: oklch(45% 0.01 60);
  --accent: oklch(40% 0.06 60);     /* one accent, low chroma */
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --paper: oklch(14% 0.006 60);     --ink: oklch(90% 0.008 80);
  --rule:  oklch(24% 0.008 60);     --muted: oklch(62% 0.01 70);
} }
```

---

## 5. Navigation and density

### 5.1 Terminal-grade and calm at once

Bloomberg's method is to let density be the client's choice and keep everything else still. Windows resize to show more or fewer rows; panels are tabbed; redesigns ship in monthly steps, some on Friday nights "so users have the weekend to adjust"; users are warned and may delay changes ([Bloomberg](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity)). Linear keeps density by lowering the volume of everything that is not content: dimmed navigation, fewer and softer separators, smaller icons, compact tabs that do not span the width. Its test for a good change is "If most people don't immediately notice what changed, that's probably a good sign", and "Most of what makes software feel good is what you aren't likely to see" ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)). Linear's earlier redesign added elevation levels (background, panels, dialogs, modals) so that surfaces separate without borders ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui)).

Alignment is felt before it is seen. Linear aligned labels, icons and buttons in the sidebar and tabs, "something users 'feel after a few minutes' rather than notice immediately" ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui)).

### 5.2 Menus of the houses

Counts from the opened pages:

| Site | Top-level items | Notes |
|---|---|---|
| Hermès | 10 + Search, Account, Cart | mega-menus per item; quick-link row under the hero ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/)) |
| Loro Piana | 9 | mega-menus with lookbook images and "Discover All" ([Loro Piana, Services](https://us.loropiana.com/en/services)) |
| Brunello Cucinelli (company site) | 12 | only 4 open dropdowns, 18 sub-links in total ([Cucinelli](https://www.brunellocucinelli.com/en/craftsmanship.html)) |
| Pictet | 6 + Client login | Who we are, Who we serve, What we do, Insights, Sustainability, Contacts ([Pictet](https://www.pictet.com/ch/en/wealth-management/geneva)) |
| Patek Philippe | 6 groups | 14/14/8/2/2/3 links; "Find your timepiece"; "Reduce motion" ([Patek](https://www.patek.com/collection)) |
| Gagosian | 10 | Exhibitions has four tabs: Current, Upcoming, Archive, List ([Gagosian](https://gagosian.com/exhibitions/upcoming/)) |

The pattern: a short word per item, no icons, a second level that is a plain list, and utility actions set apart at the end. Nine items plus More is within the houses' range.

### 5.3 One thing at a time

Hermès gives every section one headline, one or two sentences and one link ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/)). Patek gives every collection one image, one tagline and one link ([Patek](https://www.patek.com/collection)). Pictet gives every service one title, one line and one link ([Pictet](https://www.pictet.com/ch/en/wealth-management/geneva)). Loro Piana's services page is four services, each an icon, a name and one link ([Loro Piana](https://us.loropiana.com/en/services)). Apple's visionOS guidance supplies the motion equivalent: fade out, change, fade in, rather than moving the object across the view, and "Consider giving people a stationary frame of reference" ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)).

### 5.4 Why it matters commercially

Bain and Altagamma put personal luxury goods at €358 billion in 2025 and total luxury spending at €1.44 trillion, with online channels holding steady and the consumer base down from about 400 million to 340 million. Their reading: "After the shopping spree era, experiences and emotions have become the true engine of luxury growth", and brands "must evolve from reach to precision" ([Bain & Company, Nov 2025](https://www.bain.com/about/media-center/press-releases/20252/global-luxury-stays-resilient-despite-economic-headwinds-and-shifting-consumer-trends-that-reshape-marketbain--company-and-altagamma/)). Baymard benchmarks the luxury sites (Louis Vuitton, Cartier, Van Cleef & Arpels, Tiffany, Gucci, Chanel among them) against the same "500+ research-based UX parameters" as everyone else ([Baymard, Luxury Goods benchmark 2024](https://baymard.com/blog/luxury-goods-benchmark-2024)). Luxury earns no exemption from usability. It adds restraint on top.

---

## 6. The triggers — 25 things that make an interface feel cheap, with the fix

1. **Layout shift when an image loads.** Fix: `width` and `height` attributes or `aspect-ratio`; CLS at or below 0.1 ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).
2. **System font flashing, then the web font snapping in.** Fix: `font-display: optional`, metric-matched fallback via `size-adjust` and the override descriptors, preload the critical fonts ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).
3. **Jank from animating `height`, `padding`, `top`, `left`.** Fix: `transform` and `opacity` only ([Emil, Great Animations](https://emilkowal.ski/ui/great-animations); [web.dev](https://web.dev/articles/optimize-cls)).
4. **Dropped frames when the main thread is busy.** Fix: CSS transitions or WAAPI rather than rAF-driven libraries for UI ([Emil, Great Animations](https://emilkowal.ski/ui/great-animations)).
5. **Animations that restart from zero when retriggered.** Fix: CSS transitions, which redirect mid-flight; avoid keyframes for rapidly triggered UI ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
6. **Abrupt state changes, or entrances that drag.** Fix: 150–250 ms for UI, under 300 ms as a ceiling; over 400 ms "may feel too slow" ([Emil](https://emilkowal.ski/ui/great-animations); [Material](https://m1.material.io/motion/duration-easing.html)).
7. **Inconsistent easing across components.** Fix: three named curves as CSS custom properties, no inline Béziers ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Material Components](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)).
8. **`ease-in` on anything the client triggers.** Fix: "Never `ease-in` on UI"; ease-out for enter and exit ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
9. **Elements popping from `scale(0)`.** Fix: start at `scale(0.9–0.97)` with `opacity: 0` ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
10. **Bouncy springs on ordinary controls.** Fix: bounce 0.1–0.3 only for drag-to-dismiss; most springs should not bounce at all ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Josh Comeau](https://joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)).
11. **Animating keyboard shortcuts and the command palette.** Fix: none, ever ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion.md); [Rauno](https://rauno.me/craft/interaction-design)).
12. **Hover states that move or resize, or fire on touch.** Fix: gate with `@media (hover: hover) and (pointer: fine)`; hover changes colour or opacity only ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
13. **Motion the client cannot interrupt.** Fix: every animation accepts new input at any time ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion.md); [Emil, Great Animations](https://emilkowal.ski/ui/great-animations)).
14. **Ignoring reduced motion.** Fix: media query plus `matchMedia` change listener; keep fades, remove translation and scale; stop any auto-rotation ([web.dev](https://web.dev/articles/prefers-reduced-motion); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
15. **Zoom that jumps per wheel notch, or differs between mouse and trackpad.** Fix: normalise by `deltaMode`, clamp, update a target instantly, chase it with a damped approach ([MDN, deltaMode](https://developer.mozilla.org/docs/Web/API/WheelEvent/deltaMode); [Rauno](https://rauno.me/craft/interaction-design)).
16. **The page scrolls while the client zooms the globe.** Fix: wheel listener on the canvas with `{ passive: false }`; root listeners are passive by default ([Chrome](https://developer.chrome.com/blog/scrolling-intervention-2/)).
17. **Browser pinch-zoom fighting the canvas pinch.** Fix: pointer-event pinch with `touch-action: none` on the canvas only ([MDN, Pinch zoom](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)).
18. **Images that appear at full opacity in one frame, or at the wrong resolution.** Fix: `<picture>` AVIF/WebP/JPEG, `srcset` with `sizes`, reserved box, opacity crossfade ([web.dev, Image performance](https://web.dev/learn/performance/image-performance); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
19. **Loading spinners.** Fix: reserve space with a placeholder or skeleton and crossfade in; overlays leave the document flow ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).
20. **Modal interruptions for routine actions.** Fix: overlays and panels that can be peeked and cancelled; destructive confirmations only wait for the gesture to end ([Rauno](https://rauno.me/craft/interaction-design); [web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).
21. **Oscillating or bobbing idle motion.** Fix: avoid sustained oscillation, especially near 0.2 Hz; keep amplitude low; give a stationary frame of reference ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion.md)).
22. **Coloured chrome competing with content.** Fix: neutral chrome, dimmed navigation, one low-chroma accent ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui); [Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)).
23. **Too many icons, coloured icon tiles, and hard dividers.** Fix: fewer icons, smaller, monochrome; fewer separators with softened contrast and rounded ends ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)).
24. **Text and controls below contrast.** Fix: 4.5:1 for small text, 3.0:1 for large; build the ramp in Lab or LCH ([Stripe](https://stripe.com/cn/blog/accessible-color-systems); [Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui)).
25. **Default focus rings and visible scrollbars in panels.** Fix [practice, no opened source]: a single `:focus-visible` ring in the accent colour at 2 px offset; `scrollbar-gutter: stable` so content does not shift when a bar appears; thin, neutral scrollbars in panels. The reservation principle is web.dev's ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).

---

## 7. Subhasta, specifically — 20 recommendations ranked by impact

CSS-only items are marked **[CSS]**. Items needing script are marked **[JS]**. Items of markup or copy are marked **[HTML]** or **[Copy]**.

1. **[JS] Rebuild globe zoom as target-and-chase:** normalise wheel deltas by `deltaMode`, clamp each event to ±100 px, update a target zoom instantly, and chase it per frame with `1 - exp(-dt/90ms)`, anchored under the cursor ([MDN](https://developer.mozilla.org/docs/Web/API/WheelEvent/deltaMode); [Rauno](https://rauno.me/craft/interaction-design); [Comeau](https://joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)).
2. **[JS] Register the wheel listener on the canvas with `{ passive: false }` and nowhere else,** so the globe cancels scroll while reading sections keep native scrolling ([Chrome](https://developer.chrome.com/blog/scrolling-intervention-2/)).
3. **[CSS] Define three durations (140/220/360 ms) and three curves (ease-out, move, drawer) as custom properties and forbid inline timing values** ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Material Components](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)).
4. **[CSS+JS] Honour reduced motion by stopping the globe's auto-rotation and collapsing `--dur-scene` to 0 while keeping fades,** with a `matchMedia` listener for the canvas ([web.dev](https://web.dev/articles/prefers-reduced-motion); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
5. **[CSS] Open cards over the globe with opacity 0→1 and `scale(0.97)→1` over 220 ms ease-out, closing with the same curve; dim the globe behind to about 60 % and blur it 2 px,** never translating the card across the screen ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion.md)).
6. **[HTML+CSS] Reserve the daily picture's box with `aspect-ratio` from the known dimensions, give it the paper ground, and crossfade the image in with a 2 px blur,** so nothing shifts and nothing pops ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
7. **[HTML] Serve every painting through `<picture>` with AVIF, WebP and JPEG, `srcset` widths with `sizes`, `decoding="async"`, and never lazy-load the day's picture** ([web.dev, Image performance](https://web.dev/learn/performance/image-performance)).
8. **[JS] Add pointer-event pinch on the globe and the picture, feeding the distance ratio into the same zoom target, with `touch-action: none` on those two elements only** ([MDN, Pinch zoom](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)).
9. **[CSS] Set the globe's idle rotation slow, constant and `linear`, with no bob, wobble or breathing,** because the HIG warns against sustained oscillation and peripheral motion ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion.md); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
10. **[CSS] Make the nine masthead items plain words with no icons, dim the inactive ones by two lightness steps, and let hover change colour only, gated by `(hover: hover) and (pointer: fine)`** ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md); [Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Pictet](https://www.pictet.com/ch/en/wealth-management/geneva)).
11. **[CSS] Open the More panel from its trigger with `transform-origin` at the button, 180 ms ease-out from `scale(0.97)`, as a plain list with no icons,** matching Patek's six plain groups ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Patek](https://www.patek.com/collection)).
12. **[CSS] Load the display serif with `font-display: optional` and a metric-matched fallback, and use a headline cut for sizes above about 28 px, a text cut below** ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls); [Klim](https://klim.co.nz/blog/tiempos-design-information)).
13. **[CSS] Build the palette as a warm near-white paper, warm near-black ink, one low-chroma accent and ramps generated in OKLCH or Lab, holding 4.5:1 for all text** ([Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui); [Stripe](https://stripe.com/cn/blog/accessible-color-systems)).
14. **[Copy] Write every section lead as one headline, one or two sentences and a single verb link ("Discover", "Enter", "Read"),** as Hermès does ([Hermès](https://www.hermes.com/us/en/content/341849-homepagesept2025p1usen/)).
15. **[HTML] Format every picture caption in the auction order: ARTIST (dates); title; signed/dated and position; medium; dimensions in cm and in; executed date; then Provenance, Exhibited, Literature** ([Christie's](https://www.christies.com.cn/en/lot/lot-6482945); [Sotheby's](https://www.sothebys.com/en/buy/auction/2026/modern-contemporary-evening-auction-l26006/nympheas)).
16. **[JS] Never animate anything triggered from the keyboard in the daily game (letter entry, submit, next),** and give the result a fade only ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md); [Rauno](https://rauno.me/craft/interaction-design)).
17. **[CSS] Replace every spinner with a reserved, paper-coloured box that crossfades to content, and keep auction-results tables at fixed row height so sorting never shifts the page** ([web.dev, Optimize CLS](https://web.dev/articles/optimize-cls)).
18. **[CSS] Stagger list reveals once, at 40 ms per row, on first paint only; re-sorts and filters change instantly** ([Emil, Standards](https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md)).
19. **[CSS] In the long reading sections (school, legal walls, tides), separate blocks by space and lightness rather than rules; where a rule is needed make it one step above the paper, not grey-on-white** ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)).
20. **[HTML] Add a visible "Reduce motion" control in the masthead or footer that sets a `data-motion="reduced"` attribute and persists it,** as Patek does, so clients who have not set an OS preference can still stop the globe ([Patek](https://www.patek.com/collection); [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion.md)).

Also, from Bloomberg: when the design changes, change it in small steps, keep control positions fixed, and tell the client first ([Bloomberg](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity)). The test is Linear's: if nobody notices, it worked ([Linear, refresh](https://linear.app/now/behind-the-latest-design-refresh.md)).

---

## Report

1. Budget used: 29 of 30 searches; 40 of 40 fetch attempts, of which 35 returned content and 5 failed.
2. Sources that worked (35): Apple HIG Motion; Material (M1 duration/easing and M3 tokens); Emil Kowalski (two pages); Rauno Freiberg; Josh Comeau; MDN (deltaMode, pinch zoom); Chrome scrolling intervention; web.dev (reduced motion, CLS, image performance); Fonts in Use; Monotype; Fontfabric; Klim; Hermès; Loro Piana; Brunello Cucinelli; Pictet; Patek Philippe; Gagosian; Christie's lot; Sotheby's lot; Google Art Camera; Rijksmuseum; Bloomberg; Linear (three pages opened, two cited; "A design reset" was only its Part I introduction); Stripe; Baymard (two pages); Bain/Altagamma.
3. Could not open: hermes.com, loropiana.com, shop.brunellocucinelli.com and pictet.com root URLs (not on the fetch allowlist until a search returned a page; alternative pages on the same domains were then opened); aesop.com (client error, nothing retrieved).
4. Not reached within budget: Bottega Veneta, Rolex, Audemars Piguet, Lombard Odier, Julius Baer, Phillips, David Zwirner, Hauser & Wirth, Artsy, The Art Newspaper, the Met, McKinsey, Commercial Type; the Typewolf search returned only SEO pages and was not pursued.
5. Limits of the evidence: house sites were read as text, so their typefaces, colours and motion are cited through Monotype, Fonts in Use, Fontfabric and meta tags, not observed in their CSS; no opened page documents LQIP, frame conventions, measure, focus rings or scrollbars, and those items are marked as practice.
6. Strongest findings: the duration and easing numbers (Material, Emil) agree closely; the houses' pages all follow one-proposition-one-link; the auction caption format is uniform across Christie's and Sotheby's; Patek's in-page "Reduce motion" control is a luxury precedent worth copying.
