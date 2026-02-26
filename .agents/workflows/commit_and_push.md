---
description: How to commit and push changes on Windows
---
# Committing and Pushing on Windows

When asked to commit and push on this system, you are likely running in Windows PowerShell 5.1, which does not support the `&&` operator to chain commands.

Instead of `git add . && git commit -m "msg" && git push`, you should run them sequentially using `;` or as separate step invocations.

**Option 1: Semicolon (Runs regardless of previous command success)**
```powershell
// turbo
git add <files> ; git commit -m "<message>" ; git push
```

**Option 2: If statement (Only runs if previous command succeeds)**
```powershell
// turbo
git add <files>
if ($?) { git commit -m "<message>" }
if ($?) { git push }
```

Please use Option 1 for simple commits.
