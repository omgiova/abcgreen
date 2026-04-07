"use client"

import { useMemo, useState } from "react"
import { TrendingUp, Award, Wallet, ArrowUpRight, Send } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ROIForm } from "@/components/roi-form"
import { CampaignsTable } from "@/components/campaigns-table"
import { KpiCard } from "@/components/kpi-card"
import { KpiCardSkeleton, TableSkeleton } from "@/components/skeleton-loader"
import { useCampanhas } from "@/hooks/use-data"
import { formatCurrency, formatPercentage } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { createCampanha } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function ROIPage() {
  const { data: campanhas, isLoading, error, mutate } = useCampanhas()
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)

  const handleSendTestCampaign = async () => {
    setIsSending(true)
    try {
      const mockCampanha = {
        data: new Date().toLocaleDateString("pt-BR"),
        descricao: "Campanha Teste " + Math.floor(Math.random() * 100),
        investimentoAnuncio: Math.floor(Math.random() * 200) + 100,
        lucroGerado: Math.floor(Math.random() * 1000) + 500,
        roi: 0, // O script do Google Apps Script calcula o ROI
      }

      // Calcula o ROI para exibição local (embora o script também faça isso)
      mockCampanha.roi = (mockCampanha.lucroGerado / mockCampanha.investimentoAnuncio) * 100

      const success = await createCampanha(mockCampanha)
      if (success) {
        toast({
          title: "Campanha de teste enviada!",
          description: "Os dados foram adicionados à sua planilha com sucesso.",
        })
        mutate() // Recarrega os dados
      } else {
        throw new Error("Falha ao enviar")
      }
    } catch (err) {
      toast({
        title: "Erro ao enviar campanha",
        description: "Verifique sua conexão e a URL do Apps Script.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const kpis = useMemo(() => {
    if (!campanhas || campanhas.length === 0) {
      return {
        roiMedio: 0,
        melhorCampanha: "-",
        totalInvestido: 0,
        totalRetornado: 0,
      }
    }

    const roiMedio = campanhas.reduce((sum, c) => sum + c.roi, 0) / campanhas.length
    const melhor = campanhas.reduce((best, c) => c.roi > best.roi ? c : best)
    const totalInvestido = campanhas.reduce((sum, c) => sum + c.investimentoAnuncio, 0)
    const totalRetornado = campanhas.reduce((sum, c) => sum + c.lucroGerado, 0)

    return {
      roiMedio,
      melhorCampanha: melhor.descricao,
      totalInvestido,
      totalRetornado,
    }
  }, [campanhas])

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ROI de Anúncios</h1>
            <p className="text-muted-foreground">Acompanhe o retorno das suas campanhas</p>
          </div>
          <Button 
            onClick={handleSendTestCampaign} 
            disabled={isSending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Enviando..." : "Enviar Campanha de Teste"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <KpiCard
                title="ROI Médio"
                value={formatPercentage(kpis.roiMedio)}
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <KpiCard
                title="Melhor Campanha"
                value={kpis.melhorCampanha.length > 20 
                  ? kpis.melhorCampanha.substring(0, 20) + "..." 
                  : kpis.melhorCampanha}
                icon={<Award className="h-5 w-5" />}
              />
              <KpiCard
                title="Total Investido"
                value={formatCurrency(kpis.totalInvestido)}
                icon={<Wallet className="h-5 w-5" />}
              />
              <KpiCard
                title="Total Retornado"
                value={formatCurrency(kpis.totalRetornado)}
                icon={<ArrowUpRight className="h-5 w-5" />}
              />
            </>
          )}
        </div>
        <ROIForm />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Histórico de Campanhas</h2>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <p className="text-destructive text-center py-8">
              Erro ao carregar campanhas. Verifique a configuração da API.
            </p>
          ) : (
            <CampaignsTable campanhas={campanhas || []} />
          )}
        </div>
      </div>
    </AppShell>
  )
}
