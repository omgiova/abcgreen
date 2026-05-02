import type { TipoTransacao } from "@/lib/types"

const REDONDA_ITEMS = new Set(["redonda 35", "redonda 30"])
const RETANGULAR_ITEMS = new Set(["20 x 60 cm", "20 x 40 cm", "20 x 60 e 20 x 40", "20 x 45"])

const normalizeProductName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

export function getEntradaThumbnailPath(nome: string, tipo: TipoTransacao): string | null {
  if (tipo !== "entrada") return null

  const normalizedName = normalizeProductName(nome || "")

  if (REDONDA_ITEMS.has(normalizedName)) return "/produtos/red.png"
  if (normalizedName === "mao francesa") return "/produtos/mao.png"
  if (RETANGULAR_ITEMS.has(normalizedName)) return "/produtos/ret.jpeg"

  return "/produtos/qua.jpg"
}
