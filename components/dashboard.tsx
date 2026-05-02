"use client"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react"
import { DollarSign, TrendingUp, ShoppingCart, ArrowDownUp, Calendar as CalendarIcon, Filter, Percent } from "lucide-react"
import { useItems } from "@/hooks/use-data"
import { KpiCard } from "./kpi-card"
import { KpiCardSkeleton, TableSkeleton, ChartSkeleton } from "./skeleton-loader"
import { ProfitChart } from "./profit-chart"
import { TransactionsTable } from "./transactions-table"
import { formatCurrency, formatPercentage } from "@/lib/format"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { getEntradaThumbnailPath } from "@/lib/product-thumbnail"
import type { Item, TipoTransacao } from "@/lib/types"

type TimeRange = "hoje" | "ontem" | "semana" | "mes" | "3meses" | "6meses" | "tudo" | "custom"
type KpiType = "receita" | "despesa" | "saldo" | "vendas" | "produtos" | "ticket_pedido" | "ticket_produto" | null
type SaldoHierarchySection = "saque" | "despesas" | "entradas"

interface HierarchyGroup {
  nome: string
  total: number
  items: Item[]
}

const safeSum = (arr: Item[], field: keyof Item) => arr.reduce((sum, item) => {
  const val = parseFloat(String(item[field] || 0).replace(',', '.'))
  return sum + (isNaN(val) ? 0 : val)
}, 0)

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const parseItemValue = (item: Item) => {
  const val = parseFloat(String(item.valorTotal || 0).replace(',', '.'))
  return isNaN(val) ? 0 : Math.abs(val)
}

const groupItemsByName = (list: Item[]): HierarchyGroup[] => {
  const grouped = new Map<string, HierarchyGroup>()

  list.forEach((item) => {
    const key = (item.nome || "Sem nome").trim()
    const current = grouped.get(key) || { nome: key, total: 0, items: [] }
    current.total += parseItemValue(item)
    current.items.push(item)
    grouped.set(key, current)
  })

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
}

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
  const [showMateriais, setShowMateriais] = useState(true)
  
  // Estado para o Modal de Detalhes
  const [selectedKpi, setSelectedKpi] = useState<KpiType>(null)

  // Estado para o Modal Ticket por Produto
  const [showTicketProdutoInfo, setShowTicketProdutoInfo] = useState(false)

  // Estado para a Calculadora de ROI
  const [showRoiCalc, setShowRoiCalc] = useState(false)
  const [calcInvestido, setCalcInvestido] = useState("1")
  const [calcRoi, setCalcRoi] = useState("0")
  const [calcRetorno, setCalcRetorno] = useState("0")
  const [calcQtd, setCalcQtd] = useState("1")

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
        ticketProduto: 0,
        totalAds: 0,
        roiPedido: 0,
        roiProduto: 0,
        retornoPorRealInvestido: 0,
        investimentoTicketPedido: 0,
        investimentoTicketProduto: 0,
      }
    }

    const entradas = filteredItems.filter((item) => item.tipo === "entrada")
    const saidas = filteredItems.filter((item) => {
      const isAds = item.tipo === "ads" || item.nome.toLowerCase().includes("ads") || item.nome.toLowerCase().includes("anuncio")
      const isSaque = item.tipo === "saque" || item.nome.toLowerCase().includes("saque")
      const isMateriais = item.nome.toLowerCase().includes("materiais")

      if (isAds && !showAds) return false
      if (isSaque) return false
      if (isMateriais && !showMateriais) return false
      
      return item.tipo !== "entrada"
    })

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
    const totalAds = filteredItems.reduce((sum, item) => {
      const isAds = item.tipo === "ads" || item.nome.toLowerCase().includes("ads") || item.nome.toLowerCase().includes("anuncio")
      if (!isAds) return sum
      const val = parseFloat(String(item.valorTotal || 0).replace(',', '.'))
      return sum + (isNaN(val) ? 0 : Math.abs(val))
    }, 0)

    const diferencaReceitaAds = receitaTotal - totalAds
    const roiPedido = totalAds > 0 ? (diferencaReceitaAds / totalAds) * 100 : 0
    const roiProduto = totalAds > 0 ? (diferencaReceitaAds / totalAds) * 100 : 0
    const retornoPorRealInvestido = totalAds > 0 ? receitaTotal / totalAds : 0
    const investimentoTicketPedido = retornoPorRealInvestido > 0 ? ticketPedido / retornoPorRealInvestido : 0
    const investimentoTicketProduto = retornoPorRealInvestido > 0 ? ticketProduto / retornoPorRealInvestido : 0

    return {
      receitaTotal,
      despesaTotal,
      saldoLiquido,
      numVendas,
      numProdutos,
      ticketPedido,
      ticketProduto,
      totalAds,
      roiPedido,
      roiProduto,
      retornoPorRealInvestido,
      investimentoTicketPedido,
      investimentoTicketProduto,
    }
  }, [filteredItems, showAds, showMateriais])

  const saldoAtual = useMemo(() => {
    if (!items || items.length === 0) return 0

    const entradasPeriodo = items.filter((item) => item.tipo === "entrada")
    const saidasPeriodo = items.filter((item) => {
      if (item.tipo === "entrada") return false

      const textoClassificacao = normalizeText(`${item.nome || ""} ${item.descricao || ""}`)
      const isSaqueMateriais = textoClassificacao.includes("saque materiais")
      return !isSaqueMateriais
    })
    return safeSum(entradasPeriodo, "valorTotal") - safeSum(saidasPeriodo, "valorTotal")
  }, [items])

  const saldoAtualData = useMemo(() => {
    return new Date().toLocaleDateString("pt-BR")
  }, [])

  const ticketMedioCusto = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        porProduto: 0,
        totalMateriais: 0,
        totalProdutos: 0,
      }
    }

    const entradasPeriodoCompleto = items.filter((item) => item.tipo === "entrada")
    const totalProdutosPeriodoCompleto = entradasPeriodoCompleto.reduce((sum, item) => {
      const qte = parseInt(String(item.quantidade || 0))
      return sum + (isNaN(qte) ? 0 : qte)
    }, 0)

    const totalMateriaisPeriodoCompleto = items.reduce((sum, item) => {
      if (item.tipo === "entrada") return sum

      const nomeNormalizado = normalizeText(item.nome || "")
      const textoClassificacao = normalizeText(`${item.nome || ""} ${item.descricao || ""}`)
      const isSaqueMateriais = textoClassificacao.includes("saque materiais")
      const isMateriais = nomeNormalizado.includes("materiais")

      if (!isMateriais || isSaqueMateriais) return sum

      const val = parseFloat(String(item.valorTotal || 0).replace(',', '.'))
      return sum + (isNaN(val) ? 0 : Math.abs(val))
    }, 0)

    return {
      porProduto: totalProdutosPeriodoCompleto > 0 ? totalMateriaisPeriodoCompleto / totalProdutosPeriodoCompleto : 0,
      totalMateriais: totalMateriaisPeriodoCompleto,
      totalProdutos: totalProdutosPeriodoCompleto,
    }
  }, [items])

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
          if (isSaque) return false
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
          if (isSaque) return false
          if (isMateriais && !showMateriais) return false
          return true
        })
      default:
        return []
    }
  }, [selectedKpi, filteredItems, showAds, showMateriais])

  const saldoHierarchy = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        saque: [] as HierarchyGroup[],
        despesas: [] as HierarchyGroup[],
        entradas: [] as HierarchyGroup[],
      }
    }

    const baseSaldoItems = items.filter((item) => {
      if (item.tipo === "entrada") return true
      const nomeNormalizado = normalizeText(item.nome || "")
      return nomeNormalizado !== "saque materiais"
    })

    const saqueItems = baseSaldoItems.filter((item) => {
      return item.tipo !== "entrada" && normalizeText(item.nome || "") === "saque"
    })

    const despesaItems = baseSaldoItems.filter((item) => {
      return item.tipo !== "entrada" && normalizeText(item.nome || "") !== "saque"
    })

    const entradaItems = baseSaldoItems.filter((item) => item.tipo === "entrada")

    return {
      saque: groupItemsByName(saqueItems),
      despesas: groupItemsByName(despesaItems),
      entradas: groupItemsByName(entradaItems),
    }
  }, [items])

  const saldoHierarchySections = useMemo(() => {
    return [
      { id: "saque" as SaldoHierarchySection, title: "SAQUE", groups: saldoHierarchy.saque, isEntrada: false },
      { id: "despesas" as SaldoHierarchySection, title: "DESPESAS", groups: saldoHierarchy.despesas, isEntrada: false },
      { id: "entradas" as SaldoHierarchySection, title: "ENTRADAS", groups: saldoHierarchy.entradas, isEntrada: true },
    ]
  }, [saldoHierarchy])

  const saldoHierarchyTotalItems = useMemo(() => {
    return saldoHierarchySections.reduce((acc, section) => {
      return acc + section.groups.reduce((sum, group) => sum + group.items.length, 0)
    }, 0)
  }, [saldoHierarchySections])

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <KpiCard 
              title="RECEITA" 
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
                    id="filter-materiais" 
                    checked={showMateriais} 
                    onCheckedChange={(checked) => setShowMateriais(!!checked)} 
                  />
                  <Label htmlFor="filter-materiais" className="text-[10px] cursor-pointer whitespace-nowrap uppercase font-bold">Materiais</Label>
                </div>
              </div>
            </KpiCard>
            <KpiCard
              title="CUSTO POR PRODUTO"
              value={formatCurrency(ticketMedioCusto.porProduto)}
              icon={<Filter className="h-5 w-5" />}
              valueClassName="font-bold"
            />
            <KpiCard 
              title="SALDO ATUAL" 
              value={formatCurrency(saldoAtual)} 
              subtitle={`Data: ${saldoAtualData}`}
              icon={<TrendingUp className="h-5 w-5" />} 
              valueClassName={cn("font-bold", saldoAtual >= 0 ? "text-success" : "text-destructive")} 
              onClick={() => setSelectedKpi("saldo")}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 items-stretch md:grid-cols-[1fr_auto_1fr]">
        {/* Grupo 1: Pedidos */}
        <div className="p-4 pb-1 rounded-xl border bg-muted/5 space-y-3">
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
                >
                </KpiCard>
                <KpiCard 
                  title="Ticket Médio" 
                  value={formatCurrency(kpis.ticketPedido)} 
                  className="bg-background shadow-sm border-muted"
                  icon={<ArrowDownUp className="h-5 w-5" />} 
                  onClick={() => setSelectedKpi("ticket_pedido")}
                />
                <p className="sm:col-span-2 text-base font-bold text-center text-foreground leading-tight pt-0 mb-0">
                  Para vender {formatCurrency(kpis.ticketPedido)} é preciso investir {formatCurrency(kpis.investimentoTicketPedido)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ROI — centro */}
        <div
          className="w-[270px] p-4 pb-1 rounded-xl border bg-muted/5 flex flex-col cursor-pointer hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98] transition-all duration-200"
          onClick={() => {
            setCalcInvestido("1")
            setCalcRoi(kpis.roiPedido.toFixed(2))
            setCalcRetorno(kpis.retornoPorRealInvestido.toFixed(2))
            setShowRoiCalc(true)
          }}
        >
          {isLoading ? <div className="p-4"><KpiCardSkeleton /></div> : (
            <>
              <div className="flex items-center justify-center gap-2 border-b pb-2">
                <div className="rounded border border-primary p-0.5 text-primary">
                  <Percent className="h-3 w-3" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">ROI</h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-5">
                <div className={cn("font-bold text-3xl text-center", kpis.roiPedido >= 0 ? "text-success" : "text-destructive")}>
                  {formatPercentage(kpis.roiPedido)}
                </div>
                <p className="text-sm font-bold text-foreground text-center">
                  {kpis.totalAds > 0
                    ? `R$ 1 investido = ${formatCurrency(kpis.retornoPorRealInvestido)}`
                    : "Sem Ads no período"}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Grupo 2: Produtos */}
        <div className="p-4 pb-1 rounded-xl border bg-muted/5 space-y-3">
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
                >
                </KpiCard>
                <KpiCard 
                  title="Ticket Médio" 
                  value={formatCurrency(kpis.ticketProduto)} 
                  className="bg-background shadow-sm border-muted"
                  icon={<ArrowDownUp className="h-5 w-5" />} 
                  onClick={() => setShowTicketProdutoInfo(true)}
                >
                </KpiCard>
                <p className="sm:col-span-2 text-base font-bold text-center text-foreground leading-tight pt-0 mb-0">
                  Para vender {formatCurrency(kpis.ticketProduto)} é preciso investir {formatCurrency(kpis.investimentoTicketProduto)}
                </p>
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
          showSaques={false} 
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
              {selectedKpi === "saldo"
                ? `${saldoHierarchyTotalItems} itens compõem este valor no período total.`
                : `${kpiDetails.length} itens compõem este valor no período selecionado.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 pb-6">
              <div className="space-y-3 pr-4">
                {selectedKpi === "saldo" ? (
                  <>
                    {saldoHierarchySections.map((section) => {
                      const sectionTotal = section.groups.reduce((sum, group) => sum + group.total, 0)

                      return (
                        <div key={section.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3 border-b pb-2">
                            <h4 className="text-sm font-bold tracking-wide">{section.title}</h4>
                            <div className={cn(
                              "text-sm font-mono font-bold",
                              section.isEntrada ? "text-success" : "text-destructive"
                            )}>
                              {section.isEntrada ? "+" : "-"}{formatCurrency(sectionTotal)}
                            </div>
                          </div>

                          {section.groups.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-3">
                              Nenhum item encontrado nesta seção.
                            </div>
                          ) : (
                            <Accordion type="multiple" className="w-full">
                              {section.groups.map((group, groupIndex) => (
                                <AccordionItem key={`${section.id}-${group.nome}-${groupIndex}`} value={`${section.id}-${groupIndex}`}>
                                  {(() => {
                                    const groupThumbnailPath = section.isEntrada ? getEntradaThumbnailPath(group.nome, "entrada") : null
                                    return (
                                  <AccordionTrigger className="py-3 hover:no-underline">
                                    <div className="flex w-full items-center justify-between gap-3 pr-2">
                                      <div className="flex items-center gap-3 text-left">
                                        {groupThumbnailPath && (
                                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                                            <Image
                                              src={groupThumbnailPath}
                                              alt={`Miniatura de ${group.nome}`}
                                              fill
                                              sizes="40px"
                                              className="object-cover"
                                            />
                                          </div>
                                        )}
                                        <div>
                                          <div className="font-medium text-sm">{group.nome}</div>
                                          <div className="text-xs text-muted-foreground">{group.items.length} lançamentos</div>
                                        </div>
                                      </div>
                                      <div className={cn(
                                        "font-mono font-bold text-sm",
                                        section.isEntrada ? "text-success" : "text-destructive"
                                      )}>
                                        {section.isEntrada ? "+" : "-"}{formatCurrency(group.total)}
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                    )
                                  })()}
                                  <AccordionContent>
                                    <div className="space-y-2 pt-1">
                                      {group.items.map((item, idx) => (
                                        (() => {
                                          const thumbnailPath = getEntradaThumbnailPath(item.nome, item.tipo)
                                          return (
                                        <div key={`${item.id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                                          <div className="flex items-center gap-3">
                                            {thumbnailPath && (
                                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                                                <Image
                                                  src={thumbnailPath}
                                                  alt={`Miniatura de ${item.nome}`}
                                                  fill
                                                  sizes="40px"
                                                  className="object-cover"
                                                />
                                              </div>
                                            )}
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
                                            {item.descricao && (
                                              <div className="text-[11px] text-muted-foreground break-words">
                                                {item.descricao}
                                              </div>
                                            )}
                                            {item.nomeComprador && <div className="text-[10px] text-muted-foreground">{item.nomeComprador}</div>}
                                            </div>
                                          </div>
                                          <div className={cn(
                                            "font-mono font-bold",
                                            section.isEntrada ? "text-success" : "text-destructive"
                                          )}>
                                            {section.isEntrada ? "+" : "-"}{formatCurrency(parseItemValue(item))}
                                          </div>
                                        </div>
                                          )
                                        })()
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <>
                    {kpiDetails.map((item, idx) => (
                      (() => {
                        const thumbnailPath = getEntradaThumbnailPath(item.nome, item.tipo)
                        return (
                      <div key={`${item.id}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {thumbnailPath && (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                              <Image
                                src={thumbnailPath}
                                alt={`Miniatura de ${item.nome}`}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                          )}
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
                        )
                      })()
                    ))}
                    {kpiDetails.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        Nenhum registro encontrado para este KPI.
                      </div>
                    )}
                  </>
                )}
              </div>
              </ScrollArea>
              </div>
              </DialogContent>
              </Dialog>

      {/* Calculadora de ROI */}
      <Dialog open={showRoiCalc} onOpenChange={setShowRoiCalc}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calculadora de ROI</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Investido */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2 hover:bg-muted/30 transition-colors">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investido</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-foreground">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={calcInvestido}
                  onChange={(e) => {
                    const inv = e.target.value
                    setCalcInvestido(inv)
                    const invNum = parseFloat(inv)
                    const roiNum = parseFloat(calcRoi)
                    if (!isNaN(invNum) && !isNaN(roiNum) && invNum > 0) {
                      setCalcRetorno((invNum * (1 + roiNum / 100)).toFixed(2))
                    }
                  }}
                  className="w-full bg-transparent p-0 text-2xl font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* ROI */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2 hover:bg-muted/30 transition-colors">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ROI</p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={calcRoi}
                  onChange={(e) => {
                    const roi = e.target.value
                    setCalcRoi(roi)
                    const invNum = parseFloat(calcInvestido)
                    const roiNum = parseFloat(roi)
                    if (!isNaN(invNum) && !isNaN(roiNum) && invNum > 0) {
                      setCalcRetorno((invNum * (1 + roiNum / 100)).toFixed(2))
                    }
                  }}
                  className={cn(
                    "w-full bg-transparent p-0 text-2xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    parseFloat(calcRoi) >= 0 ? "text-success" : "text-destructive"
                  )}
                />
                <span className={cn("text-2xl font-bold", parseFloat(calcRoi) >= 0 ? "text-success" : "text-destructive")}>%</span>
              </div>
            </div>

            {/* Retorno */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2 hover:bg-muted/30 transition-colors">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Retorno</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-muted-foreground">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={calcRetorno}
                  onChange={(e) => {
                    const ret = e.target.value
                    setCalcRetorno(ret)
                    const retNum = parseFloat(ret)
                    const roiNum = parseFloat(calcRoi)
                    if (!isNaN(retNum) && !isNaN(roiNum) && (1 + roiNum / 100) !== 0) {
                      setCalcInvestido((retNum / (1 + roiNum / 100)).toFixed(2))
                    }
                  }}
                  className="w-full bg-transparent p-0 text-2xl font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Diferença — somente leitura */}
            {(() => {
              const inv = parseFloat(calcInvestido)
              const ret = parseFloat(calcRetorno)
              const diff = isNaN(inv) || isNaN(ret) ? 0 : ret - inv
              const isPositive = diff >= 0
              return (
                <div className={cn(
                  "rounded-xl border p-4 space-y-2",
                  isPositive ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                )}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diferença</p>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-2xl font-bold", isPositive ? "text-success" : "text-destructive")}>R$</span>
                    <p className={cn(
                      "text-2xl font-bold",
                      isPositive ? "text-success" : "text-destructive"
                    )}>
                      {diff.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Resumo de pedidos/produtos estimados */}
          {(() => {
            const ret = parseFloat(calcRetorno) || 0
            const pedidos = kpis.ticketPedido > 0 ? ret / kpis.ticketPedido : 0
            const produtos = kpis.ticketProduto > 0 ? ret / kpis.ticketProduto : 0
            return (
              <p className="text-sm font-bold text-center text-foreground px-1">
                Para{" "}
                <span className="text-success">R$ {ret.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {" "}é preciso ≈{" "}
                <span className="text-primary">{Math.ceil(pedidos)} pedidos</span>
                {" "}ou{" "}
                <span className="text-primary">{Math.ceil(produtos)} produtos</span>
              </p>
            )
          })()}

          {/* Calculadora de Lucro */}
          <div className="border-t pt-4 mt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Calculadora de Lucro</p>
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const diff = (parseFloat(calcRetorno) || 0) - (parseFloat(calcInvestido) || 0)
                const qtd = parseFloat(calcQtd) || 1
                const custoPorProduto = ticketMedioCusto.porProduto
                const custoTotal = qtd * custoPorProduto
                const lucroReais = diff - custoTotal
                const lucroPct = custoTotal > 0 ? (lucroReais / custoTotal) * 100 : 0
                const isPositiveLucro = lucroReais >= 0
                return (
                  <>
                    {/* % Lucro */}
                    <div className={cn("rounded-xl border p-4 space-y-1", isPositiveLucro ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lucro</p>
                      <div className="flex items-center gap-0.5">
                        <p className={cn("text-2xl font-bold", isPositiveLucro ? "text-success" : "text-destructive")}>
                          {lucroPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className={cn("text-2xl font-bold", isPositiveLucro ? "text-success" : "text-destructive")}>%</span>
                      </div>
                    </div>

                    {/* R$ Lucro */}
                    <div className={cn("rounded-xl border p-4 space-y-1", isPositiveLucro ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lucro R$</p>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-2xl font-bold", isPositiveLucro ? "text-success" : "text-destructive")}>R$</span>
                        <p className={cn("text-2xl font-bold", isPositiveLucro ? "text-success" : "text-destructive")}>
                          {lucroReais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Qtd de produtos */}
                    <div className="rounded-xl border bg-muted/20 p-4 space-y-1 hover:bg-muted/30 transition-colors">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qtd Produtos</p>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={calcQtd}
                        onChange={(e) => setCalcQtd(e.target.value)}
                        className="w-full bg-transparent p-0 text-2xl font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Custo por produto - read only */}
                    <div className="rounded-xl border bg-muted/10 p-4 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custo/Produto</p>
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-bold text-destructive">R$</span>
                        <p className="text-2xl font-bold text-destructive">
                          {custoPorProduto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Custo total - read only */}
                    <div className="rounded-xl border bg-muted/10 p-4 space-y-1 col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custo Total ({calcQtd || "1"} × R$ {custoPorProduto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</p>
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-bold text-destructive">R$</span>
                        <p className="text-2xl font-bold text-destructive">
                          {custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ticket Médio por Produto */}
      <Dialog open={showTicketProdutoInfo} onOpenChange={setShowTicketProdutoInfo}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
              <span className="font-bold font-mono">{formatCurrency(kpis.ticketProduto)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Custo</span>
              <span className="font-bold font-mono text-destructive">{formatCurrency(ticketMedioCusto.porProduto)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/10">
              <span className="text-sm font-semibold">Diferença</span>
              <span className={cn("font-bold font-mono", (kpis.ticketProduto - ticketMedioCusto.porProduto) >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(kpis.ticketProduto - ticketMedioCusto.porProduto)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
              </div>
              )
              }
