# Training data (not bundled)
Use only data you are authorized to process; strip names, contact details and other personal data before training. No trained model or fabricated metrics are included.

Official sources:
- NYC Open Data 311 Service Requests (2010–present): https://data.cityofnewyork.us/resource/erm2-nwe9.csv (public administrative records; verify terms, category availability and whether a usable description exists before use).
- CFPB Consumer Complaint Database: https://www.consumerfinance.gov/data-research/consumer-complaints/ (consumer narratives may be optional and scrubbed; confirm redistribution rules and label mapping).

Prepare a CSV with `text,category` headers using the ten supported categories. Inspect source fields and map only defensible labels; exclude records with missing or sensitive text. NYC 311 often has a descriptor rather than a rich narrative; do not claim that it provides narrative text for every record. CFPB primarily supports Finance & Payments, not all categories. Both datasets can be imbalanced; supplement with legitimately sourced, labeled complaints. Avoid using identifiers, repeated near-duplicates or the same incident across train/test. `train.py` deduplicates exact texts but does not automatically prevent incident-level leakage; curate source splits accordingly.

Example: `python ai-service/train.py --data datasets/approved_labeled.csv`. Model remains **untrained** until this succeeds. Multilingual extension: curate separate labeled corpora for Telugu, Hindi, Tamil, Kannada, Malayalam and Bengali; train an open-source multilingual transformer (e.g. XLM-R) and report per-language held-out precision/recall before enabling multilingual inference. No multilingual classifier is claimed here.
