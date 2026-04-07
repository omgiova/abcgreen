export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("pt-BR").format(date)
}

export function calculateTaxaShopee(valorTotal: number): number {
  return valorTotal * 0.14
}

export function calculateTaxaShopeeV2(valorCobradoShopee: number, quantidade: number): number {
  return (valorCobradoShopee * 0.20) + (4 * quantidade)
}

export function calculateLucroLiquido(
  valorTotal: number,
  custoPorProduto: number,
  quantidade: number,
  taxaShopee: number
): number {
  return valorTotal - custoPorProduto * quantidade - taxaShopee
}

export function calculateMargemLucro(lucroLiquido: number, valorTotal: number): number {
  if (valorTotal === 0) return 0
  return (lucroLiquido / valorTotal) * 100
}

export function calculateCustoPorProduto(valorGastoItem: number, qtdProdutosFabricados: number): number {
  if (qtdProdutosFabricados === 0) return 0
  return valorGastoItem / qtdProdutosFabricados
}

export function calculateROI(lucroGerado: number, investimentoAnuncio: number): number {
  if (investimentoAnuncio === 0) return 0
  return ((lucroGerado - investimentoAnuncio) / investimentoAnuncio) * 100
}
