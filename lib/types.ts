export type UnidadeMedida = "unidade" | "kg" | "ml" | "caixa" | "pacote" | "conjunto" | "outro"
export type FormaPagamento = "pix" | "credito" | "debito" | "boleto" | "dinheiro" | "carteira_shopee"
export type TipoTransacao = "entrada" | "saida" | "ads" | "saque"

export interface Item {
  id: string
  data: string
  nome: string
  descricao: string
  quantidade: number
  unidadeMedida?: UnidadeMedida
  formaPagamento?: FormaPagamento
  nomeComprador: string
  tipo: TipoTransacao
  valorUnitario?: number
  valorTotal: number
  valorCobradoShopee?: number
}
