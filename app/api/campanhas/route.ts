import { NextResponse } from "next/server"
import { getAppsScriptUrl } from "@/lib/apps-script"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const response = await fetch(`${getAppsScriptUrl()}?action=getCampanhas`, {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Falha ao buscar campanhas na planilha" },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({ campanhas: Array.isArray(data.campanhas) ? data.campanhas : [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao buscar campanhas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    const response = await fetch(getAppsScriptUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "addCampanha",
        ...payload,
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Falha ao salvar campanha na planilha" },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao salvar campanha"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}