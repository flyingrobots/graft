import { type JsonObject, parseJsonObject } from "../contracts/json-object.js";

export function parseJsonTextObject(text: string, label: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} was not valid JSON`);
  }
  return parseJsonObject(parsed, label);
}
