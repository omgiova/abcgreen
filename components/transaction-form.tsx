"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { useItems } from "@/hooks/use-data"
import { createItem } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  formatCurrency,
  formatPercentage,
  calculateTaxaShopee,
  calculateTaxaShopeeV2,
  calculateCustoPorProduto,
} from "@/lib/format"
import type { FormaPagamento, TipoTransacao, UnidadeMedida } from "@/lib/types"
import { mutate } from "swr"
import { ArrowDownCircle, ArrowUpCircle, Calculator, Info, Target, Wallet } from "lucide-react"

interface FormData {
  id: string
  data: string
  nome: string
  descricao: string
  quantidade: string
  unidadeMedida: UnidadeMedida
  formaPagamento: FormaPagamento | ""
  nomeComprador: string
  tipo: TipoTransacao | ""
  valorUnitario: string
  valorTotal: string
  valorCobradoShopee: string
}

// Calculadora auxiliar separada
interface CalculadoraData {
  valorGastoItem: string
  qtdProdutosFabricados: string
}

interface FormErrors {
  [key: string]: string
}

const initialFormData: FormData = {
  id: "",
  data: new Date().toISOString().split("T")[0],
  nome: "",
  descricao: "",
  quantidade: "1",
  unidadeMedida: "unidade",
  formaPagamento: "",
  nomeComprador: "",
  tipo: "",
  valorUnitario: "",
  valorTotal: "",
  valorCobradoShopee: "",
}

const initialCalculadoraData: CalculadoraData = {
  valorGastoItem: "",
  qtdProdutosFabricados: "",
}

export function TransactionForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: items } = useItems()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [calculadoraData, setCalculadoraData] = useState<CalculadoraData>(initialCalculadoraData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Nomes únicos de itens para a lista de sugestões
  const uniqueItemNames = useMemo(() => {
    if (!items) return []
    const names = items.map(item => item.nome)
    return Array.from(new Set(names)).sort()
  }, [items])

  // Cálculos da transação principal
  const transactionCalc = useMemo(() => {
    const valorTotal = parseFloat(formData.valorTotal) || 0
    const valorCobradoShopee = parseFloat(formData.valorCobradoShopee) || 0
    const quantidade = parseFloat(formData.quantidade) || 1
    const isEntrada = formData.tipo === "entrada"
    
    let taxaShopee = 0
    if (isEntrada) {
      if (valorCobradoShopee > 0) {
        taxaShopee = (valorCobradoShopee * 0.20) + (4 * quantidade)
      } else {
        taxaShopee = calculateTaxaShopee(valorTotal)
      }
    }

    const valorFinal = isEntrada ? valorTotal : -valorTotal

    return {
      valorTotal,
      taxaShopee,
      valorFinal,
      isEntrada,
      valorCobradoShopee,
    }
  }, [formData.valorTotal, formData.tipo, formData.valorCobradoShopee, formData.quantidade])

  // Calculadora auxiliar separada (não afeta a transação)
  const custoPorProduto = useMemo(() => {
    const valorGastoItem = parseFloat(calculadoraData.valorGastoItem) || 0
    const qtdProdutosFabricados = parseInt(calculadoraData.qtdProdutosFabricados) || 0
    return calculateCustoPorProduto(valorGastoItem, qtdProdutosFabricados)
  }, [calculadoraData.valorGastoItem, calculadoraData.qtdProdutosFabricados])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      
      const isEntrada = newData.tipo === "entrada"

      // Lógica de cálculo Valor Unitário vs Total vs Shopee
      if (field === "valorCobradoShopee") {
        const vShopee = parseFloat(value) || 0
        if (vShopee > 0) {
          const qtd = parseFloat(newData.quantidade) || 1
          const taxa = (vShopee * 0.20) + (4 * qtd)
          newData.valorTotal = (vShopee - taxa).toFixed(2)
          newData.valorUnitario = (parseFloat(newData.valorTotal) / qtd).toFixed(2)
          // Se preencheu valor Shopee e o tipo está vazio, assume entrada
          if (!newData.tipo) newData.tipo = "entrada"
        }
      } else if (field === "quantidade") {
        const qtd = parseFloat(value) || 1
        if (newData.valorCobradoShopee) {
          const vShopee = parseFloat(newData.valorCobradoShopee) || 0
          const taxa = (vShopee * 0.20) + (4 * qtd)
          newData.valorTotal = (vShopee - taxa).toFixed(2)
          newData.valorUnitario = (parseFloat(newData.valorTotal) / qtd).toFixed(2)
        } else {
          const vu = parseFloat(newData.valorUnitario) || 0
          if (vu > 0) {
            newData.valorTotal = (vu * qtd).toFixed(2)
          } else {
            const vt = parseFloat(newData.valorTotal) || 0
            if (vt > 0) {
              newData.valorUnitario = (vt / Math.max(qtd, 1)).toFixed(2)
            }
          }
        }
      } else if (field === "valorUnitario") {
        const vu = parseFloat(value) || 0
        const qtd = parseFloat(newData.quantidade) || 0
        newData.valorTotal = (vu * qtd).toFixed(2)
      } else if (field === "valorTotal") {
        const vt = parseFloat(value) || 0
        const qtd = parseFloat(newData.quantidade) || 1
        newData.valorUnitario = (vt / qtd).toFixed(2)
      }

      return newData
    })

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleCalculadoraChange = (field: keyof CalculadoraData, value: string) => {
    setCalculadoraData((prev) => ({ ...prev, [field]: value }))
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.data) newErrors.data = "Data é obrigatória"
    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório"
    if (!formData.quantidade || parseFloat(formData.quantidade) <= 0) {
      newErrors.quantidade = "Quantidade deve ser maior que 0"
    }
    // Forma de pagamento não é mais obrigatória
    if (!formData.tipo) newErrors.tipo = "Selecione o tipo"
    if (!formData.valorTotal || parseFloat(formData.valorTotal) <= 0) {
      newErrors.valorTotal = "Valor deve ser maior que zero"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    const valorTotal = parseFloat(formData.valorTotal) || 0
    const isEntrada = formData.tipo === "entrada"
    const taxaShopee = transactionCalc.taxaShopee

    const item = {
      id: formData.id || Math.random().toString(36).substring(2, 9).toUpperCase(),
      data: formData.data,
      nome: formData.nome,
      descricao: formData.descricao,
      quantidade: parseFloat(formData.quantidade) || 1,
      unidadeMedida: formData.unidadeMedida,
      formaPagamento: formData.formaPagamento || undefined,
      nomeComprador: formData.nomeComprador,
      tipo: formData.tipo as TipoTransacao,
      valorUnitario: parseFloat(formData.valorUnitario) || 0,
      valorTotal: isEntrada ? parseFloat(formData.valorTotal) : -Math.abs(parseFloat(formData.valorTotal)),
      valorCobradoShopee: parseFloat(formData.valorCobradoShopee) || 0,
    }

    const success = await createItem(item)

    setIsSubmitting(false)

    if (success) {
      toast({
        title: "Sucesso!",
        description: "Transação adicionada com sucesso.",
      })
      mutate("items")
      router.push("/")
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a transação. Verifique a configuração da API.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seletor de Tipo - Destaque no topo */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Transação</CardTitle>
          <CardDescription>Selecione se é uma entrada (venda) ou saída (despesa)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => handleChange("tipo", "entrada")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${formData.tipo === "entrada"
                ? "border-success bg-success/10 text-success"
                : "border-border hover:border-success/50"
                }`}
            >
              <ArrowDownCircle className="h-8 w-8" />
              <span className="font-semibold text-sm">Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange("tipo", "saida")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${formData.tipo === "saida"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border hover:border-destructive/50"
                }`}
            >
              <ArrowUpCircle className="h-8 w-8" />
              <span className="font-semibold text-sm">Saída</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange("tipo", "ads")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${formData.tipo === "ads"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50"
                }`}
            >
              <Target className="h-8 w-8" />
              <span className="font-semibold text-sm">Ads</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange("tipo", "saque")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${formData.tipo === "saque"
                ? "border-orange-500 bg-orange-500/10 text-orange-600"
                : "border-border hover:border-orange-500/50"
                }`}
            >
              <Wallet className="h-8 w-8" />
              <span className="font-semibold text-sm">Saque</span>
            </button>
          </div>
          {errors.tipo && <p className="mt-2 text-center text-sm text-destructive">{errors.tipo}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Transação</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>ID da Transação (Opcional)</FieldLabel>
              <Input
                placeholder=""
                value={formData.id}
                onChange={(e) => handleChange("id", e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Data</FieldLabel>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => handleChange("data", e.target.value)}
              />
              {errors.data && <p className="text-sm text-destructive">{errors.data}</p>}
            </Field>

            <Field>
              <FieldLabel>Nome do Item</FieldLabel>
              <Input
                placeholder=""
                value={formData.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                list="item-names"
              />
              <datalist id="item-names">
                {uniqueItemNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel>Descrição</FieldLabel>
              <Textarea
                placeholder="Descrição detalhada do produto ou serviço"
                value={formData.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel>Quantidade</FieldLabel>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => handleChange("quantidade", e.target.value)}
                />
                {errors.quantidade && <p className="text-sm text-destructive">{errors.quantidade}</p>}
              </Field>

              <Field>
                <FieldLabel>Unidade</FieldLabel>
                <Select
                  value={formData.unidadeMedida}
                  onValueChange={(v) => handleChange("unidadeMedida", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">Unidade</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="ml">Ml</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="pacote">Pacote</SelectItem>
                    <SelectItem value="conjunto">Conjunto</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel>Forma de Pagamento (Opcional)</FieldLabel>
              <Select
                value={formData.formaPagamento}
                onValueChange={(v) => handleChange("formaPagamento", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="carteira_shopee">Carteira Shopee</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Nome do Comprador</FieldLabel>
              <Input
                placeholder={formData.tipo === "saida" ? "Nome do fornecedor" : "Nome do cliente"}
                value={formData.nomeComprador}
                onChange={(e) => handleChange("nomeComprador", e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Valor Unitário (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valorUnitario}
                onChange={(e) => handleChange("valorUnitario", e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Valor Shopee (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valorCobradoShopee}
                onChange={(e) => handleChange("valorCobradoShopee", e.target.value)}
              />
              {parseFloat(formData.valorCobradoShopee) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa calculada: {formatCurrency((parseFloat(formData.valorCobradoShopee) * 0.20) + (4 * (parseFloat(formData.quantidade) || 1)))} (20% + R$ 4,00 por item)
                </p>
              )}
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel>Valor Total (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valorTotal}
                onChange={(e) => handleChange("valorTotal", e.target.value)}
                className="text-lg font-semibold"
              />
              {errors.valorTotal && <p className="text-sm text-destructive">{errors.valorTotal}</p>}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Calculadora auxiliar - NÃO afeta os cálculos da transação */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Calculadora Auxiliar</CardTitle>
          </div>
          <CardDescription>
            Ferramenta para calcular custo por produto. Este valor NÃO é incluído na transação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Valor gasto no insumo (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={calculadoraData.valorGastoItem}
                onChange={(e) => handleCalculadoraChange("valorGastoItem", e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Qtd de produtos fabricados</FieldLabel>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={calculadoraData.qtdProdutosFabricados}
                onChange={(e) => handleCalculadoraChange("qtdProdutosFabricados", e.target.value)}
              />
            </Field>
          </FieldGroup>

          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Custo por produto:</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(custoPorProduto)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use este valor como referência para precificação
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-24 left-0 right-0 flex justify-center px-4 z-50 pointer-events-none">
        <Button 
          type="submit" 
          className="gap-2 shadow-2xl pointer-events-auto h-13 px-8 text-base font-normal" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-4 w-4" />
              Salvando...
            </>
          ) : (
            "Salvar transação"
          )}
        </Button>
      </div>
      </form>
      )
      }
