// ---------------------------------------------------------------------------
// EchoKernelTransport — app-safe byte seam to an Echo kernel.
//
// Mirrors the WASM ABI v3 application-dispatch surface
// [echo crates/echo-wasm-abi/src/kernel_port.rs@2048da5c]: intents enter as
// EINT v1 bytes, observations as encoded observe requests, and every return
// is a CBOR wire envelope. No trusted-host authority (package install,
// ingress staging, super_tick, scheduler control, WAL/kernel mutation) may
// ever appear on this interface.
//
// STATUS: WORK IN PROGRESS — NOT WIRED, NOT SHIPPED.
// Graft has no Echo dependency and needs none: no package dependency, no
// local path, no crate, no spawned Echo process. This module is contract
// scaffolding for an integration that is not finished. The transport that
// would reach a real kernel speaks `graft.echo-kernel-command.v1`, a
// protocol no Echo build implements, and it lives unmerged on
// cycle/real-echo-structural-history-provider. Echo shapes cited below were
// read at echo@2048da5c (2026-06-01); Echo has moved on by hundreds of
// commits since, and nothing pins that sha, so treat the citations as
// historical rather than current. Do not wire this into a published
// entrypoint: test/unit/release/echo-independence.test.ts enforces it.
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
