//! Pinned-epoch (Edict c75c3f5) proof for the Graft lawpack spike.
//!
//! Mirrors ~/git/echo/tests/edict-provider-host-v1/tests/host_contract.rs as
//! closely as possible: same manifest/registry/host construction, same
//! checked byte artifacts loaded as-is (no regeneration). Only the compiled
//! source differs (our Graft action instead of the original EFFECTFUL_REPLACE
//! fixture), and only via a mechanical intent<->action keyword transform that
//! is checked, not hand-edited.

use std::sync::Arc;

use edict_provider_host_wasmtime::{
    ProviderComponentHost, ProviderHostLimits, ResolvedProviderComponent,
};
use edict_provider_schema::{ProviderArtifactSchemaRegistry, ResolvedProviderSchemaArtifact};
use edict_syntax::{
    bind_target_provider_manifest, compile_to_core, decode_canonical_cbor, encode_canonical_cbor,
    encode_core_module, lower_with_builtin_lowerer, parse_module, select_provider_component,
    validate_provider_lowering_request, BuiltinLowererRequest, BuiltinTargetLowerer,
    CanonicalValue, CompilerContext, CoreBudget, CoreModule, ProviderArtifact,
    ProviderArtifactBinding, ProviderArtifactKind, ProviderArtifactRef, ProviderArtifactSource,
    ProviderBoundArtifact, ProviderDigest, ProviderDigestAlgorithm, ProviderInvocationKind,
    ProviderLoweringInvocationContract, ProviderLoweringOutputKind, ProviderLoweringOutputRequest,
    ProviderLoweringRequest, ProviderResourceRef, ProviderResponseLimits, ProviderSchemaBinding,
    ProviderSchemaFormat, ProviderSemanticInput, ProviderSemanticInputBinding,
    ProviderSemanticInputKind, ResourceRef, TargetEffectLowering, TargetIrLoweringFacts,
    TargetProviderManifest, WriteClass, AUTHORITY_FACTS_API_VERSION, CORE_DIGEST_FRAME,
    CORE_MODULE_DIGEST_DOMAIN, ECHO_DPO_TARGET_PROFILE, ECHO_SPAN_IR_DOMAIN,
    PROVIDER_LAWPACK_ARTIFACT_DOMAIN, TARGET_IR_ARTIFACT_DIGEST_DOMAIN, TARGET_PROFILE_API_VERSION,
    TARGET_PROVIDER_ABI, TARGET_PROVIDER_MANIFEST_API_VERSION, TARGET_PROVIDER_PROTOCOL_VERSION,
};
use sha2::{Digest, Sha256};

const CANONICAL_ACTION_SOURCE: &str =
    include_str!("../record-symbol-change.edict");

const LOWERABILITY_DOMAIN: &str = "edict.lowering-requirements/v1";
const GENERATED_ARTIFACT_DOMAIN: &str = "echo.generated-artifact/v1";
const LOWERER_ROLE: &str = "lowerer.echo-dpo";
const SCHEMA_ROLE: &str = "schema.echo-provider-artifacts";
const TARGET_IR_ROLE: &str = "target-ir.echo-dpo";

const SCHEMA_BYTES: &[u8] = include_bytes!(
    "/Users/james/git/echo/schemas/edict-provider/generated/v1/primary/schema.echo-provider-artifacts.cddl"
);
const TARGET_PROFILE_BYTES: &[u8] = include_bytes!(
    "/Users/james/git/echo/schemas/edict-provider/generated/v1/primary/target-profile.echo-dpo.cbor"
);
const LAWPACK_BYTES: &[u8] = include_bytes!(
    "/Users/james/git/echo/schemas/edict-provider/generated/v1/primary/lawpack.echo-dpo.cbor"
);
const TARGET_AUTHORITY_BYTES: &[u8] = include_bytes!(
    "/Users/james/git/echo/schemas/edict-provider/generated/v1/primary/authority-facts.echo-dpo.cbor"
);
const LAWPACK_AUTHORITY_BYTES: &[u8] = include_bytes!(
    "/Users/james/git/echo/schemas/edict-provider/generated/v1/primary/authority-facts.echo-lawpack.cbor"
);
const LOWERER_COMPONENT_BYTES: &[u8] = include_bytes!(
    "/Users/james/git/echo/schemas/edict-provider/components/v1/lowerer.echo-dpo.component.wasm"
);

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn raw_sha256(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

fn raw_resource(coordinate: &str, bytes: &[u8]) -> ResourceRef {
    ResourceRef {
        coordinate: coordinate.to_owned(),
        digest: Some(format!("sha256:{}", raw_sha256(bytes))),
    }
}

fn locked_test_resource(coordinate: &str, digit: char) -> ResourceRef {
    ResourceRef {
        coordinate: coordinate.to_owned(),
        digest: Some(format!("sha256:{}", digit.to_string().repeat(64))),
    }
}

fn text(value: &str) -> CanonicalValue {
    CanonicalValue::Text(value.to_owned())
}

fn provider_digest(domain: &str, canonical_bytes: &[u8]) -> ProviderDigest {
    decode_canonical_cbor(canonical_bytes).expect("artifact is canonical CBOR");
    let mut framed = vec![0x83];
    framed.extend(
        encode_canonical_cbor(&text(CORE_DIGEST_FRAME)).expect("digest frame tag encodes"),
    );
    framed.extend(encode_canonical_cbor(&text(domain)).expect("digest domain encodes"));
    framed.extend_from_slice(canonical_bytes);
    ProviderDigest {
        algorithm: ProviderDigestAlgorithm::Sha256,
        bytes: Sha256::digest(framed).to_vec(),
    }
}

fn bound_artifact(coordinate: &str, domain: &str, bytes: &[u8]) -> ProviderBoundArtifact {
    ProviderBoundArtifact {
        reference: ProviderResourceRef {
            coordinate: coordinate.to_owned(),
            digest: provider_digest(domain, bytes),
        },
        artifact: ProviderArtifact {
            domain: domain.to_owned(),
            bytes: bytes.to_vec(),
        },
    }
}

fn artifact_binding(bound: &ProviderBoundArtifact) -> ProviderArtifactBinding {
    ProviderArtifactBinding {
        reference: bound.reference.clone(),
        domain: bound.artifact.domain.clone(),
    }
}

fn map(entries: impl IntoIterator<Item = (&'static str, CanonicalValue)>) -> CanonicalValue {
    CanonicalValue::Map(
        entries
            .into_iter()
            .map(|(key, value)| (text(key), value))
            .collect(),
    )
}

/// Copied verbatim (structure and field order) from host_contract.rs's
/// `lowerability_bytes()`. These are generic facts about the `target.replace`
/// effect pattern -- not specific to any one action name or type shape --
/// which is exactly why this can be reused unmodified for a different action.
fn lowerability_bytes() -> Vec<u8> {
    let value = map([
        ("apiVersion", text(LOWERABILITY_DOMAIN)),
        ("operationProfile", text("continuum.profile.write/v1")),
        (
            "semanticEffects",
            CanonicalValue::Array(vec![map([
                ("coordinate", text("target.replace")),
                ("writeClass", text("replace")),
                (
                    "guardKinds",
                    CanonicalValue::Array(vec![text("precommit-atomic")]),
                ),
                (
                    "obstructionCoordinates",
                    CanonicalValue::Array(vec![text("rejected")]),
                ),
                (
                    "footprintObligations",
                    CanonicalValue::Array(vec![text("target.replace.footprint")]),
                ),
                (
                    "costObligations",
                    CanonicalValue::Array(vec![text("target.replace.cost")]),
                ),
            ])]),
        ),
        (
            "requiredWriteClasses",
            CanonicalValue::Array(vec![text("replace")]),
        ),
        (
            "guardKinds",
            CanonicalValue::Array(vec![text("precommit-atomic")]),
        ),
        ("atomicity", text("atomic")),
        ("postconditionSupport", CanonicalValue::Bool(true)),
        (
            "obstructionCoordinates",
            CanonicalValue::Array(vec![text("rejected")]),
        ),
        (
            "footprintObligations",
            CanonicalValue::Array(vec![text("target.replace.footprint")]),
        ),
        (
            "costObligations",
            CanonicalValue::Array(vec![text("target.replace.cost")]),
        ),
        ("opticContract", text("replace-point")),
    ]);
    encode_canonical_cbor(&value).expect("lowerability facts encode canonically")
}

fn semantic_input(
    role: &str,
    kind: ProviderSemanticInputKind,
    coordinate: &str,
    domain: &str,
    bytes: &[u8],
) -> ProviderSemanticInput {
    ProviderSemanticInput {
        role: role.to_owned(),
        kind,
        artifact: bound_artifact(coordinate, domain, bytes),
    }
}

fn echo_manifest(component_bytes: &'static [u8]) -> &'static TargetProviderManifest {
    let component = raw_resource("echo.dpo.lowerer/component@1", component_bytes);
    let schema = raw_resource("echo.provider-artifacts.cddl@1", SCHEMA_BYTES);
    Box::leak(Box::new(TargetProviderManifest {
        api_version: TARGET_PROVIDER_MANIFEST_API_VERSION.to_owned(),
        provider_abi: TARGET_PROVIDER_ABI.to_owned(),
        provider: locked_test_resource("echo.edict-provider-host-witness@1", '1'),
        artifacts: vec![
            ProviderArtifactRef {
                role: LOWERER_ROLE.to_owned(),
                artifact_kind: ProviderArtifactKind::Lowerer,
                resource: component.clone(),
                source: ProviderArtifactSource::Component { component },
            },
            ProviderArtifactRef {
                role: SCHEMA_ROLE.to_owned(),
                artifact_kind: ProviderArtifactKind::ArtifactSchema,
                resource: schema,
                source: ProviderArtifactSource::Generated {
                    semantic_source: locked_test_resource(
                        "echo.edict-provider-host-witness.schema-source@1",
                        '2',
                    ),
                    generator: locked_test_resource(
                        "echo.edict-provider-host-witness.schema-generator@1",
                        '3',
                    ),
                },
            },
        ],
        schema_bindings: [
            (GENERATED_ARTIFACT_DOMAIN, "generated-artifact"),
            (AUTHORITY_FACTS_API_VERSION, "authority-facts"),
            (CORE_MODULE_DIGEST_DOMAIN, "core-module"),
            (PROVIDER_LAWPACK_ARTIFACT_DOMAIN, "lawpack-manifest"),
            (LOWERABILITY_DOMAIN, "lowering-requirements"),
            (TARGET_IR_ARTIFACT_DIGEST_DOMAIN, "target-ir-artifact"),
            (TARGET_PROFILE_API_VERSION, "target-profile-manifest"),
        ]
        .into_iter()
        .map(|(domain, root_rule)| ProviderSchemaBinding {
            domain: domain.to_owned(),
            schema_role: SCHEMA_ROLE.to_owned(),
            format: ProviderSchemaFormat::SelfContainedCddlV1,
            root_rule: root_rule.to_owned(),
        })
        .collect(),
    }))
}

fn echo_registry(
    manifest: &'static TargetProviderManifest,
) -> &'static ProviderArtifactSchemaRegistry {
    let proof = bind_target_provider_manifest(manifest).expect("Echo provider manifest validates");
    Box::leak(Box::new(
        ProviderArtifactSchemaRegistry::from_manifest(
            &proof,
            [ResolvedProviderSchemaArtifact {
                role: SCHEMA_ROLE.to_owned(),
                bytes: Arc::from(SCHEMA_BYTES),
            }],
            [
                GENERATED_ARTIFACT_DOMAIN,
                AUTHORITY_FACTS_API_VERSION,
                CORE_MODULE_DIGEST_DOMAIN,
                PROVIDER_LAWPACK_ARTIFACT_DOMAIN,
                LOWERABILITY_DOMAIN,
                TARGET_IR_ARTIFACT_DIGEST_DOMAIN,
                TARGET_PROFILE_API_VERSION,
            ],
        )
        .expect("Echo provider schema registry constructs"),
    ))
}

fn echo_request_from_core_bytes(
    core_coordinate: &str,
    core_bytes: &[u8],
) -> (ProviderLoweringInvocationContract, ProviderLoweringRequest) {
    let core_artifact = bound_artifact(core_coordinate, CORE_MODULE_DIGEST_DOMAIN, core_bytes);
    let target_profile_artifact = bound_artifact(
        ECHO_DPO_TARGET_PROFILE,
        TARGET_PROFILE_API_VERSION,
        TARGET_PROFILE_BYTES,
    );
    let lowerability = lowerability_bytes();
    let semantic_inputs = vec![
        semantic_input(
            "authority-facts.echo-dpo",
            ProviderSemanticInputKind::AuthorityFacts,
            "echo.dpo-authority-facts@1",
            AUTHORITY_FACTS_API_VERSION,
            TARGET_AUTHORITY_BYTES,
        ),
        semantic_input(
            "authority-facts.echo-lawpack",
            ProviderSemanticInputKind::AuthorityFacts,
            "echo.dpo-lawpack-authority-facts@1",
            AUTHORITY_FACTS_API_VERSION,
            LAWPACK_AUTHORITY_BYTES,
        ),
        semantic_input(
            "lawpack.echo-dpo",
            ProviderSemanticInputKind::Lawpack,
            "echo.dpo-lawpack@1",
            PROVIDER_LAWPACK_ARTIFACT_DOMAIN,
            LAWPACK_BYTES,
        ),
        semantic_input(
            "lowerability.echo-dpo",
            ProviderSemanticInputKind::LowerabilityFacts,
            "echo.dpo-lowerability@1",
            LOWERABILITY_DOMAIN,
            &lowerability,
        ),
    ];
    let contract = ProviderLoweringInvocationContract {
        core: artifact_binding(&core_artifact),
        target_profile: artifact_binding(&target_profile_artifact),
        semantic_inputs: semantic_inputs
            .iter()
            .map(|input| ProviderSemanticInputBinding {
                role: input.role.clone(),
                kind: input.kind.clone(),
                artifact: artifact_binding(&input.artifact),
            })
            .collect(),
    };
    let request = ProviderLoweringRequest {
        protocol_version: TARGET_PROVIDER_PROTOCOL_VERSION,
        core: core_artifact,
        target_profile: target_profile_artifact,
        semantic_inputs,
        requested_outputs: vec![ProviderLoweringOutputRequest {
            role: TARGET_IR_ROLE.to_owned(),
            kind: ProviderLoweringOutputKind::TargetIr,
            domain: TARGET_IR_ARTIFACT_DIGEST_DOMAIN.to_owned(),
        }],
        limits: ProviderResponseLimits {
            max_output_count: 8,
            max_diagnostic_count: 8,
            max_total_response_bytes: 64 * 1024,
        },
    };
    (contract, request)
}

fn graft_pinned_context() -> CompilerContext {
    CompilerContext::new()
        .with_operation_profile("graft.structuralWrite", "continuum.profile.write/v1")
        .with_operation_profile_write_classes("graft.structuralWrite", [WriteClass::Replace])
        .with_effect_write_class("target.replace", WriteClass::Replace)
        .with_budget(
            "graft.tinyBudget",
            CoreBudget {
                max_steps: 8,
                max_allocated_bytes: 1024,
                max_output_bytes: 256,
            },
        )
}

/// Mechanically derives the c75 (`intent`) dialect from the canonical
/// (`action`) source. Asserts exactly one token changed and nothing else.
fn derive_pinned_dialect_source(canonical: &str) -> String {
    let occurrences = canonical.matches("action ").count();
    assert_eq!(
        occurrences, 1,
        "expected exactly one `action ` keyword occurrence in the canonical source"
    );
    let derived = canonical.replacen("action ", "intent ", 1);
    assert_ne!(derived, canonical, "the derived source must actually differ");
    assert_eq!(
        derived.len(),
        canonical.len() - "action".len() + "intent".len(),
        "the derived source must differ ONLY by the keyword's length, nothing else"
    );
    derived
}

fn native_oracle_target_ir(core: &CoreModule) -> edict_syntax::TargetIrArtifact {
    let facts = TargetIrLoweringFacts {
        target_profile: ResourceRef {
            coordinate: ECHO_DPO_TARGET_PROFILE.to_owned(),
            digest: Some(format!("sha256:{}", "0".repeat(64))),
        },
        target_ir_domain: ECHO_SPAN_IR_DOMAIN.to_owned(),
        operation_profiles: vec!["continuum.profile.write/v1".to_owned()],
        obstruction_coordinates: vec!["rejected".to_owned()],
        effect_lowerings: vec![TargetEffectLowering {
            effect: "target.replace".to_owned(),
            target_intrinsic: "echo.dpo@1.replace".to_owned(),
        }],
    };
    lower_with_builtin_lowerer(BuiltinTargetLowerer::EchoDpo, BuiltinLowererRequest {
        core,
        facts: &facts,
    })
    .expect("built-in Echo lowerer accepts our target profile coordinate")
    .artifact
    .expect("native oracle lowers the pinned-epoch Graft action")
}

const ORIGINAL_FIXTURE_SOURCE: &str = r#"package a.b@1;

type Input = { id: String<max=16>, };

type Receipt = { id: String<max=16>, };

type Output = { id: String<max=16>, };

intent t(input: Input) returns Output
  profile p.effectful
  basis none
  budget <= p.tiny {
  let receipt: Receipt = target.replace(input.id)
    else { rejected(reason) => domain.WriteRejected };
  return { id: input.id };
}
"#;

fn original_fixture_context() -> CompilerContext {
    CompilerContext::new()
        .with_operation_profile("p.effectful", "continuum.profile.write/v1")
        .with_operation_profile_write_classes("p.effectful", [WriteClass::Replace])
        .with_effect_write_class("target.replace", WriteClass::Replace)
        .with_budget(
            "p.tiny",
            CoreBudget {
                max_steps: 8,
                max_allocated_bytes: 1024,
                max_output_bytes: 256,
            },
        )
}

/// Written in current (`action`) syntax for readability; mechanically
/// derived to `intent` before being compiled at c75, same as the canonical
/// recordSymbolChange source, so no hand-authored `intent` source exists.
const SINGLE_FIELD_GRAFT_SOURCE_ACTION_DIALECT: &str = r#"package graft.warp.tick@1;

type TickInput = { symbolId: String<max=16>, };

type TickReceipt = { symbolId: String<max=16>, };

type TickOutput = { symbolId: String<max=16>, };

action recordTick(input: TickInput) returns TickOutput
  profile graft.structuralWrite
  basis none
  budget <= graft.tinyBudget {
  let receipt: TickReceipt = target.replace(input.symbolId)
    else { rejected(reason) => graft.TickObstruction.BasisConflict };
  return { symbolId: input.symbolId };
}
"#;

/// Runs one source through parse -> compile_to_core -> real WASM
/// lowerer-component invocation, reusing Echo's checked package unmodified.
/// Returns nothing -- prints a self-contained report for this variant.
fn run_variant(label: &str, source: &str, context: &CompilerContext) {
    println!("\n\n######## VARIANT: {label} ########");
    println!("Source:\n{source}");

    let module = match parse_module(source) {
        Ok(module) => module,
        Err(error) => {
            println!("RESULT: parse_module FAILED: {error:?}");
            return;
        }
    };
    let core = match compile_to_core(&module, context) {
        Ok(core) => core,
        Err(errors) => {
            println!("RESULT: compile_to_core FAILED: {errors:?}");
            return;
        }
    };
    println!("compile_to_core: OK");

    let core_bytes = encode_core_module(&core).expect("Core module encodes canonically");
    let (contract, request) = echo_request_from_core_bytes(&core.coordinate, &core_bytes);

    let manifest = echo_manifest(LOWERER_COMPONENT_BYTES);
    let manifest_proof = Box::leak(Box::new(
        bind_target_provider_manifest(manifest).expect("Echo provider manifest validates"),
    ));
    let selected = select_provider_component(manifest_proof, LOWERER_ROLE, ProviderInvocationKind::Lowering)
        .expect("Echo lowerer component selects from the checked manifest");
    let resolved = ResolvedProviderComponent::new(selected, Arc::from(LOWERER_COMPONENT_BYTES));
    let host = ProviderComponentHost::new().expect("host configures");
    let prepared = host.prepare(&resolved).expect("Echo's checked lowerer component prepares");
    let schema = echo_registry(manifest);
    let contract = Box::leak(Box::new(contract));
    let request = Box::leak(Box::new(request));

    let validated = match validate_provider_lowering_request(schema, contract, request) {
        Ok(validated) => validated,
        Err(error) => {
            println!("RESULT: validate_provider_lowering_request FAILED (did not reach WASM invocation): {error:?}");
            return;
        }
    };
    println!("validate_provider_lowering_request: OK");

    let limits = ProviderHostLimits {
        max_input_bytes: 1024 * 1024,
        max_output_bytes: 3 * 1024 * 1024,
        max_diagnostic_bytes: 3 * 1024 * 1024,
        max_wasm_memory_bytes: 16 * 1024 * 1024,
        max_table_elements: 10_000,
        max_instances: 100,
        max_memories: 8,
        max_tables: 8,
        max_wasm_fuel: 50_000_000,
        max_hostcall_bytes: 4 * 1024 * 1024,
        max_host_diagnostic_bytes: 512,
    };
    match host.invoke_lowerer(&prepared, &validated, schema, limits) {
        Ok(outcome) => {
            if let Some(refusal) = outcome.refusal() {
                println!("RESULT: REAL COMPONENT REFUSED: {refusal:#?}");
            } else if let Some(response) = outcome.response() {
                println!("RESULT: REAL COMPONENT ACCEPTED AND RETURNED A LOWERING RESPONSE:");
                println!("{response:#?}");
            } else {
                println!("RESULT: component returned neither refusal nor response -- unexpected shape");
            }
        }
        Err(error) => {
            println!("RESULT: invoke_lowerer FAILED (host-level error, not a component refusal): {error:?}");
        }
    }
}

fn main() {
    println!("=== PINNED EDICT REVISION: c75c3f550d049485ba00eae0dc272c6dd6aca11f (local worktree) ===");
    println!("Goal: isolate whether Echo's real checked WASM lowerer component's UnsupportedSemantics");
    println!("refusal (seen for the 4-field recordSymbolChange action) is about action SHAPE or about");
    println!("something else -- by testing 3 variants under the identical pinned epoch and pipeline.");

    // Variant 1: the exact original fixture, unmodified. Positive control --
    // this MUST succeed, since it's exactly what the checked component was
    // built and conformance-tested against. If this fails, something is wrong
    // with THIS harness, not with the hypothesis being tested.
    run_variant("1. ORIGINAL FIXTURE (positive control, unmodified)", ORIGINAL_FIXTURE_SOURCE, &original_fixture_context());

    // Variant 2: a Graft-named action with the SAME single-field shape as the
    // original fixture (one String<max=16> field, same effect/obstruction
    // pattern), but different package/type/action/obstruction names.
    let single_field_pinned = derive_pinned_dialect_source(SINGLE_FIELD_GRAFT_SOURCE_ACTION_DIALECT);
    run_variant("2. SINGLE-FIELD GRAFT ACTION (shape matches original, names don't)", &single_field_pinned, &graft_pinned_context());

    // Variant 3: the original 4-field recordSymbolChange (already known to be
    // refused) -- re-run here for a single consolidated comparison.
    let pinned_source = derive_pinned_dialect_source(CANONICAL_ACTION_SOURCE);
    run_variant("3. FOUR-FIELD recordSymbolChange (known refused, re-run for comparison)", &pinned_source, &graft_pinned_context());
}
