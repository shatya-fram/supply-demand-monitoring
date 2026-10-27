"""Shared SP product classes (owner definitions 20 and 27 Oct 2026; docs/assessments/sp_sellin_definition_assessment.md)."""
import re


def sp_class(name, price):
    """SP KPI definition (owner, 20 Oct 2026): SP Data Sell-In counts SP 3GB (plus SP Injection, from MOBO); SP0 / Zero is not counted.
    '3gb'  = name carries 3GB and is not a Zero SP (IM3 SP ORI 3GB / SP 3GB ORI, 3ID SP HAPPY 3GB, BUNDLE PACK ORI REGULER 3GB)
    'zero' = SP Zero, 3ID KPK bundle and empty-card bundles, FWA starter packs (Rp 10,000 class)
    'other'= any other starter pack (Happy 5GB / 7GB eSIM)
    S PLUS (3ID SP HAPPY S PLUS V2, Rp 13,000, first sold 23 Oct 2026) counts as SP Data (owner, 27 Oct 2026)"""
    n = (name or '').upper()
    if re.search(r'3\s?GB', n) and 'ZERO' not in n:
        return '3gb'
    if 'S PLUS' in n and 'ZERO' not in n:
        return '3gb'
    if 'ZERO' in n or 'KPK' in n or 'KOSONG' in n or 'FWA' in n or price == 10000:
        return 'zero'
    return 'other'
