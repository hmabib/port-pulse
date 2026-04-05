"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Send,
} from "lucide-react";

/* ── Options statiques ── */

const TYPES_RAPPORT = [
  { id: "volumes", label: "Volumes & trafic EVP" },
  { id: "escales", label: "Escales & lignes maritimes" },
  { id: "gate", label: "Gate & flux camions" },
  { id: "parc", label: "Capacite parc conteneurs" },
  { id: "kpis", label: "KPIs operationnels" },
  { id: "exploitants", label: "Performance exploitants" },
  { id: "navires", label: "Flotte navires" },
  { id: "financier", label: "Suivi budgetaire" },
  { id: "global", label: "Rapport global complet" },
] as const;

const SEGMENTS = [
  { id: "import", label: "Import" },
  { id: "export", label: "Export" },
  { id: "transbordement", label: "Transbordement" },
  { id: "cabotage", label: "Cabotage" },
  { id: "vide", label: "Conteneurs vides" },
  { id: "plein", label: "Conteneurs pleins" },
  { id: "20p", label: "20 pieds" },
  { id: "40p", label: "40 pieds" },
  { id: "reefer", label: "Reefer" },
  { id: "dangereux", label: "Marchandises dangereuses" },
] as const;

const INDICATEURS = [
  { id: "evp_total", label: "EVP total" },
  { id: "nb_escales", label: "Nombre d'escales" },
  { id: "taux_occupation", label: "Taux d'occupation" },
  { id: "temps_sejour", label: "Temps de sejour moyen" },
  { id: "productivite", label: "Productivite (mvts/h)" },
  { id: "delai_rotation", label: "Delai de rotation" },
  { id: "gate_in_out", label: "Flux gate in/out" },
  { id: "ttt", label: "Truck turnaround time" },
  { id: "dwell_time", label: "Dwell time" },
  { id: "ratio_import_export", label: "Ratio import/export" },
] as const;

const DIMENSIONS = [
  { id: "par_jour", label: "Par jour" },
  { id: "par_semaine", label: "Par semaine" },
  { id: "par_mois", label: "Par mois" },
  { id: "par_armateur", label: "Par armateur" },
  { id: "par_exploitant", label: "Par exploitant" },
  { id: "par_navire", label: "Par navire" },
  { id: "par_ligne", label: "Par ligne maritime" },
  { id: "comparatif_n1", label: "Comparatif N-1" },
] as const;

const PERIODES_PREDEFINIES = [
  { id: "", label: "Dates personnalisees" },
  { id: "aujourd_hui", label: "Aujourd'hui" },
  { id: "7j", label: "7 derniers jours" },
  { id: "30j", label: "30 derniers jours" },
  { id: "mois_en_cours", label: "Mois en cours" },
  { id: "mois_precedent", label: "Mois precedent" },
  { id: "trimestre", label: "Trimestre en cours" },
  { id: "annee", label: "Annee en cours" },
  { id: "ytd", label: "Year-to-date" },
] as const;

/* ── Composants internes ── */

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
        active
          ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)]"
          : "border-[var(--card-border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
      {children}
      {required && <span className="ml-1 text-[var(--rose)]">*</span>}
    </label>
  );
}

/* ── Formulaire principal ── */

export default function RapportForm() {
  const [email, setEmail] = useState("");
  const [titre, setTitre] = useState("");
  const [typeRapport, setTypeRapport] = useState<string[]>([]);
  const [periodePredefinie, setPeriodePredefinie] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [indicateurs, setIndicateurs] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [contexte, setContexte] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("L'adresse e-mail est obligatoire.");
      return;
    }
    if (typeRapport.length === 0) {
      setError("Selectionnez au moins un type de rapport.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rapport-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          titre,
          typeRapport,
          dateDebut: dateDebut || null,
          dateFin: dateFin || null,
          periodePredefinie: periodePredefinie || null,
          segments,
          indicateurs,
          dimensions,
          contexte,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erreur lors de l'envoi");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-lg rounded-2xl border border-[var(--insight-success-border)] bg-[var(--insight-success-bg)] p-10 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-[var(--emerald)]" />
          <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
            Demande envoyee
          </h2>
          <p className="mb-6 text-[var(--text-secondary)]">
            Votre rapport sera genere automatiquement et envoye a{" "}
            <span className="font-semibold text-[var(--cyan)]">{email}</span>.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-5 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </a>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setEmail("");
                setTitre("");
                setTypeRapport([]);
                setPeriodePredefinie("");
                setDateDebut("");
                setDateFin("");
                setSegments([]);
                setIndicateurs([]);
                setDimensions([]);
                setContexte("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--cyan)] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              <FileText className="h-4 w-4" />
              Nouveau rapport
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <a
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            title="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Demande de rapport analytique
            </h1>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Configurez votre rapport — il sera genere automatiquement par IA et envoye par e-mail.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── E-mail ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel required>
              <Mail className="mr-1.5 inline h-4 w-4" />
              Adresse e-mail du destinataire
            </FieldLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="destinataire@exemple.com"
              required
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]"
            />
          </section>

          {/* ── Titre / besoin ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel>
              <FileText className="mr-1.5 inline h-4 w-4" />
              Titre ou besoin du rapport
            </FieldLabel>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Bilan mensuel trafic conteneurs Mars 2026"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]"
            />
          </section>

          {/* ── Type de rapport ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel required>Type de rapport</FieldLabel>
            <p className="mb-3 text-[12px] text-[var(--text-muted)]">
              Selectionnez un ou plusieurs types pour composer votre rapport.
            </p>
            <div className="flex flex-wrap gap-2">
              {TYPES_RAPPORT.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  active={typeRapport.includes(t.id)}
                  onClick={() => setTypeRapport(toggle(typeRapport, t.id))}
                />
              ))}
            </div>
          </section>

          {/* ── Periode ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel>
              <CalendarRange className="mr-1.5 inline h-4 w-4" />
              Periode d&apos;analyse
            </FieldLabel>
            <div className="mb-4">
              <select
                value={periodePredefinie}
                onChange={(e) => setPeriodePredefinie(e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]"
              >
                {PERIODES_PREDEFINIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {!periodePredefinie && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--text-muted)]">
                    Date de debut
                  </label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--text-muted)]">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* ── Segments ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel>Segments a analyser</FieldLabel>
            <p className="mb-3 text-[12px] text-[var(--text-muted)]">
              Filtrez les donnees par type de trafic ou de conteneur.
            </p>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  active={segments.includes(s.id)}
                  onClick={() => setSegments(toggle(segments, s.id))}
                />
              ))}
            </div>
          </section>

          {/* ── Indicateurs ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel>Indicateurs cles</FieldLabel>
            <p className="mb-3 text-[12px] text-[var(--text-muted)]">
              Choisissez les metriques a inclure dans le rapport.
            </p>
            <div className="flex flex-wrap gap-2">
              {INDICATEURS.map((i) => (
                <Chip
                  key={i.id}
                  label={i.label}
                  active={indicateurs.includes(i.id)}
                  onClick={() => setIndicateurs(toggle(indicateurs, i.id))}
                />
              ))}
            </div>
          </section>

          {/* ── Dimensions ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel>Dimensions & granularite</FieldLabel>
            <p className="mb-3 text-[12px] text-[var(--text-muted)]">
              Comment ventiler les donnees dans le rapport.
            </p>
            <div className="flex flex-wrap gap-2">
              {DIMENSIONS.map((d) => (
                <Chip
                  key={d.id}
                  label={d.label}
                  active={dimensions.includes(d.id)}
                  onClick={() => setDimensions(toggle(dimensions, d.id))}
                />
              ))}
            </div>
          </section>

          {/* ── Contexte libre ── */}
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
            <FieldLabel>Contexte & attentes specifiques</FieldLabel>
            <p className="mb-3 text-[12px] text-[var(--text-muted)]">
              Decrivez librement ce que vous attendez du rapport : comparaisons, focus particulier, format souhaite...
            </p>
            <textarea
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
              rows={4}
              placeholder="Ex: Je souhaite un focus sur l'evolution du trafic import vs export avec une comparaison au meme mois de l'annee precedente. Mettre en avant les anomalies detectees."
              className="w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--cyan)] focus:ring-1 focus:ring-[var(--cyan)]"
            />
          </section>

          {/* ── Erreur ── */}
          {error && (
            <div className="rounded-xl border border-[var(--insight-critical-border)] bg-[var(--insight-critical-bg)] px-5 py-3 text-sm text-[var(--rose)]">
              {error}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <a
              href="/"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-6 py-3 text-[13px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Annuler
            </a>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--cyan)] px-6 py-3 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Envoi en cours..." : "Generer le rapport"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
