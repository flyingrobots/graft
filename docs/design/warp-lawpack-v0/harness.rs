use edict_syntax::{
    compile_to_core, lower_with_builtin_lowerer, parse_module, BuiltinLowererRequest,
    BuiltinTargetLowerer, CompilerContext, CoreBudget, ResourceRef, TargetEffectLowering,
    TargetIrLoweringFacts, WriteClass, ECHO_DPO_TARGET_PROFILE, ECHO_SPAN_IR_DOMAIN,
};
use sha2::{Digest, Sha256};

const GRAFT_SOURCE: &str = include_str!("../graft-warp-record-symbol-change.edict");

fn source_sha256() -> String {
    let mut hasher = Sha256::new();
    hasher.update(GRAFT_SOURCE.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn full_context() -> CompilerContext {
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

fn target_facts() -> TargetIrLoweringFacts {
    TargetIrLoweringFacts {
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
    }
}

fn main() {
    println!("=== EDICT_REVISION (actual, local path dep to ~/git/edict @ HEAD): 9f1a11e0358caeb03339f0035333f8a49a2a814a ===");
    println!("=== NOTE: Echo's pinned cross-repo test harness is still at c75c3f5 (10 commits behind), which predates the Intent->Action rename ===");
    println!("=== SOURCE SHA256: {} ===", source_sha256());
    println!("=== SOURCE ===\n{GRAFT_SOURCE}");

    println!("\n=== POSITIVE CASE: full context ===");
    let module = parse_module(GRAFT_SOURCE).expect("Graft lawpack source parses");
    let core = compile_to_core(&module, &full_context());
    match core {
        Ok(core) => {
            println!("compile_to_core: OK");
            println!("Core module (debug): {core:#?}");

            let facts = target_facts();
            let report =
                lower_with_builtin_lowerer(BuiltinTargetLowerer::EchoDpo, BuiltinLowererRequest {
                    core: &core,
                    facts: &facts,
                })
                .expect("built-in Echo lowerer accepts our target profile coordinate");

            println!("\nlower_to_target_ir status: {:?}", report.status);
            println!("lower_to_target_ir failures: {:?}", report.failures);
            match report.artifact {
                Some(artifact) => {
                    println!("\n=== TARGET IR ARTIFACT ===");
                    println!("domain: {}", artifact.domain);
                    println!("target_profile: {:?}", artifact.target_profile);
                    println!("source_core_coordinate: {}", artifact.source_core_coordinate);
                    println!("action names: {:?}", artifact.actions.keys().collect::<Vec<_>>());
                    for (name, action) in &artifact.actions {
                        println!("\n--- action `{name}` ---");
                        println!("operation_profile: {}", action.operation_profile);
                        println!("core_evaluation_budget: {:?}", action.core_evaluation_budget);
                        println!("steps: {}", action.steps.len());
                        for step in &action.steps {
                            println!(
                                "  step `{}`: effect={} target_intrinsic={} obstruction_arms={:?}",
                                step.id,
                                step.effect,
                                step.target_intrinsic,
                                step.obstruction_arms.keys().collect::<Vec<_>>()
                            );
                        }
                        println!("result: {:?}", action.result);
                    }
                }
                None => println!("NO ARTIFACT PRODUCED (unsupported)"),
            }
        }
        Err(errors) => {
            println!("compile_to_core FAILED (unexpected for positive case):");
            for e in &errors {
                println!("  {e:?}");
            }
        }
    }

    println!("\n\n=== NEGATIVE CONTROL 1: missing graft.structuralWrite operation profile ===");
    let ctx = CompilerContext::new()
        // .with_operation_profile("graft.structuralWrite", "continuum.profile.write/v1") // REMOVED
        .with_operation_profile_write_classes("graft.structuralWrite", [WriteClass::Replace])
        .with_effect_write_class("target.replace", WriteClass::Replace)
        .with_budget(
            "graft.tinyBudget",
            CoreBudget { max_steps: 8, max_allocated_bytes: 1024, max_output_bytes: 256 },
        );
    match compile_to_core(&module, &ctx) {
        Ok(_) => println!("UNEXPECTED: compiled successfully without the operation profile fact"),
        Err(errors) => {
            println!("Expected failure. Diagnostics:");
            for e in &errors {
                println!("  {e:?}");
            }
        }
    }

    println!("\n=== NEGATIVE CONTROL 2: missing graft.tinyBudget budget ===");
    let ctx = CompilerContext::new()
        .with_operation_profile("graft.structuralWrite", "continuum.profile.write/v1")
        .with_operation_profile_write_classes("graft.structuralWrite", [WriteClass::Replace])
        .with_effect_write_class("target.replace", WriteClass::Replace);
        // .with_budget(...) // REMOVED
    match compile_to_core(&module, &ctx) {
        Ok(_) => println!("UNEXPECTED: compiled successfully without the budget fact"),
        Err(errors) => {
            println!("Expected failure. Diagnostics:");
            for e in &errors {
                println!("  {e:?}");
            }
        }
    }

    println!("\n=== NEGATIVE CONTROL 3: missing target.replace effect write class ===");
    let ctx = CompilerContext::new()
        .with_operation_profile("graft.structuralWrite", "continuum.profile.write/v1")
        .with_operation_profile_write_classes("graft.structuralWrite", [WriteClass::Replace])
        // .with_effect_write_class("target.replace", WriteClass::Replace) // REMOVED
        .with_budget(
            "graft.tinyBudget",
            CoreBudget { max_steps: 8, max_allocated_bytes: 1024, max_output_bytes: 256 },
        );
    match compile_to_core(&module, &ctx) {
        Ok(_) => println!("UNEXPECTED: compiled successfully without the effect write class fact"),
        Err(errors) => {
            println!("Expected failure. Diagnostics:");
            for e in &errors {
                println!("  {e:?}");
            }
        }
    }

    println!("\n=== NEGATIVE CONTROL 4: renamed obstruction identifier (does the compiler care?) ===");
    let renamed_source = GRAFT_SOURCE.replace(
        "graft.SymbolChangeObstruction.BasisConflict",
        "graft.SymbolChangeObstruction.SomethingElseEntirely",
    );
    assert_ne!(renamed_source, GRAFT_SOURCE, "replacement must actually change the source");
    let renamed_module = parse_module(&renamed_source).expect("renamed source still parses");
    match compile_to_core(&renamed_module, &full_context()) {
        Ok(_) => println!(
            "Compiled successfully with a renamed obstruction identifier -> obstruction names are author-chosen labels, not facts the CompilerContext resolves."
        ),
        Err(errors) => {
            println!("Renaming the obstruction identifier caused a failure. Diagnostics:");
            for e in &errors {
                println!("  {e:?}");
            }
        }
    }
}
