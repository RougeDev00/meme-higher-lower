# 🚀 Pump.fun Market Cap Tracker

Traccia in tempo reale il market cap di 359 token Pump.fun con market cap > $100k.

## 📦 Contenuto

- `pumpfun_token_list.json` - Lista dei 359 token (CA, nome, simbolo, logo)
- `fast_marketcap_update.py` - Script per aggiornare i market cap (~1 secondo!)
- `requirements.txt` - Dipendenze Python

## ⚡ Installazione

1. **Installa Python 3.10+** se non lo hai già

2. **Installa le dipendenze:**

```bash
pip install -r requirements.txt
```

## 🎯 Utilizzo

Esegui lo script per ottenere i market cap aggiornati:

```bash
python fast_marketcap_update.py
```

**Output:** Crea un file JSON in `marketcap_updates/` con timestamp.

## 📊 Formato Output

```json
{
  "timestamp": "2026-01-11T03:00:31",
  "total_tokens": 319,
  "tokens": [
    {
      "ca": "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn",
      "name": "Pump",
      "symbol": "PUMP", 
      "logo": "https://...",
      "market_cap": 1359040000
    }
  ]
}
```

## ⏱️ Performance

- **~1 secondo** per aggiornare tutti i 359 token
- Usa DexScreener API (gratuita, senza limiti)
- Batch di 30 token per richiesta

## 📝 Note

- I token nella lista sono stati filtrati per avere:
  - Market cap > $100,000
  - Logo disponibile
- La lista è statica, puoi aggiornarla periodicamente con lo scraper completo
