"use client"

import { useMemo } from "react"
import { Download } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCardSkeleton, TableSkeleton } from "@/components/skeleton-loader"
import { useItems, useCampanhas } from "@/hooks/use-data"
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format"
import { TransactionsTable } from "@/components/transactions-table"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MonthlySummary {
  mes: string
  mesDisplay: string
  receita: number
  despesas: number
  saldo: number
  roiMedio: number
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export default function RelatoriosPage() {
  const { data: items, isLoading: itemsLoading } = useItems()
  const { data: campanhas, isLoading: campanhasLoading } = useCampanhas()

  const isLoading = itemsLoading || campanhasLoading

  const monthlySummaries = useMemo(() => {
    if (!items) return []

    // Deduplicação por ID para evitar dados duplicados da planilha
    const uniqueItems = Array.from(
      items.reduce((map, item) => map.set(item.id, item), new Map<string, any>()).values()
    )

    const summaryMap = new Map<string, MonthlySummary>()

    uniqueItems.forEach((item) => {
      const date = new Date(item.data)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          mes: key,
          mesDisplay: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
          receita: 0,
          despesas: 0,
          saldo: 0,
          roiMedio: 0,
        })
      }

      const summary = summaryMap.get(key)!
      if (item.tipo === "entrada") {
        summary.receita += Math.abs(item.valorTotal)
        // Note: taxas are no longer displayed separately but affect the saldo
      } else {
        // Inclui Saída, Ads e Saque como despesas no resumo
        summary.despesas += Math.abs(item.valorTotal)
      }
    })

    // Calculate saldo and ROI
    summaryMap.forEach((summary, key) => {
      // Find all items for this month to subtract their specific taxas
      const monthItems = uniqueItems.filter(item => {
        const date = new Date(item.data)
        const itemKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        return itemKey === key
      })
      const totalTaxas = monthItems.reduce((acc, curr) => acc + (curr.taxaShopee || 0), 0)
      
      summary.saldo = summary.receita - summary.despesas - totalTaxas

      // Calculate average ROI for campaigns in this month
      if (campanhas) {
        const monthCampanhas = campanhas.filter((c) => {
          const cDate = new Date(c.data)
          const cKey = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, "0")}`
          return cKey === key
        })
        
        if (monthCampanhas.length > 0) {
          summary.roiMedio = monthCampanhas.reduce((sum, c) => sum + c.roi, 0) / monthCampanhas.length
        }
      }
    })

    return Array.from(summaryMap.values())
      .sort((a, b) => b.mes.localeCompare(a.mes))
  }, [items, campanhas])

  const exportSummaryToCSV = () => {
    if (monthlySummaries.length === 0) return

    const headers = ["Mês", "Receita", "Despesas", "Saldo", "ROI Médio (%)"]
    const rows = monthlySummaries.map((s) => [
      s.mesDisplay,
      s.receita.toFixed(2).replace(".", ","),
      s.despesas.toFixed(2).replace(".", ","),
      s.saldo.toFixed(2).replace(".", ","),
      s.roiMedio.toFixed(2).replace(".", ","),
    ])

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `relatorio-mensal-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportDetailsToCSV = () => {
    if (!items || items.length === 0) return

    // Deduplicação por ID
    const uniqueItems = Array.from(
      items.reduce((map, item) => map.set(item.id, item), new Map<string, any>()).values()
    )

    const headers = ["ID", "Data", "Nome", "Quantidade", "Comprador", "Tipo", "Venda Shopee (Bruto)", "Taxa", "Valor Total (Líquido)"]
    const rows = uniqueItems.map((i) => [
      i.id,
      formatDate(i.data),
      i.nome,
      i.quantidade,
      i.nomeComprador || "-",
      i.tipo === "entrada" ? "Entrada" : i.tipo === "saida" ? "Saída" : i.tipo === "ads" ? "Ads" : "Saque",
      (i.valorCobradoShopee || 0).toFixed(2).replace(".", ","),
      (i.taxaShopee || 0).toFixed(2).replace(".", ","),
      i.valorTotal.toFixed(2).replace(".", ","),
    ])

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `relatorio-detalhado-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Resumo e detalhamento da sua loja</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportSummaryToCSV}
              disabled={isLoading || monthlySummaries.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Resumo
            </Button>
            <Button
              onClick={exportDetailsToCSV}
              disabled={isLoading || !items || items.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Detalhes
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </div>
            <TableSkeleton rows={6} />
          </div>
        ) : (
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="resumo">Resumo Mensal</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhamento</TabsTrigger>
            </TabsList>
            
            <TabsContent value="resumo" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Despesas</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead className="text-right">ROI Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlySummaries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhum dado disponível
                            </TableCell>
                          </TableRow>
                        ) : (
                          monthlySummaries.map((summary) => (
                            <TableRow key={summary.mes}>
                              <TableCell className="font-medium">
                                {summary.mesDisplay}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(summary.receita)}
                              </TableCell>
                              <TableCell className="text-right text-destructive">
                                -{formatCurrency(summary.despesas)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={`font-medium ${summary.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                                  {summary.saldo >= 0 ? "+" : ""}{formatCurrency(summary.saldo)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={
                                  summary.roiMedio >= 100 ? "text-success" :
                                  summary.roiMedio >= 0 ? "text-warning" :
                                  "text-destructive"
                                }>
                                  {summary.roiMedio > 0 ? formatPercentage(summary.roiMedio) : "-"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="detalhes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento de Transações</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionsTable items={items || []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  )
}
