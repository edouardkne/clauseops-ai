import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fixturePdf } from "./pdf-fixture.mjs";

const origin = process.env.CLAUSEOPS_TEST_ORIGIN || "http://localhost:3000";
const target = (await fetch("http://localhost:9222/json").then(r => r.json())).find(t => t.type === "page");
if (!target) throw new Error("Start headless Chromium on localhost:9222 first.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const checks = [];
const runtimeErrors = [];
let pausedRequest;
let apiCalls = 0;
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Fetch.requestPaused") { pausedRequest = message.params; apiCalls++; }
});
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 300; i++) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error(`UI condition timed out: ${expression}`);
}
function check(condition, message) { checks.push({ message, passed: !!condition }); if (!condition) console.error("FAIL:", message); }
async function screenshot(name) {
  const image = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(`.qa/${name}.png`, Buffer.from(image.data, "base64"));
}
async function submit() {
  pausedRequest = undefined;
  await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze with AI')).click()");
  for (let i = 0; i < 100 && !pausedRequest; i++) await pause(100);
  if (!pausedRequest) throw new Error("Analysis request was not intercepted.");
  return pausedRequest;
}
async function reply(status, body) {
  await command("Fetch.fulfillRequest", {
    requestId: pausedRequest.requestId,
    responseCode: status,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
  await pause(300);
}
const obligation = {
  id: "f31dd766-f761-4e52-a649-1259bd7b5d42", title: "Submit monthly report", description: "Prepare the required monthly report.",
  action: "Submit the report to the customer.", responsibleParty: "Supplier", category: "reporting", deadlineText: null,
  recurrence: "Monthly", evidenceRequired: [], confidence: "direct", needsHumanReview: false, reviewReason: null,
  source: { pageNumber: 1, quote: "The Supplier shall submit a monthly report." }, sourceVerified: true,
};
const analysis = {
  documentTitle: "Supplier Service Agreement", documentType: "Service agreement", language: "English",
  parties: ["Acme Supplier", "Cedar Customer"], summary: "A synthetic agreement used only to verify the interface.", warnings: [],
  obligations: [obligation, { ...obligation, id: "17d99272-220f-4e6d-b279-7b81f5bf3c17", title: "Unverified interpretation example", confidence: "uncertain", needsHumanReview: true, sourceVerified: false, reviewReason: "The supporting quote could not be matched to the cited page.", source: { pageNumber: 1, quote: "An unmatched quote for interface verification." } }],
};
await mkdir(".qa", { recursive: true });
await writeFile(".qa/Analysis-Sample.pdf", fixturePdf());
await command("Page.enable");
await command("Runtime.enable");
// Every analysis request is intercepted before it can reach the server/provider.
await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/analyze-contract", requestStage: "Request" }] });
try {
  for (const width of [1440, 390, 320]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command("Page.navigate", { url: `${origin}/contracts/upload` });
    await until("document.readyState === 'complete' && !!document.querySelector('input[type=file]')");
    await pause(500);
    const beforeExtraction = apiCalls;
    const { root } = await command("DOM.getDocument");
    const { nodeId } = await command("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
    await command("DOM.setFileInputFiles", { nodeId, files: [resolve(".qa/Analysis-Sample.pdf")] });
    await until("document.body.textContent.includes('PDF text extracted locally')");
    check(apiCalls === beforeExtraction, `${width}: extraction sends no AI request`);
    await evaluate("document.querySelector('.extracted-preview').open = true");
    check(await evaluate("document.querySelector('.extracted-preview').textContent.includes('monthly report')"), `${width}: actual PDF page text preserved`);
    const intercepted = await submit();
    const payload = JSON.parse(intercepted.request.postData);
    check(JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(["filename", "pages"]), `${width}: request has only filename and pages`);
    check(payload.pages.every(p => Object.keys(p).sort().join() === "pageNumber,text"), `${width}: page payload excludes PDF binary and client analysis`);
    check(await evaluate("Array.from(document.querySelectorAll('button')).some(b => b.disabled && b.textContent.includes('Analysing'))"), `${width}: visible loading state disables submit`);
    const count = apiCalls;
    await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analysing')).click()");
    await pause(200);
    check(apiCalls === count, `${width}: duplicate submission blocked`);
    await screenshot(`analysis-loading-${width}`);
    await reply(503, { error: "Sanitized mock failure" });
    check(await evaluate("document.querySelector('[role=alert]')?.textContent.includes('unavailable')"), `${width}: API error visible`);
    check(await evaluate("!!document.querySelector('.extracted-preview')"), `${width}: preview survives error`);
    await submit();
    await reply(200, { analysis: { ...analysis, obligations: [], warnings: ["No operational obligations found."] } });
    await until("!!document.querySelector('.analysis-result')");
    check(await evaluate("document.querySelector('.analysis-result').textContent.includes('No operational obligations identified')"), `${width}: zero-obligation success state`);
    await screenshot(`analysis-empty-${width}`);
    await submit();
    await reply(200, { analysis });
    await until("document.querySelectorAll('.analysis-obligation').length === 2");
    check(await evaluate("document.querySelector('.analysis-result').textContent.includes('Quote matched to page') && document.querySelector('.analysis-result').textContent.includes('Quote not verified')"), `${width}: source verification states displayed`);
    check(await evaluate("document.querySelector('.analysis-result').textContent.includes('Uncertain') && document.querySelector('.analysis-result').textContent.includes('Needs Review')"), `${width}: ambiguity and review explicit`);
    check(await evaluate("document.querySelector('.analysis-result').textContent.includes('SOURCE') && document.querySelector('.analysis-result').textContent.includes('AI INTERPRETATION') && document.querySelector('.analysis-result').textContent.includes('REVIEW STATUS')"), `${width}: source interpretation review separated`);
    check(await evaluate("location.pathname === '/contracts/upload' && !document.querySelector('.analysis-result').textContent.includes('Grant_Agreement')"), `${width}: no fictional demo substitution`);
    check(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `${width}: no global horizontal overflow`);
    await screenshot(`analysis-result-${width}`);
    await submit();
    await evaluate("document.querySelector('button[aria-label=\"Remove selected file\"]').click()");
    try {
      await reply(200, { analysis });
    } catch (error) {
      // Chromium may already have discarded the intercepted request after the
      // application's AbortController cancellation. That is expected here.
      if (!(error instanceof Error) || error.message !== "Invalid InterceptionId.") throw error;
      await pause(300);
    }
    check(await evaluate("!document.querySelector('.analysis-result') && !document.querySelector('.selected-file')"), `${width}: removing a document prevents stale results`);
  }
  check(runtimeErrors.length === 0, "No uncaught browser runtime errors");
  await writeFile(".qa/analysis-ui-results.json", JSON.stringify({ checks, runtimeErrors }, null, 2));
  console.log(`${checks.filter(c => c.passed).length}/${checks.length} analysis browser checks passed (mock API; no credits used).`);
} finally {
  await command("Fetch.disable");
  socket.close();
}
if (checks.some(c => !c.passed)) process.exitCode = 1;
