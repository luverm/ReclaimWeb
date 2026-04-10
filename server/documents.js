const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

async function parseUploadedDocument(file) {
  const originalName = file.originalname || "document";
  const extension = `.${originalName.split(".").pop()?.toLowerCase() || ""}`;

  if (extension === ".txt" || extension === ".md") {
    const text = file.buffer.toString("utf8");
    return {
      fileName: originalName,
      extension,
      extractedText: text,
      previewText: text.slice(0, 2400),
      metadata: {}
    };
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return {
      fileName: originalName,
      extension,
      extractedText: result.value,
      previewText: result.value.slice(0, 2400),
      metadata: {}
    };
  }

  if (extension === ".pdf") {
    const pdf = await pdfParse(file.buffer);
    return {
      fileName: originalName,
      extension,
      extractedText: pdf.text || "",
      previewText: (pdf.text || "").slice(0, 2400),
      metadata: {
        pages: pdf.numpages || 0,
        info: pdf.info || {}
      }
    };
  }

  throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or MD.");
}

module.exports = { parseUploadedDocument };
