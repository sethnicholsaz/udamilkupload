# Deployment Guide

## 🚀 Deploying to Your Server

### Prerequisites
- Docker and Docker Compose installed on your server
- SSH access to your server
- Git installed on your server

### Step 1: Upload Files to Server

**Option A: Using Git (Recommended)**
```bash
# On your server
git clone <your-repo-url>
cd MilkMoovement-Puppeteer
```

**Option B: Manual Upload**
Upload these files to your server:
- `Dockerfile`
- `docker-compose.yml` 
- `package.json`
- `index.js`
- `.env` (with your credentials)
- `supabase-schema.sql` (if not already run)

### Step 2: Configure Environment

Create/edit `.env` file on your server:
```bash
nano .env
```

Make sure these are set correctly:
```bash
NODE_ENV=production
UDA_EMAIL=your-email@domain.com
UDA_PASSWORD=your-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PRODUCER_ID=60cce07b8ada14e90f0783b7
CRON_SCHEDULE=0 11 * * *
TZ=America/Phoenix
PORT=3000
```

### Step 3: Deploy with Docker

```bash
# Build and start the container
docker-compose up -d

# Check if it's running
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Verify Deployment

**Check Health:**
```bash
curl http://localhost:3000/health
```

**Check Logs:**
```bash
docker-compose logs -f milkmoovement-scraper
```

**Check Supabase:**
- Go to your Supabase dashboard
- Check `uda_data_extracts` and `uda_production_records` tables

### Step 5: Monitor

**View Container Status:**
```bash
docker-compose ps
```

**View Recent Logs:**
```bash
docker-compose logs --tail=50 milkmoovement-scraper
```

**Restart if Needed:**
```bash
docker-compose restart
```

## 🔧 Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs milkmoovement-scraper
   ```

2. **Login fails**
   - Check UDA credentials in `.env`
   - Verify network connectivity

3. **Supabase errors**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY
   - Check if schema was created

4. **Cron not running**
   - Ensure `NODE_ENV=production`
   - Check timezone settings

### View Live Logs
```bash
# Follow logs in real-time
docker-compose logs -f

# Check specific container
docker-compose logs -f milkmoovement-scraper
```

## 📅 Schedule Information

The scraper runs daily at 11:00 AM Phoenix time by default.

To change the schedule, edit `CRON_SCHEDULE` in `.env`:
- `0 6 * * *` = 6 AM daily
- `0 */6 * * *` = Every 6 hours
- `0 6 * * 1-5` = Weekdays at 6 AM

After changing schedule:
```bash
docker-compose restart
```

## 🔒 Security

- Never commit `.env` files to version control
- Use strong passwords for UDA account
- Consider using Supabase service role key for production
- Regularly monitor access logs

## 📊 Monitoring Data

Check your Supabase dashboard regularly:
- **uda_data_extracts**: Shows each scraping run
- **uda_production_records**: Shows individual pickup records
- Look for gaps in data or error patterns