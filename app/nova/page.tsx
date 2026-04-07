import { AppShell } from "@/components/app-shell"
import { TransactionForm } from "@/components/transaction-form"

export default function NovaTransacaoPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Nova Transação</h1>
          <p className="text-muted-foreground">Adicione uma nova entrada ou saída</p>
        </div>
        <TransactionForm />
      </div>
    </AppShell>
  )
}
