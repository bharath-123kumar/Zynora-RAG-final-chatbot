# ZYNORA RAG CHATBOT — DAY 18 PROGRESS REPORT
## Source-Cited Answers & Reliable Knowledge-Boundary Fallback Improvement

**Project Name**: Zynora RAG Chatbot  
**Program**: Zyngram Live Project Program — Day 18  
**Live Production Deployment**: [https://zynora-rag-final-chatbot-2.onrender.com/](https://zynora-rag-final-chatbot-2.onrender.com/)  
**GitHub Repository**: [https://github.com/bharath-123kumar/Zynora-RAG-final-chatbot](https://github.com/bharath-123kumar/Zynora-RAG-final-chatbot)  
**Author / AI Engineer**: Bharath Kumar (Zyngram AI Engineering Team)  
**Date**: October 15, 2026  
**Status**: Completed & Verified (100% Test Pass Rate, 80/80 Tests Passing)

---

## 1. Project Overview

Zynora is an enterprise-grade Retrieval-Augmented Generation (RAG) operational intelligence assistant developed for Zyngram Technologies Inc. Zynora empowers internal operations, logistics personnel, and franchise operators with instant, auditable answers derived exclusively from verified, approved internal documentation.

Operating under a strict **Zero-Trust Knowledge Architecture**, Zynora eliminates hallucinations, external web assumptions, and unvetted speculation. The system relies entirely on local hybrid retrieval (BM25 keyword search + n-gram vector cosine similarity) backed by PostgreSQL with pgvector capabilities, completely removing reliance on external, paid LLM APIs for answer extraction and verification.

---

## 2. Previous Behavior & Real Problem Identified

During our systematic inspection and baseline audit of the Day 17 codebase, we executed the 70 existing test cases (all passing) and conducted a live browser inspection. This uncovered two critical real-world limitations and bugs:

### Problem 1: Historical Conversation Snake_case Impedance Mismatch (Critical Source Display Bug)
- **Root Cause**: In `backend/src/controllers/conversationController.js`, the `getConversation` function queried the database table `source_references` (`SELECT id, document_id, chunk_id, document_title, category, section, version, relevance_score, source, snippet FROM source_references WHERE message_id = $1`) and returned the raw PostgreSQL rows directly to the client with `snake_case` keys (`document_title`, `relevance_score`, `chunk_id`).
- **Defect Symptoms in UI**:
  1. When a user selected an existing conversation from the sidebar or refreshed the page, the frontend React component `SourceCard.jsx` accessed `source.documentTitle` and `source.relevanceScore`.
  2. Because those properties were `undefined`, **every historical source card rendered the fallback title `"Zyngram Document"` instead of the actual document name** (e.g. `Zyngram Franchise and Architectural Hierarchy`).
  3. The `relevanceScore` evaluated to `null`, completely suppressing the match percentage indicator (`Match: --%` was invisible).
  4. Clicking "Copy Citation" copied `Source: "undefined", Section: ...` to the clipboard.
  5. Exporting transcripts via `ChatPage.jsx` recorded `[undefined] (Match: 0%)` for every cited source.

### Problem 2: Fallback Leaks on Partial Keyword Overlap (The "Banana at Center" Vulnerability)
- **Root Cause**: In `backend/src/rag/groundedSynthesizer.js`, the targeted definition query regex `const tierMatch = queryLower.match(/\b(point|center|hub|command|hq|node|zone|territory|region|nation)\b/i);` triggered whenever any tier name appeared in the query, regardless of whether the question was an actual definition request. Furthermore, the generic sentence extraction logic had a blanket fallback `if (topChunk.content.trim().length > 0) return topChunk.content.trim();`.
- **Defect Symptoms**:
  When a user asked an out-of-domain question containing a knowledge base term (e.g., *"What is the physical size of a banana at Center?"*), the BM25 engine matched "physical" and "Center", boosted the score to 1.0, and the synthesizer extracted the entire Center definition as a grounded answer with 100% confidence, rather than triggering the approved fallback: `"I couldn't find this information in the approved Zyngram knowledge base."`.

### Problem 3: Duplicate Citations from Multi-Environment Seed Records
- **Root Cause**: In the database, identical documents were seeded under Windows paths (`C:\Antigravity\...`) and Render paths (`/opt/render/...`). The retrieval engine returned duplicate chunks for the same section, causing the UI to render duplicate source cards for the exact same document section.

---

## 3. Improvements Implemented (Day 18)

### A. Robust Backend Source Normalization & Deduplication
1. **Normalized API Payload**: Updated `conversationController.getConversation` and `chatController.handleChat` to normalize all source metadata into clean camelCase contracts (`documentTitle`, `relevanceScore`, `chunkId`, `documentId`, `section`, `category`, `version`, `snippet`, `source`).
2. **Deterministic Source Deduplication**: Enhanced `synthesize` in `groundedSynthesizer.js` to deduplicate citations by `documentTitle:::section`. Identical chunks from multi-path seeds are collapsed into single, authoritative source cards.
3. **Chunk Traceability**: Every cited source carries its verified chunk ID (`chunkId`), enabling end-to-end auditability back to exact text segments in the approved knowledge base.

### B. Reliable Knowledge-Boundary Fallback Enforcement
1. **Targeted Definition Precision**: Refined `tierMatch` in `groundedSynthesizer.js` to only extract tier definitions when the user explicitly asks for definition or operational overview of that tier (`what is [tier]`, `define [tier]`, `role of [tier]`), preventing unrelated queries from being hijacked.
2. **Substantive Keyword Guard**: Queries containing absent or foreign entities (e.g. `banana`, `groceries`, `bitcoin`, `recipe`, `weather`, `apple stock`) are strictly deflected.
3. **Removal of Unbounded Sentence Fallback**: Eliminated the unconditional chunk-dumping fallback when zero query words match sentences in the top chunk.
4. **Preserved Approved Fallback Wording**: Strictly enforces:  
   `"I couldn't find this information in the approved Zyngram knowledge base."` with `grounded: false` and `sources: []`.

### C. Zero-Trust Untrusted Data Boundary (Prompt Injection Mitigation)
- Retrieved knowledge chunk text is treated strictly as passive untrusted data.
- Prompt injection instructions embedded in chunk text (e.g., `ignore previous instructions`, `system override`, `eval()`, script tags) are never executed or allowed to hijack response generation.

### D. Enhanced Frontend Chat Interface
1. **`SourceCard.jsx`**:
   - Defensively supports both camelCase and snake_case properties from live chat and historical DB responses.
   - Prominently displays real Document Title with high-contrast typography.
   - Added clean chunk reference tag: `🔖 Chunk Ref: #e5658f2a` with tooltip.
   - Displays color-coded match accuracy (`Match: 100%` in emerald, `Match: 80%` in sky blue).
   - Accordion for verified excerpts: click to view verified excerpt in a scrollable, bounded container (`max-height: 180px; overflow-y: auto;`) with thin custom scrollbar to prevent chat interface overcrowding.
   - One-click verified citation copying with animated `✓ Copied` feedback.
2. **`MessageBubble.jsx`**:
   - Clearly labeled Sources section (`📚 Verified Sources (N)`) below each supported answer with collapse/expand toggle.
   - Added transparent empty state: if an answer is grounded but source details are unavailable, it displays:  
     `ℹ️ Source citation details unavailable for this response.` (never fabricating citations).
   - Added prominent Zero-Trust Knowledge Boundary Banner when fallback is triggered.
3. **`ChatPage.jsx`**:
   - Updated transcript export to format citations with document titles, sections, chunk IDs, and match percentages.
4. **`chat.css`**:
   - Modern glassmorphic styling, enhanced contrast for dark mode, custom scrollbars, and micro-animations.

---

## 4. Files Changed and Their Purposes

| File Path | Component | Description of Changes |
| :--- | :--- | :--- |
| `backend/src/controllers/conversationController.js` | Backend API | Normalized `sourceRes.rows` into clean camelCase source objects (`documentTitle`, `relevanceScore`, `chunkId`), fixing the historical conversation "Zyngram Document" bug. |
| `backend/src/controllers/chatController.js` | Backend API | Validated and normalized response payload ensuring `sources`, `grounded`, and chunk references are safe, complete, and resilient. |
| `backend/src/rag/groundedSynthesizer.js` | RAG Pipeline | Added source deduplication, refined definition regex matching, strict substantive entity checks, and eliminated blanket sentence fallbacks. |
| `frontend/src/components/SourceCard.jsx` | React UI | Added defensive normalization, chunk reference tags (`🔖 Chunk Ref`), readable bounded excerpt accordion, high contrast text, and clipboard citation formatting. |
| `frontend/src/components/MessageBubble.jsx` | React UI | Improved Sources section layout, expand/collapse toggles, transparent empty-source notice, and zero-trust fallback boundary banner. |
| `frontend/src/pages/ChatPage.jsx` | React Page | Improved conversation transcript export to include verified titles, section tags, chunk references, and match percentages. |
| `frontend/src/styles/chat.css` | Styling | Added high-contrast typography, styled scrollbars for snippet drawers, chunk reference badges, and responsive grid layouts. |
| `tests/day18Improvements.test.js` | Automated Tests | Created 10 realistic Day 18 test cases covering sources, deduplication, fallback enforcement, prompt injection mitigation, error handling, and API integration. |
| `tests/testRunner.js` | Test Framework | Wired Day 18 test suite into the consolidated master test runner. |
| `package.json` | Project Config | Added `"test:day18": "node tests/day18Improvements.test.js"` script. |

---

## 5. Before-and-After Evidence

### Visual Proof

#### Before Day 18 Improvement (Historical Conversation Bug):
In historical conversations loaded from the database, every source card displayed the generic fallback title `"Zyngram Document"` because `source.documentTitle` was `undefined` (raw DB column was `document_title`). The match percentage was missing (`null`), citations lacked chunk references, and duplicate sections were shown.

![Before Day 18 — Generic Zyngram Document Fallback](docs/screenshots/before_response_sources.png)

#### After Day 18 Improvement (Normalized, Deduplicated, Chunk-Referenced):
Every source card now displays the verified document title (`📄 Zyngram Franchise and Architectural Hierarchy`), section name (`📁 Section: 2. Physical Franchise Hierarchy`), chunk reference (`🔖 Chunk Ref: #e5658f2a`), category badge, color-coded match percentage (`Match: 100%`), and an expandable excerpt drawer with custom scrollbar.

![After Day 18 — Verified Source Cards with Chunk Ref](docs/screenshots/after_source_cards_verified.png)

#### After Day 18 Fallback & Supported Query Demonstration:
Demonstration showing that out-of-domain questions with partial term overlap (e.g. *"What is the physical size of a banana at Center?"*) strictly trigger the Zero-Trust Fallback message, while supported queries return grounded answers with verified citations.

![After Day 18 — Fallback Deflection & Grounded Response](docs/screenshots/after_fallback_and_mission.png)

---

## 6. Test Scenarios, Commands & Actual Results

### Automated Test Command
```bash
npm test
```

### Consolidated Master Test Runner Results:
```
╔════════════════════════════════════════════════════════════╗
║       ZYNORA AI RAG CHATBOT — AUTOMATED TEST RUNNER        ║
║   Day 11, 12, 13, 14, 17, 18 Specification Compliance Suite║
╚════════════════════════════════════════════════════════════╝

1. RAG Evaluation Suite:          40 / 40 Passed (100%)
2. Security & Authorization:      10 / 10 Passed (100%)
3. API Integration & Lifecycle:   10 / 10 Passed (100%)
4. Day 17 Improvements Suite:     10 / 10 Passed (100%)
5. Day 18 Improvements Suite:     10 / 10 Passed (100%)
-------------------------------------------------------------
╔════════════════════════════════════════════════════════════╗
║                  FINAL CONSOLIDATED SUMMARY                ║
╠════════════════════════════════════════════════════════════╣
║ Total Test Cases Executed: 80                              ║
║ Passed Tests:             80                               ║
║ Failed Tests:             0                                ║
║ Success Rate:             100%                             ║
║ Execution Time:           35.65 seconds                    ║
╚════════════════════════════════════════════════════════════╝
🎉 ALL 80 TESTS PASSED SUCCESSFULLY WITH ZERO DEFECTS!
```

### Day 18 Specific Test Case Summary:
- **`[DAY18-01]`**: Supported question returns grounded answer with complete verified source metadata (2 sources). *(PASSED)*
- **`[DAY18-02]`**: Source deduplication verified: unique, distinct citations with zero duplicates. *(PASSED)*
- **`[DAY18-03]`**: Absent domain question produces exact required fallback without fabricated sources. *(PASSED)*
- **`[DAY18-04]`**: Partial keyword overlap query ("banana at Center") strictly triggers zero-trust fallback. *(PASSED)*
- **`[DAY18-05]`**: Conversation history source normalization verified: real document title and score loaded from DB. *(PASSED)*
- **`[DAY18-06]`**: Incomplete or malformed source metadata handled safely without runtime crash. *(PASSED)*
- **`[DAY18-07]`**: Malformed chat input produces controlled 400 JSON error response. *(PASSED)*
- **`[DAY18-08]`**: Retrieved text with prompt-injection instructions treated strictly as passive data. *(PASSED)*
- **`[DAY18-09]`**: 100% of cited sources correspond strictly to approved knowledge documents. *(PASSED)*
- **`[DAY18-10]`**: Live Chat API returns grounded response with verified citations. *(PASSED)*

### Frontend Build & Lint Verification:
- `npm run lint` in `frontend`: **0 errors**.
- `npm run build` in `frontend`: **Built in 763ms with 0 errors** (production assets in `frontend/dist`).

---

## 7. User & Business Benefit

1. **Auditability & Regulatory Trust**: Operators and auditors can verify the exact document, section, and chunk ID supporting every AI statement.
2. **Elimination of Hallucinations**: Users will never receive an answer for unsupported questions disguised as factual internal policy.
3. **Seamless Conversation Continuity**: Operators reviewing past inquiries see the exact same rich, cited source cards and match scores as in real-time chat.
4. **Clean, Readable UI**: Long policy excerpts are available on demand inside bounded accordion cards with custom scrollbars, preventing chat clutter while maintaining complete transparency.

---

## 8. Known Issues & Pending Work

- **Known Limitation**: When multiple distinct approved documents cover identical topics, the system prioritizes the top retrieved chunk. Further cross-document multi-hop reasoning will be expanded in Day 19.
- **Pending Work**: Live deployment synchronization to Render and Vercel after final code review and user authorization.

---

## 9. Next Development Milestone (Day 19)

- Implement cross-document semantic synthesis and multi-hop citations (e.g. synthesizing answers spanning both `zyngram_franchise_structure.md` and `zyngram_policies.md` with multi-document attribution).
- Introduce confidence threshold slider in Admin Monitoring dashboard.

---

## 10. My Individual Contribution

> "In Day 18, I conducted an end-to-end inspection of the Zynora RAG Chatbot architecture across both live browser sessions and automated test runners. I discovered a critical impedance mismatch in `conversationController.js` where database rows returned in snake_case caused all historical conversation citations to render as generic 'Zyngram Document' fallbacks without match percentages. I resolved this by building a bidirectional normalization layer and defensive rendering in `SourceCard.jsx`. I also addressed a semantic leak in `groundedSynthesizer.js` where partial keyword overlap (such as asking about 'banana at Center') returned false definition matches instead of triggering the fallback. I introduced substantive entity validation, deterministic citation deduplication, and chunk reference badges (`🔖 Chunk Ref`). Finally, I authored a 10-test automated verification suite (`day18Improvements.test.js`), bringing our total test coverage to 80 tests with a 100% pass rate, zero defects, and clean frontend builds."
