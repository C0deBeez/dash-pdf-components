import type React from "react";
import type { FunctionProps } from "./generation/shared/dash";
import type {
  DocumentLoadData,
  DocumentPasswordData,
  DocumentProgressData,
} from "props/DocumentView";
import type { PDFLayerData } from "props/PageView";
import type {
  PDFDashBaseProps,
  PDFDocumentOptions,
  PDFErrorData,
  PDFFile,
  PDFItemClickData,
  PDFPageColors,
  PDFPageData,
} from "props/shared/pdf";

/** Props for the single-page or continuous PDF viewer. */
export interface PDFProps extends PDFDashBaseProps {
  /** Document description to generate. Mutually exclusive with file. */
  document?: React.ReactNode;
  /** Display the generated or supplied PDF. Set false to generate without loading the viewer. Defaults to true. */
  preview?: boolean;
  /** Preview engine. pdfjs is the default; native uses the browser iframe and lacks page callbacks. */
  previewMode?: "pdfjs" | "native";
  /** Title of the native preview frame. Defaults to document.pdf. */
  fileName?: string;
  /** Browser-native toolbar hint. Custom reader controls belong to AIO. */
  showToolbar?: boolean;
  /** Stable native preview iframe ID. */
  frameId?: string;
  /** Generate whenever document or font configuration changes. Defaults to true. */
  autoGenerate?: boolean;
  /** Change this counter to request manual generation. */
  n_generate?: number;
  /** Read-only latest successful generation count. Page drawing does not increment it. */
  n_render?: number;
  /** Read-only generation activity, separate from Dash callback loading. */
  generating?: boolean;
  /** Read-only generated Blob URL. Valid only in this browser until replacement or unmount. */
  url?: string | null;
  /** Read-only generated PDF size in bytes. */
  size?: number;
  /** Enable Base64 export of the generated PDF. Defaults to false. */
  returnBase64?: boolean;
  /** Read-only generated Base64 when returnBase64 is enabled. */
  data?: string | null;
  /** Read-only generator version. */
  rendererVersion?: string;
  /** Font registrations used during generation. */
  fonts?: Record<string, unknown>[];
  /** Generation font action. clear removes global custom font registrations. */
  fontAction?: "load" | "reset" | "clear";
  /** Font descriptors used for generation diagnostics. */
  fontDescriptors?: Record<string, unknown>[];
  /** Emoji resource URL configuration or named builder reference. */
  emojiSource?: Record<string, unknown>;
  /** Named generation hyphenation function. */
  hyphenationCallback?: FunctionProps;
  /** Read-only generated font family diagnostics. */
  fontFamilies?: string[];
  /** Read-only JSON-safe generated font diagnostics. */
  fontInfo?: {
    sources?: Record<
      string,
      {
        src?: any;
        fontStyle?: string;
        fontWeight?: number | string;
        loaded?: boolean;
      }[]
    >;
    selected?: {
      fontFamily?: string;
      src?: any;
      fontStyle?: string;
      fontWeight?: number | string;
      loaded?: boolean;
    }[];
  };
  /** Additional content rendered inside the page. */
  children?: React.ReactNode;
  /** PDF source: URL, base64 data URI, or an object containing url or byte-array data. null clears the viewer. */
  file?: string | PDFFile | null;
  /** One-based current page. Defaults to 1. Updates on navigation and continuous-reading scroll. all is deprecated; use pages=all. */
  pageNumber?: number | "all";
  /** Pages to render. Omit for the current page, use all for continuous reading, or provide unique one-based page numbers. pageNumber=all is deprecated; use pages=all instead. */
  pages?: "all" | number[];
  /** Fit pages to the container width or both width and height. Overrides width and height; scale remains a multiplier. page requires a container with an explicit height. */
  fit?: "width" | "page";
  /** Page width. */
  width?: number;
  /** Page height. Ignored when width is provided. */
  height?: number;
  /** Page scale. Defaults to 1. */
  scale?: number;
  /** Page rotation in degrees. Defaults to 0. */
  rotate?: number | null;
  /** Whether selectable and searchable text is rendered. Defaults to true. */
  renderTextLayer?: boolean;
  /** Whether links and annotations are rendered. Defaults to true. */
  renderAnnotationLayer?: boolean;
  /** Whether interactive PDF forms are rendered. renderAnnotationLayer must also be true. Defaults to false. */
  renderForms?: boolean;
  /** Rendering mode. Custom render functions are not JSON-safe, so Dash supports canvas and none. Defaults to canvas. */
  renderMode?: "canvas" | "none";
  /** Canvas background color. */
  canvasBackground?: string;
  /** Physical-pixel to CSS-pixel ratio. Defaults to window.devicePixelRatio. */
  devicePixelRatio?: number;
  /** Colors used to render the page. */
  pageColors?: PDFPageColors;
  /** JSON-safe React-PDF Document options. Package-local PDF.js assets are supplied by default. */
  options?: PDFDocumentOptions;
  /** Base URL containing version-matched PDF.js assets. Defaults to assets installed with this package. */
  assetBaseUrl?: string;
  /** PDF.js module Worker URL. Defaults to the Worker installed with this package. */
  workerSrc?: string;
  /** Path prefixed to annotation image URLs. Defaults to the package annotation image directory. */
  imageResourcesPath?: string;
  /** Link rel used by external links in annotations. Defaults to noopener noreferrer nofollow. */
  externalLinkRel?: string;
  /** Link target used by external links in annotations. */
  externalLinkTarget?: "_self" | "_blank" | "_parent" | "_top";
  /** Password submitted after React-PDF requests one. It is not copied into callback output properties. */
  password?: string;
  /** Number of pages in the loaded document. Read-only. */
  numPages?: number | null;
  /** Loaded document metadata. Read-only. */
  documentData?: DocumentLoadData | null;
  /** Latest document loading progress. Read-only. */
  loadProgress?: DocumentProgressData | null;
  /** Whether React-PDF retrieved the current source. Read-only. */
  sourceLoaded?: boolean;
  /** Latest document, page, or layer error. Read-only. */
  errorData?: PDFErrorData | null;
  /** Latest password challenge. Read-only. */
  passwordData?: DocumentPasswordData | null;
  /** Latest internal-link navigation event. Read-only. */
  itemClickData?: PDFItemClickData | null;
  /** Latest loaded page dimensions. Read-only. */
  pageData?: PDFPageData | null;
  /** Latest rendered page dimensions. Read-only. */
  renderData?: PDFPageData | null;
  /** Latest annotation-layer result. Read-only. */
  annotationsData?: PDFLayerData | null;
  /** Latest text-layer result. Read-only. */
  textData?: PDFLayerData | null;
}
