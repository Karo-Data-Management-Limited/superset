# Branching Strategy Quick Reference

## Branch Overview

| Branch | Purpose | Builds | GHCR Tags |
|--------|---------|--------|-----------|
| `master` | Upstream sync | ❌ Disabled | None |
| `develop` | Development work | ✅ Enabled | `develop`, `develop-<preset>-<run_id>` |
| `release/*` | Release candidates | ✅ Enabled | `rc-<version>`, `rc-<version>-<preset>-<run_id>` |
| `production` | Stable releases | ✅ Enabled | `stable`, `<preset>` |
| Git tags (`v*`) | Version releases | ✅ Enabled | `latest`, `<version>`, `<version>-<preset>` |

## Common Commands

### Sync with Upstream
```bash
# Setup upstream (one-time)
git remote add upstream https://github.com/apache/superset.git

# Sync master
git checkout master
git fetch upstream
git merge upstream/master
git push origin master

# Update develop
git checkout develop
git merge master
git push origin develop
```

### Create Feature
```bash
git checkout develop
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# Create PR to develop
```

### Create Release
```bash
git checkout develop
git checkout -b release/v1.0.0
# Update versions
git commit -m "chore: Prepare v1.0.0"
git push origin release/v1.0.0
# Test RC images: ghcr.io/YOUR_ORG/superset:rc-v1.0.0
```

### Deploy to Production
```bash
# Merge release to production
git checkout production
git merge release/v1.0.0
git push origin production

# Tag the release
git tag v1.0.0
git push origin v1.0.0
# Production images: ghcr.io/YOUR_ORG/superset:v1.0.0, :latest

# Merge back to develop
git checkout develop
git merge release/v1.0.0
git push origin develop
```

## Image Tags by Branch/Tag

### develop branch
- `ghcr.io/YOUR_ORG/superset:develop` (lean preset)
- `ghcr.io/YOUR_ORG/superset:develop-dev`
- `ghcr.io/YOUR_ORG/superset:develop-py310`
- etc.

### release/v1.0.0 branch
- `ghcr.io/YOUR_ORG/superset:rc-v1.0.0` (lean preset)
- `ghcr.io/YOUR_ORG/superset:rc-v1.0.0-dev`
- `ghcr.io/YOUR_ORG/superset:rc-v1.0.0-py310`
- etc.

### production branch
- `ghcr.io/YOUR_ORG/superset:stable` (lean preset)
- `ghcr.io/YOUR_ORG/superset:lean`
- `ghcr.io/YOUR_ORG/superset:dev`
- etc.

### v1.0.0 git tag
- `ghcr.io/YOUR_ORG/superset:latest` (lean preset, non-RC only)
- `ghcr.io/YOUR_ORG/superset:v1.0.0`
- `ghcr.io/YOUR_ORG/superset:v1.0.0-dev`
- `ghcr.io/YOUR_ORG/superset:v1.0.0-py310`
- etc.

## Deployment Examples

### Development Environment
```bash
helm install superset-dev ./helm/superset \
  --set image.repository=ghcr.io/YOUR_ORG/superset \
  --set image.tag=develop
```

### Staging Environment (Release Candidate)
```bash
helm install superset-staging ./helm/superset \
  --set image.repository=ghcr.io/YOUR_ORG/superset \
  --set image.tag=rc-v1.0.0
```

### Production Environment (Versioned)
```bash
helm install superset-prod ./helm/superset \
  --set image.repository=ghcr.io/YOUR_ORG/superset \
  --set image.tag=v1.0.0
```

### Production Environment (Latest Stable)
```bash
helm install superset-prod ./helm/superset \
  --set image.repository=ghcr.io/YOUR_ORG/superset \
  --set image.tag=stable
```

## Tips

- Use `develop` for daily development and testing
- Use `release/*` for pre-production validation
- Use version tags for reproducible production deployments
- Keep `master` clean for easy upstream sync
- Never force-push to protected branches
- Always test images before promoting to production

For full details, see [BRANCHING_STRATEGY.md](./BRANCHING_STRATEGY.md)
