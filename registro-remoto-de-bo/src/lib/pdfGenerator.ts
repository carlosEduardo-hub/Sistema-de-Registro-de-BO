/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ plugin
import { RegisterBo } from "@/types/registerBo";

// Função para buscar imagem e converter em base64
const getImageBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generateBoPdf = async (bo: RegisterBo) => {
  const doc = new jsPDF();
  const totalPagesExp = "{total_pages_count_string}";

  const addFooter = (data: any) => {
    const pageNumber = data.pageNumber;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Documento gerado em: ${new Date().toLocaleString("pt-BR")}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Página ${pageNumber} de ${totalPagesExp}`,
      doc.internal.pageSize.getWidth() - 10,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  };

  try {
    // ✅ Logo como base64
    const logoBase64 = await getImageBase64("/assets/logo2.png");
    doc.addImage(logoBase64, "PNG", 14, 10, 25, 25);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
      "GOVERNO DO ESTADO DO PIAUÍ",
      doc.internal.pageSize.getWidth() / 2,
      20,
      { align: "center" }
    );
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      "SECRETARIA DE SEGURANÇA PÚBLICA",
      doc.internal.pageSize.getWidth() / 2,
      28,
      { align: "center" }
    );
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      "BOLETIM DE OCORRÊNCIA",
      doc.internal.pageSize.getWidth() / 2,
      40,
      { align: "center" }
    );

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(14, 48, doc.internal.pageSize.getWidth() - 14, 48);

    // Protocolo e Data
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Protocolo:", 14, 56);
    doc.setFont("helvetica", "normal");
    doc.text(bo.id.toString(), 35, 56);

    const dataRegistro = new Date(bo.createdAt).toLocaleString("pt-BR");
    doc.setFont("helvetica", "bold");
    doc.text(
      `Data do Registro: ${dataRegistro}`,
      doc.internal.pageSize.getWidth() - 14,
      56,
      { align: "right" }
    );

    let startY = 65;

    // Dados da Ocorrência
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DA OCORRÊNCIA", 14, startY);
    startY += 2;
    autoTable(doc, {
      startY,
      body: [
        ["Tipo de Ocorrência", bo.type_of_occurrence],
        [
          "Data e Hora do Evento",
          new Date(bo.date_and_time_of_event).toLocaleString("pt-BR"),
        ],
        ["Local do Fato", bo.place_of_the_fact],
        ["Relação com o Fato", bo.relationship_with_the_fact],
      ],
      theme: "striped",
      headStyles: { fillColor: [34, 49, 63] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
      didDrawPage: addFooter,
    });
    startY = (doc as any).lastAutoTable.finalY + 10;

    // Dados do Requerente
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO REQUERENTE", 14, startY);
    startY += 2;
    autoTable(doc, {
      startY,
      body: [
        ["Nome Completo", bo.full_name],
        ["CPF ou RG", bo.cpf_or_rg || "Não informado"],
        [
          "Data de Nascimento",
          bo.date_of_birth
            ? new Date(bo.date_of_birth).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })
            : "Não informado",
        ],
        ["Gênero", bo.gender || "Não informado"],
        ["Nacionalidade", bo.nationality || "Não informado"],
        ["Estado Civil", bo.marital_status || "Não informado"],
        ["Profissão", bo.profession || "Não informado"],
        ["Endereço Completo", bo.full_address || "Não informado"],
        ["Telefone", bo.phone_or_cell_phone || "Não informado"],
        ["Email", bo.email || "Não informado"],
      ],
      theme: "striped",
      headStyles: { fillColor: [34, 49, 63] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
      didDrawPage: addFooter,
    });
    startY = (doc as any).lastAutoTable.finalY + 10;

    // Transcrição
    if (bo.transcription) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TRANSCRIÇÃO DO RELATO", 14, startY);
      startY += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(
        bo.transcription,
        doc.internal.pageSize.getWidth() - 28
      );
      doc.text(splitText, 14, startY);
    }

    // Adiciona o rodapé nas páginas que não foram criadas pelo autoTable
    const pageCount = doc.internal.pages.length;
    const lastAutoTablePage = (doc as any).lastAutoTable.pageCount;
    for (let i = lastAutoTablePage + 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter({ pageNumber: i });
    }
    
    // Substitui o placeholder pelo número total de páginas
    if (typeof (doc as any).putTotalPages === "function") {
      (doc as any).putTotalPages(totalPagesExp);
    } else {
      // Fallback para substituir o placeholder se a função não existir
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() - 10,
          doc.internal.pageSize.getHeight() - 10,
          { align: "right" }
        );
      }
    }


    // Salvar
    doc.save(`Boletim_Ocorrencia_${bo.id}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
};
