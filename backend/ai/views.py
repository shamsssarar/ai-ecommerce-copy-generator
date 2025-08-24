# backend/ai/views.py
import os
import time
import json
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# (optional) OpenAI support if you add billing later
try:
    from openai import OpenAI
except Exception:
    OpenAI = None


# ---------- Providers ----------

def call_ollama(prompt: str) -> str:
    """
    Call a local Ollama model (no keys, runs on http://localhost:11434).
    """
    model = os.getenv("OLLAMA_MODEL", "gemma2:2b")
    url = "http://localhost:11434/api/generate"
    payload = {"model": model, "prompt": prompt, "stream": False}
    r = requests.post(url, json=payload, timeout=120)
    if not r.ok:
        raise RuntimeError(f"Ollama error {r.status_code}: {r.text[:300]}")
    data = r.json()  # {'model': ..., 'response': '...'}
    return (data.get("response") or "").strip()


def call_huggingface(prompt: str) -> str:
    """
    Call Hugging Face Inference API (needs HF_API_TOKEN and HF_MODEL).
    """
    token = os.getenv("HF_API_TOKEN")
    model = (os.getenv("HF_MODEL", "Qwen/Qwen2.5-3B-Instruct") or "").strip()
    if not token:
        raise RuntimeError("Missing HF_API_TOKEN in .env")

    # Simple instruct-style wrapper helps most instruct/chat models
    wrapped = f"### Instruction:\n{prompt}\n\n### Response:"
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": wrapped,
        "parameters": {"max_new_tokens": 200, "temperature": 0.7, "return_full_text": False},
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    if resp.status_code == 503:  # cold start
        time.sleep(2)
        resp = requests.post(url, headers=headers, json=payload, timeout=60)

    if not resp.ok:
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text}
        hint = ""
        if resp.status_code == 404:
            hint = " (model id may be wrong or gated; try Qwen/Qwen2.5-3B-Instruct)"
        if resp.status_code == 403:
            hint = " (token may be missing 'Make calls to Inference Providers' scope)"
        raise RuntimeError(f"HF error {resp.status_code}: {err}{hint}")

    data = resp.json()
    text = None
    if isinstance(data, list) and data:
        item = data[0]
        text = item.get("generated_text") or item.get("summary_text") or item.get("text")
    elif isinstance(data, dict):
        text = data.get("generated_text") or data.get("text")
    return (text or json.dumps(data)[:1000]).strip()


def call_openai(prompt: str) -> str:
    """
    Call OpenAI (requires OPENAI_API_KEY and billing).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not OpenAI:
        raise RuntimeError("OpenAI not configured")

    client = OpenAI(api_key=api_key)
    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a concise writing assistant."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    return res.choices[0].message.content.strip()


# ---------- API ----------

@api_view(["POST"])
def generate(request):
    prompt = (request.data.get("prompt") or "").strip()
    if not prompt:
        return Response({"error": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

    provider = os.getenv("PROVIDER", "ollama").lower()
    mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"
    if mock_mode:
        return Response({"text": f"(MOCK) You asked: {prompt[:120]}..."})

    try:
        if provider == "ollama":
            text = call_ollama(prompt)
        elif provider == "hf":
            text = call_huggingface(prompt)
        elif provider == "openai":
            text = call_openai(prompt)
        else:
            # unknown provider → gentle fallback
            text = f"(MOCK) You asked: {prompt[:120]}..."
        return Response({"text": text})

    except Exception as e:
        # keep the UI usable even when errors happen
        return Response({
            "text": f"(MOCK due to error) {prompt[:120]}...",
            "warning": str(e)
        })
    
# ---------- Copy generator endpoint ----------

def _clip(txt: str, n: int) -> str:
    txt = (txt or "").strip()
    return txt[:n]

@api_view(["POST"])
def generate_copy(request):
    """
    Accepts structured product fields and generates marketing copy via Ollama.
    """
    data = request.data or {}

    name     = _clip(data.get("name"), 80)
    price    = _clip(str(data.get("price") or ""), 16)
    features = _clip(data.get("features") or "", 600)      # comma or newline separated
    tone     = _clip(data.get("tone") or "friendly", 20)   # friendly / professional / playful
    audience = _clip(data.get("audience") or "general shoppers", 40)
    bullets  = int(data.get("bullets") or 0)               # 0 = no bullets

    if not name:
        return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Build a clean prompt template
    prompt = f"""
You are a copywriter for an online shop.
Write a concise product description.

Product name: {name}
Price: {price if price else "N/A"}
Key features (comma or newline separated):
{features}

Tone: {tone}
Target audience: {audience}

Output requirements:
- 2 short paragraphs (total 60–120 words).
- Use simple, vivid language.
- Avoid hype or clichés.
"""
    if bullets > 0:
        prompt += f"\nThen add {bullets} crisp bullet points (5–12 words each).\n"

    # Call Ollama (local) through the helper you already added
    try:
        text = call_ollama(prompt)
        return Response({"description": text})
    except Exception as e:
        return Response({
            "description": f"(MOCK due to error) Could not generate copy for {name}.",
            "warning": str(e)
        })

