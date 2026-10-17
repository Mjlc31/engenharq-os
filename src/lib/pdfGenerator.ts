import { PDFDocument, rgb } from 'pdf-lib';
import { format } from 'date-fns';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import { Worker, EpiAssignment } from '../types';

export const generateEpiReceiptPDF = async (
  assignment: any,
  worker: any,
  epi: any,
  company: any,
  deliveryPhotoUrl?: string
) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Recibo de EPI', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Funcionário: ${worker.name}`, 20, 40);
  doc.text(`CPF: ${worker.cpf || 'Não informado'}`, 20, 50);
  doc.text(`EPI: ${epi.name}`, 20, 60);
  doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 70);
  return doc.output('blob');
};

export const generateEpiRecordPdf = async (
  worker: Worker | any, 
  epiAssignments: EpiAssignment[] | any[],
  mode: 'download' | 'preview' = 'download'
): Promise<Blob | void> => {
  try {
    const templateResponse = await fetch('/ficha_epi_template.pdf');
    const existingPdfBytes = await templateResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const HEADER = {
      nameX: 72, nameY: 722,
      matX: 458, matY: 722,
      funcX: 75, funcY: 708,
      admX: 430, admY: 708
    };

    const COL = {
      qt: 45,
      epiName: 70,
      ca: 200,
      dataEnt: 233,
      assEnt: 332,
      dataDev: 394,
      assDev: 469,
      assRec: 529
    };

    const TABLE = {
      firstRowY: 377, // Lowered baseline from 386 to perfectly vertically center the text
      rowHeight: 22,
      maxRows: 17
    };

    let currentPage = pdfDoc.getPages()[0];
    let currentRow = 0;
    
    // Sort ascending by assigned_at so oldest is at top
    const assignments = [...epiAssignments].sort((a, b) => 
      new Date(a.assigned_at || 0).getTime() - new Date(b.assigned_at || 0).getTime()
    );

    const workerName = worker.name || worker.full_name || '';
    const workerMat = worker.id || worker.mat || '';
    const workerRole = worker.role || worker.department || '';

    currentPage.drawText(workerName.toUpperCase(), { x: HEADER.nameX, y: HEADER.nameY, size: 10 });
    currentPage.drawText(workerMat.slice(0, 8).toUpperCase(), { x: HEADER.matX, y: HEADER.matY, size: 10 });
    
    if (workerRole) {
      currentPage.drawText(workerRole.toUpperCase(), { x: HEADER.funcX, y: HEADER.funcY, size: 10 });
    }
    
    if (worker.admission_date) {
      currentPage.drawRectangle({ x: 420, y: 704, width: 70, height: 12, color: rgb(1, 1, 1) });
      currentPage.drawText(format(new Date(worker.admission_date), 'dd/MM/yyyy'), { x: HEADER.admX, y: HEADER.admY, size: 10 });
    }

    const impressaoStamp = `Impresso em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      if (currentRow >= TABLE.maxRows) {
        // Stamp the current page before moving to next
        currentPage.drawText(impressaoStamp, { x: 430, y: 15, size: 8 });
        
        currentRow = 0;
        currentPage = pdfDoc.addPage();
      }

      const currentY = TABLE.firstRowY - (currentRow * TABLE.rowHeight);
      
      const catalog = assignment.catalog || assignment.epi?.catalog || {};
      const epiName = catalog.name || 'EPI Desconhecido';
      const caNumber = catalog.ca_number || assignment.epi?.ca_number || '';
      const isUnif = catalog.category?.toLowerCase().includes('uniforme');
      
      currentPage.drawText('1', { x: COL.qt, y: currentY, size: 8 });
      let textName = `${isUnif ? '[UNIF]' : '[EPI]'} ${epiName}`;
      if (textName.length > 28) textName = textName.substring(0, 26) + '...';
      currentPage.drawText(textName, { x: COL.epiName, y: currentY, size: 8 });
      
      if (caNumber) {
        currentPage.drawText(caNumber.toString(), { x: COL.ca, y: currentY, size: 8 });
      }

      if (assignment.assigned_at) {
        currentPage.drawRectangle({ x: 222, y: currentY - 5, width: 58, height: 15, color: rgb(1, 1, 1) });
        currentPage.drawText(format(new Date(assignment.assigned_at), 'dd/MM/yy'), { x: COL.dataEnt, y: currentY, size: 8 });
      }

      if (assignment.digital_signature_url) {
        try {
          // It's a public URL, fetch it directly
          const response = await fetch(assignment.digital_signature_url);
          const imageBytes = await response.arrayBuffer();
          let image;
          
          // detect type by extension or content type
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('png') || assignment.digital_signature_url.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          const imgDims = image.scaleToFit(95, 18);
          // currentY is baseline (377). Cell middle is baseline + 4.
          const cellCenterY = currentY + 4;
          const cellCenterX = 281 + (103 / 2);
          currentPage.drawImage(image, {
            x: cellCenterX - (imgDims.width / 2),
            y: cellCenterY - (imgDims.height / 2),
            width: imgDims.width,
            height: imgDims.height,
          });
        } catch (e) {
          console.error("Error loading delivery photo/signature:", e);
        }
      }

      if (assignment.returned_at) {
        currentPage.drawRectangle({ x: 385, y: currentY - 5, width: 54, height: 15, color: rgb(1, 1, 1) });
        currentPage.drawText(format(new Date(assignment.returned_at), 'dd/MM/yy'), { x: COL.dataDev, y: currentY, size: 8 });
      }
      
      if (assignment.return_photo_url) {
        try {
          const response = await fetch(assignment.return_photo_url);
          const imageBytes = await response.arrayBuffer();
          let image;
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('png') || assignment.return_photo_url.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }
          const imgDims = image.scaleToFit(50, 18);
          // currentY is baseline (377). Cell middle is baseline + 4.
          const cellCenterY = currentY + 4;
          const cellCenterXDev = 440 + (58 / 2);
          currentPage.drawImage(image, {
            x: cellCenterXDev - (imgDims.width / 2),
            y: cellCenterY - (imgDims.height / 2),
            width: imgDims.width,
            height: imgDims.height,
          });
        } catch (e) {
          console.error("Error loading return photo:", e);
        }
      }

      currentRow++;
    }

    // Stamp the final page
    currentPage.drawText(impressaoStamp, { x: 430, y: 15, size: 8 });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    if (mode === 'preview') {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ficha_EPI_${workerMat.slice(0,8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    return blob;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateSelectiveLostChargePdf = async (
  worker: any,
  assignments: any[],
  siteName?: string,
  mode: 'download' | 'preview' = 'download'
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Brand Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, 12, contentWidth, 22, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ENGENHARQ OS • GESTÃO DE SEGURANÇA E EPIS', margin + 6, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('RELATÓRIO DE EXTRAVIO / CAUTELA SELETIVA DE COBRANÇA', margin + 6, 26);
  doc.text(`EMISSÃO: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin - 6, 26, { align: 'right' });

  // Worker Box
  let y = 38;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DADOS DO COLABORADOR E LOTAÇÃO', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Nome Completo:', margin + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(worker.full_name || worker.name || 'N/A'), margin + 30, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.text('CPF:', margin + 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(String(worker.cpf || 'N/A'), margin + 30, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.text('Matrícula:', margin + 4, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(String(worker.registration_number || worker.mat || 'N/A'), margin + 30, y + 24);

  // Column 2
  const col2X = margin + (contentWidth / 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Cargo / Função:', col2X, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(worker.current_role || worker.initial_role || worker.role || 'N/A'), col2X + 26, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.text('Obra Vinculada:', col2X, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(String(siteName || worker.site?.name || 'Obra Central'), col2X + 26, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.text('Admissão:', col2X, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(worker.admission_date ? format(new Date(worker.admission_date), 'dd/MM/yyyy') : 'N/A', col2X + 26, y + 24);

  // Table Header
  y = 68;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  const cols = [
    { label: 'ITEM / DESCRIÇÃO DO EPI', x: margin + 3, align: 'left' as const },
    { label: 'C.A.', x: margin + 68, align: 'center' as const },
    { label: 'DATA ENTREGA', x: margin + 92, align: 'center' as const },
    { label: 'STATUS', x: margin + 116, align: 'center' as const },
    { label: 'QTD', x: margin + 138, align: 'center' as const },
    { label: 'VALOR UNIT.', x: margin + 158, align: 'right' as const },
    { label: 'SUBTOTAL (R$)', x: margin + contentWidth - 4, align: 'right' as const },
  ];

  cols.forEach(c => doc.text(c.label, c.x, y + 4.8, { align: c.align }));

  y += 7;
  let totalAmount = 0;
  let totalQty = 0;

  assignments.forEach((assignment, index) => {
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 15;
    }

    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

    const catalog = assignment.catalog || {};
    const name = catalog.name || 'EPI Não especificado';
    const ca = catalog.ca_number || '-';
    const dateEnt = assignment.assigned_at ? format(new Date(assignment.assigned_at), 'dd/MM/yyyy') : '-';
    const status = assignment.returned_at ? 'Devolvido' : 'Em Posse / Cobrado';
    const qty = 1;
    const unitVal = Number(assignment.unit_price_at_delivery ?? catalog.unit_price ?? 0);
    const subtotal = qty * unitVal;

    totalQty += qty;
    totalAmount += subtotal;

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    const shortName = name.length > 36 ? name.substring(0, 34) + '...' : name;
    doc.text(shortName, margin + 3, y + 4.5);
    doc.text(String(ca), margin + 68, y + 4.5, { align: 'center' });
    doc.text(dateEnt, margin + 92, y + 4.5, { align: 'center' });
    doc.text(status, margin + 116, y + 4.5, { align: 'center' });
    doc.text(String(qty), margin + 138, y + 4.5, { align: 'center' });
    doc.text(`R$ ${unitVal.toFixed(2)}`, margin + 158, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${subtotal.toFixed(2)}`, margin + contentWidth - 4, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  // Total Summary Box
  y += 3;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 11, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL DE ITENS: ${totalQty} unid.`, margin + 5, y + 7);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`VALOR TOTAL COBRADO / EXTRAVIADO: R$ ${totalAmount.toFixed(2)}`, margin + contentWidth - 5, y + 7, { align: 'right' });

  // Declaratory Legal Term
  y += 16;
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(253, 224, 71); // amber-300
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 63, 18); // amber-900
  doc.text('TERMO DE CIÊNCIA E AUTORIZAÇÃO DE DESCONTO (CLT ART. 462, § 1º & NR-06)', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(113, 63, 18);
  const legalText = `Declaro que retirei sob minha responsabilidade os Equipamentos de Proteção Individual listados acima. Comprometo-me a zelar pela sua guarda e conservação, comunicando imediatamente qualquer alteração que os torne impróprios para uso. Em caso de extravio, perda culposa, dano por negligência ou não devolução dos mesmos ao término do contrato de trabalho, autorizo expressamente a empresa a descontar em minha folha de pagamento ou rescisão contratual o valor total acima apurado (R$ ${totalAmount.toFixed(2)}), com fundamento no Artigo 462, § 1º da CLT e Item 6.6.1 da Norma Regulamentadora NR-06 do Ministério do Trabalho e Emprego.`;
  
  const splitLegal = doc.splitTextToSize(legalText, contentWidth - 8);
  doc.text(splitLegal, margin + 4, y + 9.5);

  // Signatures
  y += 30;
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 30;
  }

  const sigWidth = 75;
  const sigLeftX = margin + 8;
  const sigRightX = pageWidth - margin - sigWidth - 8;

  doc.setDrawColor(71, 85, 105);
  doc.line(sigLeftX, y + 12, sigLeftX + sigWidth, y + 12);
  doc.line(sigRightX, y + 12, sigRightX + sigWidth, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${worker.full_name || 'COLABORADOR'}`, sigLeftX + (sigWidth / 2), y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`CPF: ${worker.cpf || '-'} • Matrícula: ${worker.registration_number || '-'}`, sigLeftX + (sigWidth / 2), y + 19.5, { align: 'center' });
  doc.text('Assinatura do Colaborador', sigLeftX + (sigWidth / 2), y + 23, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ENGENHARQ OS / SEGURANÇA DO TRABALHO', sigRightX + (sigWidth / 2), y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Responsável Técnico / Almoxarifado', sigRightX + (sigWidth / 2), y + 19.5, { align: 'center' });
  doc.text('Assinatura do Emitente', sigRightX + (sigWidth / 2), y + 23, { align: 'center' });

  // Document Footer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6);
  doc.text(`EngenharQ OS v2.4 • Documento emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} • Autenticidade verificável via SGEPI`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  const blob = doc.output('blob');
  if (mode === 'preview') {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Extravio_${(worker.registration_number || worker.cpf || 'EPI').replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
};

export const generateDisciplinaryPdf = async (
  record: {
    worker: any;
    type: string;
    title: string;
    content_html: string;
    applied_by_name?: string;
    site_name?: string;
    witnesses?: string[];
  },
  mode: 'download' | 'preview' = 'download'
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  let headerTitle = 'TERMO DE MEDIDA DISCIPLINAR';
  if (record.type === 'ORIENTACAO_SEGURANCA') headerTitle = 'TERMO DE ORIENTAÇÃO DE SEGURANÇA DO TRABALHO';
  else if (record.type === 'ADVERTENCIA_VERBAL') headerTitle = 'REGISTRO FORMAL DE ADVERTÊNCIA VERBAL';
  else if (record.type === 'ADVERTENCIA_ESCRITA') headerTitle = 'COMUNICADO DE ADVERTÊNCIA DISCIPLINAR ESCRITA';
  else if (record.title) headerTitle = record.title.toUpperCase();

  // Top Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, 12, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ENGENHARQ CONSTRUÇÃO & ENGENHARIA', margin + 6, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(headerTitle, margin + 6, 26);
  doc.text(`DATA: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin - 6, 26, { align: 'right' });

  // Worker Info Box
  let y = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('IDENTIFICAÇÃO DO COLABORADOR', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Colaborador:', margin + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(record.worker.full_name || 'N/A'), margin + 26, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.text('CPF:', margin + 4, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(String(record.worker.cpf || 'N/A'), margin + 26, y + 18);

  const col2X = margin + (contentWidth / 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Matrícula:', col2X, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(record.worker.registration_number || 'N/A'), col2X + 22, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.text('Função:', col2X, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(String(record.worker.current_role || record.worker.initial_role || 'N/A'), col2X + 22, y + 18);

  // Content Box
  y = 66;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DESCRIÇÃO DOS FATOS E FUNDAMENTAÇÃO LEGAL', margin, y);

  y += 5;
  const cleanContent = (record.content_html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const textLines = doc.splitTextToSize(cleanContent, contentWidth);
  doc.text(textLines, margin, y);

  y += (textLines.length * 4.2) + 12;

  if (y > pageHeight - 65) {
    doc.addPage();
    y = 20;
  }

  // Legal note
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const legalNote = "Fica o colaborador ciente de que a reincidência em condutas que violem os procedimentos internos e normas regulamentadoras de segurança do trabalho poderá ensejar a aplicação de penalidades mais severas, inclusive a rescisão do contrato de trabalho por justa causa, nos termos do Artigo 482 da Consolidação das Leis do Trabalho (CLT).";
  const noteLines = doc.splitTextToSize(legalNote, contentWidth - 8);
  doc.text(noteLines, margin + 4, y + 5);

  y += 24;
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 25;
  }

  // Signatures
  const sigWidth = 72;
  const leftX = margin + 5;
  const rightX = pageWidth - margin - sigWidth - 5;

  doc.setDrawColor(71, 85, 105);
  doc.line(leftX, y + 12, leftX + sigWidth, y + 12);
  doc.line(rightX, y + 12, rightX + sigWidth, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(String(record.worker.full_name || 'COLABORADOR'), leftX + (sigWidth / 2), y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Assinatura do Colaborador (Ciência)', leftX + (sigWidth / 2), y + 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(record.applied_by_name || 'ENGENHARQ OS / LIDERANÇA'), rightX + (sigWidth / 2), y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Empregador / Técnico de Segurança', rightX + (sigWidth / 2), y + 20, { align: 'center' });

  // Witnesses
  y += 28;
  if (y < pageHeight - 25) {
    doc.line(leftX, y + 10, leftX + sigWidth, y + 10);
    doc.line(rightX, y + 10, rightX + sigWidth, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Testemunha 1 (Nome e CPF)', leftX + (sigWidth / 2), y + 14, { align: 'center' });
    doc.text('Testemunha 2 (Nome e CPF)', rightX + (sigWidth / 2), y + 14, { align: 'center' });
  }

  const blob = doc.output('blob');
  if (mode === 'preview') {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Medida_Disciplinar_${(record.worker.registration_number || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
};
