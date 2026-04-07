"use client"

import { useMemo, useState, useEffect } from "react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import type { Item } from "@/lib/types"

interface ProfitChartProps {
  items: Item[]
  showAds?: boolean
  showSaques?: boolean
  showMateriais?: boolean
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"]

export function ProfitChart({ 
  items, 
  showAds = true, 
  showSaques = true, 
  showMateriais = true 
}: ProfitChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const processedData = useMemo(() => {
    if (!items || items.length === 0) {
      return { timeline: [], distribution: [], isDaily: false }
    }

    // Determinar se agrupamos por dia ou mês
    const itemsWithDates = items.map(i => {
      let dt: Date;
      if (typeof i.data === "string" && i.data.includes("/")) {
        const [d, m, y] = i.data.split("/")
        dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      } else {
        dt = new Date(i.data)
      }
      return { ...i, _date: dt }
    }).filter(i => !isNaN(i._date.getTime()))

    if (itemsWithDates.length === 0) {
      return { timeline: [], distribution: [], isDaily: false }
    }

    const timestamps = itemsWithDates.map(i => i._date.getTime())
    const minDate = Math.min(...timestamps)
    const maxDate = Math.max(...timestamps)
    const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)
    const isDaily = diffDays <= 31

    const groupData = new Map<string, { receita: number; despesa: number; vendas: number; ads: number; saques: number; materiais: number }>()
    let totalDespesasGerais = 0
    let totalAds = 0
    let totalSaques = 0
    let totalMateriais = 0

    itemsWithDates.forEach((item) => {
      const date = item._date
      const key = isDaily 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      
      const current = groupData.get(key) || { receita: 0, despesa: 0, vendas: 0, ads: 0, saques: 0, materiais: 0 }

      if (item.tipo === "entrada") {
        current.receita += Math.abs(item.valorTotal)
        current.vendas += 1
      } else {
        const valor = Math.abs(item.valorTotal)
        const isAds = item.tipo === "ads" || item.nome.toLowerCase().includes("ads") || item.nome.toLowerCase().includes("anuncio")
        const isSaque = item.tipo === "saque" || item.nome.toLowerCase().includes("saque")
        const isMateriais = item.nome.toLowerCase().includes("materiais")

        if (isAds) {
          if (showAds) {
            current.ads += valor
            totalAds += valor
          }
        } else if (isSaque) {
          if (showSaques) {
            current.saques += valor
            totalSaques += valor
          }
        } else if (isMateriais) {
          if (showMateriais) {
            current.materiais += valor
            totalMateriais += valor
          }
        } else {
          // Outras despesas que não são Ads, Saque ou Materiais são SEMPRE somadas
          current.despesa += valor
          totalDespesasGerais += valor
        }
      }
      groupData.set(key, current)
    })

    const sortedEntries = Array.from(groupData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))

    const timeline = sortedEntries.map(([key, data]) => {
      let label = ""
      if (isDaily) {
        const [y, m, d] = key.split("-")
        label = `${d}/${m}`
      } else {
        const [y, m] = key.split("-")
        label = `${monthNames[parseInt(m) - 1]}/${y.slice(2)}`
      }
      
      const despesaTotalDoPeriodo = data.despesa + data.ads + data.saques + data.materiais

      return {
        name: label,
        receita: data.receita,
        despesa: despesaTotalDoPeriodo,
        saldo: data.receita - despesaTotalDoPeriodo,
        vendas: data.vendas,
      }
    })

    const totalDespesas = totalAds + totalSaques + totalMateriais + totalDespesasGerais
    const totalReceita = timeline.reduce((acc, curr) => acc + curr.receita, 0)
    const lucroReal = Math.max(0, totalReceita - totalDespesas)

    const distribution = [
      { name: "Receita Total", value: totalReceita },
      { name: "Ads", value: totalAds },
      { name: "Saques", value: totalSaques },
      { name: "Materiais", value: totalMateriais },
      { name: "Outras Despesas", value: totalDespesasGerais },
    ].filter(d => d.value > 0)

    return { timeline, distribution, isDaily, totalReceita }
  }, [items, showAds, showSaques, showMateriais])

  if (!mounted) return <div className="grid gap-4 md:grid-cols-2 animate-pulse h-96 bg-muted/20 rounded-lg" />

  if (processedData.timeline.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          Nenhum dado disponível para gerar os gráficos
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. SALDO LÍQUIDO MENSAL (Barra) */}
      <Card>
        <CardHeader><CardTitle className="text-lg font-bold uppercase">Saldo Líquido Mensal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={processedData.timeline}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="saldo" radius={[4, 4, 0, 0]}>
                {processedData.timeline.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.saldo >= 0 ? "#10b981" : "#ef4444"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. RECEITA VS DESPESAS (Linha) */}
      <Card>
        <CardHeader><CardTitle className="text-lg font-bold uppercase">Receita vs Despesas</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={processedData.timeline}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. VOLUME DE VENDAS (Área) */}
      <Card>
        <CardHeader><CardTitle className="text-lg font-bold uppercase">Volume de Vendas</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={processedData.timeline}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="vendas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVendas)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. DISTRIBUIÇÃO DA RECEITA (Pizza/Donut) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex justify-between items-center uppercase">
            <span>Distribuição da Receita</span>
            <span className="text-lg font-bold uppercase text-muted-foreground font-normal normal-case">
              Total: {formatCurrency(processedData.totalReceita)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={processedData.distribution}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                minAngle={15}
                label={({ value, cx, x, y, cy }) => {
                  const totalGeralNoGrafico = processedData.distribution.reduce((acc, curr) => acc + curr.value, 0)
                  const percent = totalGeralNoGrafico > 0 ? (value / totalGeralNoGrafico) * 100 : 0
                  const radiusOffset = 1.15; 
                  const targetX = cx + (x - cx) * radiusOffset;
                  const targetY = cy + (y - cy) * radiusOffset;
                  return (
                    <text 
                      x={targetX} 
                      y={targetY}
                      fill="currentColor" 
                      textAnchor={targetX > cx ? 'start' : 'end'} 
                      dominantBaseline="central"
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    >
                      {`${percent.toFixed(1).replace('.', ',')}%`}
                    </text>
                  )
                }}
              >
                {processedData.distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const totalGeralNoGrafico = processedData.distribution.reduce((acc, curr) => acc + curr.value, 0)
                  const percent = totalGeralNoGrafico > 0 
                    ? ((value / totalGeralNoGrafico) * 100).toFixed(1).replace('.', ',') 
                    : "0,0"
                  return [`${formatCurrency(value)} (${percent}%)`, name]
                }} 
              />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px', paddingLeft: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
