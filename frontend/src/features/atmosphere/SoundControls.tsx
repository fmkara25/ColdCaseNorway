import { useContext, useEffect, useRef, useState } from "react";
import { AudioContextValue } from "./context";
export function SoundControls() {
  const audio = useContext(AudioContextValue)!;
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useState(25);
  const [ambience, setAmbience] = useState(true);
  const [effects, setEffects] = useState(true);
  const request = useRef(0);
  useEffect(() => { audio.configure(volume / 100, ambience, effects); }, [audio, volume, ambience, effects]);
  useEffect(() => {
    const generation = request;
    const hide = () => {
      if (document.hidden) { request.current++; audio.disable(); setEnabled(false); setPending(false); }
    };
    document.addEventListener("visibilitychange", hide);
    return () => { generation.current++; audio.disable(); document.removeEventListener("visibilitychange", hide); };
  }, [audio]);
  async function toggle() {
    const current = ++request.current; setFailed(false);
    if (enabled) { audio.disable(); setEnabled(false); return; }
    setPending(true);
    const success = await audio.enable();
    if (request.current !== current) return;
    audio.configure(volume / 100, ambience, effects);
    setEnabled(success); setFailed(!success); setPending(false);
  }
  return <details className="sound-controls"><summary>Lyd: {enabled ? "på" : "av"}</summary>
    <div className="sound-panel"><p>Lav romlyd og papirlyder. Ingen tale eller musikk. Lyden slås av når du forlater fanen.</p>
      <button type="button" aria-pressed={enabled} disabled={pending} onClick={() => { void toggle(); }}>{pending ? "Starter …" : enabled ? "Slå av lyd" : "Slå på lyd"}</button>
      <label>Volum <input aria-label="Volum" type="range" min="0" max="100" value={volume} onChange={event => setVolume(Number(event.target.value))} /> {volume} %</label>
      <label><input type="checkbox" checked={ambience} onChange={event => setAmbience(event.target.checked)} /> Romlyd</label>
      <label><input type="checkbox" checked={effects} onChange={event => setEffects(event.target.checked)} /> Papirlyder</label>
      {failed && <p role="status">Lyden kunne ikke startes. Du kan spille videre uten lyd.</p>}
    </div></details>;
}
