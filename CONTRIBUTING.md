# Contributing

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin](https://developercertificate.org/) (version 1.1). Every commit must include a `Signed-off-by` trailer with your name and email, matching what you use for Git author information.

You can add it automatically when you commit:

```bash
git commit -s
# or
git commit --signoff
```

That appends:

```text
Signed-off-by: Random J Developer <random@developer.example.org>
```

By adding this line, you certify the DCO terms for that contribution.

### Fixing commits without a sign-off

If you already made commits without `-s`, amend the last one:

```bash
git commit --amend --signoff --no-edit
```

For several commits on your branch:

```bash
git fetch origin main
git rebase origin/main --signoff
```

(Adjust `main` if your default branch differs.)
