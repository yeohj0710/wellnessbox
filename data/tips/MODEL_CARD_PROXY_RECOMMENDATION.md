# Proxy Recommendation Model Card

- Model: One-vs-rest SGD logistic ingredient classifier + recommendation-count classifier
- Training class: `PROXY_GOLD_SIMULATION`
- Train records: 120,000
- Blind proxy-session test records: 5,000
- Ingredient classes: 14

## Blind-session results

- TIPS set precision: 100.00%
- 95% bootstrap CI: 100.00% - 100.00%
- Micro precision: 100.00%
- Micro recall: 100.00%
- Micro F1: 100.00%
- Exact match: 100.00%
- Recommendation-count accuracy: 100.00%

## Limitations

These values measure generalization from proxy teacher sessions A/B/C to proxy blind session D over the same
scenario ontology. They do not measure agreement with licensed pharmacists or real users. Replace the dataset and
rerun without changing the interfaces when pharmacist gold becomes available.

