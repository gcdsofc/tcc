/**
 * Formato canônico de telefone do GarageOps (regra de dados aprovada pelo grupo).
 *
 * O telefone identifica a pessoa entre os serviços (cadastro do cliente, convite, conta, equipe),
 * então todo telefone é normalizado ANTES de gravar e ANTES de comparar:
 *   1. ficam só os dígitos (remove +, espaços, parênteses, hífens etc.);
 *   2. zeros à esquerda são descartados (prefixo de longa distância "0" e internacional "00");
 *   3. com 10 ou 11 dígitos (DDD + número fixo/celular, sem país) acrescenta-se o código do Brasil, 55;
 *   4. qualquer outro tamanho fica como está (já tem país, ou é número estrangeiro).
 *
 * Exemplos: "+55 (11) 99100-0301", "(11) 99100-0301", "011 99100-0301" e "0055 11 991000301"
 * viram todos "5511991000301". Texto sem dígitos vira "" (tratado como telefone não informado).
 *
 * `phoneSql` é a mesma regra em SQL, usada só para migrar telefones gravados antes desta regra;
 * se uma das duas versões mudar, a outra precisa mudar junto.
 */
export function normalizePhone(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 20);
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

/** A mesma regra de `normalizePhone` como expressão SQL sobre a coluna/expressão informada. */
export function phoneSql(column: string): string {
  const digits = `left(ltrim(regexp_replace(coalesce(${column},''),'\\D','','g'),'0'),20)`;
  return `(case when length(${digits}) in (10,11) then '55'||${digits} else ${digits} end)`;
}
