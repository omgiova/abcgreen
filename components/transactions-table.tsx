"use client"

import Image from "next/image"
import { useState, useMemo, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDate } from "@/lib/format"
import { getEntradaThumbnailPath } from "@/lib/product-thumbnail"
import type { Item, FormaPagamento, TipoTransacao } from "@/lib/types"

interface TransactionsTableProps {
  items: Item[]
}

const formasPagamento: { value: FormaPagamento | "todos"; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
]

const tiposTransacao: { value: TipoTransacao | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
]

import { Search, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"

interface TransactionsTableProps {
  items: Item[]
}

type SortConfig = {
  key: keyof Item | "valorTotalAbs"
  direction: "asc" | "desc"
}

export function TransactionsTable({ items }: TransactionsTableProps) {
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "data", direction: "desc" })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSort = (key: keyof Item | "valorTotalAbs") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const SortIcon = ({ column }: { column: keyof Item | "valorTotalAbs" }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4 text-primary" />
    )
  }

  const filteredAndSortedItems = useMemo(() => {
    // IMPORTANTE: Removida a deduplicação para mostrar todas as linhas da planilha
    let result = [...items]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((item) => {
        return (
          item.nome.toLowerCase().includes(term) ||
          item.nomeComprador?.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term) ||
          item.descricao?.toLowerCase().includes(term)
        )
      })
    }

    // Ordenação
    result.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Item]
      let bVal: any = b[sortConfig.key as keyof Item]

      if (sortConfig.key === "valorTotalAbs") {
        aVal = Math.abs(a.valorTotal)
        bVal = Math.abs(b.valorTotal)
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [items, searchTerm, sortConfig])

  if (!mounted) {
    return <div className="rounded-md border h-64 bg-muted/20 animate-pulse" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar em todas as colunas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {filteredAndSortedItems.length} registros
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("data")}
                >
                  <div className="flex items-center">Data <SortIcon column="data" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleSort("nome")}
                >
                  <div className="flex items-center">Descrição <SortIcon column="nome" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => handleSort("tipo")}
                >
                  <div className="flex items-center">Categoria <SortIcon column="tipo" /></div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("valorCobradoShopee")}
                >
                  <div className="flex items-center justify-end">Venda Bruta <SortIcon column="valorCobradoShopee" /></div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("taxaShopee")}
                >
                  <div className="flex items-center justify-end">Taxa <SortIcon column="taxaShopee" /></div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("valorTotalAbs")}
                >
                  <div className="flex items-center justify-end">Valor Líquido <SortIcon column="valorTotalAbs" /></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum registro encontrado na planilha.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedItems.map((item, idx) => {
                  const type = item.tipo
                  const isEntrada = type === "entrada"
                  const isAds = type === "ads"
                  const isSaque = type === "saque"
                  const thumbnailPath = getEntradaThumbnailPath(item.nome, item.tipo)
                  
                  return (
                    <TableRow key={`${item.id}-${idx}`} className="hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(item.data)}
                      </TableCell>
                      <TableCell>
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
                          <div>
                            <div className="font-medium">{item.nome}</div>
                            {item.nomeComprador && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.nomeComprador}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize font-normal",
                            isEntrada ? "border-success/50 text-success bg-success/5" :
                            isAds ? "border-blue-500/50 text-blue-500 bg-blue-500/5" :
                            isSaque ? "border-purple-500/50 text-purple-500 bg-purple-500/5" :
                            "border-destructive/50 text-destructive bg-destructive/5"
                          )}
                        >
                          {type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {item.valorCobradoShopee && item.valorCobradoShopee > 0 ? formatCurrency(item.valorCobradoShopee) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-destructive whitespace-nowrap">
                        {item.taxaShopee && item.taxaShopee > 0 ? `-${formatCurrency(item.taxaShopee)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={cn(
                          "font-mono font-medium",
                          isEntrada ? "text-success" : "text-destructive"
                        )}>
                          {isEntrada ? "+" : "-"}{formatCurrency(Math.abs(item.valorTotal))}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
