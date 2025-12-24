# GoDaddy DNS Setup for affordabilityindex.org

## Quick Reference Guide

### Step 1: Get Vercel DNS Information

After adding your domain in Vercel (Settings → Domains → Add affordabilityindex.org), Vercel will show you two DNS records:

**Typical Vercel DNS Records:**
```
A Record:
Type: A
Name: @
Value: 76.76.21.21 (your specific IP will be shown in Vercel)

CNAME Record:
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

### Step 2: Login to GoDaddy

1. Go to: https://dcc.godaddy.com/domains
2. Login with your GoDaddy account
3. Find and click on **affordabilityindex.org**

---

### Step 3: Open DNS Management

1. Click the **"DNS"** button or **"Manage DNS"** link
2. You'll see a list of DNS records

---

### Step 4: Configure A Record (Root Domain)

**Find the A Record for "@" (or add new one):**

```
Type: A
Name: @ (this represents affordabilityindex.org)
Value: [PASTE IP FROM VERCEL - looks like 76.76.21.21]
TTL: 600 seconds (or leave default)
```

**Actions:**
- If an A record with name "@" exists → Click "Edit" (pencil icon)
- If it doesn't exist → Click "Add" and select type "A"
- Paste the IP address from Vercel
- Save the record

---

### Step 5: Configure CNAME Record (www subdomain)

**Find the CNAME Record for "www" (or add new one):**

```
Type: CNAME
Name: www (this represents www.affordabilityindex.org)
Value: cname.vercel-dns.com
TTL: 600 seconds (or leave default)
```

**Actions:**
- If a CNAME record with name "www" exists → Click "Edit" (pencil icon)
- If it doesn't exist → Click "Add" and select type "CNAME"
- Paste "cname.vercel-dns.com" in the Value/Points to field
- Save the record

---

### Step 6: Remove Conflicting Records

**IMPORTANT - Delete these if they exist:**

❌ **Delete:** Any CNAME record for "@" (root can't be CNAME)
❌ **Delete:** Any A record for "www" (www should be CNAME)
❌ **Disable:** Domain Forwarding (if enabled)
❌ **Disable:** Domain Parking (if enabled)

**How to find Domain Forwarding:**
1. In GoDaddy domain management
2. Look for "Forwarding" section
3. If affordabilityindex.org is forwarding anywhere, click "Manage" and disable it

---

### Step 7: Verify Configuration

After saving changes in GoDaddy:

1. Go back to Vercel → Settings → Domains
2. Wait 5-10 minutes
3. Click "Refresh" next to your domain
4. Status should change to "Valid Configuration" ✓

---

## Visual Example

### Before (Typical GoDaddy Defaults):
```
Type    Name    Value                           TTL
──────────────────────────────────────────────────────
A       @       Parked (GoDaddy IP)             600
CNAME   www     @                               3600
```

### After (Correct Vercel Configuration):
```
Type    Name    Value                           TTL
──────────────────────────────────────────────────────
A       @       76.76.21.21                     600
CNAME   www     cname.vercel-dns.com            600
```

---

## Common GoDaddy Interface Notes

### Where to Click:
- **Edit record:** Pencil icon on the right
- **Delete record:** Trash can icon on the right
- **Add record:** "Add" or "Add Record" button (usually at bottom or top)

### TTL (Time To Live):
- **Default:** Usually 600 seconds or 1 hour
- **Recommendation:** Use 600 seconds (10 minutes) for faster updates
- **What it means:** How long DNS servers cache the record

### Record Name:
- **@** = Root domain (affordabilityindex.org)
- **www** = www subdomain (www.affordabilityindex.org)
- Leave the rest as shown by Vercel

---

## Verification Checklist

After DNS configuration, verify:

- [ ] A record for "@" points to Vercel's IP
- [ ] CNAME record for "www" points to cname.vercel-dns.com
- [ ] No conflicting A or CNAME records
- [ ] Domain forwarding is disabled
- [ ] Domain parking is disabled
- [ ] In Vercel, domain shows "Valid Configuration"

---

## Troubleshooting

### "Invalid Configuration" in Vercel

**Check:**
1. A record name is "@" not "affordabilityindex.org"
2. CNAME value is exactly "cname.vercel-dns.com" (no http://)
3. No extra spaces in values
4. Changes have been saved in GoDaddy

### DNS Not Updating

**Solutions:**
1. Wait 10-15 minutes after saving changes
2. Check propagation: https://www.whatsmydns.net
3. Clear browser cache or use incognito mode
4. Flush DNS on your computer: `ipconfig /flushdns` (Windows)

### Can't Find Records

**If you don't see any A or CNAME records:**
1. Look for "Default" or "All Records" filter
2. Make sure you're on the "DNS" or "DNS Records" tab
3. Scroll down - records might be below nameservers

---

## Expected Timeline

| Action | Time |
|--------|------|
| Save DNS changes | Immediate |
| GoDaddy processes change | 1-5 minutes |
| DNS propagation starts | 5-30 minutes |
| Vercel detects changes | 5-30 minutes |
| SSL certificate issued | 1-24 hours |
| Full global propagation | 24-48 hours |

---

## Quick Commands to Check DNS

**Check if A record is set (Windows):**
```bash
nslookup affordabilityindex.org
```
Should return: Vercel's IP address

**Check if CNAME is set (Windows):**
```bash
nslookup www.affordabilityindex.org
```
Should return: cname.vercel-dns.com

---

## Support Contacts

**GoDaddy Support:**
- Phone: 1-480-505-8877
- Chat: Available in GoDaddy account dashboard
- Help Center: https://www.godaddy.com/help

**Vercel Support:**
- Dashboard: https://vercel.com/support
- Docs: https://vercel.com/docs/custom-domains

---

*Last Updated: 2025-12-24*
