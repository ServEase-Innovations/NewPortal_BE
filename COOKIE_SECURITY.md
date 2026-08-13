# Cookie Authentication Security Configuration

## Overview

This application uses HTTP-only cookies for JWT authentication instead of Authorization headers. This provides better security against XSS attacks but requires careful configuration for cross-origin deployments.

## SameSite Policy Configuration

The `sameSite` cookie attribute controls when cookies are sent with cross-site requests:

### Options

1. **`strict`** (Most Secure)
   - Cookies only sent with same-site requests
   - ✅ Maximum CSRF protection
   - ❌ Breaks cross-origin navigation (e.g., links from external sites)
   - **Use when**: Frontend and backend share the same domain

2. **`lax`** (Balanced - Default)
   - Cookies sent with same-site requests and cross-site navigation
   - ✅ Good CSRF protection
   - ✅ Allows cross-origin navigation
   - ❌ May not work for cross-site API calls (POST/PUT/DELETE)
   - **Use when**: Frontend and backend are on related domains (e.g., app.domain.com ↔ api.domain.com)

3. **`none`** (Least Restrictive)
   - Cookies sent with all cross-site requests
   - ❌ No SameSite CSRF protection (requires additional CSRF tokens)
   - ✅ Works with any cross-origin setup
   - ⚠️ Requires HTTPS (secure: true)
   - **Use when**: Frontend and backend are on completely different domains

## Deployment Scenarios

### Same Domain (Recommended)
```
Frontend: https://portal.company.com
Backend:  https://portal.company.com/api
Config:   sameSite: 'strict'
```

### Subdomains
```
Frontend: https://app.company.com
Backend:  https://api.company.com
Config:   sameSite: 'lax'
```

### Cross-Site (Requires Additional Security)
```
Frontend: https://myapp.netlify.app
Backend:  https://myapi.heroku.com
Config:   sameSite: 'none' + CSRF protection
```

## Environment Configuration

Set in your `.env` file:

```env
# Explicit configuration (recommended)
COOKIE_SAMESITE_POLICY="lax"

# Enable CSRF protection for additional security (optional for 'lax')
ENABLE_CSRF_PROTECTION="true"

# Or let the system auto-detect
FRONTEND_URL="https://your-frontend.com"
BACKEND_URL="https://your-backend.com"
```

## Auto-Detection Logic

1. If `COOKIE_SAMESITE_POLICY` is set, use that value
2. If production + URLs provided, compare domains:
   - Same registrable domain → `lax`
   - Different domains → `none`
3. Default to `lax` for production, `lax` for development

## CSRF Protection Requirements

| SameSite | CSRF Protection Needed | Implementation |
|----------|----------------------|----------------|
| `strict` | ✅ Built-in (minimal) | SameSite provides protection |
| `lax`    | ✅ Built-in (good) | SameSite provides protection |
| `none`   | ❌ **Must implement CSRF tokens** | **Auto-enabled in this app** |

### CSRF Token Implementation

When CSRF protection is enabled, the system provides:

1. **CSRF Token Cookie**: Set as `csrfToken` (not httpOnly, so frontend can read)
2. **Token Validation**: Required in `x-csrf-token` header or `_csrf` body field
3. **Auto-Detection**: Automatically enabled for cross-site deployments

#### Frontend Implementation

```javascript
// Get CSRF token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrfToken='))
  ?.split('=')[1];

// Include in API requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

#### CSRF Protection Endpoints

- `GET /auth/csrf-token` - Get CSRF token separately
- Login response includes `csrfToken` field when protection is enabled
- All state-changing operations (POST/PUT/PATCH/DELETE) validate CSRF tokens

## Testing Your Configuration

1. **Same-Site Test**: Login and navigate normally
2. **Cross-Origin Test**: Make API calls from different domain/port
3. **CSRF Test**: Verify unauthorized requests are blocked
4. **Browser DevTools**: Check cookie attributes in Application tab

## Security Checklist

- [ ] Cookies are `httpOnly: true` (access/refresh tokens)
- [ ] Cookies are `secure: true` in production
- [ ] `sameSite` policy matches your deployment
- [ ] CSRF protection enabled for cross-site deployments (`sameSite: 'none'`)
- [ ] CSRF tokens included in frontend requests when required
- [ ] No sensitive data in cookie values (only opaque JWT tokens)
- [ ] Refresh token rotation implemented
- [ ] Proper cookie cleanup on logout (including CSRF token)
- [ ] Test CSRF protection with cross-origin requests