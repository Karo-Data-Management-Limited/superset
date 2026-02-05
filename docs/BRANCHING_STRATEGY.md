# Branching Strategy for Karo-Data-Management-Limited Superset Fork

## Overview

This document outlines the recommended branching strategy for managing a fork of Apache Superset that needs to:
1. Stay synchronized with upstream Apache Superset
2. Maintain custom modifications
3. Trigger builds for custom images in GHCR
4. Enable controlled releases

## Recommended Branch Structure

```
upstream/master (apache/superset)
    ↓ (sync regularly)
master (read-only, syncs with upstream)
    ↓ (merge periodically)
develop (main development branch for custom work)
    ↓ (feature branches)
feature/* (individual features)
    ↓ (when ready)
release/* (release candidates)
    ↓ (production deployments)
production (stable releases)
```

## Branch Descriptions

### `master` Branch
- **Purpose**: Mirror of upstream Apache Superset
- **Updates**: Sync from `apache/superset` master regularly
- **Custom Changes**: ❌ None - keep clean for easy upstream sync
- **GHCR Builds**: ❌ Disabled to avoid conflicts with upstream

### `develop` Branch
- **Purpose**: Main development branch for Karo custom work
- **Updates**: Merge from `master` after upstream sync
- **Custom Changes**: ✅ All custom features and modifications
- **GHCR Builds**: ✅ Enabled for testing/development images
- **Tagging**: Images tagged as `develop-<preset>-<run_id>`

### `feature/*` Branches
- **Purpose**: Individual feature development
- **Updates**: Branch from `develop`, merge back to `develop`
- **Custom Changes**: ✅ Isolated feature work
- **GHCR Builds**: ❌ Disabled (use local builds for testing)

### `release/*` Branches
- **Purpose**: Release candidates (e.g., `release/v1.0.0`)
- **Updates**: Branch from `develop` when ready for release
- **Custom Changes**: 🔧 Bug fixes only
- **GHCR Builds**: ✅ Enabled for release candidate images
- **Tagging**: Images tagged as `rc-<version>-<preset>-<run_id>`

### `production` Branch
- **Purpose**: Production-ready stable releases
- **Updates**: Merge from `release/*` after validation
- **Custom Changes**: ❌ None - only merge from release branches
- **GHCR Builds**: ✅ Enabled for production images
- **Tagging**: Images tagged as `latest`, `<version>`, and `<preset>`

## Workflow

### 1. Syncing with Upstream

```bash
# Add upstream remote (one-time setup)
git remote add upstream https://github.com/apache/superset.git

# Sync master with upstream
git checkout master
git fetch upstream
git merge upstream/master
git push origin master

# Update develop with latest master
git checkout develop
git merge master
# Resolve any conflicts with custom changes
git push origin develop
```

### 2. Development Workflow

```bash
# Create feature branch
git checkout develop
git checkout -b feature/my-custom-feature

# Make changes and commit
git add .
git commit -m "feat: Add custom feature"

# Push feature branch
git push origin feature/my-custom-feature

# Create PR to merge into develop
# After review and approval, merge to develop
```

### 3. Release Workflow

```bash
# Create release branch from develop
git checkout develop
git checkout -b release/v1.0.0

# Make any final adjustments, update version numbers
git commit -m "chore: Prepare v1.0.0 release"
git push origin release/v1.0.0

# GHCR builds release candidate images automatically
# Test the images thoroughly

# When ready, merge to production
git checkout production
git merge release/v1.0.0
git tag v1.0.0
git push origin production --tags

# GHCR builds production images automatically

# Merge back to develop to include any release fixes
git checkout develop
git merge release/v1.0.0
git push origin develop
```

## GitHub Actions Configuration

The workflow has been updated to support this branching strategy with the following triggers:

### Build Triggers by Branch

| Branch Pattern | Build Type | GHCR Tags | Purpose |
|---------------|------------|-----------|---------|
| `master` | ❌ Disabled | None | Upstream sync only |
| `develop` | ✅ Full build | `develop`, `develop-<preset>-<run_id>` | Development/testing |
| `release/*` | ✅ Full build | `rc-<version>-<preset>-<run_id>` | Release candidates |
| `production` | ✅ Full build | `latest`, `<version>`, `<preset>` | Production releases |
| `feature/*` | ❌ Disabled | None | Local development |

### Version Tagging Strategy

Production releases should be tagged with semantic versioning:
- Major: Breaking changes (e.g., `v2.0.0`)
- Minor: New features (e.g., `v1.1.0`)
- Patch: Bug fixes (e.g., `v1.0.1`)

GHCR images for production will be tagged with the version number for reproducibility.

## Best Practices

### 1. Regular Upstream Sync
- Sync `master` with upstream weekly or bi-weekly
- Merge `master` into `develop` after each sync
- Address conflicts promptly to avoid accumulation

### 2. Feature Development
- Always branch from `develop` for new features
- Keep feature branches short-lived (< 2 weeks)
- Merge frequently to avoid large conflicts

### 3. Release Management
- Create release branches 1-2 weeks before target release
- Only bug fixes and documentation updates in release branches
- Tag production releases with semantic versions

### 4. Image Management
- Use `develop` images for testing and staging
- Use `rc-*` images for pre-production validation
- Use versioned tags (not `latest`) for production deployments
- Clean up old images from GHCR regularly

### 5. Documentation
- Update CHANGELOG.md for each release
- Document custom features separately from upstream
- Maintain upgrade notes when syncing with upstream

## Migration Plan

If you're starting fresh, here's the migration plan:

### Step 1: Set Up Branches (One-time)

```bash
# Ensure master is clean and synced with upstream
git checkout master
git fetch upstream
git merge upstream/master
git push origin master

# Create develop branch from master
git checkout -b develop master
git push origin develop

# Create production branch from master
git checkout -b production master
git push origin production

# Protect branches in GitHub
# Settings → Branches → Add branch protection rule
# Protect: master, develop, production
# Require PR reviews before merging
```

### Step 2: Update GitHub Actions Workflow

The workflow has been updated in this PR to support the new branching strategy.

### Step 3: Migrate Existing Work

```bash
# If you have custom changes on master, move them to develop
git checkout develop
git cherry-pick <commit-hash>  # For each custom commit
git push origin develop

# Reset master to clean upstream state
git checkout master
git reset --hard upstream/master
git push origin master --force  # ⚠️ Only if master has no custom work
```

## Example Scenarios

### Scenario 1: Adding a Custom Dashboard

```bash
git checkout develop
git checkout -b feature/custom-dashboard
# Make changes
git commit -m "feat: Add custom sales dashboard"
git push origin feature/custom-dashboard
# Create PR to develop, review, merge
```

### Scenario 2: Preparing a Release

```bash
git checkout develop
git checkout -b release/v1.1.0
# Update version in package.json, setup.py, etc.
git commit -m "chore: Bump version to 1.1.0"
git push origin release/v1.1.0
# Wait for RC builds, test thoroughly
git checkout production
git merge release/v1.1.0
git tag v1.1.0
git push origin production --tags
```

### Scenario 3: Syncing with Upstream

```bash
git checkout master
git fetch upstream
git merge upstream/master
# Review changes in CHANGELOG
git push origin master

git checkout develop
git merge master
# Resolve conflicts if any
git push origin develop
# Test develop builds
```

## GitHub Repository Settings

### Branch Protection Rules

**For `master`:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ❌ Allow force pushes (for upstream sync)

**For `develop`:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ❌ Allow force pushes

**For `production`:**
- ✅ Require pull request reviews (2 approvals)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ❌ Allow force pushes
- ✅ Require signed commits (recommended)

### Default Branch

Set `develop` as the default branch for the repository so PRs default to the development branch.

## Summary

This branching strategy provides:
- ✅ Clean separation between upstream and custom code
- ✅ Controlled release process with testing stages
- ✅ Automated GHCR builds for appropriate branches
- ✅ Easy upstream synchronization
- ✅ Clear deployment pipeline from development to production

For questions or adjustments to this strategy, please discuss with the team.
