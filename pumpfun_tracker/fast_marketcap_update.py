#!/usr/bin/env python3
"""
⚡ FAST Market Cap Updater
==========================
Aggiorna SOLO i market cap dei token dalla lista statica.
Usa DexScreener batch API per velocità massima.

Ogni esecuzione crea un file con timestamp.
"""

import requests
import json
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ============================================================================
# CONFIGURAZIONE
# ============================================================================

TOKEN_LIST_FILE = "pumpfun_token_list.json"  # Lista statica dei token
OUTPUT_DIR = "marketcap_updates"
DEXSCREENER_BASE = "https://api.dexscreener.com"
PUMPFUN_SUPPLY = 1_000_000_000

# DexScreener permette max 30 token per richiesta
BATCH_SIZE = 30
MAX_WORKERS = 5  # Richieste parallele

# ============================================================================
# FUNZIONI
# ============================================================================

def load_token_list():
    """Carica la lista statica dei token"""
    with open(TOKEN_LIST_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["tokens"]

def fetch_market_caps_batch(token_addresses: list) -> dict:
    """
    Recupera market cap per un batch di token (max 30)
    Ritorna {ca: market_cap}
    """
    results = {}
    
    # DexScreener accetta fino a 30 address separati da virgola
    addresses_str = ",".join(token_addresses)
    
    try:
        response = requests.get(
            f"{DEXSCREENER_BASE}/latest/dex/tokens/{addresses_str}",
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            pairs = data.get("pairs", [])
            
            for pair in pairs:
                base_token = pair.get("baseToken", {})
                ca = base_token.get("address", "")
                
                if ca:
                    # Prendi il market cap o FDV
                    mc = pair.get("marketCap") or pair.get("fdv") or 0
                    if mc == 0:
                        price = float(pair.get("priceUsd") or 0)
                        if price > 0:
                            mc = price * PUMPFUN_SUPPLY
                    
                    # Prendi il valore più alto se ci sono più pair per lo stesso token
                    if ca not in results or mc > results[ca]:
                        results[ca] = float(mc)
    except Exception as e:
        pass
    
    return results

def update_market_caps(tokens: list) -> list:
    """Aggiorna i market cap di tutti i token"""
    
    # Estrai tutte le CA
    all_cas = [t["ca"] for t in tokens]
    
    # Dividi in batch
    batches = [all_cas[i:i+BATCH_SIZE] for i in range(0, len(all_cas), BATCH_SIZE)]
    
    print(f"   📦 {len(batches)} batch da processare ({BATCH_SIZE} token/batch)")
    
    # Fetch in parallelo
    all_market_caps = {}
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(fetch_market_caps_batch, batch): i 
                   for i, batch in enumerate(batches)}
        
        completed = 0
        for future in as_completed(futures):
            batch_results = future.result()
            all_market_caps.update(batch_results)
            completed += 1
            
            if completed % 3 == 0 or completed == len(batches):
                print(f"   ⏳ Batch {completed}/{len(batches)} completati...")
    
    print(f"   ✅ Market cap recuperati per {len(all_market_caps)} token")
    
    # Aggiorna i token con i nuovi market cap
    updated_tokens = []
    for token in tokens:
        ca = token["ca"]
        mc = all_market_caps.get(ca, 0)
        
        updated_tokens.append({
            "ca": ca,
            "name": token["name"],
            "symbol": token["symbol"],
            "logo": token["logo"],
            "market_cap": mc
        })
    
    # Ordina per market cap
    updated_tokens.sort(key=lambda x: x["market_cap"], reverse=True)
    
    return updated_tokens

def save_update(tokens: list) -> str:
    """Salva l'aggiornamento con timestamp"""
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"mc_update_{timestamp}.json"
    filepath = Path(OUTPUT_DIR) / filename
    
    # Filtra quelli senza market cap
    valid_tokens = [t for t in tokens if t["market_cap"] > 0]
    
    data = {
        "timestamp": datetime.now().isoformat(),
        "total_tokens": len(valid_tokens),
        "tokens": valid_tokens
    }
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return str(filepath), valid_tokens

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "="*60)
    print("   ⚡ FAST MARKET CAP UPDATER")
    print("="*60 + "\n")
    
    start = datetime.now()
    
    # Carica lista token
    print(f"📂 Caricamento token da {TOKEN_LIST_FILE}...")
    tokens = load_token_list()
    print(f"   ✅ {len(tokens)} token caricati\n")
    
    # Aggiorna market cap
    print("📡 Recupero market cap...")
    updated = update_market_caps(tokens)
    
    # Salva
    filepath, valid_tokens = save_update(updated)
    
    elapsed = (datetime.now() - start).total_seconds()
    
    print("\n" + "="*60)
    print(f"   💾 SALVATO: {filepath}")
    print(f"   📊 Token con MC valido: {len(valid_tokens)}")
    print(f"   ⚡ Tempo: {elapsed:.1f}s")
    print("="*60)
    
    # Preview top 10
    print("\n🔝 TOP 10 per Market Cap:")
    print("-" * 55)
    for i, t in enumerate(valid_tokens[:10], 1):
        mc = t["market_cap"]
        if mc >= 1_000_000:
            mc_str = f"${mc/1_000_000:.2f}M"
        else:
            mc_str = f"${mc/1_000:.1f}K"
        print(f"{i:2}. {t['symbol'][:10]:<10} {mc_str:>12}")
    print("-" * 55)
    
    print(f"\n✅ Fatto in {elapsed:.1f} secondi!\n")

if __name__ == "__main__":
    main()
