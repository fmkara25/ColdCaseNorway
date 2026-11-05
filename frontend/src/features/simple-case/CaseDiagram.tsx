export function CaseDiagram({ scene }: { scene: string }) {
  if (scene === "time") return <svg className="simple-diagram" viewBox="0 0 320 88" role="img" aria-label="Skjematisk vei fra butikken til telefonstedet">
    <path d="M24 55 C100 55 95 20 155 20 S230 55 296 55" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
    <circle cx="24" cy="55" r="5" fill="currentColor" /><circle cx="296" cy="55" r="5" fill="currentColor" />
    <text x="24" y="80">Butikken</text><text x="296" y="80" textAnchor="end">Telefonstedet</text>
    <text x="160" y="50" textAnchor="middle">22–30 min</text>
  </svg>;
  if (scene === "receipt") return <svg className="simple-diagram" viewBox="0 0 320 100" role="img" aria-label="Skisse av bil 14 med markert skade foran til høyre">
    <path d="M50 24 H240 Q270 24 278 50 Q270 76 240 76 H50 Q35 76 35 50 Q35 24 50 24Z M110 24 V76 M205 24 V76" fill="none" stroke="currentColor" strokeWidth="2" />
    <text x="145" y="56" textAnchor="middle">Bil 14</text>
    <path d="M252 74 Q267 69 274 60" fill="none" stroke="#8e392b" strokeWidth="6" />
    <text x="283" y="95" textAnchor="end">Skade foran til høyre</text>
  </svg>;
  return null;
}
