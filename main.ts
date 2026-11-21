import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const DIRS = [
  { name: 'u', dy: -1, dx: 0, val: -1 },
  { name: 'd', dy: 1, dx: 0, val: 1 },
  { name: 'l', dy: 0, dx: -1, val: -1 },
  { name: 'r', dy: 0, dx: 1, val: 1 }
];

function solveLevelText(text: string): string {
  const rawLines = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const l of rawLines) {
    if (l.length > 0) lines.push(l);
  }
  if (lines.length === 0) return '';

  let w = 0;
  for (const l of lines) {
    if (l.length > w) w = l.length;
  }
  const h = lines.length;
  const totalCells = w * h;

  const isWall = new Uint8Array(totalCells);
  const isFloor = new Uint8Array(totalCells);
  const isGoal = new Uint8Array(totalCells);
  const initialBoxesSet = new Set<number>();
  let initialPlayer = -1;

  for (let y = 0; y < h; y++) {
    const row = lines[y];
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (x >= row.length) {
        isWall[idx] = 1;
        continue;
      }
      const ch = row[x];
      if (ch === '#') {
        isWall[idx] = 1;
      } else {
        isFloor[idx] = 1;
        if (ch === '.' || ch === '*' || ch === '+') {
          isGoal[idx] = 1;
        }
        if (ch === '$' || ch === '*') {
          initialBoxesSet.add(idx);
        }
        if (ch === '@' || ch === '+') {
          initialPlayer = idx;
        }
      }
    }
  }

  const goals: number[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (isGoal[i]) goals.push(i);
  }

  const liveSquare = new Uint8Array(totalCells);
  for (const g of goals) liveSquare[g] = 1;

  let changed = true;
  while (changed) {
    changed = false;
    for (let x = 0; x < totalCells; x++) {
      if (!liveSquare[x]) continue;
      for (const d of DIRS) {
        const dy = d.name === 'u' ? -w : d.name === 'd' ? w : d.name === 'l' ? -1 : 1;
        const y = x - dy;
        const z = y - dy;
        if (y >= 0 && y < totalCells && z >= 0 && z < totalCells) {
          if (isFloor[y] && !isWall[y] && isFloor[z] && !isWall[z]) {
            if (!liveSquare[y]) {
              liveSquare[y] = 1;
              changed = true;
            }
          }
        }
      }
    }
  }

  function isDeadState(boxesArr: number[]): boolean {
    for (const b of boxesArr) {
      if (!liveSquare[b]) return true;
    }

    const boxMap = new Uint8Array(totalCells);
    for (const b of boxesArr) boxMap[b] = 1;

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const a = y * w + x;
        const c1 = a;
        const c2 = a + 1;
        const c3 = a + w;
        const c4 = a + w + 1;

        const w1 = isWall[c1] || boxMap[c1];
        const w2 = isWall[c2] || boxMap[c2];
        const w3 = isWall[c3] || boxMap[c3];
        const w4 = isWall[c4] || boxMap[c4];

        if (w1 && w2 && w3 && w4) {
          const hasNonGoalBox =
            (boxMap[c1] && !isGoal[c1]) ||
            (boxMap[c2] && !isGoal[c2]) ||
            (boxMap[c3] && !isGoal[c3]) ||
            (boxMap[c4] && !isGoal[c4]);
          if (hasNonGoalBox) return true;
        }
      }
    }
    return false;
  }

  const hallwayRow = Math.floor(initialPlayer / w);
  const cutSquares = new Uint8Array(totalCells);
  for (let x = 0; x < w; x++) {
    const idx = hallwayRow * w + x;
    if (isFloor[idx] && !liveSquare[idx]) {
      cutSquares[idx] = 1;
    }
  }

  const visitedComp = new Uint8Array(totalCells);
  const components: number[][] = [];

  for (let i = 0; i < totalCells; i++) {
    if (isFloor[i] && !isWall[i] && !cutSquares[i] && !visitedComp[i]) {
      const comp: number[] = [];
      const q: number[] = [i];
      visitedComp[i] = 1;
      let head = 0;
      while (head < q.length) {
        const curr = q[head++];
        comp.push(curr);
        const cy = Math.floor(curr / w);
        const cx = curr % w;
        const neighbors = [
          cy > 0 ? curr - w : -1,
          cy < h - 1 ? curr + w : -1,
          cx > 0 ? curr - 1 : -1,
          cx < w - 1 ? curr + 1 : -1
        ];
        for (const n of neighbors) {
          if (n !== -1 && isFloor[n] && !isWall[n] && !cutSquares[n] && !visitedComp[n]) {
            visitedComp[n] = 1;
            q.push(n);
          }
        }
      }
      components.push(comp);
    }
  }

  let allBoxesList = Array.from(initialBoxesSet);
  allBoxesList.sort((a, b) => a - b);

  let goalOutsideAny = false;
  for (const g of goals) {
    let found = false;
    for (const comp of components) {
      if (comp.includes(g)) {
        found = true;
        break;
      }
    }
    if (!found) {
      goalOutsideAny = true;
      break;
    }
  }

  let validRoomSplit = !goalOutsideAny;
  if (validRoomSplit) {
    for (const comp of components) {
      let bCount = 0;
      for (const b of allBoxesList) {
        if (comp.includes(b)) bCount++;
      }
      let gCount = 0;
      for (const g of goals) {
        if (comp.includes(g)) gCount++;
      }
      if (bCount !== gCount) {
        validRoomSplit = false;
        break;
      }
    }
  }
  if (validRoomSplit) {
    for (const b of allBoxesList) {
      if (cutSquares[b]) {
        validRoomSplit = false;
        break;
      }
    }
  }

  type RoomDef = {
    boxes: number[];
    goals: number[];
  };

  const rooms: RoomDef[] = [];

  if (validRoomSplit && components.length > 0) {
    for (const comp of components) {
      const rBoxes: number[] = [];
      for (const b of allBoxesList) {
        if (comp.includes(b)) rBoxes.push(b);
      }
      if (rBoxes.length > 0) {
        const rGoals: number[] = [];
        for (const g of goals) {
          if (comp.includes(g)) rGoals.push(g);
        }
        rBoxes.sort((a, b) => a - b);
        rGoals.sort((a, b) => a - b);
        rooms.push({ boxes: rBoxes, goals: rGoals });
      }
    }
  }

  if (rooms.length === 0) {
    const rGoals = [...goals];
    rGoals.sort((a, b) => a - b);
    rooms.push({ boxes: [...allBoxesList], goals: rGoals });
  }

  function getReachableRegion(playerSq: number, boxesArr: number[], customIsWall?: (idx: number) => boolean): number[] {
    const boxMap = new Uint8Array(totalCells);
    for (const b of boxesArr) boxMap[b] = 1;

    const visited = new Uint8Array(totalCells);
    const region: number[] = [];
    const q: number[] = [playerSq];
    visited[playerSq] = 1;
    let head = 0;

    while (head < q.length) {
      const curr = q[head++];
      region.push(curr);
      const cy = Math.floor(curr / w);
      const cx = curr % w;
      const neighbors = [
        cy > 0 ? curr - w : -1,
        cy < h - 1 ? curr + w : -1,
        cx > 0 ? curr - 1 : -1,
        cx < w - 1 ? curr + 1 : -1
      ];
      for (const n of neighbors) {
        if (n !== -1 && !visited[n]) {
          const isW = boxMap[n] || (customIsWall ? customIsWall(n) : isWall[n]) ? 1 : 0;
          if (!isW) {
            visited[n] = 1;
            q.push(n);
          }
        }
      }
    }
    region.sort((a, b) => a - b);
    return region;
  }

  function solveSubBoard(
    roomBoxes: number[],
    roomGoals: number[],
    startPlayer: number,
    otherRoomsBoxes: number[][],
    solvedRoomsGoals: number[][],
    maxStates: number,
    requireHallwayAccess: boolean
  ): string | null {
    for (const b of roomBoxes) {
      if (!liveSquare[b]) return null;
    }

    const isSubWall = (idx: number): boolean => {
      if (isWall[idx]) return true;
      for (const ob of otherRoomsBoxes) {
        if (ob.includes(idx)) return true;
      }
      for (const sg of solvedRoomsGoals) {
        if (sg.includes(idx)) return true;
      }
      return false;
    };

    const initialRegion = getReachableRegion(startPlayer, roomBoxes, isSubWall);
    if (initialRegion.length === 0) return null;
    const lowestInitial = initialRegion[0];

    const sortedInitBoxes = [...roomBoxes];
    sortedInitBoxes.sort((a, b) => a - b);

    let initKey = String(lowestInitial);
    for (const b of sortedInitBoxes) initKey += ',' + b;

    type StateNode = {
      key: string;
      boxes: number[];
      region: number[];
      parent: number;
      moveBoxOld: number;
      moveBoxNew: number;
    };

    const queue: StateNode[] = [];
    const stateMap = new Map<string, number>();

    const initState: StateNode = {
      key: initKey,
      boxes: sortedInitBoxes,
      region: initialRegion,
      parent: -1,
      moveBoxOld: -1,
      moveBoxNew: -1
    };

    queue.push(initState);
    stateMap.set(initKey, 0);

    let head = 0;
    let solvedIdx = -1;

    while (head < queue.length) {
      if (queue.length > maxStates) break;
      const curr = queue[head++];

      let allOnGoals = true;
      for (const b of curr.boxes) {
        if (!roomGoals.includes(b)) {
          allOnGoals = false;
          break;
        }
      }

      if (allOnGoals) {
        if (requireHallwayAccess) {
          let hasHallway = false;
          for (const rSq of curr.region) {
            if (Math.floor(rSq / w) === hallwayRow) {
              hasHallway = true;
              break;
            }
          }
          if (hasHallway) {
            solvedIdx = head - 1;
            break;
          }
        } else {
          solvedIdx = head - 1;
          break;
        }
      }

      const boxMap = new Uint8Array(totalCells);
      for (const b of curr.boxes) boxMap[b] = 1;

      const regionSet = new Uint8Array(totalCells);
      for (const rSq of curr.region) regionSet[rSq] = 1;

      for (let bi = 0; bi < curr.boxes.length; bi++) {
        const b = curr.boxes[bi];
        const cy = Math.floor(b / w);
        const cx = b % w;
        const boxDirs = [
          { name: 'u', dy: -1, dx: 0, val: -w },
          { name: 'd', dy: 1, dx: 0, val: w },
          { name: 'l', dy: 0, dx: -1, val: -1 },
          { name: 'r', dy: 0, dx: 1, val: 1 }
        ];

        for (const d of boxDirs) {
          const s = b - d.val;
          const t = b + d.val;

          if (s < 0 || s >= totalCells || t < 0 || t >= totalCells) continue;
          if (!regionSet[s]) continue;
          if (isSubWall(t)) continue;
          if (boxMap[t]) continue;
          if (!liveSquare[t]) continue;

          const newBoxes = [...curr.boxes];
          newBoxes[bi] = t;
          newBoxes.sort((a, b) => a - b);

          if (isDeadState(newBoxes)) continue;

          const newRegion = getReachableRegion(b, newBoxes, isSubWall);
          if (newRegion.length === 0) continue;
          const newLowest = newRegion[0];

          let newKey = String(newLowest);
          for (const nb of newBoxes) newKey += ',' + nb;

          if (!stateMap.has(newKey)) {
            if (queue.length >= maxStates) {
              // can't add more
            } else {
              const newIdx = queue.length;
              stateMap.set(newKey, newIdx);
              queue.push({
                key: newKey,
                boxes: newBoxes,
                region: newRegion,
                parent: head - 1,
                moveBoxOld: b,
                moveBoxNew: t
              });
            }
          }
        }
      }
    }

    if (solvedIdx === -1) return null;

    const pathNodes: StateNode[] = [];
    let currNodeIdx = solvedIdx;
    while (currNodeIdx !== -1) {
      pathNodes.push(queue[currNodeIdx]);
      currNodeIdx = queue[currNodeIdx].parent;
    }
    pathNodes.reverse();

    let moves = '';
    let currentPlayer = startPlayer;

    for (let i = 1; i < pathNodes.length; i++) {
      const pNode = pathNodes[i];
      const oldB = pNode.moveBoxOld;
      const newB = pNode.moveBoxNew;
      const pushDirVal = newB - oldB;
      const pushDirChar =
        pushDirVal === -w ? 'U' : pushDirVal === w ? 'D' : pushDirVal === -1 ? 'L' : 'R';
      const targetPlayerSq = oldB - pushDirVal;

      if (currentPlayer !== targetPlayerSq) {
        const currBoxesMap = new Uint8Array(totalCells);
        for (const nb of pathNodes[i - 1].boxes) currBoxesMap[nb] = 1;

        const walkPath = shortestPath(currentPlayer, targetPlayerSq, currBoxesMap, isSubWall);
        if (!walkPath) return null;
        moves += walkPath;
      }

      moves += pushDirChar;
      currentPlayer = oldB;
    }

    return moves;
  }

  function shortestPath(start: number, target: number, boxMap: Uint8Array, isSubWall: (idx: number) => boolean): string | null {
    if (start === target) return '';
    const visited = new Uint8Array(totalCells);
    const parentArr = new Int32Array(totalCells);
    const dirArr = new Array(totalCells);
    parentArr.fill(-1);

    const q: number[] = [start];
    visited[start] = 1;
    let head = 0;
    let found = false;

    while (head < q.length) {
      const curr = q[head++];
      if (curr === target) {
        found = true;
        break;
      }
      const cy = Math.floor(curr / w);
      const cx = curr % w;
      const steps = [
        { name: 'u', val: -w, ok: cy > 0 },
        { name: 'd', val: w, ok: cy < h - 1 },
        { name: 'l', val: -1, ok: cx > 0 },
        { name: 'r', val: 1, ok: cx < w - 1 }
      ];

      for (const st of steps) {
        if (!st.ok) continue;
        const n = curr + st.val;
        if (!visited[n] && !isWall[n] && !boxMap[n] && !isSubWall(n)) {
          visited[n] = 1;
          parentArr[n] = curr;
          dirArr[n] = st.name;
          q.push(n);
        }
      }
    }

    if (!found) return null;

    let pathStr = '';
    let curr = target;
    while (curr !== start) {
      pathStr = dirArr[curr] + pathStr;
      curr = parentArr[curr];
    }
    return pathStr;
  }

  const otherRoomsBoxes: number[][] = [];
  for (let i = 0; i < rooms.length; i++) {
    otherRoomsBoxes.push([...rooms[i].boxes]);
  }

  const solvedRoomsGoals: number[][] = [];
  for (let i = 0; i < rooms.length; i++) {
    solvedRoomsGoals.push([]);
  }

  let currentPlayerData = initialPlayer;
  let totalMoves = '';

  for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
    const room = rooms[rIdx];
    const otherBoxesForThisRoom: number[][] = [];
    for (let j = 0; j < rooms.length; j++) {
      if (j !== rIdx) {
        otherBoxesForThisRoom.push(otherRoomsBoxes[j]);
      }
    }

    let roomSolution = solveSubBoard(
      room.boxes,
      room.goals,
      currentPlayerData,
      otherBoxesForThisRoom,
      solvedRoomsGoals,
      250000,
      false
    );

    if (roomSolution !== null && rIdx < rooms.length - 1) {
      let simPlayer = currentPlayerData;
      let simBoxes = [...room.boxes];
      const tempOtherBoxes = [...otherBoxesForThisRoom];
      const tempSolvedGoals = [...solvedRoomsGoals];

      const isSubWallSim = (idx: number): boolean => {
        if (isWall[idx]) return true;
        for (const ob of tempOtherBoxes) if (ob.includes(idx)) return true;
        for (const sg of tempSolvedGoals) if (sg.includes(idx)) return true;
        return false;
      };

      let validExitCheck = true;
      for (let mi = 0; mi < roomSolution.length; mi++) {
        const mChar = roomSolution[mi];
        const lower = mChar.toLowerCase();
        const isPush = mChar === mChar.toUpperCase();
        const dVal =
          lower === 'u'
            ? -w
            : lower === 'd'
            ? w
            : lower === 'l'
            ? -1
            : 1;
        simPlayer += dVal;
        if (isPush) {
          const boxIdx = simPlayer;
          const targetIdx = simPlayer + dVal;
          const bi = simBoxes.indexOf(boxIdx);
          if (bi !== -1) {
            simBoxes[bi] = targetIdx;
          }
        }
      }

      const finalRegion = getReachableRegion(simPlayer, simBoxes, isSubWallSim);
      let hasHallway = false;
      for (const rSq of finalRegion) {
        if (Math.floor(rSq / w) === hallwayRow) {
          hasHallway = true;
          break;
        }
      }

      if (!hasHallway) {
        const strictSolution = solveSubBoard(
          room.boxes,
          room.goals,
          currentPlayerData,
          otherBoxesForThisRoom,
          solvedRoomsGoals,
          250000,
          true
        );
        if (strictSolution !== null) {
          roomSolution = strictSolution;
        }
      }
    }

    if (roomSolution === null) {
      const retrySolution = solveSubBoard(
        room.boxes,
        room.goals,
        currentPlayerData,
        otherBoxesForThisRoom,
        solvedRoomsGoals,
        1000000,
        false
      );
      if (retrySolution !== null) {
        roomSolution = retrySolution;
      } else {
        const wholeSolution = solveSubBoard(
          allBoxesList,
          goals,
          initialPlayer,
          [],
          [],
          1000000,
          false
        );
        if (wholeSolution !== null) {
          return wholeSolution;
        } else {
          return '';
        }
      }
    }

    totalMoves += roomSolution;

    for (let mi = 0; mi < roomSolution.length; mi++) {
      const mChar = roomSolution[mi];
      const lower = mChar.toLowerCase();
      const isPush = mChar === mChar.toUpperCase();
      const dVal =
        lower === 'u'
          ? -w
          : lower === 'd'
          ? w
          : lower === 'l'
          ? -1
          : 1;
      currentPlayerData += dVal;
      if (isPush) {
        const boxIdx = currentPlayerData;
        const targetIdx = currentPlayerData + dVal;
        const bi = room.boxes.indexOf(boxIdx);
        if (bi !== -1) {
          room.boxes[bi] = targetIdx;
        }
      }
    }

    otherRoomsBoxes[rIdx] = [];
    solvedRoomsGoals[rIdx] = [...room.goals];
  }

  return totalMoves;
}

function main() {
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch {}

  let entries: string[] = [];
  try {
    entries = readdirSync(inputDir);
  } catch {
    return;
  }
  entries.sort();

  for (const id of entries) {
    const levelPath = join(inputDir, id, 'level.txt');
    let text = '';
    try {
      text = readFileSync(levelPath, 'utf8');
    } catch {
      continue;
    }

    const solution = solveLevelText(text);

    const outSubDir = join(outputDir, id);
    try {
      mkdirSync(outSubDir, { recursive: true });
    } catch {}

    const solPath = join(outSubDir, 'solution.txt');
    try {
      writeFileSync(solPath, solution + '\n', 'utf8');
    } catch {}
  }
}

main();
