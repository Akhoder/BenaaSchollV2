# 🚀 Deployment Guide - BenaaSchool V2

**Version:** 2.1  
**Status:** Production Ready  
**Last Updated:** December 2024

---

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] All features tested and working
- [ ] No linter errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Backup created

---

## 🎯 Deployment Platforms

### Option 1: Vercel (Recommended) ⭐

**Best for:** Automatic deployments, zero-config, Next.js optimized

#### Steps:

1. **Install Vercel CLI** (if not installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Link your project**:
```bash
vercel link
```

4. **Add Environment Variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Any other required env vars

5. **Deploy**:
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

#### Automatic Deployments:
- Connect your GitHub repository
- Vercel auto-deploys on every push
- Preview deployments for PRs

---

### Option 2: Netlify

**Best for:** Alternative to Vercel, good for static sites

#### Steps:

1. **Install Netlify CLI**:
```bash
npm i -g netlify-cli
```

2. **Login**:
```bash
netlify login
```

3. **Initialize**:
```bash
netlify init
```

4. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`

5. **Add Environment Variables** in Netlify Dashboard

6. **Deploy**:
```bash
netlify deploy --prod
```

---

### Option 3: Custom Server (VPS/Dedicated)

**Best for:** Full control, custom requirements

#### Requirements:
- Node.js 18+
- PM2 or similar process manager
- Nginx or Apache
- SSL certificate (Let's Encrypt recommended)

#### Steps:

1. **Clone repository**:
```bash
git clone <your-repo-url>
cd BenaaSchollV2
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build**:
```bash
npm run build
```

4. **Create PM2 ecosystem file** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'benaa-school',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3005
    }
  }]
};
```

5. **Start with PM2**:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

6. **Configure Nginx** (`/etc/nginx/sites-available/benaa-school`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **Enable SSL** (Let's Encrypt):
```bash
sudo certbot --nginx -d your-domain.com
```

---

### Option 4: Docker

**Best for:** Containerized deployments

#### Dockerfile:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3005

CMD ["npm", "start"]
```

#### Build and Run:
```bash
# Build image
docker build -t benaa-school .

# Run container
docker run -p 3005:3005 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  benaa-school
```

---

## 🔐 Environment Configuration

### Required Environment Variables

Create a `.env.production` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Supabase Configuration

1. **Enable Row Level Security** for all tables
2. **Configure RLS policies** (see `supabase/migrations/`)
3. **Add indexes** for performance
4. **Set up backups** in Supabase Dashboard
5. **Configure email templates** for auth

---

## 📊 Database Setup

### 1. Run Migrations

If using Supabase CLI:

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

Or manually in Supabase SQL Editor:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run all migration files in order from `supabase/migrations/`

### 2. Verify Tables

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 3. Seed Initial Data (Optional)

```sql
-- Create admin user (if not exists)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at)
VALUES ('admin@example.com', 'password_hash', NOW(), NOW())
ON CONFLICT DO NOTHING;
```

---

## 🧪 Post-Deployment Testing

### Functional Tests

- [ ] **Authentication**
  - [ ] Login works
  - [ ] Logout works
  - [ ] Registration works
  - [ ] Password reset works

- [ ] **Dashboard**
  - [ ] Loads correctly
  - [ ] Stats display
  - [ ] Quick actions work

- [ ] **Pages**
  - [ ] Students page loads and paginates
  - [ ] Teachers page loads and paginates
  - [ ] Classes page loads and displays
  - [ ] Subjects page loads
  - [ ] Users page loads and manages users
  - [ ] Announcements CRUD works
  - [ ] Schedule displays
  - [ ] Grades display

- [ ] **Permissions**
  - [ ] Admin can access all pages
  - [ ] Teacher can access assigned classes
  - [ ] Student can view grades/schedule
  - [ ] Supervisor can monitor classes

### Performance Tests

```bash
# Run Lighthouse audit
npx lighthouse https://your-domain.com --view

# Check bundle size
npm run build -- --analyze
```

Expected scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

---

## 🔧 Production Optimizations

### 1. Enable Image Optimization

Already configured in `next.config.js`:
```javascript
images: {
  unoptimized: false,
  minimumCacheTTL: 31536000,
}
```

### 2. Enable Compression

Configure in your server (Nginx example):
```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. Set Security Headers

Add to `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ];
}
```

### 4. Enable Monitoring

Recommended tools:
- **Vercel Analytics** (if using Vercel)
- **Sentry** (error tracking)
- **Google Analytics** (user analytics)
- **Supabase Dashboards** (database monitoring)

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Runtime Errors

1. Check browser console for errors
2. Check server logs
3. Verify environment variables
4. Check Supabase connection

### Database Connection Issues

1. Verify Supabase URL and key
2. Check RLS policies
3. Verify network connectivity
4. Check Supabase status

### Performance Issues

1. Check database query performance
2. Verify indexes are created
3. Enable caching where appropriate
4. Monitor resource usage

---

## 📈 Scaling Considerations

### Current Limits

- **Supabase Free Tier**: 500MB database, 2GB bandwidth
- **Vercel Hobby**: Unlimited bandwidth, 100GB storage
- **Recommended**: Start with free tiers, upgrade as needed

### When to Upgrade

- Database size > 400MB
- Monthly visitors > 50k
- Need dedicated support
- Need custom domains

### Horizontal Scaling

For high traffic:
- Use Supabase Pro/Enterprise
- Add caching layer (Redis)
- Use CDN for static assets
- Implement database read replicas

---

## 🔄 Update & Maintenance

### Regular Updates

1. **Dependencies** (monthly):
```bash
npm outdated
npm update
```

2. **Next.js** (quarterly):
```bash
npm install next@latest
```

3. **Database Migrations** (as needed):
```bash
# Create new migration
supabase migration new migration_name

# Apply
supabase db push
```

### Backup Strategy

- **Database**: Supabase automatic daily backups
- **Code**: Git repository
- **Files**: Cloud storage (Supabase Storage)

### Monitoring

Set up alerts for:
- Server downtime
- High error rates
- Database connections maxed
- Disk space low
- Slow queries

---

## 📞 Support

### Resources

- **Documentation**: See project docs
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Issues**: GitHub Issues
- **Supabase Docs**: https://supabase.com/docs

### Common Contacts

- Development Team: [Your Contact]
- Supabase Support: support@supabase.io
- Hosting Support: [Vercel/Netlify/etc.]

---

## ✅ Deployment Checklist Summary

- [ ] Code is tested and working
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Deployed to production
- [ ] Functional tests passed
- [ ] Performance tests passed
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team notified

---

**🎉 Congratulations! Your BenaaSchool V2 is now live in production!**

*Last Updated: December 2024*  
*Version: 2.1 - Production Ready*

