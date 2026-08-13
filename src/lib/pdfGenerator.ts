import { jsPDF } from 'jspdf';

export const generateEpiReceiptPDF = async (
  worker: any,
  epis: any[],
  signatureDataUrl: string
): Promise<string> => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(229, 46, 45); // Red primary
  doc.text('EngenharQ OS', 20, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Ficha de Entrega de Equipamento de Proteção Individual (EPI)', 20, 30);
  
  // Worker Info
  doc.setFontSize(11);
  doc.text(`Colaborador: ${worker.full_name}`, 20, 45);
  doc.text(`CPF: ${worker.cpf}`, 20, 52);
  doc.text(`Matrícula: ${worker.registration_number}`, 20, 59);
  doc.text(`Obra Alocada: ${worker.site?.name || 'Não alocado'}`, 20, 66);
  
  // EPI Info
  doc.text('Equipamentos Entregues:', 20, 80);
  
  let y = 87;
  epis.forEach((item, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${idx + 1}. ${item.category} (CA: ${item.ca_number}) - Cód: ${item.tracking_code}`, 20, y);
    y += 7;
  });
  
  const today = new Date();
  doc.text(`Data de Entrega: ${today.toLocaleDateString()}`, 20, y + 10);
  
  // Legal term
  const termText = `Declaro ter recebido os EPIs acima descritos, comprometendo-me a usá-los exclusivamente para a finalidade a que se destinam e zelar pela sua conservação, sob pena de responder por danos causados aos equipamentos, além de me submeter às normas de segurança da empresa.`;
  const splitTerm = doc.splitTextToSize(termText, 170);
  doc.text(splitTerm, 20, y + 25);
  
  // Signature
  doc.addImage(signatureDataUrl, 'PNG', 60, y + 55, 90, 30);
  doc.line(60, y + 85, 150, y + 85);
  doc.text('Assinatura do Colaborador', 80, y + 90);
  
  // Return base64 string
  return doc.output('datauristring');
};
