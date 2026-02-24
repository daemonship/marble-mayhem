# Session Summary

## Human

Continue: Remove debug overlay from src/scenes/Game.ts in /home/shazbot/Projects/products/games/spudstorm, then commit and push. Remove: (1) `private debugText!: Phaser.GameObjects.Text;` class property, (2) the `this.debugText = this.add.text(...)` block in create() labeled "DEBUG: show pointer coords", (3) the `// DEBUG` update block in update(). Then: git add src/main.ts src/scenes/Game.ts && git commit -m "fix: mouse always active, scope DOM overlays to game-container" && git push. Verify at https://spudstorm.pages.dev. Read RESUME_SPUDSTORM.md for full context.

## Assistant

[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/Game.ts"]
[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/src/main.ts"]
Let me check the RESUME file and the git diff to understand the full state:

[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/RESUME_SPUDSTORM.md"]
[Tool: Bash cmd="git diff HEAD src/main.ts src/scenes/Game.ts"]
[Tool: Skill skill="handoff"]

## Human

**STOP. DO NOT RUN BASH COMMANDS IN MAIN SESSION. USE THE AGENT.**

## Spawn context-handoff-executor Agent IMMEDIATELY

When `/handoff` is invoked, your ONLY action is to spawn the `context-handoff-executor` agent using the Task tool.

**DO NOT:**
- Run bash commands
- Generate CONTEXT yourself
- Create files directly
- Ask the user questions

**DO:**
- Use Task tool with `subagent_type: context-handoff-executor`
- Pass the project info in the prompt

## Task Parameters

```json
{
  "subagent_type": "context-handoff-executor",
  "model": "sonnet",
  "description": "Create CONTEXT and RESUME files"
}
```

## Prompt to Send Agent

```
Create CONTEXT and RESUME files for this project.

Get project info:
```bash
HANDOFF_DIR="$(pwd)"
PROJECT=$(basename "$HANDOFF_DIR" | tr '[:lower:] -' '[:upper:]__')
echo "PROJECT=$PROJECT"
echo "HANDOFF_DIR=$HANDOFF_DIR"
```

Then do:

1. Find transcript at ~/.claude/projects/[hash]/*.jsonl (latest non-agent file)
2. Run: python ~/.claude/scripts/context_summarizer.py [transcript] -o CONTEXT_${PROJECT}.md
3. Read CONTEXT fully
4. Get git state
5. Create RESUME_${PROJECT}.md with:
   - Date, status
   - Active plans (from CONTEXT - find @*.md references)
   - Current state (detailed from CONTEXT)
   - IMMEDIATE NEXT TASK (specific and actionable)
   - Link to CONTEXT file
   Target: under 2000 tokens
6. Archive old files to docs/history/handoff_archive/
7. Write next session prompt to ~/.claude/next_session_prompt_${PROJECT}.txt
   This prompt will be passed to `claude -p` on auto-restart. It MUST be actionable:
   - Start with "Continue: " followed by the specific task that was interrupted
   - Include enough context to resume without reading RESUME (e.g., "Continue: merge TI-marketplace-pairwise-test into dev and push. You were reviewing PR #11 non-blocking items.")
   - NEVER use "await user instructions" - the whole point is unattended restart
8. Report: "CONTEXT and RESUME created. Next: [task]"
```

## After Agent Completes

1. Signal handoff completion to the session state system:
```bash
python3 -c "
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path.home() / '.claude/hooks/lib'))
from hook_state import set_global
import time

# Get project directory and convert to project identifier
project_dir = Path.cwd()
project_id = str(project_dir).replace('/', '-').lstrip('-')

# Include pane_id so only THIS session's Stop hook triggers the restart
set_global('handoff_ready', {
    'timestamp': time.time(),
    'project': project_id,
    'pane_id': os.environ.get('TMUX_PANE', '')
})
print(f'✓ handoff_ready set for {project_id} (pane {os.environ.get(\"TMUX_PANE\", \"no-tmux\")})')
"
```

2. Tell user: "Handoff complete. Ctrl+D to exit - session will restart automatically."

## Assistant

[Tool: Task desc="Create CONTEXT and RESUME files" type="context-handoff-executor"]
