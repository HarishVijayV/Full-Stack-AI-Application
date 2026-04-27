---
title: NutriGuard Pro
emoji: 🥗
colorFrom: green
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# NutriGuard Pro: Clinical AI Dietitian for IBD
(Your existing content here...)
# NutriGuard Pro: Clinical AI Dietitian for IBD

NutriGuard Pro is an advanced, agentic AI platform built to assist healthcare providers in creating safe, region-specific nutrition plans for **Ulcerative Colitis** and **IBD** patients. 

By combining **Retrieval-Augmented Generation (RAG)** with a multi-agent orchestration layer, the system ensures that every food recommendation is grounded in clinical evidence and regional availability.

---

##  Key Features

*  Agentic Workflow (LangGraph): Orchestrates four specialized agents:
   **Researcher:** Scrapes real-time regional food data using Tavily.
   **Chef:** Crafts 7-day meal plans based on patient vitals and allergies.
   **Auditor:** A RAG-powered agent that cross-references plans against 4+ clinical PDFs.
   **Judge:** Provides a final clinical verdict and protein-gap analysis.
* Specialized RAG: Uses a **fine-tuned MiniLM-L6-v2 embedding model** and ChromaDB to verify food safety against medical literature.
* Resilient Architecture: Implements a **Fallback & Degradation strategy** across three Gemini models (2.0 Flash, 1.5 Flash, 1.5 Flash-8b) to maintain 100% uptime.
* Knowledge Graph: Dynamically generates an interactive SQLite-backed food graph for different Indian states (Tamil Nadu, Kerala, Punjab, etc.).

---

## 🛠️Tech Stack

- **Backend:** FastAPI, Python 3.11
- **AI Orchestration:** LangGraph, Gemini 2.0/1.5 API
- **Database:** SQLite (Knowledge Graph), ChromaDB (Vector Store)
- **Embeddings:** Hugging Face (Fine-tuned sentence-transformers)
- **Search:** Tavily API
- **Deployment:** Docker, [Your Hosting Provider Here]

---

##  Quick Start

### 1. Prerequisites
- Python 3.11+
- Conda or Virtualenv
- API Keys: Google Gemini, Tavily

### 2. Installation
```bash
git clone [https://github.com/YOUR_USERNAME/nutriguard-pro.git](https://github.com/YOUR_USERNAME/nutriguard-pro.git)
cd nutriguard-pro/backend
pip install -r requirements.txt
