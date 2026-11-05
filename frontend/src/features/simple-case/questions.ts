interface Choice { label: string; feedback: string; next: string }
interface Question { title: string; source: string; evidenceId?: string; image?: string; step: number; choices: Choice[] }

export const questions: Record<string, Question> = {
  ticket: {
    title: "Hva forteller billetten om reisen?",
    source: "Ingrid hadde billett til Trondheim. Billetten ble ikke brukt.",
    evidenceId: "bus-ticket", step: 1,
    choices: [
      { label: "Hun planla å reise", feedback: "Billetten viser en plan. Se nå på hva vitnet faktisk så.", next: "witness" },
      { label: "Hun kom fram til Trondheim", feedback: "Billetten ble ikke brukt. Maria kan fortelle mer om planen.", next: "maria" },
    ],
  },
  maria: {
    title: "Hva kan Marias opplysning støtte?",
    source: "«Bagen sto hos meg. Ingrid skulle hente den, men hun kom aldri.»",
    image: "/images/maria-1999.webp", step: 1,
    choices: [
      { label: "Ingrid gjorde seg klar til en reise", feedback: "Bagen støtter reiseplanen. Den sier ikke hvor Ingrid endte.", next: "witness" },
      { label: "Maria vet hvor Ingrid endte", feedback: "Maria vet at bagen ble stående. Se etter neste sikre observasjon.", next: "witness" },
    ],
  },
  witness: {
    title: "Hva vet vi om føreren?",
    source: "Ca. 22.16 satte Ingrid seg inn i en mørk stasjonsvogn. Vitnet så ingen tvang og kunne ikke identifisere føreren.",
    step: 2,
    choices: [
      { label: "Vitnet kunne ikke si hvem som kjørte", feedback: "Riktig. Tidsopplysningene kan likevel brukes til å prøve en teori.", next: "time" },
      { label: "Vitnet identifiserte føreren", feedback: "Vitnet beskrev bilen, men så ikke hvem som kjørte. Sammenlign tidene.", next: "time" },
    ],
  },
  time: {
    title: "Passer tidene med samme sjåfør?",
    source: "Påstigning ca. 22.16. Erik knyttes til telefonstedet ca. 22.24. Kjøreturen mellom stedene tar anslagsvis 22–30 minutter.",
    image: "/images/erik-1999.webp", step: 3,
    choices: [
      { label: "Tidsrommet virker for kort", feedback: "Åtte minutter er kortere enn den anslåtte kjøretiden. Det svekker denne teorien.", next: "mileage" },
      { label: "Det var god tid til å kjøre dit", feedback: "Sammenlign de åtte minuttene med den korteste kjøretiden. Se så på bilens kjøring.", next: "mileage" },
    ],
  },
  mileage: {
    title: "Hvor mye av kjøringen mangler en forklaring?",
    source: "Kjørebok for bil 14 · Lars Viken står oppført som fører · 44 km. Registrert arbeidsoppdrag · ca. 12 km.",
    step: 4,
    choices: [
      { label: "Omtrent 32 km", feedback: "Omtrent 32 km mangler støtte i arbeidsordren. Prøv forklaringen mot vaktloggen.", next: "claim" },
      { label: "Alle 44 km", feedback: "Arbeidsordren forklarer omtrent 12 km. Det er resten du må undersøke.", next: "claim" },
    ],
  },
  claim: {
    title: "Hva støtter vaktloggen?",
    source: "Lars nevner en mulig ekstra utrykning. Vaktloggen og arbeidsordrene viser ingen registrert ekstrajobb. Kvitteringen kl. 22.52 viser blant annet spylervæske og tørkepapir. Senere ble bilen sett uvanlig ren, med en skade foran til høyre.",
    step: 5,
    choices: [
      { label: "Det ekstra oppdraget er ubekreftet", feedback: "Ja. Kvitteringen viser et kjøp, men dokumenterer ikke et oppdrag.", next: "decision" },
      { label: "Kvitteringen bekrefter oppdraget", feedback: "Et kjøp og et arbeidsoppdrag er to forskjellige opplysninger. Vurder helheten før du velger.", next: "decision" },
    ],
  },
};

export const suspects = [
  { id: "erik", name: "Erik Halvorsen", role: "Ingrids kjæreste", image: "/images/erik-1999.webp" },
  { id: "jonas", name: "Jonas Mikkelsen", role: "Nattleder på hotellet", image: "/images/jonas-1999.webp" },
  { id: "lars", name: "Lars Viken", role: "Tekniker i kraftselskapet" },
];

export const evidenceChoices = ["Bussbilletten", "Vitneobservasjonen", "Tidsopplysningene", "Kjøreboken og arbeidsordren", "Vaktloggen"];
