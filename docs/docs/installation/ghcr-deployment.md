# Building and Deploying Superset with GitHub Container Registry (GHCR)

This guide explains how to build custom Superset Docker images and deploy them using GitHub Container Registry (GHCR) with Helm charts.

## Overview

The Superset repository includes GitHub Actions workflows that automatically build Docker images. By default, these images are pushed to DockerHub. The enhanced workflow also pushes images to GitHub Container Registry (GHCR), allowing you to:

1. Build custom Superset images in your own fork/repository
2. Push those images to your organization's GHCR
3. Deploy using Helm charts that pull from GHCR instead of DockerHub

## Automatic Image Building

### GitHub Actions Workflow

The `.github/workflows/docker.yml` workflow automatically builds and pushes Docker images when:

- **Push to master branch**: Builds all image variants (dev, lean, py310, py311, py312, websocket, dockerize)
- **Push to version branches** (e.g., `3.0`, `4.0`): Builds all image variants
- **Pull requests to master**: Builds only dev and lean variants (for testing)

### Image Variants Built

| Variant | Description | Use Case |
|---------|-------------|----------|
| `lean` | Minimal production image | Recommended for production deployments |
| `dev` | Development image with additional tools | Development and debugging |
| `py310`, `py311`, `py312` | Python version-specific builds | Specific Python version requirements |
| `websocket` | WebSocket server | Real-time features |
| `dockerize` | Initialization utilities | Init containers in Kubernetes |

### Image Tags in GHCR

After a successful build on the master branch, images are available with the following tags:

```
ghcr.io/<org-name>/superset:latest              # Latest lean build (master only)
ghcr.io/<org-name>/superset:lean                # Latest lean preset
ghcr.io/<org-name>/superset:dev                 # Latest dev preset
ghcr.io/<org-name>/superset:py310               # Latest Python 3.10 build
ghcr.io/<org-name>/superset:py311               # Latest Python 3.11 build
ghcr.io/<org-name>/superset:py312               # Latest Python 3.12 build
ghcr.io/<org-name>/superset:websocket           # Latest websocket build
ghcr.io/<org-name>/superset:dockerize           # Latest dockerize build
ghcr.io/<org-name>/superset:GHA-<preset>-<run_id>  # Specific build by run ID
```

## Setting Up Your Repository

### 1. Fork or Clone Superset

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_ORG/superset.git
cd superset
```

### 2. Enable GitHub Container Registry

GHCR is automatically enabled for GitHub repositories. No additional setup is required for public images.

For **private images**, you'll need to:

1. Create a Personal Access Token (PAT) with `write:packages` permission
2. The workflow uses `${{ secrets.GITHUB_TOKEN }}` which is automatically provided by GitHub Actions

### 3. Configure Package Visibility (Optional)

By default, packages inherit the repository's visibility (public or private). To change this:

1. Go to your repository on GitHub
2. Navigate to the "Packages" section
3. Click on the package (superset)
4. Go to "Package settings"
5. Change visibility as needed

## Building Images

### Automatic Builds

Simply push to your master branch or a version branch:

```bash
git checkout master
# Make your changes
git add .
git commit -m "My custom changes"
git push origin master
```

The GitHub Actions workflow will automatically:
1. Build all image variants
2. Push to both DockerHub (if credentials configured) and GHCR
3. Tag images appropriately

### Manual Builds (Local Development)

You can also build images locally using the same process:

```bash
# Install supersetbot (used by the workflow)
npm install -g supersetbot

# Build a specific preset
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/YOUR_ORG/superset:lean \
  --push \
  -f Dockerfile \
  --target lean \
  .

# Or use supersetbot
supersetbot docker \
  --push \
  --preset lean \
  --extra-flags "--tag ghcr.io/YOUR_ORG/superset:lean"
```

## Deploying with Helm

### 1. Using the Example Values File

The repository includes an example values file for GHCR deployments:

```bash
# Clone the repository if you haven't already
git clone https://github.com/YOUR_ORG/superset.git
cd superset

# Deploy using GHCR images
helm install my-superset ./helm/superset \
  -f ./helm/superset/examples/ghcr-values.yaml \
  --set image.repository=ghcr.io/YOUR_ORG/superset \
  --set image.tag=latest \
  --set initImage.repository=ghcr.io/YOUR_ORG/superset \
  --set initImage.tag=dockerize
```

### 2. Custom Values File

Create your own `my-values.yaml`:

```yaml
image:
  repository: ghcr.io/YOUR_ORG/superset
  tag: latest
  pullPolicy: Always

initImage:
  repository: ghcr.io/YOUR_ORG/superset
  tag: dockerize
  pullPolicy: Always

# Your other custom configurations...
extraEnv:
  SUPERSET_ENV: production
```

Deploy:

```bash
helm install my-superset ./helm/superset -f my-values.yaml
```

### 3. Using Private GHCR Images

If your GHCR repository is private, create an image pull secret:

```bash
# Create the secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --docker-email=YOUR_EMAIL \
  --namespace=your-namespace

# Update your values file
cat <<EOF > my-values.yaml
image:
  repository: ghcr.io/YOUR_ORG/superset
  tag: latest

initImage:
  repository: ghcr.io/YOUR_ORG/superset
  tag: dockerize

imagePullSecrets:
  - name: ghcr-secret
EOF

# Deploy
helm install my-superset ./helm/superset -f my-values.yaml
```

### 4. Upgrade Existing Deployment

To upgrade an existing deployment with new images:

```bash
# Pull the latest images
helm upgrade my-superset ./helm/superset \
  -f my-values.yaml \
  --set image.tag=latest

# Or use a specific build
helm upgrade my-superset ./helm/superset \
  -f my-values.yaml \
  --set image.tag=GHA-lean-1234567890
```

## Verifying Your Deployment

### Check Image Source

Verify that your pods are using GHCR images:

```bash
# Get pod details
kubectl get pods -l app=superset

# Check image being used
kubectl describe pod <pod-name> | grep Image:

# Expected output:
# Image: ghcr.io/YOUR_ORG/superset:latest
```

### View Available Images

Check what images are available in your GHCR:

1. Go to your GitHub repository
2. Click on "Packages" in the right sidebar
3. Click on the "superset" package
4. View all available tags

Or use the GitHub API:

```bash
# List all tags for your package
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/user/packages/container/superset/versions
```

## Troubleshooting

### Images Not Pushing to GHCR

1. Check the GitHub Actions workflow run logs
2. Verify the `GITHUB_TOKEN` has necessary permissions
3. Check package settings for visibility

### Pull Access Denied

1. Verify image pull secret is created correctly
2. Check that the PAT has `read:packages` permission
3. Ensure the secret is in the same namespace as your deployment

### Old Images Being Used

1. Set `pullPolicy: Always` in your values
2. Delete pods to force a fresh pull: `kubectl delete pod -l app=superset`
3. Verify the tag exists: Check GitHub Packages UI

## Best Practices

1. **Use Specific Tags in Production**: Instead of `latest`, use specific tags like `GHA-lean-1234567890` for reproducible deployments

2. **Pin Image Versions**: In your values file, always specify an exact tag for production:
   ```yaml
   image:
     repository: ghcr.io/YOUR_ORG/superset
     tag: GHA-lean-1234567890  # Specific build
     pullPolicy: IfNotPresent
   ```

3. **Test Before Production**: Test new images in a development environment before deploying to production

4. **Monitor Build Status**: Set up notifications for GitHub Actions to alert on build failures

5. **Clean Up Old Images**: Regularly clean up old GHCR images to save storage:
   - Go to Package settings
   - Delete old versions you no longer need

## Next Steps

- Review the [Helm Chart Values](../../../helm/superset/values.yaml) for all configuration options
- Check the [GitHub Actions Workflow](../../../.github/workflows/docker.yml) to understand the build process
- Customize your Superset configuration using config overrides (see Helm chart README)
