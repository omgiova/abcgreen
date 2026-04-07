import type { Item, CampanhaROI } from "./types"

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ""

export async function fetchItems(): Promise<Item[]> {
  if (!APPS_SCRIPT_URL) {
    console.warn("NEXT_PUBLIC_APPS_SCRIPT_URL não configurada")
    return []
  }
  
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getItems`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      throw new Error("Falha ao buscar itens")
    }
    
    const data = await response.json()
    console.log("Dados recebidos da planilha:", data.items ? data.items.length : 0, "itens")
    return data.items || []
  } catch (error) {
    console.error("Erro ao buscar itens:", error)
    return []
  }
}

export async function createItem(item: Omit<Item, "id">): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.warn("NEXT_PUBLIC_APPS_SCRIPT_URL não configurada")
    return false
  }
  
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Crucial para Google Apps Script
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "addItem",
        ...item,
      }),
    })
    
    // Com no-cors, o fetch retorna uma "opaque response" 
    // que não nos deixa ler o body, mas geralmente indica sucesso se não der throw.
    return true
  } catch (error) {
    console.error("Erro ao criar item:", error)
    return false
  }
}

export async function fetchCampanhas(): Promise<CampanhaROI[]> {
  if (!APPS_SCRIPT_URL) {
    console.warn("NEXT_PUBLIC_APPS_SCRIPT_URL não configurada")
    return []
  }
  
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getCampanhas`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      throw new Error("Falha ao buscar campanhas")
    }
    
    const data = await response.json()
    return data.campanhas || []
  } catch (error) {
    console.error("Erro ao buscar campanhas:", error)
    return []
  }
}

export async function createCampanha(campanha: Omit<CampanhaROI, "id">): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.warn("NEXT_PUBLIC_APPS_SCRIPT_URL não configurada")
    return false
  }
  
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "addCampanha",
        ...campanha,
      }),
    })
    
    return response.ok
  } catch (error) {
    console.error("Erro ao criar campanha:", error)
    return false
  }
}
