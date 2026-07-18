# Singapore Mahjong — Optimization Curriculum Outline

> What "optimize your play" actually means, broken into a teachable progression.
> Pairs with [singapore-mahjong-rules.md](singapore-mahjong-rules.md). Rules are **configurable** (see §9 of the rules doc), so every EV/scoring lesson here reads its numbers from the active rule set rather than assuming one table.

---

## The core idea we're teaching

Mahjong is a game of **incomplete information under uncertainty**. Good play is not "memorize winning hands" — it's a repeated decision: *given my 13 tiles, the discards, and the score situation, which single tile do I throw?* Every lesson below is ultimately about making that one decision better.

Three intertwined skills, in tension with each other:
1. **Speed** — reach a winning hand before opponents (tile efficiency).
2. **Value** — win for more tai / trigger more bonuses.
3. **Safety** — don't deal into someone else's big hand (defense).

Singapore's animals + instant payouts add a fourth axis unique to this variant: **bonus EV** — chasing/holding tiles that pay regardless of the hand outcome.

---

## Module 0 — Foundations (prerequisite literacy)
*Goal: read a hand fluently before optimizing it.*
- Recognizing sets at a glance: pairs, chows, pongs, partial sets.
- **Shanten** (向听): how many tile-swaps from a winning hand. The single most important number in the game.
- **Tenpai** (听牌 / ready): 0 shanten — one tile from winning.
- Reading the discard pool and exposed melds.
- *Interactive drill:* flash a 13-tile hand → user states the shanten.

## Module 1 — Tile Efficiency (speed)
*Goal: minimize shanten as fast as possible; maximize the tiles that advance you.*
- **Tile acceptance / ukeire** (受入): counting how many live tiles improve your hand, and by how much.
- Comparing discards: which throw keeps the widest acceptance.
- Shape theory: why **4-5 (two-sided/ryanmen)** beats **1-3 (closed/kanchan)** beats an edge wait — 8 tiles vs 4 vs 4.
- Floating tiles, backup pairs, and when to break a pair.
- The efficiency-vs-value trade: the fastest discard isn't always the best.
- *Interactive drill:* two candidate discards side by side → user picks higher acceptance; app shows the live-tile count.

## Module 2 — Hand Selection & Value (value)
*Goal: choose a hand direction that's both reachable and worth tai.*
- Reading your **opening hand** to pick a plan: fast cheap hand vs slow big hand.
- **Full flush / half flush** (清一色 / 混一色): when the suit distribution justifies committing; the cost in speed.
- **All pongs** (对对胡) vs sequence hands: what your early pairs are telling you.
- Value tiles: seat wind, round wind, dragons — when a pong is worth chasing.
- **Ping hu** and other low-tai-but-fast hands.
- Committing vs staying flexible: the "point of no return" in a hand.
- *Interactive drill:* opening hand → user picks a plan; app scores plan by (reachability × expected tai) under the active rules.

## Module 3 — Singapore Bonus EV (the variant edge)
*Goal: value animals, flowers, and instant payouts correctly — they pay even if you never win.*
- Why instant payouts change strategy: **guaranteed money vs. hand equity**.
- Animal EV: holding Cat/Rooster and the value of completing **Cat+Rat / Rooster+Centipede**.
- Seat flower + season: the value of your matching bonus tiles.
- When bonus-chasing is a trap (drawing more tiles ≠ free money if it costs tempo).
- Configurable payouts mean **the app must recompute EV per table** — teach the *method*, not fixed numbers.
- *Interactive drill:* given the active payout table, rank three lines by total EV including bonus events.

## Module 4 — Defense & Reading Opponents (safety)
*Goal: stop feeding big hands; know when to fold.*
- Reading danger: exposed melds (esp. flush/pong signals), discard patterns, who's likely tenpai.
- **Safe tiles**: genbutsu (already discarded), suji, wall-count reasoning.
- **Fold vs push**: when your hand's EV is below the risk of dealing in.
- Discarder-liability rules make defense *more* important where the thrower pays — teach this against the active rule set.
- Defending against instant-payout threats and flush hands specifically.
- *Interactive drill:* opponents have exposed melds + a discard river → user picks the safest live discard.

## Module 5 — Score-Situation Strategy (meta)
*Goal: let the scoreboard, not just the tiles, pick your risk level.*
- Playing the **round/game position**: when to gamble for a limit hand vs bank a cheap win.
- Dealer retention: the value of dealer keeping the deal.
- Adjusting push/fold thresholds by your standing and remaining hands.
- Bankroll/tilt discipline (the human layer).

## Module 6 — Integrated Decision Practice (capstone)
*Goal: combine all axes on real turns.*
- Full-turn simulator: real hand, real discards → recommend the discard with reasoning across speed/value/bonus/safety.
- **Post-hand review**: replay a hand and grade each decision vs the optimal (an EV/shanten engine as the answer key).
- Spaced-repetition of missed decision types.

---

## What this implies for the engine (so the data model serves the lessons)

The curriculum needs these computed primitives — this is the real spec for Module-0-through-6 to exist:

1. **Shanten calculator** — for any 13/14-tile hand (Modules 0,1,6).
2. **Ukeire / tile-acceptance counter** — live-tile counting given visible tiles (Modules 1,6).
3. **Hand scorer (tai)** — reads the **configurable rule set**; values a completed or hypothetical hand (Modules 2,3,5).
4. **Bonus/instant-payout EV model** — event-based, rule-configurable (Module 3).
5. **Danger model** — opponent tenpai probability + tile safety from the discard river (Module 4).
6. **Decision recommender** — combines the above into "best discard + why" (Modules 4,5,6).

Suggested build order: **1 → 2 → 3 → (5 & 4) → 6**. The shanten + ukeire engine unlocks the most lessons per unit of work and is the answer key for every drill.

---

## Open questions before curriculum → build
1. **Target learner**: total beginner (needs Module 0 heavily) or already-plays-socially (start at Module 1)?
2. **Platform**: web app, mobile, or desktop? (Affects the interactive-drill tech.)
3. **How rigorous is the EV engine v1** — exact enumeration, or good-enough heuristics to start?
4. Do we teach one default table's numbers first and generalize later, or build fully rule-agnostic from the start?
