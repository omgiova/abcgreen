"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format"
import type { CampanhaROI } from "@/lib/types"

interface CampaignsTableProps {
  campanhas: CampanhaROI[]
}

export function CampaignsTable({ campanhas }: CampaignsTableProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const sortedCampanhas = [...campanhas].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  )

  const getRoiBadgeVariant = (roi: number) => {
    if (roi >= 100) return "default"
    if (roi >= 0) return "secondary"
    return "destructive"
  }

  const getRoiBadgeClass = (roi: number) => {
    if (roi >= 100) return "bg-success text-success-foreground"
    if (roi >= 0) return "bg-warning text-warning-foreground"
    return ""
  }

  if (!mounted) {
    return <div className="rounded-md border h-64 bg-muted/20 animate-pulse" />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Investimento</TableHead>
            <TableHead className="text-right">Lucro Gerado</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCampanhas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhuma campanha encontrada
              </TableCell>
            </TableRow>
          ) : (
            sortedCampanhas.map((campanha) => (
              <TableRow key={campanha.id}>
                <TableCell className="font-medium">
                  {formatDate(campanha.data)}
                </TableCell>
                <TableCell>{campanha.descricao}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(campanha.investimentoAnuncio)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(campanha.lucroGerado)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={getRoiBadgeVariant(campanha.roi)}
                    className={cn(getRoiBadgeClass(campanha.roi))}
                  >
                    {formatPercentage(campanha.roi)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
