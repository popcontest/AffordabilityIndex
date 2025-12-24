# Deployment Guide: affordabilityindex.org

## Overview
This guide walks you through deploying the Affordability Index to production at affordabilityindex.org using Vercel and GoDaddy DNS.

## Prerequisites
- GitHub account (to push code)
- Vercel account (free tier works)
- GoDaddy account with affordabilityindex.org domain
- Database already running on Supabase

---

## Step 1: Push Code to GitHub

If you haven't already, initialize and push your code to GitHub:

```bash
git add .
git commit -m "Production-ready build with new ranking pages"
git push origin master
```

---

## Step 2: Deploy to Vercel

### 2.1 Sign up/Login to Vercel
1. Go to https://vercel.com
2. Sign up with your GitHub account (or login if you have one)

### 2.2 Import Your Project
1. Click "Add New Project"
2. Select "Import Git Repository"
3. Choose your AffordabilityIndex repository
4. Click "Import"

### 2.3 Configure Build Settings
Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (leave as is)
- **Build Command:** `cd apps/web && npm run build`
- **Output Directory:** `apps/web/.next`
- **Install Command:** `npm install`

### 2.4 Add Environment Variables
Click "Environment Variables" and add:

**Production Environment:**
```
DATABASE_URL=postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**Optional (if using API Ninjas for property tax):**
```
API_NINJAS_KEY=zPLWy41q+T+kQ2mXED7VLw==dPc0q59YVhYZR1bE
```

### 2.5 Deploy
1. Click "Deploy"
2. Wait 2-5 minutes for build to complete
3. You'll get a temporary URL like: `https://affordability-index-xyz.vercel.app`

---

## Step 3: Configure GoDaddy DNS

### 3.1 Get Vercel DNS Records
After deployment, in your Vercel project:
1. Go to **Settings** → **Domains**
2. Enter `affordabilityindex.org`
3. Click "Add"
4. Vercel will show you DNS records to add

You'll see something like:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3.2 Configure DNS in GoDaddy

1. **Login to GoDaddy:** https://dcc.godaddy.com/domains
2. **Select your domain:** Click "affordabilityindex.org"
3. **Open DNS Management:** Click "Manage DNS"

### 3.3 Add DNS Records

**For the root domain (affordabilityindex.org):**

1. Find existing A record with name "@" (if exists, edit it; otherwise add new)
2. **Type:** A
3. **Name:** @
4. **Value:** `76.76.21.21` (use the IP from Vercel)
5. **TTL:** 600 seconds (or 1 hour)
6. Click "Save"

**For www subdomain (www.affordabilityindex.org):**

1. Find existing CNAME record with name "www" (if exists, edit it; otherwise add new)
2. **Type:** CNAME
3. **Name:** www
4. **Value:** `cname.vercel-dns.com` (use the value from Vercel)
5. **TTL:** 600 seconds (or 1 hour)
6. Click "Save"

### 3.4 Remove Conflicting Records (IMPORTANT!)

**Delete these if they exist:**
- Any CNAME record for "@" (root domain can't have CNAME)
- Any A record for "www" (www should use CNAME)
- Any "Domain Forwarding" settings for affordabilityindex.org
- Any parking page records

---

## Step 4: Verify Domain in Vercel

Back in Vercel:
1. Go to **Settings** → **Domains**
2. Your domain should show "Valid Configuration" after 5-10 minutes
3. If it shows errors, click "Refresh" after DNS propagates

---

## Step 5: Enable HTTPS/SSL

Vercel automatically provisions SSL certificates. This happens within 24 hours, but usually within minutes.

To verify:
1. Wait 10-15 minutes after DNS configuration
2. Visit https://affordabilityindex.org
3. You should see a valid SSL certificate (green lock icon)

---

## Step 6: Test Production Deployment

Visit these URLs to verify everything works:

1. **Homepage:** https://affordabilityindex.org
2. **State Rankings:** https://affordabilityindex.org/rankings/states
3. **Large Cities:** https://affordabilityindex.org/rankings/large-cities
4. **Mid-Size Cities:** https://affordabilityindex.org/rankings/mid-size-cities
5. **Small Cities:** https://affordabilityindex.org/rankings/small-cities
6. **Towns:** https://affordabilityindex.org/rankings/towns
7. **Sample City:** https://affordabilityindex.org/california/san-diego
8. **Sample ZIP:** https://affordabilityindex.org/zip/92101

---

## Common Issues & Troubleshooting

### DNS Not Propagating
- **Wait Time:** DNS changes can take 24-48 hours to propagate globally
- **Check Status:** Use https://www.whatsmydns.net to check propagation
- **Clear Cache:** Try incognito/private browsing mode

### "Invalid Configuration" in Vercel
- **Verify A Record:** Make sure @ points to Vercel's IP
- **Verify CNAME:** Make sure www points to cname.vercel-dns.com
- **Remove Conflicts:** Delete any domain forwarding or parking settings in GoDaddy

### Build Failing on Vercel
- **Check Environment Variables:** Ensure DATABASE_URL is set correctly
- **Check Build Logs:** Click on the failed deployment to see error details
- **Local Build Test:** Run `npm run build` locally to verify it works

### Database Connection Errors
- **Whitelist Vercel IPs:** In Supabase, ensure "Allow connections from any IP" is enabled
- **Connection String:** Verify the DATABASE_URL in Vercel matches Supabase exactly
- **Connection Pooling:** Use the pooler connection string (ends with :5432/postgres)

### SSL Certificate Issues
- **Wait Time:** SSL provisioning can take up to 24 hours
- **Domain Verification:** Ensure domain shows "Valid" in Vercel before SSL is issued
- **Force Refresh:** Try hard refresh (Ctrl+F5) or clear browser cache

---

## Post-Deployment Checklist

- [ ] Homepage loads at affordabilityindex.org
- [ ] www.affordabilityindex.org redirects to affordabilityindex.org
- [ ] SSL certificate is active (HTTPS works)
- [ ] All ranking pages load correctly
- [ ] Sample city pages display data
- [ ] Sample ZIP pages display data
- [ ] Search functionality works
- [ ] True Affordability API returns data
- [ ] Sitemap is accessible: /sitemap.xml
- [ ] Robots.txt is accessible: /robots.txt

---

## Continuous Deployment

Vercel automatically redeploys your site when you push to GitHub:

1. Make changes locally
2. Commit: `git commit -m "Your change description"`
3. Push: `git push origin master`
4. Vercel automatically builds and deploys (takes 2-5 minutes)

You can watch deployments at: https://vercel.com/[your-username]/affordability-index/deployments

---

## Monitoring & Analytics

### Vercel Analytics (Free)
1. Go to your project in Vercel
2. Click "Analytics" tab
3. Enable Web Analytics for free usage metrics

### Speed Insights
1. Go to "Speed Insights" tab in Vercel
2. Enable to track Core Web Vitals

### Error Tracking
Vercel automatically tracks runtime errors:
1. Go to "Logs" tab
2. Filter by "Errors" to see any issues

---

## Environment Variables Reference

Here are all the environment variables you need in Vercel:

```bash
# Required
DATABASE_URL=postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# Optional
API_NINJAS_KEY=zPLWy41q+T+kQ2mXED7VLw==dPc0q59YVhYZR1bE
```

To update environment variables:
1. Go to Vercel project → Settings → Environment Variables
2. Edit or add variables
3. Redeploy the project for changes to take effect

---

## Rollback Instructions

If something goes wrong:

1. Go to Vercel Dashboard
2. Click "Deployments" tab
3. Find a previous working deployment
4. Click the "..." menu next to it
5. Select "Promote to Production"
6. Confirm the rollback

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **GoDaddy DNS Help:** https://www.godaddy.com/help/manage-dns-680
- **Next.js Docs:** https://nextjs.org/docs

---

## Next Steps After Deployment

1. **Set up Google Analytics** (optional)
2. **Submit sitemap to Google Search Console:** https://search.google.com/search-console
3. **Enable Vercel Web Analytics** for visitor tracking
4. **Monitor database performance** in Supabase dashboard
5. **Set up monitoring alerts** (Vercel can notify you of errors)

---

*Last Updated: 2025-12-24*
