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
const firstId = "f31dd766-f761-4e52-a649-1259bd7b5d42";
const secondId = "17d99272-220f-4e6d-b279-7b81f5bf3c17";
const thirdId = "17d99272-220f-4e6d-b279-7b81f5bf3c18";
const obligation = { id: firstId, title: "Pay supplier invoice", action: "Pay the invoice", description: "Pay after review", responsibleParty: "Customer", category: "payment", deadlineText: null, recurrence: null, evidenceRequired: ["Receipt"], confidence: "direct", needsHumanReview: false, reviewReason: null, source: { pageNumber: 1, quote: "Payment is due within 30 days of invoice receipt." }, sourceVerified: true };
const analysis = { documentTitle: "Synthetic evidence workflow", documentType: "Services", language: "English", summary: "Browser test fixture only.", parties: ["Customer"], warnings: [], obligations: [obligation, { ...obligation, id: secondId, title: "Submit monthly report", action: "Submit monthly report", category: "reporting", evidenceRequired: ["monthly report"] }, { ...obligation, id: thirdId, title: "Archive invoice record", action: "Archive invoice", evidenceRequired: ["Record"] }] };
const match = { obligationId: firstId, match: "possible", explanation: "This document appears relevant to payment, but confirm the transaction.", pageNumber: 1, supportingEvidenceQuote: "Payment is due within 30 days of invoice receipt.", quoteVerified: true, needsHumanReview: true, reviewReason: "Confirm the transaction and parties.", validityText: null, validityVerified: true };
async function click(text) {
  await evaluate(`Array.from(document.querySelectorAll('button,a')).find(e => e.textContent.includes(${JSON.stringify(text)})).click()`);
  await pause(200);
}
async function choose(filename) {
  const {root} = await command("DOM.getDocument");
  const {nodeId} = await command("DOM.querySelector",{nodeId:root.nodeId,selector:"input[type=file]"});
  await command("DOM.setFileInputFiles",{nodeId,files:[]});
  await command("DOM.setFileInputFiles",{nodeId,files:[resolve(filename)]});
}
async function submitMatch() {
  pausedRequest = undefined;
  await click("Match Evidence with AI");
  for(let i=0;i<100&&!pausedRequest;i++) await pause(100);
  if(!pausedRequest) throw new Error("Missing matching request");
  return JSON.parse(pausedRequest.request.postData);
}
async function matchAction(index, label) {
  await evaluate(`Array.from(document.querySelectorAll('.evidence-match')[${index}].querySelectorAll('button')).find(b=>b.textContent.includes(${JSON.stringify(label)})).click()`);
  await pause(150);
}
await mkdir(".qa",{recursive:true});
await writeFile(".qa/Evidence-Workflow.pdf",fixturePdf());
await writeFile(".qa/Receipt-Sample.pdf",fixturePdf());
await writeFile(".qa/Other-Evidence.pdf",fixturePdf());
await command("Page.enable"); await command("Runtime.enable");
await command("Fetch.enable",{patterns:[{urlPattern:"*/api/analyze-contract",requestStage:"Request"},{urlPattern:"*/api/match-evidence",requestStage:"Request"}]});
try {
  for(const width of [1440,390,320]) {
    await command("Emulation.setDeviceMetricsOverride",{width,height:1000,deviceScaleFactor:1,mobile:false});
    await command("Page.navigate",{url:`${origin}/contracts/upload`});
    await until("document.readyState==='complete' && !!document.querySelector('input[type=file]')"); await pause(500);
    const baseline=apiCalls;
    await choose(".qa/Evidence-Workflow.pdf");
    await until("document.body.textContent.includes('PDF text extracted locally')");
    await submit(); await reply(200,{analysis});
    await until("document.querySelectorAll('.analysis-obligation').length===3");
    check(await evaluate("document.querySelector('.analysis-obligation .analysis-heading').textContent.includes('Missing Evidence')"),`${width}: initial Missing Evidence`);
    await click("Review evidence for this contract");
    await until("location.pathname==='/evidence' && !!document.querySelector('.evidence-dropzone')");
    check(await evaluate("!document.body.textContent.includes('Grant agreement')"),`${width}: no fictional evidence mixed into active contract`);
    check(await evaluate("document.querySelector('.demo-pill').textContent.includes('Session intelligence')"),`${width}: active evidence is labelled as session intelligence`);
    await choose(".qa/Receipt-Sample.pdf");
    await until("document.querySelectorAll('.evidence-document').length===1");
    check(apiCalls===baseline+1,`${width}: evidence selection and extraction make no provider request`);
    check(await evaluate("document.querySelector('.evidence-match').textContent.includes('LOCAL MATCH')"),`${width}: exact requirement gets local proposal`);
    check(await evaluate("document.querySelectorAll('.candidate-list input:checked').length===2"),`${width}: deterministic shortlist excludes strong local proposal`);
    const payload=await submitMatch();
    check(Object.keys(payload).sort().join()==="evidence,obligations" && payload.obligations.length===2 && payload.obligations.every(o=>!('source' in o)&&!('description' in o)),`${width}: only evidence text and narrowed structured candidates sent`);
    await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Matching evidence')).click()");
    check(apiCalls===baseline+2,`${width}: duplicate inflight request blocked`);
    await reply(200,{matches:[match,{...match,obligationId:thirdId,match:"weak",supportingEvidenceQuote:"Fabricated synthetic citation",quoteVerified:false,reviewReason:"Quote not verified."}]});
    await until("document.querySelectorAll('.evidence-match').length===3");
    check(await evaluate("Array.from(document.querySelectorAll('.evidence-match')).every(e=>e.dataset.decision==='proposed')"),`${width}: AI creates proposals only`);
    check(await evaluate("Array.from(document.querySelectorAll('.evidence-match')[2].querySelectorAll('button')).find(b=>b.textContent==='Accept Match').disabled"),`${width}: ungrounded proposal cannot be accepted`);
    await matchAction(0,"Accept Match");
    await matchAction(1,"Accept Match");
    check(await evaluate("document.querySelectorAll('.evidence-match')[1].textContent.includes('Needs Review')"),`${width}: acceptance does not clear ambiguity`);
    await evaluate("document.querySelectorAll('.evidence-review')[1].open=true");
    await matchAction(1,"Confirm relevance reviewed");
    check(await evaluate("!Array.from(document.querySelectorAll('.evidence-match')[1].querySelectorAll('.analysis-heading .badge')).some(b=>b.textContent==='Needs Review')"),`${width}: explicit grounded review resolves evidence flag`);
    await matchAction(2,"Reject Match");
    await click("Match Evidence with AI");
    await until("document.body.textContent.includes('Existing matching result reused')");
    check(apiCalls===baseline+2,`${width}: unchanged matching cached`);
    check(await evaluate("document.querySelectorAll('.evidence-match')[2].dataset.decision==='rejected'"),`${width}: rejected proposal remains rejected on reuse`);
    check(await evaluate("document.documentElement.scrollWidth<=innerWidth"),`${width}: evidence has no horizontal overflow`);
    await screenshot(`evidence-${width}`);
    await evaluate("Array.from(document.querySelectorAll('.evidence-match')[1].querySelectorAll('a')).find(a=>a.textContent.includes('View obligation')).click()");
    await until("location.pathname==='/contracts/upload' && !!document.querySelector('.analysis-result')");
    check(await evaluate("document.querySelector('.analysis-obligation .analysis-heading').textContent.includes('Pending')"),`${width}: accepted evidence returns task to Pending`);
    check(await evaluate("document.querySelector('.analysis-obligation').textContent.includes('Receipt-Sample.pdf')"),`${width}: accepted evidence visible on related obligation`);
    await evaluate("document.querySelector('.completion-control input').click()");
    await until("document.querySelector('.analysis-obligation .analysis-heading').textContent.includes('Completed')");
    check(true,`${width}: completion stays explicit`);
    await click("Ask about this contract");
    await until("location.pathname==='/assistant' && !!document.querySelector('.current-contract')");
    for(const index of [3,13,14,15,16,17,18]) await evaluate(`document.querySelectorAll('.assistant-prompts > button')[${index}].click()`);
    await pause(200);
    check(await evaluate("document.querySelectorAll('.conversation-turn').length===7"),`${width}: all seven evidence questions answered`);
    check(await evaluate("document.querySelector('[role=log]').textContent.includes('Receipt-Sample.pdf') && document.querySelector('[role=log]').textContent.includes('Rejected by user')"),`${width}: assistant uses session evidence and rejected decisions`);
    check(apiCalls===baseline+2,`${width}: assistant/navigation/decisions make zero extra calls`);
    check(await evaluate("document.documentElement.scrollWidth<=innerWidth"),`${width}: assistant has no overflow`);
    await screenshot(`evidence-assistant-${width}`);
    await evaluate("document.querySelector('.source-chip').click()");
    await until("location.pathname==='/contracts/upload'"); await click("Review evidence for this contract");
    await until("!!document.querySelector('.evidence-dropzone')");
    await choose(".qa/Receipt-Sample.pdf");
    await until("document.body.textContent.includes('Existing evidence reused')");
    check(await evaluate("document.querySelectorAll('.evidence-document').length===1 && document.querySelectorAll('.evidence-match')[2].dataset.decision==='rejected'"),`${width}: reselection preserves identity and decisions`);
  }
  // One targeted error/empty/retry check on a new evidence document.
  await choose(".qa/Other-Evidence.pdf"); await until("document.querySelectorAll('.evidence-document').length===2");
  async function submitSecond() {
    pausedRequest=undefined;
    await evaluate("Array.from(document.querySelectorAll('.evidence-document')[1].querySelectorAll('button')).find(b=>b.textContent==='Match Evidence with AI').click()");
    for(let i=0;i<100&&!pausedRequest;i++) await pause(100);
    if(!pausedRequest) throw new Error('Retry request not intercepted');
  }
  await submitSecond(); await reply(503,{error:"Synthetic failure"});
  check(await evaluate("document.body.textContent.includes('Your extracted evidence and decisions are preserved')"),"Sanitized API error preserves local evidence");
  await submitSecond(); await reply(200,{matches:[]});
  check(await evaluate("document.body.textContent.includes('No relevant matches found')"),"Empty matching result is a useful state");
  check(runtimeErrors.length===0,"No uncaught runtime errors");
  await writeFile('.qa/evidence-ui-results.json',JSON.stringify({checks,runtimeErrors},null,2));
  console.log(`${checks.filter(c=>c.passed).length}/${checks.length} targeted evidence browser checks passed (mock APIs).`);
} finally { await command("Fetch.disable"); socket.close(); }
if(checks.some(c=>!c.passed)) process.exitCode=1;
