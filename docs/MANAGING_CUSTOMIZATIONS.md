# Managing Existing Customizations in Source Builds

This guide helps you migrate from a "pull-modify-push" workflow to a source-based build while preserving all your customizations.

## Assessment: Document Your Customizations

Before migrating, document everything you're currently adding to the official image:

### 1. Identify All Customizations

Create a checklist:
```bash
# Connect to your current custom image
docker run -it your-acr.azurecr.io/superset:latest bash

# Document installed packages
dpkg -l > /tmp/installed-packages.txt
pip freeze > /tmp/python-packages.txt

# Find custom files
find /app -type f -newer /etc/os-release
find /app/pythonpath -type f
```

### 2. Common Customization Categories

- **System packages**: Additional apt packages (e.g., database drivers, fonts)
- **Python packages**: Additional pip packages (e.g., custom connectors, libraries)
- **Configuration files**: Custom `superset_config.py`, database drivers
- **Static files**: Custom logos, favicons, CSS
- **Environment variables**: Custom env vars or secrets
- **Database drivers**: ODBC, Oracle, DB2, etc.
- **Authentication**: Custom OAuth, LDAP configs

## Migration Strategy

### Option 1: Dockerfile with Build Arguments (Recommended)

Create `Dockerfile.custom` that extends the base build:

```dockerfile
# Dockerfile.custom
ARG BASE_IMAGE=ghcr.io/karo-data-management-limited/superset:latest
FROM ${BASE_IMAGE}

# Switch to root for installations
USER root

# ============================================================================
# SYSTEM PACKAGES
# ============================================================================
# Add any additional system packages your team needs
RUN apt-get update && apt-get install -y \
    # Example: Microsoft ODBC drivers
    unixodbc \
    unixodbc-dev \
    # Example: Oracle client
    # libaio1 \
    # Example: Additional fonts
    fonts-liberation \
    # Add your packages here
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# PYTHON PACKAGES
# ============================================================================
# Install additional Python packages
COPY requirements-custom.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements-custom.txt

# Alternative: Install packages directly
# RUN pip install --no-cache-dir \
#     snowflake-connector-python \
#     databricks-sql-connector \
#     your-custom-package

# ============================================================================
# DATABASE DRIVERS
# ============================================================================
# Example: Microsoft ODBC Driver for SQL Server
# RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
#     curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
#     apt-get update && \
#     ACCEPT_EULA=Y apt-get install -y msodbcsql18 && \
#     rm -rf /var/lib/apt/lists/*

# Example: Oracle Instant Client
# COPY oracle-instantclient*.rpm /tmp/
# RUN rpm -Uvh /tmp/oracle-instantclient*.rpm

# ============================================================================
# CUSTOM CONFIGURATION
# ============================================================================
# Copy custom configuration files
COPY custom_config.py /app/pythonpath/superset_config.py
COPY custom_security.py /app/pythonpath/

# Copy custom database drivers or SQLAlchemy dialects
# COPY custom_drivers/ /app/custom_drivers/

# ============================================================================
# CUSTOM STATIC ASSETS
# ============================================================================
# Copy custom logos, favicons, etc.
# COPY custom-logo.png /app/superset/static/assets/images/
# COPY custom-favicon.ico /app/superset/static/assets/images/

# ============================================================================
# ENVIRONMENT VARIABLES
# ============================================================================
# Set any custom environment variables
ENV CUSTOM_VAR=value
ENV SUPERSET_LOAD_EXAMPLES=no

# ============================================================================
# CUSTOM SCRIPTS
# ============================================================================
# Copy and make executable any custom scripts
# COPY scripts/ /app/scripts/
# RUN chmod +x /app/scripts/*.sh

# Switch back to superset user
USER superset

# Health check (optional override)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8088/health || exit 1
```

### Option 2: Multi-Stage Build from Source

If you need more control, build from source with customizations integrated:

```dockerfile
# Use the base Superset Dockerfile stages
FROM superset-base AS superset-custom

USER root

# Add customizations here (same as Option 1)
RUN apt-get update && apt-get install -y \
    your-custom-packages \
    && rm -rf /var/lib/apt/lists/*

# ... rest of customizations ...

USER superset
```

### Option 3: Layered Approach (Hybrid)

Keep some customizations in the build, others at deploy time:

**Build-time** (in Dockerfile):
- System dependencies
- Python packages
- Database drivers
- Static assets

**Runtime** (via Helm/Kubernetes):
- Configuration files (ConfigMaps)
- Secrets (Secrets/KeyVault)
- Environment variables

## Handling Specific Customizations

### Database Drivers

#### Example: SQL Server with ODBC
```dockerfile
# System packages
RUN apt-get update && apt-get install -y \
    unixodbc unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Microsoft ODBC Driver
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18 mssql-tools18 && \
    rm -rf /var/lib/apt/lists/*

# Python driver
RUN pip install --no-cache-dir pyodbc
```

#### Example: Oracle
```dockerfile
# Download Oracle Instant Client
ADD https://download.oracle.com/otn_software/linux/instantclient/2340000/instantclient-basic-linux.x64-23.4.0.24.05.zip /tmp/
RUN unzip /tmp/instantclient-basic-linux.x64-23.4.0.24.05.zip -d /opt/oracle && \
    rm /tmp/instantclient-basic-linux.x64-23.4.0.24.05.zip

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_23_4:$LD_LIBRARY_PATH
RUN pip install --no-cache-dir cx_Oracle
```

### Custom Authentication

Mount configs via Helm instead of baking into image:

```yaml
# values.yaml
extraConfigs:
  custom_security.py: |
    from flask_appbuilder.security.manager import AUTH_OAUTH
    AUTH_TYPE = AUTH_OAUTH
    # ... your OAuth config ...
```

### Custom Visualizations/Plugins

```dockerfile
# In Dockerfile.custom
COPY custom-viz-plugin/ /app/superset-frontend/src/visualizations/custom-viz/
RUN cd /app/superset-frontend && npm run build
```

## Testing Your Customizations

### 1. Build Locally
```bash
# Build your custom image
docker build -f Dockerfile.custom -t superset-custom:test .

# Test it
docker run -p 8088:8088 superset-custom:test
```

### 2. Verify All Customizations
```bash
# Check installed packages
docker run superset-custom:test pip freeze | grep your-package

# Verify files
docker run superset-custom:test ls -la /app/pythonpath/

# Test database connectivity
docker run superset-custom:test python -c "import pyodbc; print('ODBC OK')"
```

### 3. Compare with Production
```bash
# Generate comparison report
docker run your-acr.azurecr.io/superset:latest pip freeze > prod-packages.txt
docker run superset-custom:test pip freeze > custom-packages.txt
diff prod-packages.txt custom-packages.txt
```

## Integration with Branching Strategy

### Customization Workflow

```bash
# 1. Create customization branch
git checkout develop
git checkout -b feature/add-oracle-driver

# 2. Update Dockerfile.custom
echo "RUN pip install cx_Oracle" >> Dockerfile.custom

# 3. Document the change
echo "- Added Oracle driver (cx_Oracle)" >> CUSTOMIZATIONS.md

# 4. Commit with [CUSTOM] prefix
git commit -m "[CUSTOM] Add Oracle database driver support"

# 5. Merge to develop
git checkout develop
git merge feature/add-oracle-driver

# 6. Test the build
# GitHub Actions will build and push to ghcr.io/YOUR_ORG/superset:develop
```

### Syncing with Upstream

```bash
# 1. Update from upstream
git checkout master
git merge upstream/master

# 2. Merge to develop (resolve conflicts)
git checkout develop
git merge master

# If Dockerfile conflicts:
# - Keep upstream changes in main Dockerfile
# - Keep your changes in Dockerfile.custom
# - Update Dockerfile.custom if upstream changed base structure

# 3. Test after merge
docker build -f Dockerfile.custom -t test .
```

## Automation

### GitHub Actions for Custom Build

Add to `.github/workflows/docker.yml`:

```yaml
- name: Build Custom Image
  if: hashFiles('Dockerfile.custom') != ''
  run: |
    docker build -f Dockerfile.custom \
      --build-arg BASE_IMAGE=$GHCR_IMAGE_TAG \
      -t ${GHCR_IMAGE_TAG}-custom .
    
    docker push ${GHCR_IMAGE_TAG}-custom
```

## Maintenance Checklist

After each upstream sync:

- [ ] Review upstream Dockerfile changes
- [ ] Test custom build locally
- [ ] Verify all customizations still work
- [ ] Update CUSTOMIZATIONS.md
- [ ] Run integration tests
- [ ] Deploy to dev environment first
- [ ] Monitor for issues
- [ ] Promote to production

## Troubleshooting

### Build Fails After Upstream Sync

```bash
# Compare Dockerfiles
git diff upstream/master..HEAD -- Dockerfile

# Check if base image structure changed
docker history ghcr.io/YOUR_ORG/superset:latest
```

### Custom Package Conflicts

```bash
# Pin versions in requirements-custom.txt
echo "your-package==1.2.3" >> requirements-custom.txt

# Or use constraints file
pip install -r requirements-custom.txt -c constraints.txt
```

### Missing Customizations After Deploy

```bash
# Verify correct image is deployed
kubectl describe pod superset-xxx | grep Image

# Check if customizations are present
kubectl exec -it superset-xxx -- pip freeze | grep your-package
```

## Best Practices

1. **Document everything** in `CUSTOMIZATIONS.md`
2. **Use version pinning** for custom packages
3. **Test locally first** before pushing
4. **Keep Dockerfile.custom separate** from main Dockerfile
5. **Prefer runtime config** over build-time when possible
6. **Use build args** for flexibility
7. **Tag custom images** distinctly (e.g., `-custom` suffix)
8. **Maintain a test suite** for customizations
9. **Review upstream changes** before merging
10. **Keep custom changes minimal** for easier maintenance

## Migration Timeline Recommendation

### Week 1: Assessment
- Document all current customizations
- Create Dockerfile.custom
- Test local builds

### Week 2: Development Environment
- Build and push to GHCR/ACR
- Deploy to dev environment
- Verify all customizations work

### Week 3: Staging Environment
- Deploy to staging
- Run full test suite
- Get team validation

### Week 4: Production Migration
- Schedule maintenance window
- Deploy to production
- Monitor closely
- Keep old images as rollback option

## Support

For questions or issues:
1. Check `docs/BRANCHING_STRATEGY.md` for workflow
2. Review `docs/CONTAINER_REGISTRY_OPTIONS.md` for registry options
3. See upstream Superset documentation for base functionality
