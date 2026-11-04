// Procedural textures only: no speech, music, files or network requests.
export class ArchiveAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private room?: AudioBufferSourceNode;
  private roomGain?: GainNode;
  private noise?: AudioBuffer;
  private revision = 0;
  private active = false;
  private wanted = false;
  private effects = true;
  private lastPaper = -Infinity;
  async enable() {
    this.wanted = true;
    const revision = ++this.revision;
    try {
      if (!this.context) this.create();
      await this.context!.resume();
      if (revision !== this.revision) {
        if (!this.wanted && this.context) void this.context.suspend().catch(() => {});
        return false;
      }
      this.active = this.context!.state === "running";
      return this.active;
    } catch { if (revision === this.revision) this.active = false; return false; }
  }
  disable() {
    this.revision++; this.active = false; this.wanted = false;
    if (this.context && this.context.state !== "closed") void this.context.suspend().catch(() => {});
  }
  configure(volume: number, ambience: boolean, effects: boolean) {
    this.effects = effects;
    if (this.master && this.context) this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.context.currentTime, 0.05);
    if (this.roomGain && this.context) this.roomGain.gain.setTargetAtTime(ambience ? 0.045 : 0, this.context.currentTime, 0.1);
  }
  paper() {
    const context = this.context;
    if (!this.active || !this.effects || !context || context.state !== "running" || context.currentTime - this.lastPaper < 0.2) return;
    this.lastPaper = context.currentTime;
    const source = context.createBufferSource(); source.buffer = this.noise!;
    const filter = context.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = 1600;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
    source.connect(filter).connect(gain).connect(this.master!);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(); source.stop(context.currentTime + 0.16);
  }
  dispose() {
    this.revision++; this.active = false; this.wanted = false;
    this.room?.stop(); this.room?.disconnect(); this.master?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined; this.room = undefined; this.master = undefined;
    this.roomGain = undefined; this.noise = undefined;
  }
  private create() {
    // Constructed exclusively after an explicit user gesture.
    const context = new AudioContext(); this.context = context;
    const noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = noise.getChannelData(0); let seed = 42;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    this.noise = noise;
    this.master = context.createGain(); this.master.gain.value = 0.25; this.master.connect(context.destination);
    this.roomGain = context.createGain(); this.roomGain.gain.value = 0.045;
    const filter = context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 320;
    this.room = context.createBufferSource(); this.room.buffer = noise; this.room.loop = true;
    this.room.connect(filter).connect(this.roomGain).connect(this.master); this.room.start();
  }
}
