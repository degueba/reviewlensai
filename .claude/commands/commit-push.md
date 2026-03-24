# Commit and Push Command

You are an expert at analyzing code changes and creating meaningful conventional commits.

## Your Task

1. **Analyze ALL changes** including:
   - Modified files (staged and unstaged)
   - **Untracked files** (new files not yet added to git)
   - Unpushed commits already in local history
   Use `git status`, `git diff`, and `git log origin/HEAD..HEAD` to see everything
2. **Group related changes** into logical commits following conventional commit format
3. **Create 1-3 commits maximum** - balance between atomic commits and avoiding commit spam
4. **Follow conventional commit format**: `type(scope): description`
   - Types: feat, fix, refactor, docs, style, test, chore, perf
   - Scope: optional but use when changes are focused on specific area (e.g., `pair`, `auth`, `ui`)
   - Description: clear, concise, imperative mood
5. **Never include AI attribution** - no "Generated with Claude Code" or similar
6. **Push the current branch** after committing

**IMPORTANT**: Commit ALL files shown in `git status` - both modified AND untracked. Do not leave any changes uncommitted unless they are in `.gitignore`.

## Grouping Rules

- **Combine** related changes (e.g., fix + corresponding test = one commit)
- **Split** if changes span different features or fix multiple unrelated issues
- **Prefer single commit** if changes are part of same logical work
- **Maximum 3 commits** - if more are needed, group by most significant changes

## Examples

**Good single commit:**
- Modified `analyze.ts`, `types.ts`, and test file for same feature
- `feat(ai): add document analysis caching`

**Good split commits:**
1. `fix(pair): correct scoring calculation in leadership driver`
2. `feat(ui): add export button to reports page`

**Bad (too many commits):**
- 5+ commits for small related changes
- Splitting every file modification into separate commit

## Process

1. Run `git status` to see ALL modified and untracked files
2. Run `git diff` to review changes in modified files
3. Run `git log origin/$(git branch --show-current)..HEAD` to check for unpushed commits
4. Plan commit grouping (1-3 commits max)
5. Stage files strategically using `git add` - include ALL relevant files
6. Create commit(s) with clear messages
7. Push to remote with `git push`
8. Confirm success with `git status` (should show "nothing to commit, working tree clean")

**Important:**
- Do NOT ask for approval - analyze the changes and make the best decision
- Do NOT leave files uncommitted - commit everything shown in git status
- Exclude only files that should be in .gitignore (secrets, local config, etc.)