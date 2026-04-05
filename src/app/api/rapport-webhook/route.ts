import { type NextRequest, NextResponse } from "next/server";

const MAKE_WEBHOOK_URL = process.env.MAKE_RAPPORT_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  if (!MAKE_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "MAKE_RAPPORT_WEBHOOK_URL non configure" },
      { status: 500 },
    );
  }

  const body = await request.json();

  const {
    email,
    titre,
    typeRapport,
    dateDebut,
    dateFin,
    periodePredefinie,
    segments,
    indicateurs,
    dimensions,
    contexte,
  } = body;

  if (!email || !typeRapport || typeRapport.length === 0) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants (email, typeRapport)" },
      { status: 400 },
    );
  }

  const payload = {
    email,
    titre: titre || "Rapport analytique",
    typeRapport,
    dateDebut: dateDebut || null,
    dateFin: dateFin || null,
    periodePredefinie: periodePredefinie || null,
    segments: segments || [],
    indicateurs: indicateurs || [],
    dimensions: dimensions || [],
    contexte: contexte || "",
    demandeLe: new Date().toISOString(),
  };

  const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!webhookResponse.ok) {
    const text = await webhookResponse.text();
    console.error("Make webhook error:", text);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi au webhook Make" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, message: "Demande de rapport envoyee avec succes" });
}
