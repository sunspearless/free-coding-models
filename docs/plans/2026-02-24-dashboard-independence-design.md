# Dashboard Independence & Custom Models Design

**Date:** 2026-02-24  
**Status:** Approved

## 1. Architecture & Config Changes

### Config Structure

Extend `~/.free-coding-models.json` with new fields:

```json
{
  "apiKeys": { ... },
  "providers": { ... },
  "favorites": [],
  "pingHistory": {},
  "customProviders": {
    "my-provider": {
      "name": "My Custom API",
      "url": "https://api.example.com/v1/chat/completions"
    }
  },
  "customModels": [
    {
      "id": "my-provider/my-model",
      "name": "My Model",
      "context": "128k",
      "price": "Free",
      "tier": "A",
      "provider": "my-provider"
    }
  ]
}
```

- Dashboard merges built-in `sources.js` with `customModels` at runtime
- CLI ignores custom data (graceful degradation)

## 2. UI Components & Data Flow

### New Components

1. **Add Model Modal**
   - Fields: Name, Context, Price, Tier (dropdown), Provider (dropdown)
   - Button in toolbar/nav bar
   - Validates before saving

2. **Add Provider Modal**
   - Fields: Provider Key, Display Name, API Endpoint URL
   - Button in Settings
   - Validates URL format

3. **Extended Model Table**
   - Same columns as existing
   - User-added models have visual indicator
   - Custom providers in filter dropdown

### Data Flow

```
User Action → Modal Submit → POST /api/config → config.js → Save to ~/.free-coding-models.json → Reload merged model list
```

## 3. Error Handling

- **Config Migration**: Initialize empty custom fields if undefined
- **Provider Validation**: Require https://, check duplicate key
- **Model Validation**: Required fields, valid tiers, valid provider
- **Runtime**: No API key = "noauth" status; CLI ignores custom data

## 4. Testing

### Unit Tests
- Config load/save with custom fields
- Validation functions
- Model merging logic

### Integration Tests
- POST/GET /api/config endpoints
- Ping works with custom provider URL
