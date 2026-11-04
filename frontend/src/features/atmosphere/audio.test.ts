import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArchiveAudio } from "./audio";
let state: string;
let gains: ReturnType<typeof vi.fn>[];
let sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[];
let finishResume: (() => void) | undefined;
const suspend = vi.fn(async () => { state = "suspended"; });
const close = vi.fn(async () => { state = "closed"; });
const resume = vi.fn(async () => { state = "running"; });
const constructor = vi.fn(function () {
  return {
    sampleRate: 100, currentTime: 1, destination: {}, get state() { return state; },
    resume, suspend, close,
    createBuffer: () => ({ getChannelData: () => new Float32Array(300) }),
    createGain: () => {
      const target = vi.fn(); gains.push(target);
      const node = { gain: { value: 0, setTargetAtTime: target, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: () => node, disconnect: vi.fn() }; return node;
    },
    createBiquadFilter: () => { const node = { frequency: { value: 0 }, connect: () => node, disconnect: vi.fn() }; return node; },
    createBufferSource: () => { const node = { start: vi.fn(), stop: vi.fn(), connect: () => node, disconnect: vi.fn() }; sources.push(node); return node; },
  };
});
beforeEach(() => {
  vi.clearAllMocks(); state = "suspended"; gains = []; sources = []; finishResume = undefined;
  resume.mockImplementation(async () => { state = "running"; });
  vi.stubGlobal("AudioContext", constructor);
});
afterEach(() => vi.unstubAllGlobals());
it("creates no audio resource until consent and reuses a context after mute", async () => {
  const audio = new ArchiveAudio(); audio.configure(0.25, true, true); audio.paper();
  expect(constructor).not.toHaveBeenCalled();
  expect(await audio.enable()).toBe(true); audio.disable(); expect(await audio.enable()).toBe(true);
  expect(constructor).toHaveBeenCalledTimes(1); expect(suspend).toHaveBeenCalled(); audio.dispose(); expect(close).toHaveBeenCalled();
});
it("clamps gain and independently disables ambience and paper cues", async () => {
  const audio = new ArchiveAudio(); await audio.enable(); audio.configure(5, false, false);
  expect(gains[0]).toHaveBeenLastCalledWith(1, 1, 0.05); expect(gains[1]).toHaveBeenLastCalledWith(0, 1, 0.1);
  audio.paper(); expect(sources).toHaveLength(1);
  audio.configure(-1, true, true); expect(gains[0]).toHaveBeenLastCalledWith(0, 1, 0.05);
  audio.paper(); audio.paper(); expect(sources).toHaveLength(2);
  audio.disable(); audio.paper(); expect(sources).toHaveLength(2); audio.dispose();
});
it("a delayed resume cannot turn sound back on after leaving the tab", async () => {
  resume.mockImplementation(() => new Promise<void>(resolve => { finishResume = () => { state = "running"; resolve(); }; }));
  const audio = new ArchiveAudio(); const enabling = audio.enable(); audio.disable(); finishResume!();
  expect(await enabling).toBe(false); expect(state).toBe("suspended"); audio.paper(); expect(sources).toHaveLength(1); audio.dispose();
});
it("unsupported audio remains optional and can be retried", async () => {
  vi.stubGlobal("AudioContext", undefined); const audio = new ArchiveAudio();
  expect(await audio.enable()).toBe(false); audio.disable(); audio.dispose();
});
