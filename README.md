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

**Questions?** Check Vercel's support or reach out to your dev team.
