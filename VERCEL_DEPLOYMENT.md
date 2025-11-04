# 🚀 Deploy to Vercel - Complete Guide

## Option 1: Deploy via Vercel Website (Easiest)

### **Step 1: Push to GitHub**
```bash
cd "/Users/arpitjindal/VS Code/Bootcamp 2/TimeLock-Predictions"
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### **Step 2: Deploy on Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repo: `Arpit-Jindal-01/TimeLock-Predictions`
4. Configure settings:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as is (or set to `./`)
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: `frontend`
5. Click "Deploy"
6. Wait 1-2 minutes ⏳
7. Your site is live! 🎉

---

## Option 2: Deploy via Vercel CLI (Advanced)

### **Step 1: Install Vercel CLI**
```bash
npm i -g vercel
```

### **Step 2: Login to Vercel**
```bash
vercel login
```

### **Step 3: Deploy**
```bash
cd "/Users/arpitjindal/VS Code/Bootcamp 2/TimeLock-Predictions"
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **timelock-predictions**
- Directory? **./frontend**
- Override settings? **N**

### **Step 4: Deploy to Production**
```bash
vercel --prod
```

---

## 📁 Project Structure for Vercel

```
TimeLock-Predictions/
├── frontend/              # This will be served
│   ├── index.html        # Main page
│   ├── analytics.html    # Analytics
│   ├── profile.html      # Profile
│   ├── *.js             # JavaScript files
│   └── *.css            # Stylesheets
├── contract/             # Ignored by Vercel
├── vercel.json           # Vercel configuration
└── .vercelignore         # Files to ignore
```

---

## ⚙️ Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "version": 2,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    },
    {
      "src": "/",
      "dest": "/frontend/index.html"
    }
  ]
}
```

This routes all traffic to the `frontend` directory.

---

## 🌐 After Deployment

Your site will be available at:
```
https://timelock-predictions.vercel.app
```
or
```
https://timelock-predictions-[random].vercel.app
```

You can also add a custom domain in Vercel settings!

---

## ✅ Verification Steps

After deployment, test these:

1. **Homepage loads**: https://your-url.vercel.app
2. **Wallet connection works**: Click "Connect Freighter Wallet"
3. **Balance displays**: Shows real XLM from Stellar
4. **Analytics page**: https://your-url.vercel.app/analytics.html
5. **Profile page**: https://your-url.vercel.app/profile.html
6. **Mobile responsive**: Test on phone

---

## 🐛 Troubleshooting

### **Issue: 404 Not Found**
**Solution**: Check that `vercel.json` routes are correct and `frontend` directory exists

### **Issue: Files not loading**
**Solution**: Verify paths in HTML are relative (not absolute)

### **Issue: Wallet not connecting**
**Solution**: Freighter works on deployed sites, no changes needed

---

## 🔄 Update Deployment

After making changes:

```bash
# Commit changes
git add .
git commit -m "Update frontend"
git push origin main

# Vercel auto-deploys on push!
# Or manually: vercel --prod
```

---

## 🎯 Environment Variables (Optional)

If you need to add environment variables:

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add variables (e.g., API keys)

For this project, no environment variables needed - everything is in the frontend!

---

## 📊 Analytics

Vercel provides:
- Real-time visitor analytics
- Performance metrics
- Error tracking
- Deployment logs

Access via Vercel Dashboard → Your Project → Analytics

---

## 💡 Pro Tips

1. **Custom Domain**: Add in Settings → Domains
2. **HTTPS**: Automatic and free with Vercel
3. **Preview Deployments**: Every git push creates preview URL
4. **Rollback**: Easy rollback to previous deployments
5. **Edge Network**: Content served from edge locations (fast!)

---

## 🚀 Ready to Deploy!

Just run these 3 commands:

```bash
# 1. Commit everything
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 2. Install Vercel CLI (if needed)
npm i -g vercel

# 3. Deploy
vercel --prod
```

Your site will be live in 2 minutes! 🎉

---

**Your deployed site will have:**
- ✅ All frontend features working
- ✅ Wallet connection (Freighter + Manual)
- ✅ Live balance tracking
- ✅ Analytics dashboard
- ✅ Mobile optimization
- ✅ Social sharing
- ✅ Fast global CDN delivery

The contract is already deployed on Stellar Testnet, so everything works immediately! 🔥
