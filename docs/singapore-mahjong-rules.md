# Singapore Mahjong — Rules Reference

> Foundation document for the Singapore Mahjong optimization tutor app.
> **Important:** Singapore mahjong is played casually and *house rules vary widely*. Where a rule is commonly disputed, this doc marks it **[house-dependent]**. When we build the app, these should be configurable settings, not hardcoded.

---

## 1. Overview

Singapore mahjong is a 4-player variant of Chinese mahjong. Its defining features versus other variants:

- **Animal tiles** (猫 cat, 老鼠 rat, 公鸡 rooster, 蜈蚣 centipede) — unique to the Singapore/Malaysian style.
- **Instant payouts** ("bonuses") — certain tiles trigger immediate payment from all players, *before* anyone wins the hand.
- **Tai (台) scoring** — the winning hand's value is counted in *tai*, and payment scales (usually doubling) per tai.
- Typically **no minimum tai to win** — you can win a "chicken hand" (鸡胡, 0 tai) unless the table agrees otherwise. **[house-dependent]**

The goal each hand: be the first to complete a legal hand of **4 sets + 1 pair** (plus win by tai on top).

---

## 2. The Tiles

A Singapore set has **148 tiles**: the standard 144 plus 4 animals.

### Suited tiles (108)
Three suits, numbered 1–9, four copies each:
- **Dots / Circles** (筒 / 饼) — 1–9
- **Bamboo** (条 / 索) — 1–9
- **Characters** (万) — 1–9

"Terminals" = 1 and 9; "simples" = 2–8.

### Honor tiles (28)
- **Winds** (风): East 東, South 南, West 西, North 北 — 4 copies each (16)
- **Dragons** (箭): Red 中 (zhōng), Green 發 (fā), White 白 (bái) — 4 copies each (12)

### Bonus tiles — Flowers & Seasons (8)
Each is a single unique tile (1 copy). They are **not** part of a hand's sets; they're set aside for bonus scoring and replaced with a fresh draw.
- **Flowers** (花): Plum 梅 (1), Orchid 蘭 (2), Chrysanthemum 菊 (3), Bamboo 竹 (4)
- **Seasons** (季): Spring 春 (1), Summer 夏 (2), Autumn 秋 (3), Winter 冬 (4)

Each flower/season carries a number 1–4, which maps to a seat (see §7).

### Animal tiles (4) — Singapore-specific
Each is a single unique tile (1 copy), also set aside and replaced when drawn:
- **Cat** 猫
- **Rat / Mouse** 老鼠
- **Rooster** 公鸡
- **Centipede / Worm** 蜈蚣

Two "predator–prey" pairs matter: **Cat ↔ Rat** and **Rooster ↔ Centipede**.

---

## 3. Sets (Melds)

A winning hand = **4 sets + 1 pair**.

- **Pair (眼/对)** — two identical tiles.
- **Chow (顺/吃)** — three consecutive tiles in the same suit (e.g. 3-4-5 bamboo). Only from the player on your **left**, or self-drawn.
- **Pong (碰)** — three identical tiles. Claimable from any player's discard.
- **Kong (杠)** — four identical tiles. Claimable, and grants a **replacement tile** drawn from the back wall. Three kinds:
  - *Exposed kong* — pong on the table, you draw the 4th and add it.
  - *Melded kong* — claim a 4th tile off a discard when you hold three.
  - *Concealed kong* — you hold all four in hand.

Honors and terminals can form pongs/kongs but obviously not chows across the 1/9 boundary.

---

## 4. Flow of Play

1. **Deal**: Dealer (East) gets 14 tiles, others 13. Any flowers/seasons/animals dealt are exposed and replaced immediately (repeat until none remain in hand).
2. **Turn order**: counter-clockwise. On your turn you either draw from the wall or claim the previous discard; then you discard one tile.
3. **Claims** (priority high→low): **Win** > **Pong/Kong** > **Chow**. A pong/kong beats a chow even if the chow player is next in seat order.
4. **Bonus tiles drawn** during play are exposed and replaced immediately (may trigger instant payouts — §7).
5. **Winning (胡)**: completing 4 sets + 1 pair, either by self-draw (自摸 zimo) or on someone's discard (吃胡/food).
6. **Draw / wall exhausted**: if the live wall runs out with no winner, the hand is a **wash (流局)** — replayed, dealer usually stays. **[house-dependent]**

---

## 5. Tai (台) Scoring — the core mechanic

The winning hand is scored in **tai**. Payment scales per tai, typically **doubling**: with a base stake, a hand worth *n* tai pays base × 2ⁿ (or a lookup table the table agrees on). Most tables cap at a **limit (满/max), commonly 5 tai** — anything at or above the cap pays the same top amount. **[house-dependent: limit is often 3, 5, or 10]**

### Who pays
- **Self-draw (zimo)**: all three opponents pay the full hand value each.
- **Win on a discard**: the **discarder pays**. **[house-dependent: some tables split — discarder pays a share and the other two pay a "gun/包" portion; others make discarder pay full]**

### Common tai sources

| Pattern | Tai | Notes |
|---|---|---|
| Chicken hand 鸡胡 | 0 | A legal hand with no scoring elements |
| Self-draw 自摸 | 1 | |
| Seat wind pong 门风 | 1 | Pong/kong of your own seat wind |
| Round/prevailing wind pong 圈风 | 1 | Pong/kong of the current round's wind |
| Dragon pong 三元 | 1 each | Red/Green/White — 1 tai per dragon pong |
| Ping hu 平胡 | 1 | All chows, pair is not a value tile, non-value wait **[house-dependent definition]** |
| All pongs 对对胡 | 2 | Four pongs/kongs + pair |
| Half flush 混一色 | 2 | One suit + honors |
| Full flush 清一色 | 4 | One suit only, no honors |
| Half sequence / others | — | Many minor patterns vary by house |

### Big / limit hands (usually pay the cap outright) **[house-dependent set]**
- **All honors** 字一色
- **Small/Big three dragons** 小三元 / 大三元
- **Small/Big four winds** 小四喜 / 大四喜
- **Thirteen orphans** 十三幺 (one of each terminal + honor + a pair)
- **Heavenly / Earthly hand** 天胡 / 地胡 (win on the opening deal / first draw)
- **All terminals** 清幺九, etc.

### Extra situational tai
- **Robbing the kong** 抢杠 — win off a tile someone adds to a pong: +1
- **Win on kong replacement** 杠上开花 — +1
- **Win on flower replacement** 花上开花 — +1 **[house-dependent]**
- **Last tile** 海底捞月 (last wall draw) / 河底 (last discard) — +1

> These stack additively with the pattern tai, then get capped at the table limit.

---

## 6. Flowers & Seasons scoring

Flowers/seasons are set aside as bonuses and each **generally counts toward tai / bonus payments**, but the important Singapore-specific rules are the **seat matches** and **complete sets**:

- **Your seat flower / season**: each flower/season is numbered 1–4 → maps to a seat (East=1, South=2, West=3, North=4). Holding the flower **and/or** season matching your seat is worth bonus value; holding *both* your matching flower and season is especially valuable. **[house-dependent tai]**
- **Complete set of 4 flowers** (1-2-3-4) or **4 seasons** — a big bonus, often triggers an instant payout.
- **All 8 flowers+seasons** — a limit-level bonus. **[house-dependent]**
- **No flowers at all** 无花 — sometimes +1 tai for a flowerless win. **[house-dependent]**

---

## 7. Animals & Instant Payouts (the Singapore signature)

**Instant payouts** happen *the moment a triggering tile is revealed* (drawn and replaced) — every player pays the drawer immediately, independent of who eventually wins the hand. This is the flavor that makes Singapore mahjong distinctive.

Typical instant-payout triggers **[all house-dependent in exact amounts]**:

### Animals
- **Each animal** (cat / rat / rooster / centipede) — worth 1 tai toward your final hand, and often a small instant bonus on draw.
- **Predator–prey pair completed**: if you hold **Cat + Rat**, or **Rooster + Centipede** together — **instant payout** from all players.
- **All 4 animals** — large instant payout / limit-level bonus.

### Flowers/seasons instant triggers
- **Own flower + own season** (both matching your seat number) — instant payout.
- **Complete 4-flower or 4-season set** — instant payout.
- **"Both bunches" (8 flowers)** — top instant payout.

> Design note for the app: model instant payouts as events on the *game timeline*, separate from the hand-win settlement, since they pay regardless of the hand outcome.

---

## 8. Rounds & Dealer

- A full game cycles through **four prevailing winds** (East, South, West, North rounds), each with all four players taking dealer.
- **Dealer keeps the deal** if the dealer wins or the hand washes out; otherwise the deal passes counter-clockwise. **[house-dependent on wash]**
- The **prevailing wind** determines which round-wind pong scores (§5).

---

## 9. Things to decide before coding (house-rule switches)

These should be **configurable options** in the app, since Singapore tables differ:

1. Minimum tai to win (0 vs 1+).
2. Tai limit / cap (3, 5, 10…).
3. Payment scaling table (doubling vs fixed schedule).
4. Discarder liability (pays full vs split / 包 rules).
5. Exact instant-payout amounts for animals, seat flower+season, complete sets.
6. Which limit hands are recognized.
7. Wash-out handling and dealer retention.
8. Whether replacement-tile and last-tile bonuses apply.

---

## 10. Glossary (quick)

- **Tai 台** — scoring unit for a hand.
- **Zimo 自摸** — self-draw win.
- **Pong 碰 / Chow 吃 / Kong 杠** — triplet / run / quad.
- **Ping hu 平胡** — all-sequence "no-points" hand.
- **Full flush 清一色 / Half flush 混一色** — one suit / one suit + honors.
- **Instant payout** — immediate payment triggered by revealing a bonus tile.
- **Seat wind / Round wind** — your position wind / the current round's wind.

---

*Next steps for the app: (a) confirm which house-rule variant to teach as the default, (b) build a tile/data model, (c) then layer optimization lessons — efficiency (tile acceptance), when to go for flush vs speed, animal/flower expected-value decisions, and defense.*
