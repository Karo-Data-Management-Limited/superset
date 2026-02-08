# Custom Superset Modifications

This directory contains organization-specific customizations for Apache Superset.

## Contents

- `requirements.txt` - Additional Python dependencies beyond base Superset
- `Dockerfile.custom` - Custom Dockerfile that extends the official apache/superset:6.0.0 image
- `docker-compose.custom.yml` - Docker Compose configuration for building/running custom image
- `logo.png` - (Optional) Custom logo to replace the default Superset logo

## Building the Custom Image

### For Local Development

```bash
# Build the custom image
docker compose -f docker-compose.custom.yml build

# Run the custom image
docker compose -f docker-compose.custom.yml up
```

### For AKS Deployment

```bash
# Build from the repository root with specific tag for your container registry
docker build -f custom/Dockerfile.custom -t your-registry.azurecr.io/superset:6.0.0-custom .

# Push to Azure Container Registry
az acr login --name your-registry
docker push your-registry.azurecr.io/superset:6.0.0-custom
```

**Note**: The Dockerfile extends `apache/superset:6.0.0`. When upgrading Superset versions, update the `FROM` line in `Dockerfile.custom`.

## Maintaining This Fork

When syncing with upstream Apache Superset:

1. Fetch upstream changes:
   ```bash
   git fetch upstream
   git merge upstream/master
   ```

2. Rebuild the custom image to ensure dependencies are compatible:
   ```bash
   docker compose -f docker-compose.custom.yml build --no-cache
   ```

3. Test the custom build before deploying to AKS

## Adding New Dependencies

1. Add the package to `custom/requirements.txt`
2. Rebuild the Docker image
3. Commit both the requirements file and any configuration changes
4. Your colleague will automatically get these changes on their next pull

## Files in This Directory

- **requirements.txt** - Python packages to install in addition to base Superset requirements
- **Dockerfile.custom** - Extends the official apache/superset Docker image with custom packages
- **docker-compose.custom.yml** - Compose file for building/running the custom image locally
- **logo.png** - (Optional) Custom logo file that replaces the default Superset logo

## Adding a Custom Logo

1. Place your `logo.png` file in the `custom/` directory
2. Rebuild the Docker image
3. The logo will be copied to `/app/superset/static/assets/images/karo_logo.png`
4. Configure Superset to use it via `superset_config.py` or environment variables
