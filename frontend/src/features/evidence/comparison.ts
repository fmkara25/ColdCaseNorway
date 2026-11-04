import type { BoardSnapshot } from "../board/api";

// Add one hypothesis without changing any existing note, position or connection.
export function addComparison(snapshot: BoardSnapshot, fromId: string, toId: string, label: string,
  accessible: ReadonlySet<string>, connectionId: string): BoardSnapshot {
  if (fromId === toId || !accessible.has(fromId) || !accessible.has(toId)) throw new Error("Velg to ulike, tilgjengelige kilder.");
  const text = label.trim();
  if (!text || text.length > 120) throw new Error("Beskriv forbindelsen med 1–120 tegn.");
  const board = snapshot.board;
  if (board.connections.some(item => item.fromId === fromId && item.toId === toId || item.fromId === toId && item.toId === fromId))
    throw new Error("Kildene er allerede koblet på tavlen. Den lagrede teksten er beholdt.");
  if (board.connections.length >= 128 || board.connections.some(item => item.id === connectionId)) throw new Error("Tavlen har ikke plass til denne forbindelsen.");
  const positions = [...board.positions];
  for (const id of [fromId, toId]) {
    if (positions.some(item => item.id === id)) continue;
    if (positions.length >= 128) throw new Error("Tavlen har ikke plass til flere kort.");
    let point: { x:number; y:number } | undefined;
    for (let i=0; i<660; i++) {
      const candidate = { x:40 + (i % 20) * 240, y:40 + Math.floor(i / 20) * 150 };
      if (!positions.some(item => Math.abs(item.x - candidate.x) < 220 && Math.abs(item.y - candidate.y) < 130)) { point = candidate; break; }
    }
    if (!point) throw new Error("Fant ikke plass til kortet. Åpne tavlen og flytt kortene først.");
    positions.push({ id, ...point });
  }
  return { version:snapshot.version, board:{ ...board, positions,
    connections:[...board.connections, { id:connectionId, fromId, toId, label:text }] } };
}
