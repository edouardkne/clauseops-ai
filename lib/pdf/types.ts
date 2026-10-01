export type ExtractedPage = {
  pageNumber: number;
  text: string;
  characterCount: number;
};

export type ExtractedDocument = {
  filename: string;
  size: number;
  mimeType: string;
  pageCount: number;
  characterCount: number;
  pages: ExtractedPage[];
};

export type PdfExtractionProgress =
  | "validating"
  | "loading"
  | "extracting"
  | "complete";