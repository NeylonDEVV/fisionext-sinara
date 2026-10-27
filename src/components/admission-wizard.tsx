"use client";
import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { saveAdmission } from "@/actions-patient";
import { THERAPIES } from "@/lib/therapy";

const STEPS = ["Anamnese", "Avaliação física", "Diagnóstico e plano"];
type Opts = { req?: boolean; rows?: number; ph?: string };

const inp = (n: string, l: string, d: string, o: Opts = {}) => (
  <div key={n}><label className="label" htmlFor={n}>{l}{o.req && " *"}</label>
    <input id={n} name={n} required={o.req} defaultValue={d} placeholder={o.ph} className="input" /></div>
);
const ta = (n: string, l: string, d: string, o: Opts = {}) => (
  <div key={n}><label className="label" htmlFor={n}>{l}{o.req && " *"}</label>
    <textarea id={n} name={n} rows={o.rows ?? 3} required={o.req} defaultValue={d} placeholder={o.ph} className="input" /></div>
);

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn disabled:opacity-60" disabled={pending}>{pending ? "Salvando..." : "Concluir admissão"}</button>;
}

export function AdmissionWizard({ patientId, initial }: { patientId: string; initial?: Record<string, unknown> }) {
  const [state, action] = useFormState(saveAdmission, undefined);
  const [step, setStep] = useState(0);
  const [pain, setPain] = useState(Number(initial?.painScale ?? 5));
  const ref = useRef<HTMLFormElement>(null);
  const v = (k: string) => String(initial?.[k] ?? "");

  function go(to: number) {
    if (to > step) {
      const panel = ref.current?.querySelector(`[data-step="${step}"]`);
      const fields = Array.from(panel?.querySelectorAll<HTMLInputElement>("input, select, textarea") ?? []);
      for (const el of fields) if (!el.checkValidity()) { el.reportValidity(); return; }
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form ref={ref} action={action} onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}>
      <input type="hidden" name="patientId" value={patientId} />

      <div className="mb-6">
        <div className="mb-3 flex gap-2">
          {STEPS.map((s, i) => (
            <button type="button" key={s} onClick={() => go(i)} className={`flex-1 text-left text-xs font-semibold transition ${i <= step ? "text-brand-700" : "text-ink-400"}`}>
              <span className="block">{i + 1}. {s}</span>
            </button>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
          <motion.div className="h-full rounded-full bg-brand-500" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 28 }} />
        </div>
      </div>

      <div className="card p-6">
        <div data-step={0} hidden={step !== 0} className="step-in space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {inp("referralDoctor", "Médico solicitante", v("referralDoctor"))}
            {inp("cid", "CID", v("cid"), { ph: "Ex.: M54.5" })}
          </div>
          {inp("medicalDiagnosis", "Diagnóstico clínico", v("medicalDiagnosis"))}
          {ta("complaint", "Queixa principal", v("complaint"), { req: true })}
          {ta("history", "História da doença atual", v("history"), { rows: 4 })}
          <div className="grid gap-4 sm:grid-cols-2">
            {ta("comorbidities", "Comorbidades", v("comorbidities"), { rows: 2 })}
            {ta("medications", "Medicamentos em uso", v("medications"), { rows: 2 })}
            {ta("surgeries", "Cirurgias prévias", v("surgeries"), { rows: 2 })}
            {ta("allergies", "Alergias", v("allergies"), { rows: 2 })}
          </div>
          {ta("habits", "Hábitos e estilo de vida", v("habits"), { rows: 2, ph: "Atividade física, tabagismo, sono, profissão..." })}
        </div>

        <div data-step={1} hidden={step !== 1} className="step-in space-y-4">
          <div>
            <label className="label" htmlFor="painScale">Dor na escala EVA: <b className="text-brand-600">{pain}/10</b></label>
            <input id="painScale" name="painScale" type="range" min={0} max={10} value={pain} onChange={(e) => setPain(Number(e.target.value))} className="w-full accent-brand-500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {inp("painLocation", "Localização da dor", v("painLocation"))}
            {inp("vitalSigns", "Sinais vitais", v("vitalSigns"), { ph: "PA, FC, SpO₂" })}
          </div>
          {ta("posture", "Postura e inspeção", v("posture"))}
          {ta("rom", "Amplitude de movimento (ADM)", v("rom"))}
          {ta("strength", "Força muscular", v("strength"))}
          {ta("specialTests", "Testes especiais", v("specialTests"))}
        </div>

        <div data-step={2} hidden={step !== 2} className="step-in space-y-4">
          {ta("physioDiagnosis", "Diagnóstico fisioterapêutico", v("physioDiagnosis"), { req: true })}
          {ta("goals", "Objetivos do tratamento", v("goals"), { req: true })}
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="therapy">Tipo de fisioterapia</label>
              <select id="therapy" name="therapy" defaultValue={v("therapy") || "ORTOPEDICA"} className="input">{Object.entries(THERAPIES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></div>
            <div><label className="label" htmlFor="plannedSessions">Nº de sessões previstas</label><input id="plannedSessions" name="plannedSessions" type="number" min={1} defaultValue={v("plannedSessions")} className="input" /></div>
            <div><label className="label" htmlFor="frequency">Frequência</label>
              <select id="frequency" name="frequency" defaultValue={v("frequency")} className="input"><option value="">—</option><option>1x por semana</option><option>2x por semana</option><option>3x por semana</option><option>Diária</option></select></div>
          </div>
          {ta("conduct", "Condutas e técnicas planejadas", v("conduct"))}
          <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-4 text-sm">
            <input type="checkbox" name="consent" required defaultChecked={initial?.consent === true} className="mt-0.5 h-4 w-4 accent-brand-500" />
            <span>O paciente foi informado sobre a avaliação e o plano de tratamento e consentiu com o atendimento e o uso dos seus dados para o prontuário e laudos. *</span>
          </label>
        </div>
      </div>

      {state?.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}

      <div className="mt-5 flex justify-between">
        <button type="button" onClick={() => go(step - 1)} className={`btn-ghost ${step === 0 ? "invisible" : ""}`}>Voltar</button>
        {step < STEPS.length - 1 ? <button type="button" onClick={() => go(step + 1)} className="btn">Continuar</button> : <Submit />}
      </div>
    </form>
  );
}
