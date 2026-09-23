import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Worker, EpiAssignment } from '../types';
import { supabase } from './supabase';

export async function generateEpiRecordPdf(worker: Worker, epiAssignments: EpiAssignment[]) {
  // Fetch system settings
  const { data } = await supabase
    .from('system_settings')
    .select('*')
    .limit(1)
    .single();
    
  const settings = data as any;

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
  doc.line(50, 10, 50, 30);
  
  // Logo
  if (settings?.logo_url) {
    try {
      doc.addImage(settings.logo_url, 'PNG', 12, 12, 36, 16);
    } catch (e) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(230, 81, 0); // Orange
      doc.text(settings?.company_name || 'EngenharQ', 30, 21, { align: 'center' });
    }
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 81, 0); // Orange
    doc.text(settings?.company_name || 'EngenharQ', 30, 21, { align: 'center' });
  }

  // Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ficha de Registro de Equipamentos de', 125, 18, { align: 'center' });
  doc.text('Proteção Individual – EPI\'s', 125, 25, { align: 'center' });
  
  // Worker Info Box
  doc.rect(10, 32, 190, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Nome:', 12, 38);
  doc.line(24, 38.5, 110, 38.5);
  doc.text(worker.full_name || '', 25, 37.5);
  
  doc.text('Nº MATRÍCULA:', 115, 38);
  doc.line(143, 38.5, 195, 38.5);
  doc.text(worker.registration_number || '', 144, 37.5);
  
  doc.text('Função:', 12, 44);
  doc.line(26, 44.5, 110, 44.5);
  doc.text(worker.current_role || worker.initial_role || '', 27, 43.5);

  const formattedAdmission = worker.admission_date ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : '';
  doc.text('Data de Admissão:', 115, 44);
  doc.line(146, 44.5, 195, 44.5);
  doc.text(formattedAdmission, 147, 43.5);

  // Declaration Section
  doc.rect(10, 48, 190, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DECLARAÇÃO DE RECEBIMENTO', 105, 53, { align: 'center' });
  doc.line(10, 55, 200, 55); // Horizontal line
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const declText1 = settings?.epi_declaration_text || "Declaro para todos os fins de direito que recebi gratuitamente, após\norientação de uso e aplicação os Equipamentos de Proteção Individual a\nutilizar durante a realização de minhas atividades.";
  doc.text(doc.splitTextToSize(declText1, 85), 12, 59);

  const declText2 = settings?.epi_terms_text || "Declaro, ainda, ter ciência de que:\na) Os EPIs deverão ser utilizados, unicamente para a finalidade a qual se\n   destinam;\nb) Qualquer alteração que os tornem parcial ou totalmente\n   inadequados para uso deverá ser por mim comunicada.\nc) A Falta do uso, por mim, dos EPIs fornecidos pela ENGENHARQ LTDA\n   constitui ato faltoso sujeito às sanções disciplinares previstas na\n   legislação e no Regulamento interno, aplicáveis ao assunto, inclusive\n   à demissão por justa causa.\nd) Responsabilizar-me-ei, integralmente, pela guarda e conservação dos\n   EPIs que me forem entregues. Em caso de perda ou extravio ou\n   inutilização proposital comprometo-me a ressarcir a empresa\n   conforme previsto no parágrafo 1º do artigo 462 da CLT, inclusive no\n   que couber a título de indenização por rescisão de contrato de\n   trabalho, a importância correspondente ao valor do material.";
  doc.text(doc.splitTextToSize(declText2, 85), 12, 70);
  
  const baseLegalText = settings?.epi_legal_base_text || "Base Legal:\n\nNR 1 (aprovada pela portaria MTE 3214, de 08/06/78):\na) Cumprir disposições legais e regulamentares sobre segurança e medicina do trabalho\n   inclusive de ordens de Serviço expedidas pelo empregador;\nb) Submeter-se aos exames médicos previstos nas NR;\nc) Colaborar com a empresa na aplicação das NR; e\nd) Usar o equipamento de proteção individual fornecido pelo empregador.\n\nNR 6 (aprovada pela portaria MTB nº 3214, de 08/06/78).\nItem 6.6.1 – Cabe ao trabalhador, quanto ao EPI:\na) Usar o fornecido pela organização;\nb) Utilizar apenas para a finalidade a que se destina;\nc) Responsabilizar-se pela limpeza, guarda e conservação;\nd) Comunicar à organização quando extraviado, danificado ou qualquer alteração que o\n   torne impróprio para o uso; e\ne) Cumprir as determinações do empregador sobre o uso adequado.\n\nFinalmente, declaro que estou de acordo com todos os termos presentes, razão pela\nqual assino, nesta data, por livre e espontânea vontade.";
  doc.text(doc.splitTextToSize(baseLegalText, 90), 105, 59);

  doc.setFontSize(8);
  doc.line(70, 128, 90, 128);
  doc.text('Data', 80, 131, { align: 'center' });
  doc.line(100, 128, 160, 128);
  doc.text('Assinatura do Empregado', 130, 131, { align: 'center' });

  // Table Headers
  const startY = 137;
  doc.rect(10, startY, 190, 14);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RECEBIMENTO DO EPI', 72.5, startY + 5, { align: 'center' });
  doc.text('DEVOLUÇÃO DO EPI', 167.5, startY + 5, { align: 'center' });
  
  doc.line(10, startY + 7, 200, startY + 7); // horizontal line for sub-headers
  doc.line(135, startY, 135, startY + 14); // vertical middle split

  // Sub headers
  const cols = [18, 70, 86, 102, 135, 151, 175];
  cols.forEach(x => {
    doc.line(x, startY + 7, x, startY + 14);
  });

  doc.setFontSize(7);
  doc.text('QT.', 14, startY + 11.5, { align: 'center' });
  doc.text('UNIFORME/EPI', 44, startY + 11.5, { align: 'center' });
  doc.text('C.A.', 78, startY + 11.5, { align: 'center' });
  doc.text('DATA', 94, startY + 11.5, { align: 'center' });
  doc.text('ASSINATURA DO\nEMPREGADO', 118.5, startY + 10, { align: 'center' });
  
  doc.text('DATA', 143, startY + 11.5, { align: 'center' });
  doc.text('ASSINATURA DO\nEMPREGADO', 163, startY + 10, { align: 'center' });
  doc.text('ASSINATURA DO\nRECEBEDOR', 187.5, startY + 10, { align: 'center' });
  
  // Table rows
  let currentY = startY + 14;
  const rowHeight = 7;
  const maxRows = Math.floor((287 - currentY) / rowHeight); // fill rest of page, 287 is max printable Y
  
  doc.setFont('helvetica', 'normal');
  
  // Ensure we iterate enough to draw empty lines if needed
  const totalRows = Math.max(maxRows, epiAssignments?.length || 0);

  for (let i = 0; i < totalRows; i++) {
    if (currentY + rowHeight > 287) {
      doc.addPage();
      currentY = 20;
      doc.rect(10, currentY, 190, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('RECEBIMENTO DO EPI', 72.5, currentY + 5, { align: 'center' });
      doc.text('DEVOLUÇÃO DO EPI', 167.5, currentY + 5, { align: 'center' });
      doc.line(10, currentY + 7, 200, currentY + 7);
      doc.line(135, currentY, 135, currentY + 14);
      cols.forEach(x => doc.line(x, currentY + 7, x, currentY + 14));
      doc.setFontSize(7);
      doc.text('QT.', 14, currentY + 11.5, { align: 'center' });
      doc.text('UNIFORME/EPI', 44, currentY + 11.5, { align: 'center' });
      doc.text('C.A.', 78, currentY + 11.5, { align: 'center' });
      doc.text('DATA', 94, currentY + 11.5, { align: 'center' });
      doc.text('ASSINATURA DO\nEMPREGADO', 118.5, currentY + 10, { align: 'center' });
      doc.text('DATA', 143, currentY + 11.5, { align: 'center' });
      doc.text('ASSINATURA DO\nEMPREGADO', 163, currentY + 10, { align: 'center' });
      doc.text('ASSINATURA DO\nRECEBEDOR', 187.5, currentY + 10, { align: 'center' });
      currentY += 14;
      doc.setFont('helvetica', 'normal');
    }

    doc.rect(10, currentY, 190, rowHeight);
    cols.forEach(x => {
      doc.line(x, currentY, x, currentY + rowHeight);
    });
    
    if (epiAssignments && epiAssignments[i]) {
      const assignment = epiAssignments[i];
      const catalog = assignment.epi?.catalog;
      
      doc.text('1', 14, currentY + 4.5, { align: 'center' });
      
      if (catalog?.name) {
        const prefix = catalog.category?.toLowerCase().includes('uniforme') ? '[UNIF]' : '[EPI]';
        const itemName = `${prefix} ${catalog.name} (Cód: ${assignment.epi?.tracking_code || '-'})`;
        let text = itemName;
        if (text.length > 28) text = text.substring(0, 26) + '...';
        doc.text(text, 19, currentY + 4.5);
      }
      
      if (catalog?.ca_number) {
        doc.text(catalog.ca_number, 78, currentY + 4.5, { align: 'center' });
      }
      
      if (assignment.assigned_at) {
        doc.text(format(new Date(assignment.assigned_at), 'dd/MM/yy'), 94, currentY + 4.5, { align: 'center' });
      }
      
      if (assignment.digital_signature_url) {
        try {
          doc.addImage(assignment.digital_signature_url, 'PNG', 105, currentY + 0.5, 25, 6);
        } catch (e) {
          doc.setFont('Courier', 'italic');
          doc.setFontSize(6);
          doc.text('Assinado', 118.5, currentY + 4.5, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }
      }

      if (assignment.returned_at) {
        doc.text(format(new Date(assignment.returned_at), 'dd/MM/yy'), 143, currentY + 4.5, { align: 'center' });
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
