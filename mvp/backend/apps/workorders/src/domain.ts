// Regras puras de ordens e orçamentos (testadas sem banco).

export interface EstimateItem { kind: 'service' | 'part'; description: string; quantity: number; unitPrice: number }

/** Itens digitados manualmente (não existe estoque): serviço ou peça, com quantidade e preço válidos. */
export function validateEstimateItems(items: unknown): EstimateItem[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) throw new Error('Informe de 1 a 30 itens.');
  for (const raw of items) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const description = String(item.description ?? '').trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (
      !['service', 'part'].includes(String(item.kind))
      || !description || description.length > 240
      || !Number.isFinite(quantity) || quantity <= 0 || quantity > 10000
      || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10_000_000
    ) throw new Error('Item de orçamento inválido.');
  }
  return items.map((raw) => {
    const item = raw as Record<string, unknown>;
    return { kind: item.kind as EstimateItem['kind'], description: String(item.description).trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) };
  });
}

/** Total calculado no servidor; o total enviado pelo navegador nunca é usado. */
export function estimateTotal(items: EstimateItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

/** Execução só com a versão vigente aprovada. */
export function canExecute(orderStatus: string, approvedCurrentEstimate: boolean): boolean {
  return ['approved', 'in_progress'].includes(orderStatus) && approvedCurrentEstimate === true;
}

/** Encerrar por recusa só quando a versão mais recente foi recusada pelo cliente. */
export function canCloseRefused(latestEstimateStatus: string): boolean {
  return latestEstimateStatus === 'refused';
}

/** Pagamento não pode passar do saldo do orçamento aprovado. */
export function paymentFits(amount: number, alreadyPaid: number, approvedTotal: number): boolean {
  return amount > 0 && amount + alreadyPaid <= approvedTotal + 0.005;
}

/** A ordem só fecha como paga quando o total aprovado está quitado. */
export function isSettled(approvedTotal: number, paid: number): boolean {
  return approvedTotal > 0 && paid + 0.005 >= approvedTotal;
}
