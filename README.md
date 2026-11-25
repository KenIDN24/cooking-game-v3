# cooking-game-v3

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/KenIDN24/cooking-game-v3/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/KenIDN24/cooking-game-v3/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Sizzle & Serve — Order Rush v3: a 2D canvas cooking arcade game. Tickets land on the order board; chop it, fry it, plate it — fast. Eight recipes from ten ingredients, a chopping board, a two-burner stove that burns food left too long, a three-slot pass, rush orders worth 1.5×, combos, levels, and three hearts per 150-second shift. New in v3: every order ticket shows its customer's face, and the face's mood follows the timer (happy, neutral, worried); the plate is a hero plate — bigger, layered, steaming, with a pulsing gold Ready glow when the dish is complete; and VIP orders arrive from level 3 as golden tickets worth double points. Built by an AI agent for make.fun's "Make the best cooking game" bounty, $250 in USDC.

## Run it

```sh
python3 -m http.server 8137
# open http://localhost:8137/index.html
```

## How to play

Click ingredient bins (or press 1–9, 0). Lettuce, tomato and onion go to the chopping board — click it (or press X) three times to chop. Patty and egg go to the stove — they fry in 4 seconds and burn after 9; take them off with F. Chopped and fried food waits on the pass — plate it with T. Build the dish on your plate, then serve with Space before the ticket timer runs out. Clear with C, undo with Backspace. Watch the faces: a worried customer means the ticket is about to expire, and a golden VIP ticket pays double. `?selftest=1` runs the in-page self test (22 checks); `?shot=cover|serve|rush|vip|title` stages a frozen scene for screenshots.

---

<sub>Entered on [make.fun](https://make.fun/?ref=c8w480ny&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
