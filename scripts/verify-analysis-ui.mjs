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
  id: "f31dd766-f761-4e52-a649-1259bd7b5d42", title: "Pay the supplier invoice", description: "Pay the invoice after review.",
  action: "Pay the invoice.", responsibleParty: "Customer", category: "payment", deadlineText: null,
  recurrence: null, evidenceRequired: [], confidence: "direct", needsHumanReview: false, reviewReason: null,
  source: { pageNumber: 1, quote: "Payment is due within 30 days of invoice receipt." }, sourceVerified: true,
};
const analysis = {
  documentTitle: "Synthetic Contract Intelligence", documentType: "Service agreement", language: "English",
  parties: ["Customer", "Supplier"], summary: "Synthetic fixture for Phase 2B browser checks only.", warnings: [],
  obligations: [obligation,
    { ...obligation, id: "17d99272-220f-4e6d-b279-7b81f5bf3c17", title: "Submit monthly report", category: "reporting", responsibleParty: "Supplier", confidence: "inferred", deadlineText: "within 30 days of notice", evidenceRequired: ["Report"], source: { pageNumber: 1, quote: "The Supplier shall submit a monthly report." } },
    { ...obligation, id: "17d99272-220f-4e6d-b279-7b81f5bf3c18", title: "Unverified interpretation", category: "data_protection", confidence: "uncertain", responsibleParty: null, sourceVerified: false, source: { pageNumber: 1, quote: "Unmatched synthetic quote." } },
  ],
};
async function clickText(text) {
  await evaluate(`Array.from(document.querySelectorAll('button,a')).find(element => element.textContent.includes(${JSON.stringify(text)})).click()`);
  await pause(250);
}
async function selectPdf(filename) {
  const { root } = await command("DOM.getDocument");
  const { nodeId } = await command("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
  await command("DOM.setFileInputFiles", { nodeId, files: [] });
  await command("DOM.setFileInputFiles", { nodeId, files: [resolve(filename)] });
  await until("document.body.textContent.includes('PDF text extracted locally')");
}
async function metric(label) {
  return evaluate(`Array.from(document.querySelectorAll('.analysis-counts > div')).find(div => div.querySelector('dt').textContent === ${JSON.stringify(label)})?.querySelector('dd').textContent`);
}
await mkdir(".qa", { recursive: true });
await writeFile(".qa/Intelligence-Sample.pdf", fixturePdf());
await writeFile(".qa/Different-Sample.pdf", fixturePdf());
await command("Page.enable");
await command("Runtime.enable");
await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/analyze-contract", requestStage: "Request" }] });
try {
  for (const width of [1440, 390, 320]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command("Page.navigate", { url: `${origin}/` });
    await until("document.readyState === 'complete' && !!document.querySelector('.source-preview')");
    check(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `${width}: landing has no horizontal overflow`);
    check(await evaluate("!document.body.textContent.includes('Phase 1') && !document.body.textContent.includes('No document upload') && !document.body.textContent.includes('Grant_Agreement')"), `${width}: landing represents current capabilities`);
    check(await evaluate("Array.from(document.querySelectorAll('a')).filter(a=>a.textContent.includes('Analyze a contract')).every(a=>a.getAttribute('href')==='/contracts/upload')"), `${width}: landing CTAs open real workflow`);
    await screenshot(`consolidated-landing-${width}`);
    await command("Page.navigate", { url: `${origin}/evidence` });
    await until("document.readyState === 'complete' && !!document.querySelector('.sample-evidence')");
    check(await evaluate("!document.querySelector('.sample-evidence').open && document.body.textContent.includes('Start with a contract')"), `${width}: evidence starts with real empty state and separate collapsed samples`);
    await command("Page.navigate", { url: `${origin}/settings` });
    await until("document.readyState === 'complete' && !!document.querySelector('.settings-list')");
    check(await evaluate("document.documentElement.scrollWidth <= innerWidth && document.body.textContent.includes('Upcoming')"), `${width}: settings responsive and independent verification upcoming`);
    await command("Page.navigate", { url: `${origin}/contracts/upload` });
    await until("document.readyState === 'complete' && !!document.querySelector('input[type=file]')");
    await pause(400);
    const baseline = apiCalls;
    await selectPdf(".qa/Intelligence-Sample.pdf");
    check(apiCalls === baseline, `${width}: no AI activity on render or extraction`);
    const intercepted = await submit();
    const payload = JSON.parse(intercepted.request.postData);
    check(Object.keys(payload).sort().join() === "filename,pages" && payload.pages.every(page => Object.keys(page).sort().join() === "pageNumber,text"), `${width}: only filename and page text transmitted`);
    await evaluate("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analysing')).click()");
    check(apiCalls === baseline + 1, `${width}: in-flight duplicate blocked`);
    await reply(200, { analysis });
    await until("document.querySelectorAll('.analysis-obligation').length === 3");
    for (const [label, expected] of [["Obligations found", 3], ["Direct", 1], ["Inferred", 1], ["Uncertain", 1], ["Needs human review", 2], ["Citations verified", 2], ["Citations unverified", 1], ["With deadline wording", 1], ["Require evidence", 1], ["Missing responsible party", 1], ["Without a clear calendar deadline", 3]]) {
      check(await metric(label) === String(expected), `${width}: summary ${label}`);
    }
    check(await evaluate("document.querySelectorAll('.review-queue details').length === 2"), `${width}: review queue populated`);
    await evaluate("document.querySelector('.review-queue details').open = true");
    check(await evaluate("document.querySelector('.review-queue').textContent.includes('inferred rather than directly stated') && document.querySelector('.review-queue').textContent.includes('cannot safely be converted')"), `${width}: actual review reasons and unsafe deadline visible`);
    await clickText("Reuse current analysis");
    check(apiCalls === baseline + 1, `${width}: repeated analysis reuses cached result`);
    check(await evaluate("document.body.textContent.includes('No AI request was sent')"), `${width}: cache reuse feedback`);
    await evaluate("document.querySelector('.completion-control input').click()");
    await until("document.querySelector('.analysis-obligation .analysis-heading').textContent.includes('Completed')");
    check(await evaluate("document.querySelector('.analysis-obligation').textContent.includes('Task completion was recorded by the user')"), `${width}: explicit session completion changes status`);
    await evaluate("document.querySelectorAll('.completion-control input')[1].click()");
    check(await evaluate("document.querySelectorAll('.analysis-obligation')[1].querySelector('.analysis-heading').textContent.includes('Needs Review')"), `${width}: completion cannot bypass review`);
    await evaluate("(() => { const select = document.querySelector('select[aria-label=\"Filter real obligations\"]'); select.value = 'payment'; select.dispatchEvent(new Event('change', {bubbles:true})); })()");
    await pause(150);
    check(await evaluate("document.querySelectorAll('.analysis-obligation').length === 1 && document.querySelector('.analysis-obligation h3').textContent.includes('Pay the supplier')"), `${width}: payment filter works`);
    await evaluate("(() => { const select = document.querySelector('select[aria-label=\"Filter real obligations\"]'); select.value = 'all'; select.dispatchEvent(new Event('change', {bubbles:true})); })()");
    await pause(150);
    check(await evaluate("document.querySelector('.analysis-result').textContent.includes('SOURCE') && document.querySelector('.analysis-result').textContent.includes('AI INTERPRETATION') && document.querySelector('.analysis-result').textContent.includes('OPERATIONAL STATE') && document.querySelector('.analysis-result').textContent.includes('HUMAN REVIEW')"), `${width}: intelligence layers separated`);
    check(await evaluate("document.querySelector('.analysis-result').textContent.includes('Verified source') && document.querySelector('.analysis-result').textContent.includes('Unverified source')"), `${width}: citation verification states retained`);
    check(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `${width}: results have no horizontal overflow`);
    check(await evaluate("!document.querySelector('.analysis-result').textContent.includes('Grant_Agreement')"), `${width}: no fictional demo result`);
    await screenshot(`intelligence-result-${width}`);
    await clickText("Ask about this contract");
    await until("location.pathname === '/assistant' && !!document.querySelector('.current-contract')");
    check(await evaluate("document.querySelector('.current-contract').textContent.includes('Intelligence-Sample.pdf')"), `${width}: assistant uses current session across navigation`);
    for (let index = 0; index < 13; index++) {
      await evaluate(`document.querySelectorAll('.assistant-prompts > button')[${index}].click()`);
    }
    await pause(150);
    check(await evaluate("document.querySelectorAll('.conversation-turn').length === 13"), `${width}: all supported local questions answered`);
    check(await evaluate("document.querySelector('[role=log]').textContent.includes('3 obligations were found') && document.querySelector('[role=log]').textContent.includes('Source page 1')"), `${width}: local counts and source lookup grounded`);
    await evaluate("(() => { const input = document.querySelector('#assistant-question'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Explain the business risks'); input.dispatchEvent(new Event('input', {bubbles:true})); })()");
    await pause(100);
    await evaluate("document.querySelector('button[aria-label=\"Send question\"]').click()");
    await pause(150);
    check(await evaluate("document.querySelector('[role=log]').textContent.includes('Generative assistance is not enabled')"), `${width}: synthesis does not silently call a provider`);
    check(apiCalls === baseline + 1, `${width}: navigation, review toggles, statuses and all assistant questions make zero extra API calls`);
    check(await evaluate("document.documentElement.scrollWidth <= innerWidth"), `${width}: assistant has no horizontal overflow`);
    await screenshot(`intelligence-assistant-${width}`);
    await evaluate("document.querySelector('.source-chip').click()");
    await until("location.pathname === '/contracts/upload' && !!document.querySelector('.analysis-result')");
    check(await evaluate("document.querySelector('.analysis-obligation .analysis-heading').textContent.includes('Completed')"), `${width}: completion persists across workspace navigation`);
    await selectPdf(".qa/Intelligence-Sample.pdf");
    await clickText("Analyze with AI");
    await until("!!document.querySelector('.analysis-result')");
    check(apiCalls === baseline + 1, `${width}: reselecting identical PDF reuses session analysis`);
    await selectPdf(".qa/Different-Sample.pdf");
    await submit();
    check(apiCalls === baseline + 2, `${width}: a different document makes one explicit request`);
    await reply(200, { analysis: { ...analysis, documentTitle: "Different synthetic document", obligations: [] } });
    await until("document.body.textContent.includes('No operational obligations identified')");
    check(await metric("Obligations found") === "0", `${width}: new document has isolated intelligence`);
    await clickText("Clear analysis session");
    check(await evaluate("!document.querySelector('.analysis-result')"), `${width}: explicit session clearing works`);
  }
  await command("Page.navigate", { url: `${origin}/contracts/upload` });
  await until("document.readyState === 'complete' && !!document.querySelector('input[type=file]')");
  await pause(400);
  await selectPdf(".qa/Intelligence-Sample.pdf");
  await submit(); await reply(503, { error: "Synthetic unavailable response" });
  check(await evaluate("document.body.textContent.includes('AI analysis is unavailable') && document.body.textContent.includes('PDF text extracted locally')"), "Analysis failure keeps extraction available");
  await submit(); await reply(200, { analysis: { ...analysis, obligations: [] } });
  await until("document.body.textContent.includes('No operational obligations identified')");
  check(await evaluate("document.body.textContent.includes('No review flags were found')"), "Empty review queue has a useful state");
  await command("Page.navigate", { url: `${origin}/assistant` });
  await until("document.readyState === 'complete' && !!document.querySelector('.assistant-empty')");
  check(await evaluate("document.body.textContent.includes('No analysed contract in this session')"), "Fresh session never falls back to fictional obligations");
  check(runtimeErrors.length === 0, "No uncaught browser runtime errors");
  await writeFile(".qa/intelligence-ui-results.json", JSON.stringify({ checks, runtimeErrors }, null, 2));
  console.log(`${checks.filter(c => c.passed).length}/${checks.length} targeted consolidation browser checks passed (mock API; zero credits used).`);
} finally {
  await command("Fetch.disable");
  socket.close();
}
if (checks.some(c => !c.passed)) process.exitCode = 1;
