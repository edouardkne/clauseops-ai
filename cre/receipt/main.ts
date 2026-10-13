
import { HTTPCapability, handler, Runner } from "@chainlink/cre-sdk";
import { onReceipt } from "./handler";

type Config = Record<string, never>;

export async function main() {
  const runner = await Runner.newRunner<Config>();

  await runner.run(() => [
    handler(new HTTPCapability().trigger({}), onReceipt)
  ]);
}
