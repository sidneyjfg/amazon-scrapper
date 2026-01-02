# Amazon Scrapper - AI Coding Assistant Instructions

## 🎯 Project Overview

**Amazon Scrapper** is an automated invoice extraction system for Amazon Seller Central Brazil. It uses Puppeteer with stealth plugins to:
1. Authenticate with 2FA (TOTP) on Amazon Seller Central
2. Navigate to the invoicing console (Faturador)
3. Download XML invoice files for a configurable date range (default: last 4 days)
4. Filter XMLs by `natOp` (nature of operation) values
5. Upload filtered XMLs to SFTP server organized by client/platform/date
6. Track sent files to avoid duplicates using persistent state
7. Send execution reports via Google Chat webhook

**Execution Model**: Containerized Node.js app that runs via `node-cron` on a schedule (default: daily at 6AM).

## 🏗️ Architecture & Data Flow

### Three-Phase Flow Pattern
The system follows a sequential flow orchestrated by [src/main.js](src/main.js):

```javascript
loginFlow → panelFlow → downloadFlow
```

1. **Login Flow** ([src/flows/login.flow.js](src/flows/login.flow.js)): Handles Amazon authentication with TOTP 2FA and Brazil account selection
2. **Panel Flow** ([src/flows/panel.flow.js](src/flows/panel.flow.js)): Navigates to Faturador and configures date range via Shadow DOM manipulation
3. **Download Flow** ([src/flows/download.flow.js](src/flows/download.flow.js)): Downloads ZIP, extracts XMLs, filters by natOp, uploads via SFTP

### Shadow DOM Interaction Pattern
Amazon Seller Central uses Web Components with Shadow DOM extensively. Access pattern:

```javascript
const katButton = await page.$('kat-button[data-test="confirm-selection"]');
const shadow = await katButton.evaluateHandle(el => el.shadowRoot);
const realBtn = await shadow.$('button');
await realBtn.click();
```

See [src/services/auth.service.js](src/services/auth.service.js#L89-L95) and [src/services/navigation.service.js](src/services/navigation.service.js#L21-L26) for examples.

### State Management
- **Persistent State**: [state/sent-files.json](state/sent-files.json) tracks uploaded files to prevent re-uploads
- **State Utils**: [src/utils/state.utils.js](src/utils/state.utils.js) provides `loadSentFiles()` and `markAsSent(fileName)`
- **Lock File**: [src/main.js](src/main.js) uses `run.lock` to prevent concurrent executions

### XML Processing Pipeline
1. Download ZIP → Wait for completion ([src/utils/automation.utils.js](src/utils/automation.utils.js#L68-L88))
2. Extract XMLs → Clean temp directory
3. Parse each XML for `natOp` field using `xml2js` ([src/utils/xml.utils.js](src/utils/xml.utils.js#L24-L34))
4. Normalize and filter against `ALLOWED_NAT_OP` env var (semicolon-separated)
5. Upload only accepted files via SFTP ([src/utils/automation.utils.js](src/utils/automation.utils.js#L170-L220))

## 🔧 Development Patterns

### Human-Like Automation
Always use random delays to mimic human behavior:

```javascript
const { delay, getRandomDelay } = require('../utils/automation.utils');
await delay(await getRandomDelay(2000, 3500)); // Between actions
await page.type('#field', value, { delay: 100 }); // Typing simulation
```

### Page Evaluation for Complex DOM
For shadow DOM or complex interactions, use `page.evaluate()`:

```javascript
await page.evaluate(() => {
  const dropdown = document.querySelector('kat-dropdown-button');
  dropdown?.shadowRoot?.querySelector('button')?.click();
});
```

### CDP Session for Downloads
Download behavior is configured via Chrome DevTools Protocol:

```javascript
const client = await page.target().createCDPSession();
await client.send('Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: path.resolve(downloadDir)
});
```

See [src/core/browser.js](src/core/browser.js#L23-L27).

### Error Handling & Logging
- Use descriptive emoji-prefixed console logs: `console.log('✅ Success')`, `console.error('❌ Error')`
- Send execution results via webhook ([src/utils/webhook.js](src/utils/webhook.js))
- Browser timeout is 70 minutes to handle slow Amazon responses ([src/core/browser.js](src/core/browser.js#L11))

## 📦 Environment Variables

Critical variables (all in [README.md](README.md)):
- `AMAZON_EMAIL`, `AMAZON_PASSWORD`: Login credentials
- `SECRET_TOTP`: Base32-encoded TOTP secret for 2FA (see [src/utils/authenticatorPass.js](src/utils/authenticatorPass.js))
- `ALLOWED_NAT_OP`: Semicolon-separated list (e.g., `"VENDA;REMESSA"`) for XML filtering
- `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_BASE_PATH`: Upload destination
- `CRON_SCHEDULE`: Default `"0 6 * * *"` (6AM daily)
- `WEBHOOK_URL`: Google Chat webhook for notifications

## 🚀 Running & Debugging

### Local Development
```bash
npm install
npm start  # Starts cron scheduler
```

To run immediately (bypass cron), uncomment last line in [src/main.js](src/main.js#L95):
```javascript
runJob();
```

### Docker
```bash
docker-compose up -d  # Uses docker-compose-yml (note: missing .yml extension)
docker logs -f amazon-scrapper
```

Volumes persist state and downloads:
- `./state:/app/state` - Sent files tracking
- `./downloads:/app/downloads` - Temporary download directory

## 🎨 Code Organization

- **Flows** ([src/flows/](src/flows/)): High-level orchestration (login → panel → download)
- **Services** ([src/services/](src/services/)): Business logic (auth, navigation, download)
- **Utils** ([src/utils/](src/utils/)): Reusable helpers (automation, XML parsing, SFTP, state)
- **Config** ([src/config/](src/config/)): Environment-based configuration
- **Core** ([src/core/](src/core/)): Infrastructure (browser setup, logging, errors)

## 🔍 Testing Changes

1. Set `CRON_SCHEDULE="*/5 * * * *"` for frequent testing
2. Enable `headless: false` in [src/core/browser.js](src/core/browser.js#L10) to watch Puppeteer
3. Check [state/sent-files.json](state/sent-files.json) to verify duplicate prevention
4. Monitor webhook payloads for execution metrics

## ⚠️ Common Pitfalls

- **Shadow DOM changes**: Amazon updates break selectors frequently. Check [src/services/navigation.service.js](src/services/navigation.service.js) for shadow root navigation patterns
- **Date format**: Amazon expects `MM/DD/YYYY` format (see [src/services/navigation.service.js](src/services/navigation.service.js#L87-L94))
- **TOTP timing**: 30-second window; use fresh tokens from [src/utils/authenticatorPass.js](src/utils/authenticatorPass.js)
- **File naming**: Missing `.yml` extension in `docker-compose-yml` - keep for consistency
