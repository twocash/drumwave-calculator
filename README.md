# Revenue Calculator - Vercel Deployment Guide

## Quick Deploy (5 minutes)

### Option 1: Deploy via Vercel Website (Easiest)

1. **Extract this zip file** to a folder on your computer

2. **Go to vercel.com** and sign in (create free account if needed)

3. **Click "Add New"** → Select "Project"

4. **Import the folder:**
   - Click "Browse" or drag the extracted folder
   - Or connect to GitHub/GitLab if you've pushed it there

5. **Vercel auto-detects everything** - just click "Deploy"

6. **You'll get a URL immediately** like: `your-project.vercel.app`

That's it. The calculator will be live and shareable.

---

### Option 2: Deploy via Vercel CLI (For developers)

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Navigate to this folder
cd calculator-deploy

# Deploy
vercel

# Follow prompts - first deploy will ask some questions
# After that, just run 'vercel' again to update
```

---

## What's Included

- ✅ React 18 with production build configuration
- ✅ Recharts for data visualization
- ✅ Vite for fast builds
- ✅ All dependencies pre-configured
- ✅ Responsive design (works on mobile/desktop)

---

## Local Testing (Optional)

If you want to test locally before deploying:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Opens at http://localhost:5173
```

---

## Updating the Calculator

1. Edit `src/App.jsx` with your changes
2. Run `vercel` again (or push to GitHub if using Git integration)
3. Vercel rebuilds automatically

---

## Custom Domain (Optional)

In Vercel dashboard:
1. Go to your project
2. Settings → Domains
3. Add your custom domain (e.g., `calculator.yourcompany.com`)

---

## Support

- Vercel docs: https://vercel.com/docs
- Vite docs: https://vitejs.dev
- React docs: https://react.dev

# DrumWave Calculator - Vercel Deployment Guide

## Quick Deploy (5 minutes)

### Option 1: Deploy via Vercel Website (Easiest)

1. **Extract this zip file** to a folder on your computer

2. **Go to vercel.com** and sign in (create free account if needed)

3. **Click "Add New"** → Select "Project"

4. **Import the folder:**
   - Click "Browse" or drag the extracted folder
   - Or connect to GitHub/GitLab if you've pushed it there

5. **Set Environment Variable (IMPORTANT):**
   - Before deploying, go to Settings → Environment Variables
   - Add: `VITE_ACCESS_PASSWORD` = `your_password_here`
   - Select: Production, Preview, and Development
   - Save

6. **Vercel auto-detects everything** - click "Deploy"

7. **You'll get a URL immediately** like: `your-project.vercel.app`

**Note:** The calculator is password-protected. Users will need to enter the password you set in step 5 to access it.

---

### Option 2: Deploy via Vercel CLI (For developers)
```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Navigate to this folder
cd drumwave-calculator

# Set environment variable
# Create .env.local file:
echo "VITE_ACCESS_PASSWORD=your_password_here" > .env.local

# Deploy
vercel

# Follow prompts - first deploy will ask some questions
# Set VITE_ACCESS_PASSWORD in Vercel dashboard under Settings → Environment Variables
```

---

## Password Protection

The calculator includes basic password protection to prevent casual URL sharing:

- **Default password:** `drumwave2024` (if no environment variable set)
- **To change:** Set `VITE_ACCESS_PASSWORD` in Vercel environment variables
- **Session behavior:** Password persists until browser tab closes
- **Purpose:** Discourages unauthorized access, not bank-grade security

### Changing the Password

**In Vercel Dashboard:**
1. Go to your project
2. Settings → Environment Variables
3. Edit `VITE_ACCESS_PASSWORD`
4. Redeploy (automatic on next commit)

**For Local Development:**
1. Create `.env.local` in project root
2. Add: `VITE_ACCESS_PASSWORD=your_password`
3. Restart dev server

---

## What's Included

- ✓ React 18 with production build configuration
- ✓ Recharts for data visualization
- ✓ Vite for fast builds
- ✓ Password protection gate
- ✓ All dependencies pre-configured
- ✓ Responsive design (works on mobile/desktop)

---

## Local Testing (Optional)

If you want to test locally before deploying:
```bash
# Install dependencies
npm install

# Create .env.local with password
echo "VITE_ACCESS_PASSWORD=test123" > .env.local

# Run development server
npm run dev

# Opens at http://localhost:5173
```

---

## Updating the Calculator

1. Edit `src/App.jsx` with your changes
2. Commit and push to GitHub (if using Git integration)
3. Vercel rebuilds automatically

---

## Custom Domain (Optional)

In Vercel dashboard:
1. Go to your project
2. Settings → Domains
3. Add your custom domain (e.g., `calculator.drumwave.com`)

---

## Support

- Vercel docs: https://vercel.com/docs
- Vite docs: https://vitejs.dev
- React docs: https://react.dev

**Questions?** Check Vercel's support or reach out to your dev team.
