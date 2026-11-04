import { ApiError } from "../cases/api";
export interface BoardNote { id: string; text: string }
export interface BoardPosition { id: string; x: number; y: number }
export interface BoardConnection { id: string; fromId: string; toId: string; label: string }
export interface BoardState { schemaVersion: 1; notes: BoardNote[]; positions: BoardPosition[]; connections: BoardConnection[] }
export interface BoardSnapshot { version: number; board: BoardState }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
export function isBoardSnapshot(value: unknown): value is BoardSnapshot {
  if (!record(value) || !Number.isInteger(value.version) || (value.version as number) < 0 || !record(value.board)) return false;
  const b = value.board;
  return b.schemaVersion === 1 && Array.isArray(b.notes) && b.notes.length <= 20 && b.notes.every(note => record(note) && typeof note.id === "string" && typeof note.text === "string" && note.text.length <= 3000) &&
    Array.isArray(b.positions) && b.positions.length <= 128 && b.positions.every(p => record(p) && typeof p.id === "string" && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x <= 5000 && p.y <= 5000) &&
    Array.isArray(b.connections) && b.connections.length <= 128 && b.connections.every(c => record(c) && ["id", "fromId", "toId", "label"].every(key => typeof c[key] === "string"));
}
async function request(caseId: string, method: "POST" | "PUT", body?: BoardSnapshot): Promise<BoardSnapshot> {
  const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/investigation${method === "PUT" ? "/board" : ""}`, {
    method, credentials: "same-origin", headers: { "X-ColdCase-Request": "1", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = new ApiError(response.status);
    error.message = response.status === 409 ? "Tavlen er endret i en annen fane. Dine ulagrede endringer er beholdt her." :
      response.status === 401 ? "Lagringstilgangen er utløpt. Åpne den lagrede etterforskningen på nytt." : "Kunne ikke lagre eller åpne tavlen. Prøv igjen.";
    throw error;
  }
  const value: unknown = await response.json();
  if (!isBoardSnapshot(value)) throw new Error("Ugyldig tavledata.");
  return value;
}
export const openInvestigation = (caseId: string) => request(caseId, "POST");
export const saveBoard = (caseId: string, snapshot: BoardSnapshot) => request(caseId, "PUT", snapshot);
export function removeCard(board: BoardState, id: string): BoardState {
  return { ...board, positions: board.positions.filter(p => p.id !== id), connections: board.connections.filter(c => c.fromId !== id && c.toId !== id) };
}
export function canConnect(board: BoardState, from: string, to: string) {
  return from !== to && board.connections.length < 128 && board.positions.some(p => p.id === from) && board.positions.some(p => p.id === to) &&
    !board.connections.some(c => (c.fromId === from && c.toId === to) || (c.fromId === to && c.toId === from));
}
