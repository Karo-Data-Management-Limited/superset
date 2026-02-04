# Container Registry Options: GHCR vs ACR

This document addresses container registry choices for deploying Superset in Azure environments and provides guidance on handling existing customizations.

## Container Registry Comparison

### GitHub Container Registry (GHCR)
**Pros:**
- ✅ Native integration with GitHub Actions (no additional secrets needed)
- ✅ Automatic builds on push to branches/tags
- ✅ Free for public repositories
- ✅ Good for open-source workflows
- ✅ Simple authentication with GitHub tokens

**Cons:**
- ❌ Requires image pull secrets for private repos in Kubernetes
- ❌ No native Azure integration (no managed identity support)
- ❌ Additional network hop from Azure to GitHub

**Best for:** Organizations primarily using GitHub for CI/CD and multi-cloud deployments

### Azure Container Registry (ACR)
**Pros:**
- ✅ Native Azure integration with AKS
- ✅ Works with AKS managed identity (no pull secrets needed)
- ✅ Lower latency for AKS deployments (same region)
- ✅ Azure RBAC integration
- ✅ Private endpoints and VNet integration

**Cons:**
- ❌ Requires Azure credentials in GitHub Actions
- ❌ Additional Azure service to manage and pay for
- ❌ More complex setup for hybrid/multi-cloud scenarios

**Best for:** Azure-centric deployments, especially with AKS and managed identities

## Recommended Approach: Support Both

The workflow can be enhanced to support **both** GHCR and ACR, allowing you to choose based on your deployment environment:

### Workflow Configuration

```yaml
on:
  push:
    branches:
      - "develop"
      - "release/*"
      - "production"

env:
  # Configure which registries to use
  PUSH_TO_GHCR: true
  PUSH_TO_ACR: true
  ACR_NAME: your-acr-name
```

### Required Secrets for ACR

Add these secrets to your GitHub repository:
- `AZURE_CLIENT_ID` - Service principal client ID
- `AZURE_TENANT_ID` - Azure tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID

For AKS deployments with managed identity, use workload identity federation (recommended) or service principal credentials.

## Handling Existing Customizations

### Current State Analysis

You mentioned:
> "current state is to pull latest docker image, modify and deploy"

This suggests a multi-stage build process:
1. Pull official Superset image
2. Add customizations (dependencies, configs, etc.)
3. Push to ACR
4. Deploy to AKS

### Migration Strategy

#### Option 1: Source-Based Build (Recommended)
Build from source with your customizations integrated into the Dockerfile.

**Pros:**
- Full control over the build
- Easier to manage with version control
- Better for upstream synchronization
- All customizations in one place

**Cons:**
- Need to migrate existing customizations to Dockerfile
- Slightly longer build times

**Implementation:**
1. Create a custom Dockerfile that extends the base build:
   ```dockerfile
   # Use multi-stage build from Superset source
   FROM superset-base AS custom-superset
   
   # Add your custom dependencies
   RUN pip install your-custom-package
   
   # Copy your custom configurations
   COPY custom-config.py /app/pythonpath/
   
   # Add any other customizations
   ```

2. Document customizations in version control
3. Use branching strategy to manage custom changes separate from upstream

#### Option 2: Image-Based Build (Current Approach)
Continue pulling official images and layering customizations.

**Pros:**
- Minimal migration effort
- Faster builds (reuse official images)
- Easier to update Superset versions

**Cons:**
- Two-step build process
- Harder to track all customizations
- Potential version compatibility issues

**Implementation:**
Create a separate Dockerfile for customizations:

```dockerfile
# Dockerfile.custom
ARG BASE_IMAGE=ghcr.io/YOUR_ORG/superset:latest
FROM ${BASE_IMAGE}

USER root

# Install additional system packages
RUN apt-get update && apt-get install -y \
    your-package-1 \
    your-package-2 \
    && rm -rf /var/lib/apt/lists/*

# Install additional Python packages
RUN pip install --no-cache-dir \
    your-python-package-1 \
    your-python-package-2

# Copy custom configuration files
COPY custom_config.py /app/pythonpath/
COPY custom_scripts/ /app/scripts/

# Set custom environment variables
ENV CUSTOM_VAR=value

USER superset
```

### Recommended Hybrid Approach

**For critical customizations:**
- Integrate into the main Dockerfile as build arguments or conditional steps
- Example:
  ```dockerfile
  ARG INCLUDE_CUSTOM_DEPS="false"
  RUN if [ "${INCLUDE_CUSTOM_DEPS}" = "true" ]; then \
        pip install custom-package-1 custom-package-2; \
      fi
  ```

**For environment-specific customizations:**
- Use Helm values and ConfigMaps
- Mount configurations at runtime
- Use init containers for setup

## Handling Merge Conflicts

### Strategies to Minimize Conflicts

1. **Keep customizations isolated:**
   - Use separate configuration files
   - Leverage Superset's config override mechanisms
   - Avoid modifying core Superset files

2. **Use feature branches:**
   - Keep `master` clean for upstream sync
   - Apply customizations in `develop` branch
   - Use the branching strategy from `docs/BRANCHING_STRATEGY.md`

3. **Document all customizations:**
   - Maintain a `CUSTOMIZATIONS.md` file listing all changes
   - Use clear commit messages (e.g., `[CUSTOM]` prefix)
   - Tag custom commits for easy identification

4. **Automate conflict resolution where possible:**
   ```bash
   # Use ours/theirs strategy for specific files
   git checkout --ours path/to/custom/file
   git checkout --theirs path/to/upstream/file
   ```

5. **Regular upstream syncs:**
   - Sync weekly to avoid large conflict sets
   - Test immediately after sync
   - Fix conflicts while changes are fresh

### Example Customization Workflow

```bash
# 1. Sync with upstream
git checkout master
git fetch upstream
git merge upstream/master

# 2. Update develop with upstream changes
git checkout develop
git merge master
# Resolve conflicts, preferring your customizations

# 3. Document what was merged
git log --oneline master..develop > MERGE_NOTES.md

# 4. Test custom build
docker build -t test-image .
```

## Secrets Configuration for Private Clusters

### GHCR Access from Private AKS Cluster

**Option 1: Image Pull Secret**
```bash
# Create secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  --namespace=superset

# Reference in Helm values
imagePullSecrets:
  - name: ghcr-secret
```

**Option 2: Azure Key Vault Integration**
```yaml
# Store PAT in Azure Key Vault, reference via CSI driver
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <from-keyvault>
```

### ACR Access from Private AKS Cluster

**Option 1: Managed Identity (Recommended)**
```bash
# Attach ACR to AKS (no secrets needed)
az aks update -n myAKSCluster -g myResourceGroup \
  --attach-acr myACR
```

**Option 2: Service Principal**
```bash
# Create service principal and assign role
az ad sp create-for-rbac --name acr-service-principal
az role assignment create \
  --assignee <appId> \
  --scope /subscriptions/<subscription>/resourceGroups/<rg>/providers/Microsoft.ContainerRegistry/registries/<acr> \
  --role AcrPull
```

## Integration with Current Helm Values

### Minimal Changes Needed

Your existing `values.yaml` likely has:
```yaml
image:
  repository: your-acr.azurecr.io/superset
  tag: latest
```

To support both registries, use Helm template conditionals:

```yaml
# values.yaml for ACR
image:
  repository: karodata.azurecr.io/superset
  tag: latest
  pullPolicy: IfNotPresent

# No imagePullSecrets needed with managed identity
```

```yaml
# values-ghcr.yaml for GHCR
image:
  repository: ghcr.io/karo-data-management-limited/superset
  tag: develop
  pullPolicy: Always

imagePullSecrets:
  - name: ghcr-secret
```

Then deploy with:
```bash
# ACR deployment (managed identity)
helm install superset ./helm/superset -f values-acr.yaml

# GHCR deployment (with secret)
helm install superset ./helm/superset -f values-ghcr.yaml
```

## Recommendation Summary

### For Karo Data Management:

1. **Use ACR for production deployments:**
   - Leverage existing AKS managed identity
   - Lower latency, better Azure integration
   - No changes to current deployment process

2. **Use GHCR for development/testing:**
   - Automatic builds via GitHub Actions
   - Easy collaboration and testing
   - Lower cost for non-production environments

3. **Support both in workflow:**
   - Push to both registries from GitHub Actions
   - Choose registry per environment in Helm values
   - Use ACR for production, GHCR for dev/staging

4. **Handle customizations:**
   - Migrate critical customizations to Dockerfile with build args
   - Use Helm ConfigMaps for environment-specific configs
   - Maintain clear documentation of all custom changes
   - Use the branching strategy to isolate custom work

See the updated workflow configuration in the next commit that adds ACR support alongside GHCR.
