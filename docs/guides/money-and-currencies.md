# Money & Currencies Guide

In Qirsh, **every single fils is accounted for**. The API never uses floating point numbers for financial amounts.

## Supported Currencies & Exponents

| Currency Code | Currency Name | Exponent | Minor Unit | Example: 15.25 Units in Minor |
| :--- | :--- | :--- | :--- | :--- |
| **JOD** | Jordan Dinar | **3** | Fils | `15250` fils |
| **KWD** | Kuwaiti Dinar | **3** | Fils | `15250` fils |
| **BHD** | Bahraini Dinar | **3** | Fils | `15250` fils |
| **OMR** | Omani Rial | **3** | Baisa | `15250` baisa |
| **USD** | US Dollar | **2** | Cents | `1525` cents |
| **EUR** | Euro | **2** | Cents | `1525` cents |
| **GBP** | British Pound | **2** | Pence | `1525` pence |
| **SAR** | Saudi Riyal | **2** | Halalas | `1525` halalas |
| **AED** | UAE Dirham | **2** | Fils | `1525` fils |
| **JPY** | Japanese Yen | **0** | Yen | `15` yen |

---

## Precision Rules
1. **Integer Minor Units**: When passing `amountMinor`, provide an integer count of the currency's smallest sub-unit.
2. **Strict Decimal Validation**: If you pass a formatted string (e.g., `"15.250"`), it is parsed according to the currency's exponent.
   - For JOD (3 decimals): `"15.25"` -> `15250`, `"15.250"` -> `15250`.
   - Any value exceeding the exponent (e.g. `"15.2505"`) is **strictly rejected** with `INVALID_AMOUNT_PRECISION` instead of being silently rounded.
3. **Deterministic Splitting**: Dividing an amount (e.g. yearly budget into 12 months) distributes remainder units one by one to the earliest portions:
   ```ts
   splitAmount(100n, 3); // Yields: [34n, 33n, 33n], Sum strictly equals 100n
   ```
