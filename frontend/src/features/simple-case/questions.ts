interface Choice { label: string; feedback: string; next: string }
interface Question { title: string; source: string; evidenceId?: string; image?: string; imageName?: string; choices: Choice[] }

export const questions: Record<string, Question> = {
  ticket: {
    title: "Hva forteller billetten om reisen?",
    source: "Ingrid hadde billett til Trondheim. Billetten ble ikke brukt.",
    evidenceId: "bus-ticket",
    choices: [
      { label: "Hun planla å reise", feedback: "Billetten viser en plan. Maria kan fortelle hva Ingrid gjorde før avreisen.", next: "maria" },
      { label: "Hun kom fram til Trondheim", feedback: "Billetten ble ikke brukt. Maria kan fortelle mer om planen.", next: "maria" },
    ],
  },
  maria: {
    title: "Hvordan vil du spørre Maria om reiseplanen?",
    source: "Maria fortalte først lite om avreisen. Et notat fra Ingrid nevner en avtale om en bag.",
    image: "/images/maria-1999.webp", imageName: "Maria Nygård",
    choices: [
      { label: "La henne forklare med egne ord", feedback: "«Jeg trodde jeg beskyttet henne. Bagen sto hos meg. Hun kom aldri for å hente den.»", next: "lead" },
      { label: "Legg fram notatet og spør om bagen", feedback: "«Ja, bagen var pakket. Hun skulle hente den hos meg, men kom aldri. Det er det jeg vet.»", next: "lead" },
    ],
  },
  lead: {
    title: "Hvilket spor vil du undersøke først?",
    source: "21.47 · En samtale før Ingrid forlot hotellet. Ca. 22.16 · En bil stanser ved butikken.",
    choices: [
      { label: "Finn ut hvem Ingrid snakket med", feedback: "Samtaleloggen knytter Jonas til samtalen kl. 21.47. Be ham forklare den.", next: "jonas" },
      { label: "Følg observasjonen ved butikken", feedback: "Du henter fram vitnets tilleggsnotat om bilen.", next: "witness" },
    ],
  },
  jonas: {
    title: "Hva forklarer Jonas’ løgn best?",
    source: "«Vi hadde hatt et forhold. Jeg var gift. Hun sa at det var over den kvelden, og jeg ville ikke at noen skulle få vite om oss.»",
    image: "/images/jonas-1999.webp", imageName: "Jonas Mikkelsen",
    choices: [
      { label: "Han ville skjule forholdet og samtalen", feedback: "Det stemmer med det Jonas forteller. Samtalen sier lite om det som skjedde etterpå.", next: "other-lead" },
      { label: "Han forsøkte å skjule at han møtte henne ved butikken", feedback: "Loggen dokumenterer kontakt før hun dro fra hotellet. Den plasserer ham ikke ved butikken.", next: "other-lead" },
    ],
  },
  witness: {
    title: "Hva kan observasjonen brukes til?",
    source: "Ca. 22.16 satte Ingrid seg inn i en mørk stasjonsvogn. Vitnet så ingen tvang og kunne ikke identifisere føreren.",
    choices: [
      { label: "Avgrense tidspunktet og lete etter bilen", feedback: "Biltypen og tidspunktet gir et spor. De identifiserer ikke sjåføren.", next: "time" },
      { label: "Slå fast at føreren var en nær bekjent", feedback: "At Ingrid ble med frivillig kan tyde på at de kjente hverandre. Vitnet kan ikke slå fast hvem det var.", next: "time" },
    ],
  },
  time: {
    title: "Passer tidene med samme sjåfør?",
    source: "Erik og Ingrid hadde et vanskelig forhold. Påstigning ca. 22.16. Erik knyttes til telefonstedet ca. 22.24. Kjøreturen mellom stedene tar anslagsvis 22–30 minutter.",
    image: "/images/erik-1999.webp", imageName: "Erik Halvorsen",
    choices: [
      { label: "Tidsrommet virker for kort", feedback: "Åtte minutter er kortere enn den anslåtte kjøretiden. Det svekker denne teorien.", next: "other-lead" },
      { label: "Det var god tid til å kjøre dit", feedback: "Sammenlign de åtte minuttene med den korteste kjøretiden. De omtrentlige tidene gir ikke et sikkert alibi.", next: "other-lead" },
    ],
  },
  mileage: {
    title: "Hvor mye av kjøringen mangler en forklaring?",
    source: "Kjørebok for bil 14 · Lars Viken står oppført som fører · 44 km. Registrert arbeidsoppdrag · ca. 12 km.",
    choices: [
      { label: "Omtrent 32 km", feedback: "Omtrent 32 km mangler støtte i arbeidsordren. Prøv forklaringen mot vaktloggen.", next: "claim" },
      { label: "Omtrent 12 km", feedback: "Arbeidsordren forklarer omtrent 12 km. Det er resten du må undersøke.", next: "claim" },
    ],
  },
  claim: {
    title: "Hva støtter vaktloggen?",
    source: "Lars nevner en mulig ekstra utrykning. Vaktloggen og arbeidsordrene viser ingen registrert ekstrajobb.",
    choices: [
      { label: "Det ekstra oppdraget er ubekreftet", feedback: "Kontrollen gir ingen støtte til et ekstra oppdrag. Nå kan du sammenligne kvitteringen og observasjonene av bilen.", next: "receipt" },
      { label: "Fraværet av en ordre beviser at bilen sto stille", feedback: "En manglende ordre viser at turen ikke er dokumentert. Den viser ikke hvor bilen var.", next: "receipt" },
    ],
  },
  receipt: {
    title: "Hvordan bør du bruke kvitteringen og skaderapporten?",
    source: "22.52 · Skardal Nord: drivstoff, spylervæske og tørkepapir. Senere ble bil 14 beskrevet som uvanlig ren, med skade foran til høyre. Lars forklarte skaden med parkering.",
    choices: [
      { label: "Sammenhold kjøpet, skaden og kjøringen med forklaringen", feedback: "Kildene gir grunn til å prøve forklaringen nærmere. Ingen av dem viser alene hva som skjedde.", next: "contradiction" },
      { label: "Bruk kjøpet til å fastslå når og hvor skaden oppsto", feedback: "Kvitteringen tidfester kjøpet. Skaderapporten kan ikke tidfeste selve sammenstøtet.", next: "contradiction" },
    ],
  },
  contradiction: {
    title: "Hvilken opplysning bør få deg til å revurdere teorien?",
    source: "Lars sa først at han ikke hadde sett Ingrid på flere dager. Da han ble spurt om skaden og renholdet, sa han: «Hun satte seg inn selv …»",
    choices: [
      { label: "Han beskriver påstigningen etter å ha benektet kontakt", feedback: "Det er en konkret motstrid. Vurder den sammen med kjøringen, kvitteringen og de andre forklaringene.", next: "decision" },
      { label: "Han kan ikke tidfeste når bilen ble rengjort", feedback: "Renholdet gir ingen sikker tid. Legg merke til forskjellen mellom det han sa om Ingrid først og nå.", next: "decision" },
    ],
  },
};

export const suspects = [
  { id: "erik", name: "Erik Halvorsen", role: "Ingrids kjæreste", image: "/images/erik-1999.webp" },
  { id: "jonas", name: "Jonas Mikkelsen", role: "Nattleder på hotellet", image: "/images/jonas-1999.webp" },
  { id: "lars", name: "Lars Viken", role: "Tekniker i kraftselskapet" },
];

export const totalQuestions = Object.keys(questions).length;

export function nextQuestion(screen: string, next: string, visited: string[]) {
  if (next !== "other-lead") return next;
  if (screen === "jonas") return visited.includes("time") ? "mileage" : "witness";
  return visited.includes("jonas") ? "mileage" : "jonas";
}

export const exhibits: Record<string, { label: string; value: string }[]> = {
  ticket: [{ label: "Reisemål", value: "Trondheim" }, { label: "Billett", value: "Ubrukt" }],
  lead: [{ label: "Samtalelogg", value: "21.47" }, { label: "Ved butikken", value: "Ca. 22.16" }],
  time: [{ label: "Butikken", value: "Ca. 22.16" }, { label: "Telefonstedet", value: "Ca. 22.24" }, { label: "Anslått kjøretid", value: "22–30 min" }],
  mileage: [{ label: "Start", value: "81 442 km" }, { label: "Slutt", value: "81 486 km" }, { label: "Arbeidsordre", value: "Ca. 12 km" }],
  receipt: [{ label: "Skardal Nord", value: "22.52" }, { label: "Varelinjer", value: "Drivstoff · spylervæske · tørkepapir" }],
};

export const evidenceChoices = ["Bussbilletten", "Vitneobservasjonen", "Tidsopplysningene", "Kjøreboken og arbeidsordren", "Vaktloggen", "Kvitteringen og skaderapporten", "Motstriden i Lars’ forklaring"];
