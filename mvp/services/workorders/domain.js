function validateEstimateItems(items){
  if(!Array.isArray(items)||items.length<1||items.length>30)throw new Error('Informe de 1 a 30 itens.');
  for(const i of items){if(!['service','part'].includes(i.kind)||!String(i.description||'').trim()||String(i.description).length>240||!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0||Number(i.quantity)>10000||!Number.isFinite(Number(i.unitPrice))||Number(i.unitPrice)<0||Number(i.unitPrice)>10000000)throw new Error('Item de orçamento inválido.');}
  return items.map(i=>({kind:i.kind,description:String(i.description).trim(),quantity:Number(i.quantity),unitPrice:Number(i.unitPrice)}));
}
function estimateTotal(items){return items.reduce((sum,i)=>sum+i.quantity*i.unitPrice,0);}
function canExecute(orderStatus,approvedCurrentEstimate){return ['approved','in_progress'].includes(orderStatus)&&approvedCurrentEstimate===true;}
function canCloseRefused(latestEstimateStatus){return latestEstimateStatus==='refused';}
module.exports={validateEstimateItems,estimateTotal,canExecute,canCloseRefused};
