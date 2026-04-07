"use client"

import useSWR from "swr"
import type { Item, CampanhaROI } from "@/lib/types"

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ""

async function fetchItems(): Promise<Item[]> {
  if (!APPS_SCRIPT_URL) {
    return []
  }
  
  const response = await fetch(`${APPS_SCRIPT_URL}?action=getItems`)
  if (!response.ok) throw new Error("Falha ao buscar itens")
  const data = await response.json()
  return data.items || []
}

async function fetchCampanhas(): Promise<CampanhaROI[]> {
  if (!APPS_SCRIPT_URL) {
    return []
  }
  
  const response = await fetch(`${APPS_SCRIPT_URL}?action=getCampanhas`)
  if (!response.ok) throw new Error("Falha ao buscar campanhas")
  const data = await response.json()
  return data.campanhas || []
}

export function useItems() {
  return useSWR<Item[]>("items", fetchItems, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
}

export function useCampanhas() {
  return useSWR<CampanhaROI[]>("campanhas", fetchCampanhas, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
}
