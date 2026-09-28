import base64
import io
import threading
import time

import pytest
from dash import Dash, html
from pypdf import PdfReader
from werkzeug.serving import make_server

import dash_pdf_components as dpc


def test_generation_properties_and_descriptor_tree():
    document = dpc.Document(dpc.Page(dpc.Text("Hello"), size="A4"))
    for preview in (True, False):
        output = dpc.PDF(document=document, preview=preview, returnBase64=True)
        assert output.to_plotly_json()["props"]["document"] is document
    assert dpc.PDF(preview=False)._type == "PDF"
    assert {"async-pdf-generator.js", "async-pdf-viewer.js"} == {
        entry["relative_package_path"] for entry in vars(dpc.PDF)["_js_dist"] if entry.get("async") == "lazy"
    }


@pytest.mark.browser
@pytest.mark.parametrize("preview", [False, True])
def test_generated_pdf_and_lazy_modules(browser, preview):
    app = Dash(__name__, requests_pathname_prefix="/pdf/", routes_pathname_prefix="/pdf/")
    app.enable_dev_tools(dev_tools_ui=True, dev_tools_props_check=True, dev_tools_hot_reload=False)
    app.layout = html.Div(
        [
            dpc.PDF(
                id="pdf",
                document=dpc.Document(dpc.Page(dpc.Text("Hello from unified PDF"))),
                preview=preview,
                returnBase64=True,
                fit="width",
                style={"height": 300},
            ),
        ]
    )
    server = make_server("127.0.0.1", 0, app.server, threaded=True)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def script(code, args=None):
        return browser("execute/sync", {"script": code, "args": args or []})

    try:
        browser("url", {"url": f"http://127.0.0.1:{server.server_port}/pdf/"})
        state = {}
        end = time.monotonic() + 45
        while time.monotonic() < end:
            state = script("try {return window.dash_component_api.getLayout('pdf').props} catch(e) {return {}}")
            if state.get("data") or state.get("errorData"):
                break
            time.sleep(0.1)
        assert not state.get("errorData"), state
        assert state.get("data"), state
        reader = PdfReader(io.BytesIO(base64.b64decode(state["data"])))
        assert "Hello from unified PDF" in reader.pages[0].extract_text()
        end = time.monotonic() + 20
        while preview and time.monotonic() < end:
            if script("return !!document.querySelector('#pdf canvas')"):
                break
            time.sleep(0.1)
        requests = script("return performance.getEntriesByType('resource').map(e=>e.name)")
        assert any("async-pdf-generator.js" in url for url in requests), requests
        assert any("async-pdf-viewer.js" in url for url in requests) == preview, requests
        if not preview:
            assert not any("pdf.worker" in url for url in requests), requests
        previous = state["n_render"]
        script("window.dash_clientside.set_props('pdf', {scale:1.5, rotate:90, returnBase64:false})")
        time.sleep(0.3)
        assert script("return window.dash_component_api.getLayout('pdf').props.n_render") == previous
        script("window.dash_clientside.set_props('pdf', {returnBase64:true})")
        end = time.monotonic() + 5
        while time.monotonic() < end:
            if script("return !!window.dash_component_api.getLayout('pdf').props.data"):
                break
            time.sleep(0.1)
        assert script("return window.dash_component_api.getLayout('pdf').props.n_render") == previous
        logs = browser("log", {"type": "browser"})
        assert not [entry for entry in logs if entry["level"] == "SEVERE"], logs
    finally:
        server.shutdown()
        thread.join(timeout=10)


@pytest.mark.browser
def test_nested_updates_manual_generation_and_url_retirement(browser):
    app = Dash(__name__)
    app.layout = dpc.PDF(
        id="pdf",
        document=dpc.Document(dpc.Page(dpc.Text("Original", id="pdf-text"))),
        preview=False,
        returnBase64=True,
    )
    server = make_server("127.0.0.1", 0, app.server, threaded=True)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def script(code, args=None):
        return browser("execute/sync", {"script": code, "args": args or []})

    def wait_state(condition):
        state = {}
        end = time.monotonic() + 30
        while time.monotonic() < end:
            state = script("try{return window.dash_component_api.getLayout('pdf').props}catch(e){return {}}")
            if condition(state):
                return state
            time.sleep(0.1)
        raise AssertionError(state)

    try:
        browser("url", {"url": f"http://127.0.0.1:{server.server_port}"})
        initial = wait_state(lambda value: bool(value.get("data")))
        old_url = initial["url"]
        script(
            "window.retiredPDFURLs=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{window.retiredPDFURLs.push(u);revoke(u)}"
        )
        script("window.dash_clientside.set_props('pdf', {autoGenerate:false})")
        wait_state(lambda value: value.get("url") is None and not value.get("generating"))
        script("window.dash_clientside.set_props('pdf-text', {children:'Manual replacement'})")
        time.sleep(0.2)
        pending = wait_state(lambda value: value.get("url") is None and not value.get("generating"))
        assert pending["n_render"] == initial["n_render"]
        assert old_url in script("return window.retiredPDFURLs")
        script("window.dash_clientside.set_props('pdf', {n_generate:1})")
        generated = wait_state(lambda value: bool(value.get("data")) and value["n_render"] > initial["n_render"])
        assert "Manual replacement" in PdfReader(io.BytesIO(base64.b64decode(generated["data"]))).pages[0].extract_text()
        assert generated["n_render"] == initial["n_render"] + 1
        script("window.dash_clientside.set_props('pdf', {preview:true})")
        time.sleep(0.2)
        assert script("return window.dash_component_api.getLayout('pdf').props.url") == generated["url"]
        assert script("return window.dash_component_api.getLayout('pdf').props.n_render") == generated["n_render"]
        script("window.dash_clientside.set_props('pdf', {file:'/conflicting.pdf'})")
        invalid = wait_state(lambda value: (value.get("errorData") or {}).get("stage") == "input")
        assert invalid["url"] is None
        assert invalid["numPages"] is None
        assert not invalid["generating"]
        assert not [entry for entry in browser("log", {"type": "browser"}) if entry["level"] == "SEVERE"]
    finally:
        server.shutdown()
        thread.join(timeout=10)
