# Dash PDF adapters

`PDF` is the only output component. Document nodes describe generated PDF content; they never render HTML. `file` and `document` are mutually exclusive. `preview=False` skips the viewer; browser links and Dash's `dcc.Download` handle downloads.

Generation uses a separate lazy renderer module. PDF.js display uses a separate lazy viewer module. An internal Blob links the two; public `url` and opt-in `data` are JSON-safe output properties. Reader controls never trigger generation. `n_render` counts successful current generation jobs only.

`errorData` reports stage/name/message. `error` is custom UI. `generating` is generator activity, separate from Dash callback loading. The old PDFViewer/PDFDownloadLink/BlobProvider names in the upstream API audit describe upstream adapters; the public PDF uses `preview` for display and Dash controls for downloads.

PDF document styles are distinct from PDF container CSS. `width` and `height` size reader pages; `style` sizes the HTML container. `children` remains page overlay content. Generated document trees always go in `document`.

Function props accept named references registered in `window.dashPdfComponentsFunctions`, never executable code strings. Their context provides `createElement` and primitives. Text templates and Canvas operations are JSON adaptations. Dates use ISO timestamps. Images use browser-accessible URLs, byte arrays, or supported dictionaries.

Font configuration is scoped around serialized jobs, and stale jobs cannot publish. Blob URLs are released on replacement/unmount after preview cleanup. They cannot be fetched by Python or treated as persistent addresses. User-provided URLs are not revoked.

Node-only file/stream APIs remain unsupported. Form editing does not publish Dash state. Native browser preview does not support PDF.js page and layer events.
