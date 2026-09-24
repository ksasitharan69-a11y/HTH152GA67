import json
import logging
import re
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMClient:
    """
    Unified client for LLM providers (Gemini, OpenAI, Groq, Ollama, OpenRouter).
    Includes structured JSON prompting, timeout handling, and fallback reasoning.
    """

    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower() if settings.LLM_PROVIDER else "gemini"
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL or ("gemini-1.5-flash" if "gemini" in self.provider else "gpt-4o-mini")
        self.base_url = settings.LLM_BASE_URL
        self.timeout = 30.0

    async def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Request structured JSON from configured LLM provider.
        Returns parsed dictionary or None if LLM is unavailable or output is invalid.
        """
        if not self.api_key or self.api_key.strip() == "":
            logger.info("No LLM_API_KEY configured. Utilizing integrated semantic reasoning engine.")
            return None

        try:
            if "gemini" in self.provider:
                return await self._call_gemini(prompt, system_instruction)
            elif "openai" in self.provider or self.base_url:
                return await self._call_openai(prompt, system_instruction)
            else:
                logger.warning(f"Unsupported LLM provider '{self.provider}'. Falling back to semantic engine.")
                return None
        except Exception as e:
            logger.error(f"Error contacting LLM provider ({self.provider}): {e}")
            return None

    async def _call_gemini(self, prompt: str, system_instruction: Optional[str]) -> Optional[Dict[str, Any]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        
        contents = []
        if system_instruction:
            contents.append({
                "role": "user",
                "parts": [{"text": f"SYSTEM INSTRUCTION: {system_instruction}"}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will strictly follow these instructions and output JSON only."}]
            })
            
        user_prompt = f"{prompt}\n\nIMPORTANT: Respond with pure JSON only. Do not wrap in markdown quotes or add extra text."
        contents.append({
            "role": "user",
            "parts": [{"text": user_prompt}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.error(f"Gemini API returned status {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            try:
                candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
                return self._parse_json_safe(candidate_text)
            except (KeyError, IndexError) as err:
                logger.error(f"Malformed response from Gemini: {err}")
                return None

    async def _call_openai(self, prompt: str, system_instruction: Optional[str]) -> Optional[Dict[str, Any]]:
        base_url = self.base_url or "https://api.openai.com/v1"
        url = f"{base_url.rstrip('/')}/chat/completions"
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": f"{prompt}\n\nRespond with valid JSON only."})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"OpenAI API returned status {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return self._parse_json_safe(content)

    @staticmethod
    def _parse_json_safe(raw_text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON safely from LLM output."""
        if not raw_text:
            return None
        text = raw_text.strip()
        # Remove markdown code block markers if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Attempt to find JSON object substring
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
            logger.error(f"Failed to parse JSON from text: {text[:200]}")
            return None

llm_client = LLMClient()
