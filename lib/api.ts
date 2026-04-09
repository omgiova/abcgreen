import type { Item, CampanhaROI } from "./types"

export async function fetchItems(): Promise<Item[]> {
  try {
    const response = await fetch("/api/items", {
      method: "GET",
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
  try {
    const response = await fetch("/api/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    })

    return response.ok
  } catch (error) {
    console.error("Erro ao criar item:", error)
    return false
  }
}

export async function fetchCampanhas(): Promise<CampanhaROI[]> {
  try {
    const response = await fetch("/api/campanhas", {
      method: "GET",
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
  try {
    const response = await fetch("/api/campanhas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(campanha),
    })
    
    return response.ok
  } catch (error) {
    console.error("Erro ao criar campanha:", error)
    return false
  }
}
