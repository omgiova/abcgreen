import { NextResponse } from "next/server"

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ""

export const dynamic = "force-dynamic"

function getAppsScriptUrl() {
  if (!APPS_SCRIPT_URL) {
    throw new Error("NEXT_PUBLIC_APPS_SCRIPT_URL não configurada")
  }

  return APPS_SCRIPT_URL
}

export async function GET() {
  try {
    const response = await fetch(`${getAppsScriptUrl()}?action=getItems`, {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Falha ao buscar itens na planilha" },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({ items: Array.isArray(data.items) ? data.items : [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao buscar itens"
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
        action: "addItem",
        ...payload,
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Falha ao salvar item na planilha" },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao salvar item"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}