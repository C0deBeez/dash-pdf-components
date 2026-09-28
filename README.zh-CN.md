# dash-pdf-components

[English](README.md) | [简体中文](README.zh-CN.md)

通过一个 `PDF` 输出组件在 Plotly Dash 中生成和显示 PDF。生成文件可通过浏览器链接或 Dash 的 `dcc.Download` 下载。`Document`、`Page`、`Text`、图像、SVG 和表单组件用于描述要生成的文档，不会渲染为 HTML。

```bash
uv add dash-pdf-components
```

需要 Python 3.10+ 和 Dash 3+。前端使用 `@react-pdf/renderer` 生成 PDF，使用 React-PDF/PDF.js 显示 PDF。React 和 ReactDOM 由 Dash 提供。

## 显示现有 PDF

```python
from dash import Dash, get_asset_url
import dash_pdf_components as dpc

app = Dash(__name__)
app.layout = dpc.PDF(
    id="pdf",
    file=get_asset_url("documents/quixote.pdf"),
    pages="all",
    fit="width",
    style={"height": "75vh"},
)

if __name__ == "__main__":
    app.run(debug=True)
```

请将示例的 `assets/` 目录与代码放在一起，或改用你自己的 PDF URL。`file` 接受 URL、上传所得的 data URI、`{"url": "..."}` 或 `{"data": [37, 80, 68, 70, ...]}`。跨域资源需要浏览器具有相应访问权限。传入 `None` 可清空输入。

省略 `pages` 时显示 `pageNumber` 指定的页面；传入 `"all"` 可连续阅读；也可以传入 `[1, 3, 5]` 这样的有序列表。重复、无效或超出范围的页码会被过滤。连续阅读时，导航会滚动到目标页，滚动页面也会更新 `pageNumber`。如果内部链接的目标不在显式选择的页面中，组件会发出 `itemClickData`，但不会改变页面选择。

`fit="width"` 会适应可用宽度。`fit="page"` 会同时适应宽度和高度，因此容器必须设置明确的高度。`scale` 在适应后的尺寸上应用缩放倍数，`rotate` 控制页面旋转。`width` 和 `height` 描述 PDF 页面尺寸；容器尺寸请通过 `style` 设置。

## 生成并显示文档

```python
from dash import Dash
import dash_pdf_components as dpc

app = Dash(__name__)
app.layout = dpc.PDF(
    id="report",
    document=dpc.Document(
        title="Report",
        children=dpc.Page(
            [
                dpc.Text("Hello PDF!"),
                dpc.Text(renderTemplate="{pageNumber} / {totalPages}", fixed=True),
            ],
            size="A4",
            style={"padding": 40},
        ),
    ),
    fit="page",
    style={"height": "75vh"},
)

if __name__ == "__main__":
    app.run(debug=True)
```

`file` 与 `document` 互斥。生成的 Blob 会在浏览器内直接传给显示模块；除非明确请求，否则 PDF 字节不会经过 Python。文档节点或生成配置发生变化时会自动重新生成；页面导航、缩放和旋转只更新预览。

`PDF.children` 是在已显示页面上重复呈现的附加内容。生成内容应始终通过 `document` 提供。文档节点样式遵循渲染器的布局属性和单位；`PDF.style` 则是 HTML 容器的 CSS。

## 下载与生成回调

| 属性 | 含义 | 默认值 |
| --- | --- | --- |
| `preview` | 是否显示 PDF；关闭时生成文档但不加载阅读器 | true |
| `document` | 用于生成 PDF 的单个 Document 描述；与 `file` 互斥 | None |
| `fileName` | 原生预览 iframe 的标题 | document.pdf |
| `autoGenerate` | 文档或字体配置变化时自动生成 | true |
| `n_generate` | 修改计数器以手动请求生成 | 0 |
| `generating` | 只读的生成器活动状态，与 Dash 回调加载状态分离 | false |
| `url` / `size` | 只读的浏览器 Blob URL 和字节数 | None / 0 |
| `returnBase64` / `data` | 选择启用 Base64 导出及其只读结果 | false / None |
| `n_render` | 只读的成功生成次数；绘制页面不会增加该值 | 0 |
| `errorData` | 只读的错误阶段、名称和消息 | None |
| `numPages` / `documentData` | 只读的 PDF.js 已加载页数和文件指纹 | None |
| `pageData` / `renderData` | 只读的最近加载或渲染页面尺寸 | None |
| `loadProgress` / `sourceLoaded` | 只读的源文件获取进度和状态 | None / false |
| `password` / `passwordData` | 阅读密码和只读的密码请求信息 | None |
| `itemClickData` | 只读的内部链接目标和时间戳 | None |
| `annotationsData` / `textData` | 只读的最近图层计数 | None |
| `previewMode` | `pdfjs` 或浏览器原生 `native` iframe | pdfjs |

原生预览不会暴露 PDF.js 页面或图层事件；`showToolbar` 是给浏览器的提示，`frameId` 用于命名 iframe。只有 PDF.js 加载文档后才会得到 `numPages`；无预览生成时，不会仅为获取页数而加载 PDF.js。`fileName` 不会设置独立 Dash 下载控件的文件名。

```python
from dash import Dash, Input, Output, html
import dash_pdf_components as dpc

app = Dash(__name__)
app.layout = html.Div([
    html.Button("Generate", id="generate"),
    dpc.PDF(
        id="output",
        document=dpc.Document(dpc.Page(dpc.Text("Report"))),
        preview=False,
        autoGenerate=False,
    ),
    html.A("下载 PDF", id="download-link", download="report.pdf"),
])

@app.callback(Output("output", "n_generate"), Input("generate", "n_clicks"),
              prevent_initial_call=True)
def generate(clicks):
    return clicks

app.clientside_callback(
    "function(url) { return url || null; }",
    Output("download-link", "href"), Input("output", "url"),
)

if __name__ == "__main__":
    app.run(debug=True)
```

使用 `dcc.Download` 时，启用 `returnBase64=True`，并在按钮回调中返回 `{"content": data, "filename": "report.pdf", "type": "application/pdf", "base64": True}`。PDF 字节会经过 Dash；大文件更适合上面的浏览器链接。如需在 Python 中访问 PDF，可使用 `base64.b64decode` 解码 `data`。启用 Base64 导出会复用当前生成的 Blob，不会重新布局文档。Blob URL 仅属于当前浏览器；结果被替换或组件卸载时会释放，Python 无法获取它。用户提供的 URL 不由本组件管理或释放。

`error` 仍表示自定义错误界面，而不是错误输出字符串。`noData` 用于提供空输入界面。Dash 回调加载使用 Dash 上下文；`generating` 与 PDF 资源加载是彼此独立的活动。

## 文档节点、字体与函数

上游文档原语包括 `Document`、`Page`、`View`、`Text`、`Image`、`ImageBackground`、`Link`、`Note`、`Canvas`、PDF 表单字段和 SVG 原语。参阅[组件属性](docs/components.md)、[上游 API 审计](docs/api-mapping.json)和[边界适配说明](docs/adapters.md)。生成的 Python 绑定包含属性描述以及自定义的文档样式和字体类型。

`fonts`、`fontAction`、`fontDescriptors`、`emojiSource` 和 `hyphenationCallback` 用于配置生成过程。`fontFamilies`、`fontInfo` 和 `rendererVersion` 提供诊断信息。字体必须包含文档所使用的字符。组件接受浏览器 URL、data URL、图像字节数组和受支持的源字典；Python 文件系统路径不能直接作为浏览器资源。

具名 JavaScript 函数使用 `{"function": "gallery.name", "options": {...}}`，并注册在 `window.dashPdfComponentsFunctions` 中。回调会先接收上游参数，再接收 options 和 context；生成上下文包含 `createElement`、PDF 原语和输出组件 ID。原始 Python 函数或 JavaScript 源代码字符串不能用作组件属性。旧的同步顶层 JavaScript `createPDFElement` 导出未被保留，请使用回调所提供的上下文。

依赖字体的生成任务会串行执行，并在每个任务后恢复设置。已被取代的任务无法发布结果。`Text.renderTemplate` 用于适配页码文本；Canvas 接受 JSON 绘图 `operations`。PDF 内的可编辑表单不会更新 Dash 属性。

## 延迟加载与本地资源

主入口只包含公开包装组件和控制器。生成模块和 PDF.js 显示模块分别位于独立的 `async-pdf-generator.js` 和 `async-pdf-viewer.js` 分块中，并向 Dash 注册。

- 显示 `file` 时加载显示模块和 Worker，不加载渲染器。
- 设置 `preview=False` 生成时加载渲染器，不加载 PDF.js 或其 Worker。
- 生成并显示时加载两个模块。
- 原生预览不会加载 PDF.js 显示模块。

匹配版本的 PDF.js Worker、CMaps、标准字体、WASM、ICC 和注释图像资源都随包在本地提供。`assetBaseUrl`、`workerSrc`、`imageResourcesPath` 以及单独的 PDF.js `options` 可以覆盖阅读器的资源默认值。延迟加载可以减少浏览器传输量和执行成本，但安装包仍包含两套引擎。

## 保留的官方示例

示例及其演示资源保留在 Git 中，但不包含在发布归档内。请从源码检出中运行示例集。

完整的 `examples/` 快照以及配套渲染器项目转换而来的示例均已保留：包括 31 个仓库示例和 44 个 Playground 模板，以及上游源码。原始的 `../dash-pdf-renderer-components/examples` 保持不变。参阅[示例源码与资源](examples/README.md)。

```bash
uv sync
pnpm install --frozen-lockfile
pnpm run build
python usage.py                       # 可编辑生成 + 读取现有文件
PDF_DEMO=basic python usage.py         # 仅显示
PDF_DEMO=gallery python usage.py       # 全部 75 个生成示例
```

示例集通过 `assets/` 提供缓存字体、图像、emoji 和具名回调。部分源示例较大：图像压力测试会生成约 100 MB 的内容，完整的《堂吉诃德》需要更长处理时间。下载和 Base64 任务在示例集中需要手动触发。
