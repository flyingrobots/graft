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
    include_str!("../../warp-lawpack-experiment/graft-warp-record-symbol-change.edict");

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
    core_bytes: &[u8],
) -> (ProviderLoweringInvocationContract, ProviderLoweringRequest) {
    let core_artifact = bound_artifact("graft.warp@1", CORE_MODULE_DIGEST_DOMAIN, core_bytes);
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

fn main() {
    println!("=== PINNED EDICT REVISION: c75c3f550d049485ba00eae0dc272c6dd6aca11f (local worktree) ===");

    println!("\n=== STEP 1: mechanical dialect derivation ===");
    let pinned_source = derive_pinned_dialect_source(CANONICAL_ACTION_SOURCE);
    println!("Canonical (action) source SHA-256:  {}", raw_sha256(CANONICAL_ACTION_SOURCE.as_bytes()));
    println!("Derived (intent) source SHA-256:    {}", raw_sha256(pinned_source.as_bytes()));
    println!("Derived source:\n{pinned_source}");

    println!("\n=== STEP 2: parse + compile_to_core at c75 ===");
    let module = parse_module(&pinned_source).expect("derived pinned-dialect source parses under Edict c75");
    let core = compile_to_core(&module, &graft_pinned_context())
        .expect("derived pinned-dialect source compiles to Core under Edict c75");
    println!("compile_to_core: OK");
    println!("Core module (debug):\n{core:#?}");

    println!("\n=== STEP 3: native oracle lowering (built-in Rust lowerer, c75) ===");
    let oracle = native_oracle_target_ir(&core);
    println!("Native oracle Target IR (debug):\n{oracle:#?}");

    println!("\n=== STEP 4: REAL WASM lowerer-component invocation (Echo's checked lowerer.echo-dpo.component.wasm, unmodified) ===");
    let core_bytes = encode_core_module(&core).expect("Core module encodes canonically");
    let (contract, request) = echo_request_from_core_bytes(&core_bytes);

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
    let validated = validate_provider_lowering_request(schema, contract, request);

    match validated {
        Ok(validated) => {
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
                    println!("invoke_lowerer: call succeeded (WASM component executed)");
                    if let Some(refusal) = outcome.refusal() {
                        println!("Component returned a REFUSAL (this is the outcome, not a crash):");
                        println!("{refusal:#?}");
                    } else if let Some(response) = outcome.response() {
                        println!("Component returned a real lowering RESPONSE:");
                        println!("{response:#?}");
                    } else {
                        println!("Component returned neither refusal nor response -- unexpected shape");
                    }
                    if let Some(manifest_used) = outcome.manifest() {
                        println!("Manifest used: {manifest_used:#?}");
                    }
                }
                Err(error) => {
                    println!("invoke_lowerer FAILED (host-level error, not a component refusal):");
                    println!("{error:#?}");
                }
            }
        }
        Err(error) => {
            println!("validate_provider_lowering_request FAILED -- did not reach WASM invocation:");
            println!("{error:#?}");
        }
    }
}
