import { useEffect, useState, type ReactNode } from "react";
import { ArchiveAudio } from "./audio";
import { AudioContextValue } from "./context";
export function SoundProvider({ children }: { children: ReactNode }) {
  const [audio] = useState(() => new ArchiveAudio());
  useEffect(() => () => audio.dispose(), [audio]);
  return <AudioContextValue.Provider value={audio}>{children}</AudioContextValue.Provider>;
}
