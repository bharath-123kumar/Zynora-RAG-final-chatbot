# Zyngram Day 17 — Zynora AI RAG Chatbot Project Improvement Report

**Project Title:** Zynora — Zyngram Internal RAG Chatbot Intelligence System  
**Evaluation Phase:** Day 17: Project Improvement & Progress Presentation  
**Author:** AI Engineer Trainee  
**Date:** October 14, 2026  
**Repository:** [https://github.com/bharath-123kumar/Zynora-RAG-final-chatbot](https://github.com/bharath-123kumar/Zynora-RAG-final-chatbot)  

---

## A. Previous Project Status

Prior to Day 17, the Zynora RAG Chatbot stood as a functioning full-stack application built across Days 11–14:
- **Backend:** Node.js + Express.js modular REST API with JWT authentication, RBAC, and SQLite/PostgreSQL dual-database support.
- **Frontend:** React (Vite) single-page application with message list, conversation history sidebar, admin knowledge document manager, and system monitoring dashboard.
- **RAG Pipeline:** Custom zero-dependency hybrid retrieval engine combining BM25 keyword matching and cosine vector similarity over approved Markdown/JSON documents.
- **Test Baseline:** 60 automated tests covering RAG quality (40), security (10), and API lifecycle (10).

While fundamentally operational, a critical review revealed multiple usability, auditability, and interaction bottlenecks that hindered enterprise operations.

---

## B. Problems Identified & Verified

| Issue ID | Category | Problem Description | Reproduction Steps | Expected Behavior | Actual Behavior | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISS-01** | RAG / Citations | **Missing Citation Excerpt Snippets** | Ask any question; inspect the source card or API response. | Sources should display the exact supporting sentence/chunk cited from the knowledge document. | Only `documentTitle`, `section`, and `category` were shown; users could not audit the supporting text. | High |
| **ISS-02** | Frontend UI/UX | **Risk of Duplicate Concurrent Submissions** | Double-click "Send" or press Enter rapidly before async response resolves. | Input should be locked with an atomic flag, preventing multiple identical requests. | Redundant parallel API requests triggered duplicate user messages in state. | Medium |
| **ISS-03** | UI / Zero-Trust | **Ambiguous Fallback Presentation** | Ask out-of-domain question (e.g. "What is Apple stock price?"). | Exact fallback should have prominent visual boundary badge explaining zero-trust deflection. | Rendered as plain text identical to grounded answers with no visual distinction. | High |
| **ISS-04** | RAG Precision | **Sub-optimal Extraction for Core Executive Concepts** | Query "What is the mission of Zyngram?" or "What is Zyngram's vision?". | Exact high-confidence extraction of mission and vision statements from approved overview document. | Relied on general sentence sliding window, occasionally capturing surrounding narrative text. | Medium |
| **ISS-05** | Database Schema | **Source References Lacked Snippet Persistence** | Query `source_references` table in PostgreSQL. | Cited excerpts should be stored for historical audit compliance. | `source_references` only had document ID, title, section, score without snippet text. | Medium |
| **ISS-06** | Testing Coverage | **No Dedicated Automated Regression Suite for Day 17 Features** | Run master test runner. | Test runner should validate snippet generation, duplicate safety, and boundary alerts. | Test runner only covered Day 11–14 baseline specs (60 tests). | Medium |

---

## C. Improvements Implemented

### 1. Interactive Auditable Source Citations & Snippet Drawer
- **RAG Engine (`groundedSynthesizer.js`):** Extended `sources` array to capture `snippet: c.content.trim().slice(0, 320)` alongside document ID, title, category, section, version, and relevance score.
- **Database Schema (`003_add_source_snippet.sql`):** Added `ALTER TABLE source_references ADD COLUMN IF NOT EXISTS snippet TEXT;`.
- **Controllers (`chatController.js` & `conversationController.js`):** Updated SQL inserts and selects to persist and load citation snippets.
- **Frontend UI (`SourceCard.jsx`):** Redesigned the card with an expandable drawer (`📖 View Verified Excerpt` / `▲ Hide Excerpt`), displaying the exact excerpt in an illuminated citation box, plus a 1-click **"Copy Citation"** action.

### 2. Zero-Trust Knowledge Boundary Callout & One-Click Copy
- **Frontend (`MessageBubble.jsx`):** Added automatic detection of the exact fallback sentence (`"I couldn't find this information in the approved Zyngram knowledge base."`).
- **Visual Alerting:** When the boundary is reached, an illuminated amber alert banner (`🛡️ Zero-Trust Knowledge Boundary Active`) is rendered, explaining that external hallucination has been deflected according to enterprise compliance.
- **Copy Response:** Added a 1-click `📋 Copy` button to all assistant messages with animated tooltip feedback (`✓ Copied`).

### 3. Frontend Usability, Accessibility, and Duplicate Lock
- **Duplicate Prevention (`ChatPage.jsx`):** Implemented an atomic submission lock using `useRef(false)` combined with immediate textarea and button disabling during retrieval.
- **Multi-Stage Real-Time Status:** Replaced the generic 3-dot spinner with an animated operational status banner:
  - *"Ingesting query and matching approved documents..."*
  - *"Calculating BM25 + cosine vector similarity..."*
  - *"Verifying zero-trust grounding & citations..."*
- **1-Click Sample Inquiries:** Sample prompts now feature immediate 1-click execution for seamless evaluation demos.
- **Transcript Export:** Added an `📤 Export` action in the header that formats and copies the entire conversation transcript with source citations to the clipboard.
- **Sidebar Search & Badges (`Sidebar.jsx`):** Added a live conversation search filter and message count badges (`[3 msgs]`).

### 4. Precision Grounded Synthesis
- Enhanced `groundedSynthesizer.js` with targeted extraction for **Mission**, **Vision**, **Executive Summary**, **Secure Ledger**, and **FAQ inquiries** directly from approved chunks.

---

## D. New or Enhanced Features

1. **Auditable Source Citations with Expandable Excerpts:** Inspect the exact text used to construct an answer.
2. **Zero-Trust Boundary Visual Callouts:** Clear visual indication when inquiries fall outside approved Zyngram documentation.
3. **Multi-Stage Grounding Progress Indicator:** Operational feedback showing each retrieval pipeline step in real time.
4. **Conversation Transcript Export:** One-click clipboard copy of full Q&A sessions with verified citations.
5. **Interactive Inquiry History Search:** Instant client-side filtering across past conversation threads.
6. **Atomic Submission Guard:** Zero duplicate network requests during rapid user interaction.

---

## E. Files Changed and Technical Decisions

| File Path | Nature of Change | Technical Rationale |
| :--- | :--- | :--- |
| `backend/src/db/migrations/003_add_source_snippet.sql` | Created | Migrates database to support persistent text snippet storage in `source_references`. |
| `backend/src/rag/groundedSynthesizer.js` | Modified | Adds snippet mapping to `sources` and precision targeted extraction for mission, vision, and FAQs. |
| `backend/src/controllers/chatController.js` | Modified | Inserts `src.snippet` into `source_references` on conversation message persistence. |
| `backend/src/controllers/conversationController.js` | Modified | Returns `snippet` column when re-loading conversation message history. |
| `frontend/src/components/SourceCard.jsx` | Modified | Adds interactive snippet drawer, copy citation button, keyboard navigation, and relevance badge. |
| `frontend/src/components/MessageBubble.jsx` | Modified | Adds Zero-Trust Knowledge Boundary banner and copy response action. |
| `frontend/src/pages/ChatPage.jsx` | Modified | Implements atomic `isSubmittingRef`, step-by-step loading state, transcript export, and 1-click prompts. |
| `frontend/src/components/Sidebar.jsx` | Modified | Adds search filter and message count badges to conversation list. |
| `frontend/src/styles/chat.css` | Modified | Adds styles for boundary banners, snippet boxes, copy buttons, and loading spinners. |
| `tests/day17Improvements.test.js` | Created | 10 automated test cases verifying Day 17 improvements. |
| `tests/testRunner.js` | Modified | Integrates Day 17 suite into consolidated master test runner (70 tests total). |
| `package.json` | Modified | Adds `test:day17` script. |

---

## F. Before-and-After Comparisons

| Aspect | Before Day 17 | After Day 17 |
| :--- | :--- | :--- |
| **Source Transparency** | Only title and section were displayed. Supporting text was hidden. | Expandable snippet box displays the exact cited excerpt from the approved chunk. |
| **Citation Copying** | Manual copy of text required. | 1-click citation copy button formats title, section, and version. |
| **Fallback Queries** | Rendered as ordinary text message with no visual alert. | Prominent `🛡️ Zero-Trust Knowledge Boundary Active` alert banner clarifies intentional deflection. |
| **User Message Submission** | Rapid clicking or Enter keypresses caused duplicate requests. | Atomic ref guard completely blocks duplicate simultaneous submissions. |
| **Loading Feedback** | 3 static bouncing dots with no progress description. | Multi-stage dynamic status showing ingestion, vector similarity, and grounding verification. |
| **Conversation Auditability** | No export option available. | 1-click transcript export formats conversation + citations for documentation. |
| **Inquiry History** | Static list without search or message count. | Live keyword search filter and message counter badges on every conversation. |
| **Automated Tests** | 60 baseline tests. | **70 automated tests (100% passing)** including Day 17 regression coverage. |

---

## G. Tests Executed and Actual Results

Ran: `node tests/testRunner.js`

```text
╔════════════════════════════════════════════════════════════╗
║       ZYNORA AI RAG CHATBOT — AUTOMATED TEST RUNNER        ║
║      Day 11, 12, 13, 14 Specification Compliance Suite     ║
╚════════════════════════════════════════════════════════════╝

-------------------------------------------------------------
📊 RAG Test Suite Summary: 40 / 40 Passed (100%)
-------------------------------------------------------------
📊 Security Test Suite Summary: 10 / 10 Passed (100%)
-------------------------------------------------------------
📊 API Integration Test Summary: 10 / 10 Passed (100%)
-------------------------------------------------------------

=============================================================
🚀 EXECUTING DAY 17 PROJECT IMPROVEMENT TEST SUITE
=============================================================
✅ PASS [DAY17-01] Source citations include verified text snippets for auditability
✅ PASS [DAY17-02] Exact fallback sentence strictly returned for out-of-domain queries
✅ PASS [DAY17-03] Precision extraction of Zyngram Mission statement verified
✅ PASS [DAY17-04] Precision extraction of Zyngram Vision statement verified
✅ PASS [DAY17-05] Contextual query resolution successfully binds preceding topic
✅ PASS [DAY17-06] Database schema verified: source_references.snippet exists
✅ PASS [DAY17-07] Unapproved DRAFT documents are completely excluded from retrieval
✅ PASS [DAY17-08] Deprecated ARCHIVED documents are completely excluded from retrieval
✅ PASS [DAY17-09] Adversarial injection attempts deflected safely with zero-trust boundary
✅ PASS [DAY17-10] FAQ precision extraction matches approved organizational architecture

-------------------------------------------------------------
📊 Day 17 Test Suite Summary: 10 / 10 Passed (100%)
-------------------------------------------------------------

╔════════════════════════════════════════════════════════════╗
║                  FINAL CONSOLIDATED SUMMARY                ║
╠════════════════════════════════════════════════════════════╣
║ Total Test Cases Executed: 70                              ║
║ Passed Tests:             70                               ║
║ Failed Tests:             0                                ║
║ Success Rate:             100%                             ║
║ Execution Time:           37.97 seconds                    ║
╚════════════════════════════════════════════════════════════╝

🎉 ALL 70 TESTS PASSED SUCCESSFULLY WITH ZERO DEFECTS!
```

---

## H. Evidence Locations

- **Local Frontend UI:** `http://localhost:3000`
- **Local Backend API:** `http://localhost:5000`
- **Backend Health Check:** `http://localhost:5000/health`
- **Master Test Runner:** `tests/testRunner.js`
- **Day 17 Test Suite:** `tests/day17Improvements.test.js`
- **New Database Migration:** `backend/src/db/migrations/003_add_source_snippet.sql`
- **Presentation Outline:** `docs/DAY_17_PRESENTATION_OUTLINE.md`

---

## I. Known Issues and Limitations

1. **Remote Render Cold Start:** On Render's free tier, the PostgreSQL database and backend service enter sleep after 15 minutes of inactivity; initial wake-up takes ~30–45 seconds.
2. **Local Vector Model Bounds:** Vector similarity uses a fast in-process BM25 + normalized character n-gram cosine model without external embeddings, deliberately designed for zero-API cloud isolation.

---

## J. Next Steps

1. **Deploy Updates to Production:** Commit and push Day 17 improvements to GitHub `master` branch for automated deployment to Render and Vercel.
2. **Deliver Day 17 Presentation:** Utilize the 8-minute presentation outline to present the technical architecture, live zero-trust demonstration, and 100% test pass rate to the Zyngram technical evaluators.
