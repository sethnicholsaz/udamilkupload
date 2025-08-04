# MilkMoovement UDA Scraper

Automated data extraction from UDA MilkMoovement portal using Puppeteer and Docker, with data storage in Supabase.

## Features

- 🤖 **Automated Login**: Uses Puppeteer to authenticate with UDA portal
- 🔑 **Token Management**: Extracts fresh authentication tokens for API calls
- 📊 **Data Extraction**: Retrieves production data via direct API calls
- 💾 **Supabase Storage**: Stores data in structured PostgreSQL tables
- ⏰ **Scheduled Runs**: Configurable cron scheduling for daily automation
- 🐳 **Docker Ready**: Containerized for easy deployment
- 📈 **Health Monitoring**: Built-in health check endpoint

## Quick Start

### 1. Set up Supabase

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Get your project URL and anon key from Supabase settings

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

Required environment variables:
- `UDA_EMAIL`: Your UDA portal email
- `UDA_PASSWORD`: Your UDA portal password  
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### 3. Deploy with Docker

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f

# Check health
curl http://localhost:3000/health
```

## Configuration

### Scheduling

Set `CRON_SCHEDULE` in your `.env` file:

```bash
# Daily at 6 AM
CRON_SCHEDULE=0 6 * * *

# Every 6 hours
CRON_SCHEDULE=0 */6 * * *

# Weekdays at 6 AM
CRON_SCHEDULE=0 6 * * 1-5
```

### Timezone

```bash
TZ=America/Phoenix
TZ=America/New_York
TZ=UTC
```

## Data Structure

The scraper stores data in two Supabase tables:

### `uda_data_extracts`
Complete API responses with metadata and analytics

### `uda_production_records` 
Individual pickup records normalized for easy querying

## Development

```bash
# Install dependencies
npm install

# Run once (development mode)
npm run dev

# Run in production mode
NODE_ENV=production npm start
```

## Monitoring

- Health check: `GET /health`
- Docker logs: `docker-compose logs -f`
- Container status: `docker-compose ps`

## Troubleshooting

### Common Issues

1. **Login fails**: Check UDA credentials in `.env`
2. **No data stored**: Verify Supabase URL and key
3. **Token errors**: UDA may have changed authentication - check logs
4. **Cron not running**: Verify `NODE_ENV=production` is set

### Logs

```bash
# Real-time logs
docker-compose logs -f milkmoovement-scraper

# Last 100 lines
docker-compose logs --tail=100 milkmoovement-scraper
```

## Security Notes

- Never commit `.env` files
- Use environment variables in production
- Consider using Supabase service role key for server-side operations
- Regularly rotate UDA credentials
- Monitor Supabase usage and set up alerts

## License

MIT License - see LICENSE file for details