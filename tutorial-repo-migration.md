# Tutorial: Migrating to `goalnad-mainnet`

Follow these steps to move the cleaned code from your current repository to a fresh, mainnet-specific repository.

## Step 1: Create the New Repository
1. Go to [GitHub](https://github.com/new).
2. Name the repository: `goalnad-mainnet`.
3. Keep it **Public** (or Private if preferred).
4. **DO NOT** initialize with a README, license, or gitignore (we will push from our local machine).
5. Copy the SSH/HTTPS URL of the new repo (e.g., `https://github.com/zvsvev/goalnad-mainnet.git`).

## Step 2: Prepare Your Local Code
If you are already in the `goalnad` folder where we just did the cleanup:

1. **Check your current state**:
   ```bash
   git status
   # Should say "nothing to commit, working tree clean"
   ```

2. **Rename the old remote (optional but recommended)**:
   ```bash
   git remote rename origin testnet
   ```

3. **Add the new mainnet remote**:
   ```bash
   git remote add origin https://github.com/zvsvev/goalnad-mainnet.git
   ```

## Step 3: Push to the New Repo
Push your clean code to the new repository:

```bash
git push -u origin main
```

---

## Alternative: Fresh Start (No History)
If you want the new repo to have a **"First Commit"** feel with no previous testnet history:

1. Create a new folder anywhere else on your computer:
   ```bash
   mkdir goalnad-migration
   cp -r /path/to/old/goalnad/* goalnad-migration/
   cd goalnad-migration
   rm -rf .git  # Remove old history
   ```

2. Initialize fresh:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Mainnet migration"
   ```

3. Add the new remote and push:
   ```bash
   git remote add origin https://github.com/zvsvev/goalnad-mainnet.git
   git branch -M main
   git push -u origin main
   ```

## Step 4: Verify
Go to your new GitHub repository page and you should see the cleaned project structure, the new `.env.example` files, and the `mainnet-migration-plan.md` right in the root.

---
**Next Step**: Link this new repo to Vercel and Railway for Phase 3!
