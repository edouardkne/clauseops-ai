import {
  extractText,
  getDocumentProxy,
} from "unpdf";

import type {
  ExtractedDocument,
} from "./types";

export const PDF_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPages: 100,
  maxCharacters: 1_500_000,
  maxImageSize: 16_777_216,
  timeoutMs: 20_000,
} as const;

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeoutPromise = new Promise<never>(
    (_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new PdfExtractionError(
            "PDF processing took too long. Try a smaller or simpler document.",
          ),
        );
      }, timeoutMs);
    },
  );

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export function validatePdfFile(
  file: File,
): void {
  const filename =
    file.name.toLowerCase();

  const hasPdfExtension =
    filename.endsWith(".pdf");

  const hasPdfMime =
    file.type === "application/pdf";

  if (!hasPdfExtension && !hasPdfMime) {
    throw new PdfExtractionError(
      "ClauseOps currently supports PDF documents only.",
    );
  }

  if (file.size === 0) {
    throw new PdfExtractionError(
      "The selected PDF is empty.",
    );
  }

  if (file.size > PDF_LIMITS.maxBytes) {
    throw new PdfExtractionError(
      "The PDF is larger than the current 10 MB limit.",
    );
  }
}

export async function extractPdfDocument(
  file: File,
): Promise<ExtractedDocument> {
  validatePdfFile(file);

  try {
    const buffer =
      await file.arrayBuffer();

    const pdf = await withTimeout(
      getDocumentProxy(
        new Uint8Array(buffer),
        {
          maxImageSize:
            PDF_LIMITS.maxImageSize,
        },
      ),
      PDF_LIMITS.timeoutMs,
    );

    if (pdf.numPages < 1) {
      throw new PdfExtractionError(
        "No pages were found in this PDF.",
      );
    }

    if (
      pdf.numPages >
      PDF_LIMITS.maxPages
    ) {
      throw new PdfExtractionError(
        `This PDF contains ${pdf.numPages} pages. ClauseOps currently supports up to ${PDF_LIMITS.maxPages} pages per document.`,
      );
    }

    const extracted =
      await withTimeout(
        extractText(pdf, {
          mergePages: false,
        }),
        PDF_LIMITS.timeoutMs,
      );

    if (!Array.isArray(extracted.text)) {
      throw new PdfExtractionError(
        "ClauseOps could not preserve page-level text for this PDF.",
      );
    }

    const pages = extracted.text.map(
      (rawText, index) => {
        const text =
          rawText.trim();

        return {
          pageNumber: index + 1,
          text,
          characterCount:
            text.length,
        };
      },
    );

    const characterCount =
      pages.reduce(
        (total, page) =>
          total +
          page.characterCount,
        0,
      );

    if (characterCount === 0) {
      throw new PdfExtractionError(
        "No selectable text was found. This may be a scanned or image-only PDF; OCR is not enabled yet.",
      );
    }

    if (
      characterCount >
      PDF_LIMITS.maxCharacters
    ) {
      throw new PdfExtractionError(
        "The extracted document contains too much text for the current ClauseOps prototype.",
      );
    }

    return {
      filename: file.name,
      size: file.size,
      mimeType:
        file.type ||
        "application/pdf",
      pageCount:
        extracted.totalPages,
      characterCount,
      pages,
    };
  } catch (error) {
    if (
      error instanceof PdfExtractionError
    ) {
      throw error;
    }

    throw new PdfExtractionError(
      "ClauseOps could not read this PDF. The document may be encrypted, malformed, or unsupported.",
    );
  }
}
