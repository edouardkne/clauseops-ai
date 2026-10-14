export type Config = {
  authorizedEVMAddress?: string;
};

export function buildHttpTriggerConfig(config: Config) {
  const address = config.authorizedEVMAddress;
  if (address === undefined) return {};
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("authorizedEVMAddress must be a 20-byte EVM address");
  }
  return {
    authorizedKeys: [{
      type: "KEY_TYPE_ECDSA_EVM" as const,
      publicKey: address,
    }],
  };
}
