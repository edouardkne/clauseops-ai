
import { HTTPCapability, handler, Runner } from "@chainlink/cre-sdk";
import { buildHttpTriggerConfig, type Config } from "./config";
import { onReceipt } from "./handler";

export async function main() {
  const runner = await Runner.newRunner<Config>();

  await runner.run(config => [
    handler(new HTTPCapability().trigger(buildHttpTriggerConfig(config)), onReceipt)
  ]);
}
