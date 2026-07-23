#!/usr/bin/env bats

setup_file() {
  # Spin up container (forcing build to copy codebase, not bind)
  docker compose -f test/e2e/rest-sessions/docker-compose.yml up -d --build
  
  # Wait for REST API to become ready (max 30 seconds)
  for i in {1..30}; do
    if curl -s http://localhost:3001/tools >/dev/null; then
      return 0
    fi
    sleep 1
  done
  echo "Failed to start REST server in Docker container"
  return 1
}

teardown_file() {
  docker compose -f test/e2e/rest-sessions/docker-compose.yml down
}

@test "Global endpoint security and schema validation" {
  # 1. Get global tools
  tools_result=$(curl -s -X GET http://localhost:3001/tools)
  
  # Ensure run_capture is NOT exposed globally
  has_run_capture=$(echo "$tools_result" | jq '.tools | map(.name) | contains(["run_capture"])')
  [ "$has_run_capture" = "false" ]
  
  # Ensure inputSchema contains draft-07/schema or standard type for capabilities
  schema_format=$(echo "$tools_result" | jq -r '.tools[] | select(.name == "capabilities") | .inputSchema.properties.family.type')
  [ "$schema_format" = "string" ]
}

@test "Provision session and interact with sandbox tools" {
  # 1. Create session cloning Hello-World
  result=$(curl -s -X POST http://localhost:3001/sessions -H "Content-Type: application/json" -d '{"repositoryUrl": "https://github.com/octocat/Hello-World.git"}')
  session_id=$(echo "$result" | jq -r .sessionId)
  session_dir=$(echo "$result" | jq -r .sessionDir)
  
  # Ensure sessionId exists and sessionDir is NOT leaked
  [ "$session_id" != "null" ]
  [ -n "$session_id" ]
  [ "$session_dir" = "null" ]
  
  # 2. Check session tools
  session_tools=$(curl -s -X GET http://localhost:3001/sessions/$session_id/tools)
  
  # Ensure run_capture is NOT exposed in the session tools
  has_run_capture=$(echo "$session_tools" | jq '.tools | map(.name) | contains(["run_capture"])')
  [ "$has_run_capture" = "false" ]
  
  # 3. Call capabilities tool
  cap_result=$(curl -s -X POST http://localhost:3001/sessions/$session_id/tools/capabilities -H "Content-Type: application/json" -d '{}')
  reason=$(echo "$cap_result" | jq -r '.structuredContent.reason')
  [ "$reason" = "CAPABILITY_SUMMARY" ]
  
  # 4. Call safe_read tool on README
  read_result=$(curl -s -X POST http://localhost:3001/sessions/$session_id/tools/safe_read -H "Content-Type: application/json" -d '{"path": "README"}')
  content=$(echo "$read_result" | jq -r '.content[0].text')
  [[ "$content" == *"Hello World"* ]]
  
  # 5. Call graft_map on directory root
  map_result=$(curl -s -X POST http://localhost:3001/sessions/$session_id/tools/graft_map -H "Content-Type: application/json" -d '{"path": "."}')
  truncated=$(echo "$map_result" | jq -r '.structuredContent.truncated')
  # Hello-World is small, should not be truncated
  [ "$truncated" = "null" ]
  
  # 6. Verify stats captures the operations
  stats_result=$(curl -s -X POST http://localhost:3001/sessions/$session_id/tools/stats -H "Content-Type: application/json" -d '{}')
  non_read_bytes=$(echo "$stats_result" | jq -r '.structuredContent.totalNonReadBytesReturned')
  [ "$non_read_bytes" -gt 0 ]
  
  # 7. Ensure calling run_capture directly fails with 404
  run_capture_result=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/sessions/$session_id/tools/run_capture -H "Content-Type: application/json" -d '{"command": "id"}')
  [ "$run_capture_result" = "404" ]
}

@test "Invoke tools via GET query parameters" {
  # 1. Create session cloning Hello-World via GET
  result=$(curl -s -X GET "http://localhost:3001/sessions?repositoryUrl=https://github.com/octocat/Hello-World.git")
  session_id=$(echo "$result" | jq -r .sessionId)
  
  # 2. Call safe_read via GET
  read_result=$(curl -s -X GET "http://localhost:3001/sessions/$session_id/tools/safe_read?path=README")
  content=$(echo "$read_result" | jq -r '.content[0].text')
  [[ "$content" == *"Hello World"* ]]

  # 3. Call capabilities via GET with family filter
  cap_result=$(curl -s -X GET "http://localhost:3001/sessions/$session_id/tools/capabilities?family=session")
  reason=$(echo "$cap_result" | jq -r '.structuredContent.reason')
  [ "$reason" = "CAPABILITY_FAMILY_DETAIL" ]
}


