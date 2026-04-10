"use client"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react"
import { DollarSign, TrendingUp, ShoppingCart, ArrowDownUp, Calendar as CalendarIcon, Filter } from "lucide-react"
import { useItems } from "@/hooks/use-data"
import { KpiCard } from "./kpi-card"
import { KpiCardSkeleton, TableSkeleton, ChartSkeleton } from "./skeleton-loader"
import { ProfitChart } from "./profit-chart"
import { TransactionsTable } from "./transactions-table"
import { formatCurrency } from "@/lib/format"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import type { TipoTransacao } from "@/lib/types"

type TimeRange = "hoje" | "ontem" | "semana" | "mes" | "3meses" | "6meses" | "tudo" | "custom"
type KpiType = "receita" | "despesa" | "saldo" | "vendas" | "produtos" | "ticket_pedido" | "ticket_produto" | null

export function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const { data: items, isLoading, error, mutate } = useItems()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Estados de Filtro
  const [range, setRange] = useState<TimeRange>("tudo")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [tipo, setTipo] = useState<TipoTransacao | "todos">("todos")
  
  // Filtros de Despesa
  const [showAds, setShowAds] = useState(true)
  const [showSaques, setShowSaques] = useState(false)
  const [showMateriais, setShowMateriais] = useState(true)
  
  // Estado para o Modal de Detalhes
  const [selectedKpi, setSelectedKpi] = useState<KpiType>(null)

  const START_OF_OPERATIONS = new Date(2025, 9, 1) // 01/10/2025 (Mês 9 no JS = Outubro)

  const handleRangeChange = (newRange: TimeRange) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start = new Date(START_OF_OPERATIONS)
    let end = new Date(now)

    switch (newRange) {
      case "hoje":
        start = today
        break
      case "ontem":
        start = new Date(today)
        start.setDate(today.getDate() - 1)
        end = new Date(start)
        end.setHours(23, 59, 59)
        break
      case "semana":
        start = new Date(today)
        start.setDate(today.getDate() - 7)
        break
      case "mes":
        start = new Date(today)
        start.setMonth(today.getMonth() - 1)
        break
      case "3meses":
        start = new Date(today)
        start.setMonth(today.getMonth() - 3)
        break
      case "6meses":
        start = new Date(today)
        start.setMonth(today.getMonth() - 6)
        break
      case "tudo":
        start = new Date(START_OF_OPERATIONS)
        break
    }

    // Garantir que não filtre antes de Outubro/2025
    if (start < START_OF_OPERATIONS) start = new Date(START_OF_OPERATIONS)

    setRange(newRange)
    if (newRange !== "custom") {
      setStartDate(start.toISOString().split("T")[0])
      setEndDate(end.toISOString().split("T")[0])
    }
  }

  // Inicializa com "Tudo" respeitando a data de início
  useEffect(() => {
    handleRangeChange("tudo")
  }, [])

  const filteredItems = useMemo(() => {
    if (!items) return []

    return items.filter((item) => {
      // Filtro de Tipo Global
      if (tipo !== "todos") {
        if (tipo === "entrada" && item.tipo !== "entrada") return false
        if (tipo === "saida" && !["saida", "ads", "saque"].includes(item.tipo)) return false
      }

      if (!item.data) return false

      // Parsing robusto de data (aceita DD/MM/AAAA ou ISO)
      let itemDate: Date
      if (typeof item.data === "string" && item.data.includes("/")) {
        const [day, month, year] = item.data.split("/")
        itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      } else {
        itemDate = new Date(item.data)
      }
      
      if (isNaN(itemDate.getTime())) return false
      itemDate.setHours(0, 0, 0, 0)
      
      // Converter datas YYYY-MM-DD do filtro para objeto Date local (evita bug de fuso horário)
      let start: Date | null = null
      if (startDate) {
        const [sYear, sMonth, sDay] = startDate.split("-")
        start = new Date(parseInt(sYear), parseInt(sMonth) - 1, parseInt(sDay))
        start.setHours(0, 0, 0, 0)
      }

      let end: Date | null = null
      if (endDate) {
        const [eYear, eMonth, eDay] = endDate.split("-")
        end = new Date(parseInt(eYear), parseInt(eMonth) - 1, parseInt(eDay))
        end.setHours(23, 59, 59, 999)
      }

      if (start && itemDate < start) return false
      if (end && itemDate > end) return false
      return true
    })
  }, [items, startDate, endDate])

  const kpis = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) {
      return { 
        receitaTotal: 0, 
        despesaTotal: 0, 
        saldoLiquido: 0, 
        numVendas: 0,
        numProdutos: 0,
        ticketPedido: 0,
        ticketProduto: 0
      }
    }

    const entradas = filteredItems.filter((item) => item.tipo === "entrada")
    const saidas = filteredItems.filter((item) => {
      const isAds = item.tipo === "ads" || item.nome.toLowerCase().includes("ads") || item.nome.toLowerCase().includes("anuncio")
      const isSaque = item.tipo === "saque" || item.nome.toLowerCase().includes("saque")
      const isMateriais = item.nome.toLowerCase().includes("materiais")

      if (isAds && !showAds) return false
      if (isSaque && !showSaques) return false
      if (isMateriais && !showMateriais) return false
      
      return item.tipo !== "entrada"
    })

    // Soma robusta convertendo strings para números e tratando valores nulos
    const safeSum = (arr: any[], field: string) => arr.reduce((sum, item) => {
      const val = parseFloat(String(item[field] || 0).replace(',', '.'))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    const receitaTotal = safeSum(entradas, 'valorTotal')
    const despesaTotal = safeSum(saidas, 'valorTotal')
    
    // O Saldo Líquido real é a Receita Total menos as Despesas Totais.
    const saldoLiquido = receitaTotal - despesaTotal

    const numVendas = entradas.length
    const numProdutos = entradas.reduce((sum, item) => {
      const qte = parseInt(String(item.quantidade || 0))
      return sum + (isNaN(qte) ? 0 : qte)
    }, 0)

    const ticketPedido = numVendas > 0 ? receitaTotal / numVendas : 0
    const ticketProduto = numProdutos > 0 ? receitaTotal / numProdutos : 0

    return { receitaTotal, despesaTotal, saldoLiquido, numVendas, numProdutos, ticketPedido, ticketProduto }
  }, [filteredItems, showAds, showSaques, showMateriais])

  const kpiDetails = useMemo(() => {
    if (!selectedKpi || !filteredItems) return []

    switch (selectedKpi) {
      case "receita":
        return filteredItems.filter(i => i.tipo === "entrada")
      case "despesa":
        return filteredItems.filter(i => {
          const isAds = i.tipo === "ads" || i.nome.toLowerCase().includes("ads") || i.nome.toLowerCase().includes("anuncio")
          const isSaque = i.tipo === "saque" || i.nome.toLowerCase().includes("saque")
          const isMateriais = i.nome.toLowerCase().includes("materiais")

          if (isAds && !showAds) return false
          if (isSaque && !showSaques) return false
          if (isMateriais && !showMateriais) return false
          return i.tipo !== "entrada"
        })
      case "vendas":
        return filteredItems.filter(i => i.tipo === "entrada")
      case "produtos":
        return filteredItems.filter(i => i.tipo === "entrada")
      case "ticket_pedido":
        return filteredItems.filter(i => i.tipo === "entrada")
      case "ticket_produto":
        return filteredItems.filter(i => i.tipo === "entrada")
      case "saldo":
        return filteredItems.filter(i => {
          const isAds = i.tipo === "ads" || i.nome.toLowerCase().includes("ads") || i.nome.toLowerCase().includes("anuncio")
          const isSaque = i.tipo === "saque" || i.nome.toLowerCase().includes("saque")
          const isMateriais = i.nome.toLowerCase().includes("materiais")

          if (isAds && !showAds) return false
          if (isSaque && !showSaques) return false
          if (isMateriais && !showMateriais) return false
          return true
        })
      default:
        return []
    }
  }, [selectedKpi, filteredItems, showAds, showSaques, showMateriais])

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-destructive">Erro ao carregar dados. Verifique a configuração da API.</p>
        <Button onClick={() => mutate()}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-[112px] shrink-0">
            <Image
              src="/green%20(3).png"
              alt="Logo da ABC Green"
              fill
              sizes="112px"
              className="object-contain object-left"
              unoptimized
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral da loja ABC Green na Shopee</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button asChild>
            <a
              href="https://shopee.com.br/abc.green"
              target="_blank"
              rel="noreferrer"
            >
              Ver loja
            </a>
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {/* Filtro de Período */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {range === "custom" ? "Período Personalizado" : range.charAt(0).toUpperCase() + range.slice(1).replace('3meses', '3 Meses').replace('6meses', '6 Meses')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleRangeChange("hoje")}>Hoje</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange("ontem")}>Ontem</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange("semana")}>Última Semana</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange("mes")}>Último Mês</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange("3meses")}>Últimos 3 Meses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange("6meses")}>Últimos 6 Meses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRangeChange("tudo")}>Todo o Período</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRange("custom")}>Personalizado...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {range === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-32 h-9" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-32 h-9" />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <KpiCard 
              title="RECEITA TOTAL" 
              value={formatCurrency(kpis.receitaTotal)} 
              icon={<DollarSign className="h-5 w-5" />} 
              valueClassName="text-success font-bold" 
              onClick={() => setSelectedKpi("receita")}
            />
            <KpiCard 
              title="DESPESAS" 
              value={formatCurrency(kpis.despesaTotal)} 
              icon={<ArrowDownUp className="h-5 w-5" />} 
              valueClassName="text-destructive font-bold" 
              onClick={() => setSelectedKpi("despesa")}
            >
              <div className="flex flex-wrap items-center justify-between gap-y-2 kpi-card-actions">
                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    id="filter-ads" 
                    checked={showAds} 
                    onCheckedChange={(checked) => setShowAds(!!checked)} 
                  />
                  <Label htmlFor="filter-ads" className="text-[10px] cursor-pointer whitespace-nowrap uppercase font-bold">Ads</Label>
                </div>
                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    id="filter-saques" 
                    checked={showSaques} 
                    onCheckedChange={(checked) => setShowSaques(!!checked)} 
                  />
                  <Label htmlFor="filter-saques" className="text-[10px] cursor-pointer whitespace-nowrap uppercase font-bold">Saque</Label>
                </div>
                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    id="filter-materiais" 
                    checked={showMateriais} 
                    onCheckedChange={(checked) => setShowMateriais(!!checked)} 
                  />
                  <Label htmlFor="filter-materiais" className="text-[10px] cursor-pointer whitespace-nowrap uppercase font-bold">Materiais</Label>
                </div>
              </div>
            </KpiCard>
            <KpiCard 
              title="SALDO LÍQUIDO" 
              value={formatCurrency(kpis.saldoLiquido)} 
              icon={<TrendingUp className="h-5 w-5" />} 
              valueClassName={cn("font-bold", kpis.saldoLiquido >= 0 ? "text-success" : "text-destructive")} 
              onClick={() => setSelectedKpi("saldo")}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Grupo 1: Pedidos */}
        <div className="p-4 rounded-xl border bg-muted/5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Análise por Pedido</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {isLoading ? (
              <><KpiCardSkeleton /><KpiCardSkeleton /></>
            ) : (
              <>
                <KpiCard 
                  title="Pedidos" 
                  value={kpis.numVendas.toString()} 
                  className="bg-background shadow-sm border-muted"
                  icon={<ShoppingCart className="h-5 w-5" />} 
                  onClick={() => setSelectedKpi("vendas")}
                />
                <KpiCard 
                  title="Ticket Médio" 
                  value={formatCurrency(kpis.ticketPedido)} 
                  className="bg-background shadow-sm border-muted"
                  icon={<ArrowDownUp className="h-5 w-5" />} 
                  onClick={() => setSelectedKpi("ticket_pedido")}
                />
              </>
            )}
          </div>
        </div>

        {/* Grupo 2: Produtos */}
        <div className="p-4 rounded-xl border bg-muted/5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Análise por Produto</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {isLoading ? (
              <><KpiCardSkeleton /><KpiCardSkeleton /></>
            ) : (
              <>
                <KpiCard 
                  title="Produtos" 
                  value={kpis.numProdutos.toString()} 
                  className="bg-background shadow-sm border-muted"
                  icon={<Filter className="h-5 w-5" />} 
                  onClick={() => setSelectedKpi("produtos")}
                />
                <KpiCard 
                  title="Ticket Médio" 
                  value={formatCurrency(kpis.ticketProduto)} 
                  className="bg-background shadow-sm border-muted"
                  icon={<ArrowDownUp className="h-5 w-5" />} 
                  onClick={() => setSelectedKpi("ticket_produto")}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <ProfitChart 
          items={filteredItems} 
          showAds={showAds} 
          showSaques={showSaques} 
          showMateriais={showMateriais} 
        />
      )}

      {/* Modal de Detalhes do KPI */}
      <Dialog open={selectedKpi !== null} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="capitalize">
              {selectedKpi === "vendas" ? "Vendas Realizadas" : 
               selectedKpi === "receita" ? "Detalhamento de Receita" :
               selectedKpi === "despesa" ? "Detalhamento de Despesas" :
               selectedKpi === "ticket_pedido" ? "Cálculo do Ticket Médio por Pedido" :
               selectedKpi === "ticket_produto" ? "Cálculo do Ticket Médio por Produto" :
               selectedKpi === "produtos" ? "Quantidade de Produtos Vendidos" :
               "Detalhamento do Saldo"}
            </DialogTitle>
            <DialogDescription>
              {kpiDetails.length} itens compõem este valor no período selecionado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 pb-6">
              <div className="space-y-3 pr-4">
                {kpiDetails.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(item.data)}</span>
                      <Badge variant="outline" className="text-[10px] h-4 font-normal capitalize">
                        {item.tipo}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">
                      {item.nome}
                      {item.quantidade > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (x{item.quantidade})
                        </span>
                      )}
                    </div>
                    {item.nomeComprador && <div className="text-[10px] text-muted-foreground">{item.nomeComprador}</div>}
                  </div>
                  <div className="text-right space-y-1">
                    <div className={cn(
                      "font-mono font-bold",
                      item.tipo === "entrada" ? "text-success" : "text-destructive"
                    )}>
                      {item.tipo === "entrada" ? "+" : "-"}{formatCurrency(Math.abs(item.valorTotal))}
                    </div>
                  </div>
                </div>
              ))}
              {kpiDetails.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum registro encontrado para este KPI.
              </div>
              )}
              </div>
              </ScrollArea>
              </div>
              </DialogContent>
              </Dialog>
              </div>
              )
              }
