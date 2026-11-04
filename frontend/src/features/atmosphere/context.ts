import { createContext, useContext } from "react";
import { ArchiveAudio } from "./audio";
export const AudioContextValue = createContext<ArchiveAudio | null>(null);
export function usePaperSound() {
  const audio = useContext(AudioContextValue);
  return () => audio?.paper();
}
