#!/usr/bin/env bats

@test "End-to-end Session REST API workflow" {
  # 1. Create session by cloning a tiny repository
  result=$(curl -s -X POST http://localhost:3000/sessions -H "Content-Type: application/json" -d '{"repositoryUrl": "https://github.com/octocat/Hello-World.git"}')
  session_id=$(echo "$result" | jq -r .sessionId)
  
  [ "$session_id" != "null" ]
  [ -n "$session_id" ]
  
  # 2. List tools
  tools_result=$(curl -s -X GET http://localhost:3000/sessions/$session_id/tools)
  has_capabilities=$(echo "$tools_result" | jq '.tools | map(.name) | contains(["capabilities"])')
  [ "$has_capabilities" = "true" ]
  
  # 3. Try to use safe_read on README
  read_result=$(curl -s -X POST http://localhost:3000/sessions/$session_id/tools/safe_read -H "Content-Type: application/json" -d '{"path": "README"}')
  content=$(echo "$read_result" | jq -r '.content[0].text')
  
  # Check that content contains 'Hello World'
  [[ "$content" == *"Hello World"* ]]
}
