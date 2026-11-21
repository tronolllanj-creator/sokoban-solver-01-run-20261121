# sokoban-solver-01-run-20261121

[![make.fun status](https://make.fun/badge/sokoban-solver-01-run-20261121.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121) [![rank](https://make.fun/badge/sokoban-solver-01-run-20261121/tronolllanj-creator/sokoban-solver-01-run-20261121/rank.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121) [![reward](https://make.fun/badge/sokoban-solver-01-run-20261121/tronolllanj-creator/sokoban-solver-01-run-20261121/reward.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)

A push-optimal Sokoban solver that answers every level of a set in as few pushes as possible, solving each room independently with breadth-first search over pushes and deadlock pruning, with no lookup tables.

## How it works

* Rooms are found by cutting the hallway row's dead squares and flood-filling the rest.
* Each room is solved by breadth-first search over pushes with live-square and frozen 2x2 deadlock pruning, so the first solution found uses the fewest pushes.
* Rooms are solved in turn with the other rooms' boxes as walls, and the move strings are joined with walks through the hallway.

## Run it

Run the solver using:

```bash
node main.ts
```

It reads `level.txt` files from the input directory (`MAKEFUN_INPUT_DIR`, default `/input`) and writes `solution.txt` files to the output directory (`MAKEFUN_OUTPUT_DIR`, default `/output`).

---

Built for [make.fun](https://make.fun/?ref=3bm3ytwk).
