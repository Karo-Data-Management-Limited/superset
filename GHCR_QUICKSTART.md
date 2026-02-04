# Quick Start: Using GHCR for Superset Deployment

This is a quick reference guide for deploying Superset using GitHub Container Registry.

## TL;DR - For Impatient Developers

```bash
# 1. Fork/clone the repository
git clone https://github.com/YOUR_ORG/superset.git
cd superset

# 2. Push to master to build images (or wait for CI)
# Images will automatically be pushed to ghcr.io/YOUR_ORG/superset

# 3. Deploy with Helm
helm install my-superset ./helm/superset \
  --set image.repository=ghcr.io/YOUR_ORG/superset \
  --set image.tag=latest \
  --set initImage.repository=ghcr.io/YOUR_ORG/superset \
  --set initImage.tag=dockerize
```

## Using the Example Values File

```bash
# Edit the example file to use your organization
sed -i 's/your-org/my-github-org/g' helm/superset/examples/ghcr-values.yaml

# Deploy
helm install my-superset ./helm/superset \
  -f ./helm/superset/examples/ghcr-values.yaml
```

## For Private Repositories

```bash
# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT

# Deploy with secret
helm install my-superset ./helm/superset \
  -f ./helm/superset/examples/ghcr-values.yaml \
  --set imagePullSecrets[0].name=ghcr-secret
```

## Available Image Tags

After pushing to master, images are available at:

| Tag | Description | Example |
|-----|-------------|---------|
| `latest` | Latest lean build from master | `ghcr.io/YOUR_ORG/superset:latest` |
| `<preset>` | Latest build of specific preset | `ghcr.io/YOUR_ORG/superset:lean` |
| `GHA-<preset>-<id>` | Specific build (reproducible) | `ghcr.io/YOUR_ORG/superset:GHA-lean-1234567890` |

**Presets available:** `lean`, `dev`, `py310`, `py311`, `py312`, `websocket`, `dockerize`

## Common Commands

```bash
# View deployed image
kubectl describe pod <pod-name> | grep Image

# Force pull new image
kubectl delete pod -l app=superset

# Check available GHCR images
# Go to: https://github.com/orgs/YOUR_ORG/packages
```

## Troubleshooting

**Problem:** "ImagePullBackOff" or "ErrImagePull"
- Check image exists: Visit https://github.com/orgs/YOUR_ORG/packages
- For private repos, verify image pull secret is created
- Verify secret name matches in your values file

**Problem:** Old image being used
- Set `pullPolicy: Always` in values
- Delete pods to force recreation: `kubectl delete pod -l app=superset`

**Problem:** Build not triggered
- Verify you pushed to `master` or a version branch (`3.0`, `4.0`, etc.)
- Check GitHub Actions tab for workflow runs
- PRs only build `dev` and `lean` presets

## Full Documentation

For complete documentation, see:
- [GHCR Deployment Guide](./docs/docs/installation/ghcr-deployment.md)
- [Implementation Summary](./GHCR_IMPLEMENTATION.md)
- [Helm Chart README](./helm/superset/README.md)
