import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PDFProps } from "props/PDF";
import type { GeneratedResult } from "./generation/Generator";
import { getLoadingState } from "utils/dash";

const Generator = React.lazy(
  () =>
    import(
      /* webpackChunkName: "async-pdf-generator" */ "./generation/Generator"
    ),
);
const Viewer = React.lazy(
  () => import(/* webpackChunkName: "async-pdf-viewer" */ "./PDF"),
);

const serializeError = (stage: string, value: unknown) => {
  const error = value instanceof Error ? value : new Error(String(value));
  return { stage, name: error.name, message: error.message };
};

const clearedViewerState = {
  numPages: null,
  documentData: null,
  pageData: null,
  renderData: null,
  loadProgress: null,
  sourceLoaded: false,
  passwordData: null,
  itemClickData: null,
  annotationsData: null,
  textData: null,
};

class LazyBoundary extends React.Component<
  {
    onError: (error: unknown) => void;
    children: React.ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? (
      <span role="alert">PDF module failed to load.</span>
    ) : (
      this.props.children
    );
  }
}

/** No renderer or PDF.js imports may enter this synchronous controller. */
const PDFController = (props: PDFProps) => {
  const {
    document: _document,
    preview = true,
    previewMode = "pdfjs",
    file = null,
    fileName = "document.pdf",
    showToolbar = true,
    frameId,
    autoGenerate = true,
    n_generate = 0,
    returnBase64 = false,
    fonts,
    fontAction,
    fontDescriptors,
    emojiSource,
    hyphenationCallback,
    generating: _generating,
    url: _url,
    data: _data,
    size: _size,
    rendererVersion: _version,
    fontFamilies: _families,
    fontInfo: _fontInfo,
    n_render = 0,
    setProps,
    ...viewerProps
  } = props;
  const api = (window as any).dash_component_api;
  const context = api.useDashContext();
  // Read serialized descriptors instead of reconciled React children. Also subscribes to nested Dash node changes.
  const documentJSON: string = context.useSelector((state: any) => {
    const raw = context.componentPath.reduce(
      (node: any, part: string | number) => node?.[part],
      state.layout,
    )?.props;
    return JSON.stringify(raw?.document ?? null);
  });
  const hasDocument = documentJSON !== "null";
  const invalid = hasDocument && file !== null;
  const configJSON = JSON.stringify({
    fonts,
    fontAction,
    fontDescriptors,
    emojiSource,
    hyphenationCallback,
  });
  const inputKey = hasDocument
    ? documentJSON + configJSON
    : JSON.stringify(file);
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    key: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] =
    useState<PDFProps["errorData"]>(null);
  const latest = useRef(props);
  latest.current = props;
  const renderCount = useRef(n_render);
  renderCount.current = Math.max(renderCount.current, n_render);
  const active =
    result?.key === inputKey && hasDocument && !invalid ? result : null;
  const source = hasDocument ? (active?.blob ?? null) : file;
  const [nativeUrl, setNativeUrl] = useState<string | null>(null);
  const nativeFileKey = JSON.stringify(file);
  useEffect(() => {
    if (
      !preview ||
      previewMode !== "native" ||
      hasDocument ||
      !file ||
      typeof file === "string" ||
      "url" in file
    ) {
      setNativeUrl(null);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(file.data)], { type: "application/pdf" }),
    );
    setNativeUrl(url);
    return () => {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
  }, [preview, previewMode, hasDocument, nativeFileKey]);
  const callbackLoading = getLoadingState(props.loading_state);

  useEffect(() => {
    latest.current.setProps?.(clearedViewerState);
  }, [inputKey, preview, previewMode]);

  useEffect(() => {
    setGenerationError(null);
    if (invalid) {
      const error = serializeError(
        "input",
        "file and document are mutually exclusive.",
      );
      setGenerationError(error);
      setGenerating(false);
      setResult(null);
      latest.current.setProps?.({
        ...clearedViewerState,
        errorData: error,
        generating: false,
        url: null,
        data: null,
        size: 0,
      });
    } else if (!hasDocument) {
      setResult(null);
      setGenerating(false);
      latest.current.setProps?.({
        generating: false,
        url: null,
        data: null,
        size: 0,
        rendererVersion: null,
        fontFamilies: null,
        fontInfo: null,
      });
    }
  }, [inputKey, invalid, hasDocument]);

  const onStart = useCallback((busy: boolean) => {
    setResult(null);
    setGenerationError(null);
    setGenerating(busy);
    latest.current.setProps?.({
      generating: busy,
      url: null,
      data: null,
      size: 0,
      errorData: null,
    });
  }, []);
  const onSuccess = useCallback(
    (value: GeneratedResult) => {
      const url = URL.createObjectURL(value.blob);
      setResult({ blob: value.blob, url, key: inputKey });
      setGenerating(false);
      latest.current.setProps?.({
        generating: false,
        url,
        size: value.blob.size,
        errorData: null,
        rendererVersion: value.version,
        ...value.diagnostics,
        n_render: ++renderCount.current,
      });
    },
    [inputKey],
  );
  const onError = useCallback((value: unknown) => {
    const error = serializeError("generation", value);
    setGenerationError(error);
    setGenerating(false);
    setResult(null);
    latest.current.setProps?.({
      generating: false,
      url: null,
      data: null,
      size: 0,
      errorData: error,
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    return () => {
      setTimeout(() => URL.revokeObjectURL(result.url), 0);
    };
  }, [result]);
  // Export from the current Blob; this never starts a new renderer job.
  useEffect(() => {
    let cancelled = false;
    if (!active || !returnBase64) {
      latest.current.setProps?.({ data: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled)
        latest.current.setProps?.({
          data: String(reader.result).split(",")[1],
        });
    };
    reader.onerror = () => {
      if (!cancelled)
        latest.current.setProps?.({
          errorData: serializeError("export", reader.error),
        });
    };
    reader.readAsDataURL(active.blob);
    return () => {
      cancelled = true;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [active, returnBase64]);

  const updateViewer = useCallback(
    (updates: Record<string, unknown>) => {
      if (generationError && "errorData" in updates) delete updates.errorData;
      setProps?.(updates);
    },
    [setProps, generationError],
  );

  const {
    children,
    id,
    className,
    style,
    loading_state: _loading,
    ...attributes
  } = viewerProps;
  // Only container attributes are forwarded; callback and renderer props stay private.
  const rootAttributes = Object.fromEntries(
    Object.entries(attributes).filter(
      ([key]) =>
        ["tabIndex", "role", "dir", "lang", "hidden"].includes(key) ||
        key.startsWith("aria-") ||
        key.startsWith("data-"),
    ),
  );

  return (
    <div
      {...rootAttributes}
      id={typeof id === "object" ? api.stringifyId(id) : id}
      className={className}
      style={style}
      data-dash-is-loading={callbackLoading || undefined}
      aria-busy={generating}
    >
      {!invalid && hasDocument && (
        <LazyBoundary key="generation" onError={onError}>
          <React.Suspense fallback={null}>
            <Generator
              documentJSON={documentJSON}
              configJSON={configJSON}
              autoGenerate={autoGenerate}
              n_generate={n_generate}
              id={id}
              onStart={onStart}
              onSuccess={onSuccess}
              onError={onError}
            />
          </React.Suspense>
        </LazyBoundary>
      )}
      {generationError && (
        <div role="alert">{props.error ?? generationError.message}</div>
      )}
      {!invalid &&
        preview &&
        !generationError &&
        (previewMode === "native"
          ? (nativeUrl ||
              active?.url ||
              typeof file === "string" ||
              (file && "url" in file)) && (
              <iframe
                id={frameId}
                title={fileName}
                src={`${nativeUrl || active?.url || (typeof file === "string" ? file : file && "url" in file ? file.url : null)}#toolbar=${showToolbar ? 1 : 0}`}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 400,
                  border: 0,
                }}
              />
            )
          : source && (
              <LazyBoundary
                key={`viewer-${inputKey}`}
                onError={(value) =>
                  setProps?.({
                    errorData: serializeError("viewer-module", value),
                  })
                }
              >
                <React.Suspense fallback={null}>
                  <Viewer
                    {...viewerProps}
                    id={undefined}
                    className={undefined}
                    style={{
                      width: "100%",
                      height: style?.height ? "100%" : undefined,
                      boxSizing: "border-box",
                    }}
                    file={source}
                    setProps={updateViewer}
                  >
                    {children}
                  </Viewer>
                </React.Suspense>
              </LazyBoundary>
            ))}
      {!source && !generating && !generationError && preview && props.noData}
    </div>
  );
};
export default PDFController;
