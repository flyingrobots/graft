// ---------------------------------------------------------------------------
// EchoKernelTransport — app-safe byte seam to an Echo kernel.
//
// Mirrors the WASM ABI v3 application-dispatch surface
// [echo crates/echo-wasm-abi/src/kernel_port.rs@2048da5c]: intents enter as
// EINT v1 bytes, observations as encoded observe requests, and every return
// is a CBOR wire envelope. No trusted-host authority (package install,
// ingress staging, super_tick, scheduler control, WAL/kernel mutation) may
// ever appear on this interface.
// ---------------------------------------------------------------------------

export interface EchoKernelInfo {
  readonly module: string;
  readonly codecId: string;
}

export interface EchoKernelTransport {
  kernelInfo(): EchoKernelInfo;
  submitIntentBytes(intentBytes: Uint8Array): Uint8Array;
  observeBytes(requestBytes: Uint8Array): Uint8Array;
}

/** Reserved scheduler/control op id; forbidden at application dispatch. */
export const CONTROL_INTENT_V1_OP_ID = 0xffffffff;
