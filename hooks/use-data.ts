"use client"

import useSWR from "swr"
import type { Item, CampanhaROI } from "@/lib/types"

async function fetchItems(): Promise<Item[]> {
  const response = await fetch("/api/items")
  if (!response.ok) throw new Error("Falha ao buscar itens")
  const data = await response.json()
  return data.items || []
}

async function fetchCampanhas(): Promise<CampanhaROI[]> {
  const response = await fetch("/api/campanhas")
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
