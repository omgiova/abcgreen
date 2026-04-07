"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { createCampanha } from "@/lib/api"
import { formatCurrency, formatPercentage, calculateROI } from "@/lib/format"
import { cn } from "@/lib/utils"
import { mutate } from "swr"

interface FormData {
  data: string
  descricao: string
  investimentoAnuncio: string
  lucroGerado: string
}

interface FormErrors {
  [key: string]: string
}

const initialFormData: FormData = {
  data: new Date().toISOString().split("T")[0],
  descricao: "",
  investimentoAnuncio: "",
  lucroGerado: "",
}

export function ROIForm() {
  const { toast } = useToast()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roi = useMemo(() => {
    const investimento = parseFloat(formData.investimentoAnuncio) || 0
    const lucro = parseFloat(formData.lucroGerado) || 0
    return calculateROI(lucro, investimento)
  }, [formData.investimentoAnuncio, formData.lucroGerado])

  const roiColorClass = useMemo(() => {
    if (roi >= 100) return "text-success"
    if (roi >= 0) return "text-warning"
    return "text-destructive"
  }, [roi])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.data) newErrors.data = "Data é obrigatória"
    if (!formData.descricao.trim()) newErrors.descricao = "Descrição é obrigatória"
    if (!formData.investimentoAnuncio || parseFloat(formData.investimentoAnuncio) <= 0) {
      newErrors.investimentoAnuncio = "Investimento deve ser maior que zero"
    }
    if (!formData.lucroGerado) {
      newErrors.lucroGerado = "Lucro gerado é obrigatório"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setIsSubmitting(true)

    const campanha = {
      data: formData.data,
      descricao: formData.descricao,
      investimentoAnuncio: parseFloat(formData.investimentoAnuncio) || 0,
      lucroGerado: parseFloat(formData.lucroGerado) || 0,
      roi,
    }

    const success = await createCampanha(campanha)

    setIsSubmitting(false)

    if (success) {
      toast({
        title: "Sucesso!",
        description: "Campanha adicionada com sucesso.",
      })
      setFormData(initialFormData)
      mutate("campanhas")
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a campanha. Verifique a configuração da API.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Campanha de Anúncio</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Data</FieldLabel>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => handleChange("data", e.target.value)}
              />
              {errors.data && <p className="text-sm text-destructive">{errors.data}</p>}
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel>Descrição da Campanha</FieldLabel>
              <Textarea
                placeholder="Ex: Campanha Black Friday - Kits Slime"
                value={formData.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
              />
              {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
            </Field>

            <Field>
              <FieldLabel>Investimento em Anúncio (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.investimentoAnuncio}
                onChange={(e) => handleChange("investimentoAnuncio", e.target.value)}
              />
              {errors.investimentoAnuncio && <p className="text-sm text-destructive">{errors.investimentoAnuncio}</p>}
            </Field>

            <Field>
              <FieldLabel>Lucro Gerado (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.lucroGerado}
                onChange={(e) => handleChange("lucroGerado", e.target.value)}
              />
              {errors.lucroGerado && <p className="text-sm text-destructive">{errors.lucroGerado}</p>}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-2",
        roi >= 100 ? "border-success/50 bg-success/5" :
        roi >= 0 ? "border-warning/50 bg-warning/5" :
        "border-destructive/50 bg-destructive/5"
      )}>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">ROI da Campanha</p>
            <p className={cn("text-5xl font-bold", roiColorClass)}>
              {formatPercentage(roi)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {roi >= 100 ? "Excelente retorno!" :
               roi >= 0 ? "Retorno positivo" :
               "Retorno negativo"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Salvando...
          </>
        ) : (
          "Salvar Campanha"
        )}
      </Button>
    </form>
  )
}
