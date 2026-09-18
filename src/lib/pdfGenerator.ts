import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Worker, EpiAssignment } from '../types';

export async function generateEpiRecordPdf(worker: Worker, epiAssignments: EpiAssignment[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Fonts and Setup
  doc.setFont('helvetica');
  
  // Header Box
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 20);
  
  // Logo
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(230, 81, 0); // Orange
  doc.text('EngenharQ', 15, 23);

  // Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text('Ficha de Registro de Equipamentos de', 75, 18);
  doc.text('Proteção Individual – EPI\'s', 85, 25);
  
  // Worker Info Box
  doc.rect(10, 32, 190, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${worker.full_name || ''}`, 12, 38);
  doc.text(`Nº MATRÍCULA: ${worker.registration_number || ''}`, 120, 38);
  
  const formattedAdmission = worker.admission_date ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : '___/___/______';
  doc.text(`Função: ${worker.current_role || worker.initial_role || ''}`, 12, 44);
  doc.text(`Data de Admissão: ${formattedAdmission}`, 120, 44);

  // Declaration Section
  doc.rect(10, 49, 190, 75);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARAÇÃO DE RECEBIMENTO', 75, 54);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const declText1 = "Declaro para todos os fins de direito que recebi gratuitamente, após orientação de uso e aplicação os Equipamentos de Proteção Individual a utilizar durante a realização de minhas atividades.";
  doc.text(doc.splitTextToSize(declText1, 90), 12, 59);

  const declText2 = "Declaro, ainda, ter ciência de que:\na) Os EPIs deverão ser utilizados, unicamente para a finalidade a qual se destinam;\nb) Qualquer alteração que os tornem parcial ou totalmente inadequados para uso deverá ser por mim comunicada.\nc) A Falta do uso, por mim, dos EPIs fornecidos pela ENGENHARQ LTDA constitui ato faltoso sujeito às sanções disciplinares previstas na legislação e no Regulamento interno, aplicáveis ao assunto, inclusive à demissão por justa causa.\nd) Responsabilizar-me-ei, integralmente, pela guarda e conservação dos EPIs que me forem entregues. Em caso de perda ou extravio ou inutilização proposital comprometo-me a ressarcir a empresa conforme previsto no parágrafo 1º do artigo 462 da CLT, inclusive no que couber a título de indenização por rescisão de contrato de trabalho, a importância correspondente ao valor do material.";
  doc.text(doc.splitTextToSize(declText2, 95), 12, 69);
  
  const baseLegalText = "Base Legal:\nNR 1 (aprovada pela portaria MTE 3214, de 08/06/78):\na) Cumprir disposições legais e regulamentares sobre segurança e medicina do trabalho inclusive de ordens de Serviço expedidas pelo empregador;\nb) Submeter-se aos exames médicos previstos nas NR;\nc) Colaborar com a empresa na aplicação das NR; e\nd) Usar o equipamento de proteção individual fornecido pelo empregador.\n\nNR 6 (aprovada pela portaria MTB nº 3214, de 08/06/78).\nItem 6.6.1 - Cabe ao trabalhador, quanto ao EPI:\na) Usar o fornecido pela organização;\nb) Utilizar apenas para a finalidade a que se destina;\nc) Responsabilizar-se pela limpeza, guarda e conservação;\nd) Comunicar à organização quando extraviado, danificado ou qualquer alteração que o torne impróprio para o uso; e\ne) Cumprir as determinações do empregador sobre o uso adequado.\n\nFinalmente, declaro que estou de acordo com todos os termos presentes, razão pela qual assino, nesta data, por livre e espontânea vontade.";
  doc.text(doc.splitTextToSize(baseLegalText, 85), 110, 59);

  doc.setFontSize(8);
  doc.text('_____/_____/_____', 80, 120);
  doc.text('Data', 88, 123);
  doc.text('_________________________________', 120, 120);
  doc.text('Assinatura do Empregado', 132, 123);

  // Table Headers
  const startY = 126;
  doc.rect(10, startY, 190, 14);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RECEBIMENTO DO EPI', 45, startY + 5);
  doc.text('DEVOLUÇÃO DO EPI', 145, startY + 5);
  
  doc.line(10, startY + 7, 200, startY + 7); // horizontal line for sub-headers
  doc.line(125, startY, 125, startY + 14); // vertical middle split

  // Sub headers
  doc.setFontSize(7);
  doc.text('QT.', 12, startY + 11);
  doc.text('UNIFORME/EPI', 25, startY + 11);
  doc.text('C.A.', 68, startY + 11);
  doc.text('DATA', 83, startY + 11);
  
  doc.text('ASSINATURA DO', 101, startY + 10);
  doc.text('EMPREGADO', 103, startY + 13);
  
  doc.text('DATA', 130, startY + 11);
  
  doc.text('ASSINATURA DO', 147, startY + 10);
  doc.text('EMPREGADO', 149, startY + 13);
  
  doc.text('ASSINATURA DO', 174, startY + 10);
  doc.text('RECEBEDOR', 176, startY + 13);
  
  // Vertical lines for columns
  const cols = [18, 66, 81, 99, 125, 145, 172];
  cols.forEach(x => {
    doc.line(x, startY + 7, x, startY + 14);
  });

  // Table rows
  let currentY = startY + 14;
  const rowHeight = 7;
  const maxRows = 22;
  
  doc.setFont('helvetica', 'normal');
  
  for (let i = 0; i < maxRows; i++) {
    doc.rect(10, currentY, 190, rowHeight);
    cols.forEach(x => {
      doc.line(x, currentY, x, currentY + rowHeight);
    });
    
    if (epiAssignments && epiAssignments[i]) {
      const assignment = epiAssignments[i];
      const catalog = assignment.catalog;
      
      doc.text('1', 13, currentY + 5);
      
      if (catalog?.name) {
        const prefix = catalog.category?.toLowerCase().includes('uniforme') ? '[UNIF]' : '[EPI]';
        const itemName = `${prefix} ${catalog.name} (Cód: ${assignment.catalog?.code || '-'})`;
        let text = itemName;
        if (text.length > 32) text = text.substring(0, 30) + '...';
        doc.text(text, 19, currentY + 4.5);
      }
      
      if (catalog?.ca_number) {
        doc.text(catalog.ca_number, 67, currentY + 4.5);
      }
      
      if (assignment.assigned_at) {
        doc.text(format(new Date(assignment.assigned_at), 'dd/MM/yy'), 82, currentY + 4.5);
      }
      
      if (assignment.digital_signature_url) {
        try {
          doc.addImage(assignment.digital_signature_url, 'PNG', 101, currentY + 0.5, 22, 6);
        } catch (e) {
          doc.setFont('Courier', 'italic');
          doc.setFontSize(6);
          doc.text('Assinado', 105, currentY + 4.5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }
      }

      if (assignment.returned_at) {
        doc.text(format(new Date(assignment.returned_at), 'dd/MM/yy'), 127, currentY + 4.5);
      }
    }
    
    currentY += rowHeight;
  }

  doc.save(`Ficha_EPI_${worker.registration_number || worker.id}.pdf`);
}

export const generateEpiReceiptPDF = async (
  worker: any, 
  epis: any[], 
  signatureDataUrl: string
): Promise<string> => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(229, 46, 45); 
  doc.text('EngenharQ OS', 20, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Ficha de Entrega de Equipamento de Proteção Individual (EPI)', 20, 30);
  
  doc.setFontSize(11);
  doc.text(`Colaborador: ${worker.full_name}`, 20, 45);
  doc.text(`CPF: ${worker.cpf}`, 20, 52);
  doc.text(`Matrícula: ${worker.registration_number}`, 20, 59);
  doc.text(`Obra Alocada: ${worker.site?.name || 'Não alocado'}`, 20, 66);
  
  doc.text('Equipamentos Entregues:', 20, 80);
  
  let y = 87;
  epis.forEach((item, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${idx + 1}. [EPI/UNIF] ${item.category} (CA: ${item.ca_number || '-'}) - Cód: ${item.tracking_code}`, 20, y);
    y += 7;
  });
  
  const today = new Date();
  doc.text(`Data de Entrega: ${today.toLocaleDateString()}`, 20, y + 10);
  
  const termText = `Declaro ter recebido os EPIs acima descritos, comprometendo-me a usá-los exclusivamente para a finalidade a que se destinam e zelar pela sua conservação, sob pena de responder por danos causados aos equipamentos, além de me submeter às normas de segurança da empresa.`;
  const splitTerm = doc.splitTextToSize(termText, 170);
  doc.text(splitTerm, 20, y + 25);
  
  doc.addImage(signatureDataUrl, 'PNG', 60, y + 55, 90, 30);
  doc.line(60, y + 85, 150, y + 85);
  doc.text('Assinatura do Colaborador', 80, y + 90);
  
  return doc.output('datauristring');
};
