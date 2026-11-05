import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArchiveImage } from "../../components/ArchiveImage";
import { fetchJson, isCaseFile, type CaseFile } from "../cases/api";
import { Feedback } from "../cases/CasePages";
import { isEvidenceList, type Evidence } from "../evidence/api";
import { evidenceChoices, questions, suspects } from "./questions";
import "./simple-case.css";

const root = "/api/cases/1999-1218";
const saveKey = "cold-case:1999-1218:simple:v1";
interface Verdict { correct: boolean; explanation: string }
interface Save { screen: string; answer?: number; suspect?: string; evidence?: string; verdict?: Verdict }
const initial: Save = { screen: "file" };
function isVerdict(value: unknown): value is Verdict {
  return !!value && typeof value === "object" && "correct" in value && typeof value.correct === "boolean" &&
    "explanation" in value && typeof value.explanation === "string" && value.explanation.length > 0;
}
function load(): Save {
  try {
    const value = JSON.parse(localStorage.getItem(saveKey) ?? "null") as Save | null;
    if (!value || !["file", "decision", "result", ...Object.keys(questions)].includes(value.screen)) return initial;
    if (value.suspect !== undefined && !suspects.some(person => person.id === value.suspect)) return initial;
    if (value.evidence !== undefined && value.evidence !== "" && !evidenceChoices.includes(value.evidence)) return initial;
    if (value.screen === "result" && (!isVerdict(value.verdict) || !value.suspect)) return initial;
    if (value.answer !== undefined && (!Number.isInteger(value.answer) || !questions[value.screen]?.choices[value.answer])) return initial;
    return value;
  } catch {
    return initial;
  }
}

export function SimpleCasePage() {
  const [save, setSave] = useState(load);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const file = useQuery({ queryKey: ["simple-case", "file"], queryFn: ({ signal }) => fetchJson<CaseFile>(root, signal, isCaseFile) });
  const evidence = useQuery({
    queryKey: ["simple-case", "evidence"],
    queryFn: ({ signal }) => fetchJson<Evidence[]>(root + "/evidence", signal, isEvidenceList),
  });
  useEffect(() => { heading.current?.focus(); }, [save.screen, file.isSuccess, evidence.isSuccess]);
  const update = (value: Save) => {
    setSave(value);
    try {
      localStorage.setItem(saveKey, JSON.stringify(value));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  };

  async function submit() {
    if (!save.suspect || pending) return;
    setError("");
    setPending(true);
    try {
      const response = await fetch(root + "/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ColdCase-Request": "1" },
        body: JSON.stringify({ suspectId: save.suspect }),
      });
      if (!response.ok) throw new Error();
      const verdict: unknown = await response.json();
      if (!isVerdict(verdict)) throw new Error();
      await new Promise(resolve => setTimeout(resolve, 700));
      update({ ...save, screen: "result", verdict });
    } catch {
      setError("Kunne ikke vurdere avgjørelsen. Valget ditt er beholdt. Prøv igjen.");
    } finally {
      setPending(false);
    }
  }

  const question = Object.hasOwn(questions, save.screen) ? questions[save.screen] : undefined;
  const choice = save.answer === undefined ? undefined : question?.choices[save.answer];
  const ticket = evidence.data?.find(item => item.id === "bus-ticket");
  const title = save.screen === "file" ? file.data?.title : question?.title ??
    (save.screen === "decision" ? "Hvem mener du er ansvarlig?" :
      save.verdict?.correct ? "Du fant den ansvarlige" : "Du valgte feil person");

  return <main id="main-content" tabIndex={-1} className="simple-case">
    <header className="simple-header"><Link to="/">Cold Case Norway</Link><span>Sak 1999–1218</span></header>
    {!file.isSuccess || !evidence.isSuccess ? <Feedback error={file.error ?? evidence.error}
      retry={() => { void file.refetch(); void evidence.refetch(); }} /> : <>
      <div className="simple-progress" aria-label="Fremdrift">
        <span>{question ? `Etterforskning · ${question.step} av 5` : save.screen === "file" ? "Saksmappe" : save.screen === "decision" ? "Din avgjørelse" : "Resultat"}</span>
        <progress aria-label="Fremdrift i saken" max={7} value={question?.step ?? (save.screen === "file" ? 0 : save.screen === "decision" ? 6 : 7)} />
      </div>
      <h1 ref={heading} tabIndex={-1}>{title}</h1>
      {save.screen === "file" && <>
        <div className="simple-file">
          <ArchiveImage src={file.data.missingPersonPortraitPath} name={file.data.missingPerson} />
          <div><p>Ingrid Solberg forsvant fra Skardal 18. desember 1999. Hun hadde planlagt å reise til Trondheim. Hva skjedde den kvelden?</p>
            <ul className="simple-evidence"><li>{ticket?.title ?? "Bussbillett til Trondheim"} · ubrukt</li><li>Samtalelogg · 21.47</li><li>Vitne så Ingrid ved butikken</li></ul>
          </div>
        </div>
        <ul className="simple-people">{[...suspects, { id: "maria", name: "Maria Nygård", role: "Ingrids venninne", image: "/images/maria-1999.webp" }].map(person =>
          <li key={person.id}><ArchiveImage src={person.image} name={person.name} compact /><div><strong>{person.name}</strong><small>{person.role}</small></div></li>)}</ul>
        <button className="simple-primary" onClick={() => update({ screen: "ticket" })}>Start etterforskningen</button>
      </>}
      {question && <div className="simple-question">
        <figure className="simple-source">
          <span>{question.evidenceId ? ticket?.title ?? "Saksdokument" : "Fra saksdokumentene"}</span>
          {question.image && <ArchiveImage src={question.image} name={save.screen === "maria" ? "Maria Nygård" : "Erik Halvorsen"} compact />}
          <blockquote>{question.source}</blockquote>
        </figure>
        <div className="simple-choices">
          {question.choices.map((option, index) => <button key={option.label} aria-pressed={save.answer === index}
            disabled={!!choice} onClick={() => update({ ...save, answer: index })}>{option.label}</button>)}
          {choice && <><p role="status">{choice.feedback}</p><button className="simple-primary" onClick={() => update({ screen: choice.next })}>Fortsett</button></>}
        </div>
      </div>}
      {save.screen === "decision" && <div className="simple-decision">
        <fieldset disabled={pending}><legend className="sr-only">Velg én person</legend>
          {suspects.map(person => <label key={person.id}>
            <input type="radio" name="suspect" value={person.id} checked={save.suspect === person.id}
              onChange={() => update({ ...save, suspect: person.id })} />
            <ArchiveImage src={person.image} name={person.name} compact /><span>{person.name}</span>
          </label>)}
        </fieldset>
        <label className="simple-support">Kilde som støtter valget (valgfritt)
          <select disabled={pending} value={save.evidence ?? ""} onChange={event => update({ ...save, evidence: event.target.value })}>
            <option value="">Ingen valgt</option>{evidenceChoices.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button className="simple-primary" disabled={!save.suspect || pending} onClick={() => void submit()}>Bekreft avgjørelsen</button>
        {pending && <p className="simple-wait" role="status">Vurderer avgjørelsen …</p>}
        {error && <p role="alert">{error}</p>}
      </div>}
      {save.screen === "result" && save.verdict && <div className="simple-result">
        <p>Du valgte <strong>{suspects.find(person => person.id === save.suspect)?.name}</strong>.</p>
        {save.evidence && <p>Din valgte kilde: {save.evidence}.</p>}
        <p>{save.verdict.explanation}</p>
        <button className="simple-primary" onClick={() => update(initial)}>Spill på nytt</button>
      </div>}
      {saveError && <p role="alert">Nettleseren kunne ikke lagre fremdriften på denne enheten.</p>}
    </>}
  </main>;
}
