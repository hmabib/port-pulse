import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { sanitizeReturnPath } from "@/lib/access-control";

type AccessPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const returnPath = sanitizeReturnPath(params.next ?? null);
  const isConfigured = Boolean(process.env.PORT_PULSE_ACCESS_KEY);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8">
          <div className="rounded-xl bg-white px-4 py-3">
            <Image
              src="/kct-logo.jpg"
              alt="Kribi Conteneurs Terminal Cameroun"
              width={320}
              height={46}
              priority
              className="h-auto w-full"
            />
          </div>
          <p className="mt-3 text-center text-[var(--text-label)] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
            Port Pulse · Cockpit opérationnel
          </p>
        </div>

        <div className="mb-6">
          <LockKeyhole
            aria-hidden="true"
            className="mb-3 text-[var(--pak-400)]"
            size={28}
          />
          <h2 className="text-[var(--text-title)] font-semibold text-[var(--text-primary)]">
            Accès au cockpit
          </h2>
          <p className="mt-2 text-[var(--text-table)] text-[var(--text-secondary)]">
            Saisissez la clé d’accès pour consulter les données opérationnelles.
          </p>
        </div>

        {params.error === "1" ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-[var(--insight-critical-border)] bg-[var(--insight-critical-bg)] px-4 py-3 text-[var(--text-table)] text-[var(--critical)]"
          >
            Clé incorrecte. Vérifiez la saisie puis réessayez.
          </p>
        ) : null}

        {!isConfigured ? (
          <p
            role="alert"
            className="rounded-lg border border-[var(--insight-warning-border)] bg-[var(--insight-warning-bg)] px-4 py-3 text-[var(--text-table)] text-[var(--warning)]"
          >
            La clé d’accès n’est pas configurée sur cet environnement.
          </p>
        ) : (
          <form action="/api/access" method="post" className="space-y-4">
            <input type="hidden" name="next" value={returnPath} />
            <label className="block">
              <span className="mb-2 block text-[var(--text-label)] font-semibold uppercase tracking-[var(--tracking-label)] text-[var(--text-muted)]">
                Clé d’accès
              </span>
              <input
                type="password"
                name="accessKey"
                required
                autoComplete="current-password"
                autoFocus
                className="w-full rounded-[var(--radius-control)] border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--text-body)] text-[var(--text-primary)] outline-none transition focus:border-[var(--pak-400)] focus:ring-2 focus:ring-[var(--pak-500)]/20"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-[var(--radius-control)] bg-[var(--pak-600)] px-4 py-3 text-[var(--text-body)] font-semibold text-white transition hover:bg-[var(--pak-500)] focus:outline-none focus:ring-2 focus:ring-[var(--pak-400)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            >
              Accéder au cockpit
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
