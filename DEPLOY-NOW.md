# Deploy Now - Quick Start Checklist

## 30-Minute Deployment Guide

Follow these steps in order to deploy affordabilityindex.org to production.

---

## ✅ Pre-Deployment Checklist

- [ ] Production build completes successfully (already done!)
- [ ] All ranking pages work on localhost
- [ ] Database is on Supabase (already configured!)
- [ ] You have access to GoDaddy account
- [ ] You have a GitHub account

---

## 📋 Step-by-Step Deployment

### Step 1: Push to GitHub (5 minutes)

**If you haven't already:**

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Production ready: Rankings redesign complete"

# Create GitHub repo at: https://github.com/new
# Name it: AffordabilityIndex

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/AffordabilityIndex.git
git branch -M master
git push -u origin master
```

- [ ] Code is on GitHub

---

### Step 2: Deploy to Vercel (10 minutes)

1. **Go to:** https://vercel.com/signup
   - [ ] Sign up with GitHub account

2. **Import Project:**
   - [ ] Click "Add New Project"
   - [ ] Select "Import Git Repository"
   - [ ] Choose "AffordabilityIndex" repo
   - [ ] Click "Import"

3. **Configure Build:**
   - Framework: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `cd apps/web && npm run build`
   - Output Directory: `apps/web/.next`
   - [ ] Settings verified

4. **Add Environment Variable:**
   Click "Environment Variables" tab:
   ```
   Name: DATABASE_URL
   Value: postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres
   ```
   - [ ] DATABASE_URL added

5. **Deploy:**
   - [ ] Click "Deploy"
   - [ ] Wait for build (2-5 minutes)
   - [ ] Note your temporary URL (e.g., affordability-index-xyz.vercel.app)
   - [ ] Test temporary URL in browser

---

### Step 3: Add Custom Domain (2 minutes)

In your Vercel project:

1. **Go to:** Settings → Domains
   - [ ] Enter: `affordabilityindex.org`
   - [ ] Click "Add"

2. **Note the DNS records shown:**
   ```
   A Record:
   Name: @
   Value: [IP ADDRESS - write it down!]

   CNAME Record:
   Name: www
   Value: cname.vercel-dns.com
   ```
   - [ ] DNS records noted

---

### Step 4: Configure GoDaddy DNS (5 minutes)

1. **Login to GoDaddy:**
   - [ ] Go to: https://dcc.godaddy.com/domains
   - [ ] Click on "affordabilityindex.org"
   - [ ] Click "Manage DNS"

2. **Add/Edit A Record:**
   ```
   Type: A
   Name: @
   Value: [PASTE IP FROM VERCEL]
   TTL: 600
   ```
   - [ ] A record configured

3. **Add/Edit CNAME Record:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600
   ```
   - [ ] CNAME record configured

4. **Remove Conflicts:**
   - [ ] Delete any domain forwarding
   - [ ] Delete any parking settings
   - [ ] No CNAME for "@"
   - [ ] No A record for "www"

5. **Save Changes:**
   - [ ] All DNS changes saved

---

### Step 5: Verify Domain (10 minutes)

1. **In Vercel:**
   - [ ] Go to Settings → Domains
   - [ ] Wait 5-10 minutes
   - [ ] Click "Refresh"
   - [ ] Status shows "Valid Configuration" ✓

2. **Test Domain:**
   - [ ] Visit: https://affordabilityindex.org
   - [ ] Visit: https://www.affordabilityindex.org
   - [ ] Both load successfully

---

### Step 6: Test All Pages (5 minutes)

Visit each of these URLs and verify they work:

- [ ] https://affordabilityindex.org (homepage)
- [ ] https://affordabilityindex.org/rankings
- [ ] https://affordabilityindex.org/rankings/states
- [ ] https://affordabilityindex.org/rankings/large-cities
- [ ] https://affordabilityindex.org/rankings/mid-size-cities
- [ ] https://affordabilityindex.org/rankings/small-cities
- [ ] https://affordabilityindex.org/rankings/towns
- [ ] https://affordabilityindex.org/california/san-diego
- [ ] https://affordabilityindex.org/zip/92101

---

## 🎉 You're Live!

If all checkboxes are checked, your site is now live at affordabilityindex.org!

---

## ⚠️ Troubleshooting

### DNS Not Working Yet?

**Wait:** DNS can take 24-48 hours to fully propagate
**Check:** https://www.whatsmydns.net/?query=affordabilityindex.org
**Try:** Incognito/private browsing mode

### Build Failed?

**Check build logs in Vercel:**
1. Go to Deployments tab
2. Click on failed deployment
3. Read error message
4. Common fixes:
   - Verify DATABASE_URL is set
   - Check for TypeScript errors
   - Ensure all dependencies are in package.json

### Site Shows Error?

**Check database connection:**
1. Verify DATABASE_URL environment variable
2. In Supabase: Settings → Database → Allow connections from any IP

---

## 📊 Post-Deployment (Optional)

### Enable Analytics (5 minutes)

1. **Vercel Analytics:**
   - [ ] Go to Analytics tab in Vercel
   - [ ] Click "Enable Web Analytics"

2. **Speed Insights:**
   - [ ] Go to Speed Insights tab
   - [ ] Click "Enable"

### Submit to Google (10 minutes)

1. **Google Search Console:**
   - [ ] Go to: https://search.google.com/search-console
   - [ ] Add property: affordabilityindex.org
   - [ ] Verify ownership (use DNS TXT record method)
   - [ ] Submit sitemap: https://affordabilityindex.org/sitemap.xml

---

## 🔄 Future Deployments

Every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

Vercel automatically rebuilds and deploys (takes 2-5 minutes).

---

## 📞 Need Help?

**Detailed Guides:**
- Full deployment: See `DEPLOYMENT.md`
- GoDaddy DNS: See `GODADDY-DNS-SETUP.md`

**Support:**
- Vercel: https://vercel.com/support
- GoDaddy: 1-480-505-8877

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ affordabilityindex.org loads
✅ SSL certificate is active (HTTPS)
✅ All ranking pages work
✅ Database queries return data
✅ No errors in Vercel logs

---

*Deployment Time: ~30 minutes*
*DNS Propagation: Up to 48 hours*
*SSL Provisioning: Up to 24 hours*

**Good luck with your deployment!** 🚀
