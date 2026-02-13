# Deployment Workflow - Avoiding Vercel Rate Limits

## Problem
Vercel Hobby plan has a limit of **100 deployments per 24-hour rolling window**. Each push to `main` triggers a deployment.

## Solution: Batch Your Changes

### **Workflow 1: Development Branch (Recommended)**

Use a development branch for work-in-progress changes, only merge to `main` when ready to deploy.

```bash
# Create a dev branch (one time)
git checkout -b dev
git push -u origin dev

# Daily workflow
git checkout dev
# Make your changes...
git add .
git commit -m "feat: multiple updates"
git push origin dev

# When ready to deploy (batch multiple commits)
git checkout main
git merge dev
git push origin main  # This triggers ONE Vercel deployment

# Continue working
git checkout dev
```

**Benefits:**
- ✅ Only deploy when you're ready
- ✅ Test multiple changes together
- ✅ Can make unlimited commits to `dev` without deploying

---

### **Workflow 2: Amend Commits (For Quick Fixes)**

If you're making small sequential changes, amend your last commit instead of creating new ones.

```bash
# First change
git add .
git commit -m "feat: update homepage"

# Oops, found a typo - DON'T make a new commit!
# Fix the typo, then:
git add .
git commit --amend --no-edit  # Adds to previous commit

# Push (force push needed for amended commits)
git push origin main --force  # Only ONE deployment triggered
```

**Benefits:**
- ✅ Keeps git history clean
- ✅ Reduces deployment count
- ⚠️ Only use for unpushed commits or if you're the only developer

---

### **Workflow 3: Local Testing First**

Always test locally before pushing to avoid "fix" commits.

```bash
# Start local dev server
cd frontend
npm run dev

# Open http://localhost:3000
# Test your changes thoroughly

# Only push when everything works
git add .
git commit -m "feat: tested and working update"
git push origin main
```

**Benefits:**
- ✅ Catch bugs before deploying
- ✅ Fewer "fix" commits
- ✅ Better code quality

---

### **Workflow 4: Disable Auto-Deploy for Non-Production Branches**

Configure Vercel to only auto-deploy `main` branch.

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Under "Production Branch", ensure only `main` is set
3. Under "Deploy Hooks", remove any unnecessary hooks
4. Create a `dev` branch for development work

**Benefits:**
- ✅ Work freely on other branches
- ✅ Only `main` triggers production deployments
- ✅ Preview deployments for PRs (if needed)

---

## **Recommended Daily Workflow**

```bash
# Morning: Start working on dev branch
git checkout dev
git pull origin dev

# Make multiple changes throughout the day
# Change 1
git add frontend/src/app/page.tsx
git commit -m "feat: update hero section"

# Change 2
git add frontend/src/components/footer.tsx
git commit -m "fix: center footer"

# Change 3
git add frontend/src/app/register-agent/page.tsx
git commit -m "feat: add step 05"

# Push to dev (no deployment triggered)
git push origin dev

# End of day OR when ready to deploy
git checkout main
git pull origin main
git merge dev  # Combines all changes
git push origin main  # ONE deployment with all changes

# Back to dev for next work session
git checkout dev
```

---

## **Emergency: Hit the Rate Limit**

If you've hit the limit:

1. **Wait for quota to reset** (rolling 24-hour window)
2. **Manual deploy from Vercel dashboard** (might bypass limit)
3. **Upgrade to Pro plan** ($20/month, unlimited deployments)
4. **Continue committing to dev branch** - they'll deploy when limit resets

---

## **Quick Reference**

| Action | Deployments Triggered | When to Use |
|--------|----------------------|-------------|
| Push to `main` | 1 per push | When ready to deploy |
| Push to `dev` | 0 | Daily development work |
| `git commit --amend` | 1 (if pushed) | Quick fixes to last commit |
| Local testing | 0 | Before every push |
| Merge dev → main | 1 | End of day / feature complete |

---

## **Pro Tips**

1. **Batch related changes** - Group similar updates into one commit
2. **Use meaningful commit messages** - Easier to track what deployed
3. **Test locally first** - `npm run dev` before pushing
4. **Create dev branch** - Keep `main` for production-ready code only
5. **Monitor Vercel dashboard** - Check deployment count regularly

---

## **Current Setup**

- **Production repo:** `zvsvev/goalnad-mainnet`
- **Production branch:** `main`
- **Vercel auto-deploys:** `main` branch only
- **Testnet repo:** `zvsvev/goalnad` (optional, for testing)

---

## **Next Steps**

1. Create a `dev` branch: `git checkout -b dev && git push -u origin dev`
2. Set `dev` as your default working branch
3. Only merge to `main` when ready to deploy
4. Consider upgrading to Vercel Pro if you need frequent deployments
