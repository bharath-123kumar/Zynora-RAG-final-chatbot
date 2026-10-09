# Zyngram Corporate and Operational Policies

## 1. Information Security and Zero-Trust Policy
All employees, contractors, and franchise operators must follow strict zero-trust credential access guidelines. Multi-factor authentication is mandatory on all administrative portals. API keys, JWT secrets, and database credentials must never be shared, hardcoded in repositories, or logged in client diagnostics.

## 2. Knowledge Base Governance and Lifecycle Policy
The Zyngram Knowledge Base is managed under a formal 4-stage document lifecycle:
1. **DRAFT**: Newly submitted or edited documentation undergoing verification. Drafts are strictly excluded from RAG retrieval.
2. **APPROVED**: Documentation verified by certified Knowledge Administrators.
3. **ACTIVE IN RAG**: Approved documentation actively indexed in the vector and keyword search indices for user queries.
4. **ARCHIVED**: Deprecated or superseded documentation retained strictly for historical audit trails. Excluded from RAG retrieval.

Any document not bearing the ACTIVE IN RAG or APPROVED status is inaccessible to the chatbot pipeline to prevent hallucination and unapproved guidance.

## 3. Workplace Hours and Shift Operations
Standard administrative offices operate Monday through Friday from 09:00 to 18:00 local time. Physical distribution facilities (Hubs and Commands) operate 24/7 on three rotating 8-hour shifts to sustain continuous transit flow.
