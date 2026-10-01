import { mkdir, writeFile } from "node:fs/promises";
import { fixturePdf } from "./pdf-fixture.mjs";
import { resolve } from "node:path";

const origin = process.env.CLAUSEOPS_TEST_ORIGIN || "http://localhost:3000";
const targets = await fetch("http://localhost:9222/json").then(r => r.json());
const target = targets.find(t => t.type === "page");
if (!target) throw new Error("Start headless Chromium on debugging port 9222 first.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
const checks = [];
socket.addEventListener("message", event => {
  const data = JSON.parse(event.data);
  if (data.id) {
    const request = pending.get(data.id);
    if (request) {
      pending.delete(data.id);
      if (data.error) request.reject(new Error(JSON.stringify(data.error)));
      else request.resolve(data.result);
    }
  }
  if (data.method === "Runtime.exceptionThrown") errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
});
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(id, {
      resolve: result => { clearTimeout(timeout); resolve(result); },
      reject: error => { clearTimeout(timeout); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function navigate(path) {
  await command("Page.navigate", { url: origin + path });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('h1')`)) break;
    await pause(100);
  }
  await pause(300);
}
function assert(condition, message) {
  checks.push({ message, passed: !!condition });
  if (!condition) console.error("FAIL:", message);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await pause(300);
}
async function textInput(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await pause(250);
}
await mkdir(".qa", { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
const routes = ["/", "/dashboard", "/contracts", "/contracts/upload", "/contracts/demo", "/obligations", "/obligations/demo", "/evidence", "/assistant", "/reports", "/calendar", "/settings", "/contracts/services", "/obligations/7"];
for (const width of [1440, 768, 390, 320]) {
  await command("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const route of routes) {
    await navigate(route);
    const state = await evaluate(`({ title: document.querySelector('h1')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth, main: !!document.querySelector('#main-content') })`);
    assert(state.title && !state.title.includes("isn’t in the workspace") && state.main, `${width}px ${route}: renders page`);
    assert(!state.overflow, `${width}px ${route}: no global horizontal overflow`);
    if ([1440, 390].includes(width) && ["/", "/dashboard", "/contracts/demo", "/assistant"].includes(route)) {
      const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      await writeFile(`.qa/${route === "/" ? "landing" : route.slice(1).replaceAll("/", "-")}-${width}.png`, Buffer.from(shot.data, "base64"));
    }
  }
}
await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await navigate("/dashboard");
await click('button[aria-label="Open navigation"]');
assert(await evaluate("getComputedStyle(document.querySelector('.sidebar')).display !== 'none'"), "Mobile navigation opens");
await click('.sidebar a[href="/contracts"]');
assert(await evaluate("location.pathname === '/contracts' && getComputedStyle(document.querySelector('.sidebar')).display === 'none'"), "Mobile navigation follows link and closes");
assert(await evaluate("document.querySelector('.table-scroll').scrollWidth > document.querySelector('.table-scroll').clientWidth"), "Contract table scrolls locally on mobile");
await textInput('input[aria-label="Search contracts"]', "Northstar");
assert(await evaluate("document.querySelectorAll('tbody tr').length === 1 && document.querySelector('tbody').textContent.includes('Northstar')"), "Contract search filters records");
await click('button[aria-label="Card view"]');
assert(await evaluate("document.querySelectorAll('.contract-card').length === 1"), "Contract card view works");
await navigate("/obligations");
await evaluate("(() => { const select = document.querySelector('select'); select.value = 'Overdue'; select.dispatchEvent(new Event('change', {bubbles:true})); })()");
await pause(200);
assert(await evaluate("document.querySelectorAll('tbody tr').length === 1 && document.querySelector('tbody').textContent.includes('Confirm public liability insurance')"), "Status filter shows overdue obligation");
await textInput('input[aria-label="Search obligations"]', "not a record");
assert(await evaluate("document.body.textContent.includes('No matching obligations')"), "Obligation search empty state");
await navigate("/contracts/demo");
await click('#tab-3');
assert(await evaluate("document.querySelector('[role=tabpanel]').textContent.includes('thirty (30) days')"), "Key Clauses tab shows exact source");
await evaluate("document.querySelector('#tab-3').focus()");
await command("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
await command("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
await pause(200);
assert(await evaluate("document.querySelector('#tab-4').getAttribute('aria-selected') === 'true'"), "Contract tabs support arrow keys");
await navigate("/assistant");
await click('.assistant-prompts > button:nth-of-type(2)');
assert(await evaluate("document.querySelector('[role=log]').textContent.includes('internal review target')"), "Assistant provides scripted context");
await textInput('#assistant-question', "Can you analyse my new contract?");
await click('button[aria-label="Send question"]');
assert(await evaluate("document.querySelector('[role=log]').textContent.includes('cannot analyse new questions')"), "Unsupported assistant question fallback");
await navigate("/contracts/upload");
await writeFile(".qa/Sample.pdf", fixturePdf());
const { root } = await command("DOM.getDocument");
const { nodeId } = await command("DOM.querySelector", { nodeId: root.nodeId, selector: 'input[type=file]' });
await command("DOM.setFileInputFiles", { nodeId, files: [resolve(".qa/Sample.pdf")] });
for (let attempt = 0; attempt < 200; attempt++) {
  if (await evaluate("document.body.textContent.includes('PDF text extracted locally')")) break;
  await pause(100);
}
assert(await evaluate("document.body.textContent.includes('PDF text extracted locally')"), "Real PDF text extracts locally without an AI request");
await click('button[aria-label="Remove selected file"]');
assert(await evaluate("!document.querySelector('.selected-file')"), "Selected file can be removed");
await evaluate("(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['bad'], 'Sample.exe')); const input = document.querySelector('input[type=file]'); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()");
await pause(200);
assert(await evaluate("document.querySelector('[role=alert]')?.textContent.includes('PDF documents only')"), "Unsupported file type rejected");
await navigate("/evidence");
await click('.heading-action button');
assert(await evaluate("!!document.querySelector('#evidence-upload')"), "Evidence upload preview opens");
await navigate("/reports");
await click('.export-placeholder button');
assert(await evaluate("document.querySelector('[role=status]')?.textContent.includes('No file has been generated')"), "Export placeholder explains availability");
for (const route of ["/contracts/missing", "/obligations/missing"]) {
  assert((await fetch(origin + route)).status === 404, `${route}: unknown record returns 404`);
}
assert(errors.length === 0, "No uncaught browser runtime errors");
await writeFile(".qa/results.json", JSON.stringify({ checks, errors }, null, 2));
console.log(`${checks.filter(c => c.passed).length}/${checks.length} browser checks passed.`);
if (errors.length) console.error(errors);
socket.close();
if (checks.some(c => !c.passed)) process.exitCode = 1;
