from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.discovery import build
from fastapi import FastAPI, HTTPException, Query
import urllib.parse
import requests
from google import genai
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.genai as genai
import time
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to ["http://localhost:3000"] for React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google Drive API config
API_KEY = "AIzaSyCTqIYMBpgXkEvTAnROEu6yhaMcpT0gs8E"
FOLDER_ID = "1W6rstApBxHSSLQhoK5LPPhhiwgK9klXa"  # Dumps_site folder id

FIREBASE_EXAMS_URL = "https://homepage-e8970-default-rtdb.firebaseio.com/Exams.json"

@app.get("/api/exams")
def list_all_exams():
    try:
        r = requests.get(FIREBASE_EXAMS_URL, timeout=6)
        r.raise_for_status()
        db = r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not db:
        return {}

    # ✅ Just return the database structure as is
    return db

RDB_URL = "https://dumps-134-default-rtdb.firebaseio.com"

@app.get("/api/exam")
def exam(vendor: str = Query(...), exam: str = Query(...)):


    # encode vendor + exam path safely for Firebase
    path = f"{vendor}/{exam}"
    encoded = "/".join(urllib.parse.quote(seg, safe="") for seg in path.split("/"))
    url = f"{RDB_URL}/{encoded}.json"
    print(url)

    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        return r.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Invalid JSON from RTDB")


# 🔑 List of API keys
ALL_API_KEYS = [
    "cdcdcdc",
    "AIzaSyAwnbe5wmbW2NytTPJbyCoLK116VbZMfDk",
    "API_KEY_2",
    "API_KEY_3",
    "API_KEY_4",
    "API_KEY_5",
    "API_KEY_6",
    "API_KEY_7",
    "API_KEY_8",
    "API_KEY_9",
    "API_KEY_10",
]

# Store key states
key_status = {key: {"active": True, "retry_time": 0} for key in ALL_API_KEYS}
current_index = 0
COOLDOWN_SECONDS = 600  # 10 minutes


def refresh_keys():
    """Re-enable keys whose cooldown expired"""
    now = time.time()
    for key, status in key_status.items():
        if not status["active"] and now >= status["retry_time"]:
            status["active"] = True


def get_active_keys():
    """Return list of currently active keys"""
    refresh_keys()
    return [k for k, v in key_status.items() if v["active"]]


def get_client():
    """Return Gemini client with the current active API key"""
    global current_index
    active_keys = get_active_keys()
    if not active_keys:
        raise Exception("No active API keys available right now")
    return genai.Client(api_key=active_keys[current_index]), active_keys


def mark_key_as_bad(key: str):
    """Deactivate key for cooldown period"""
    key_status[key]["active"] = False
    key_status[key]["retry_time"] = time.time() + COOLDOWN_SECONDS


class QuestionData(BaseModel):
    Question: str
    Options: dict
    Answer: str
    Explanation: str


@app.post("/api/generate_ai")
async def generate_ai(data: QuestionData):
    global current_index
    last_error = None

    for _ in range(len(get_active_keys())):
        active_keys = get_active_keys()
        if not active_keys:
            return {"status": "error", "message": f"All API keys are cooling down. Try again later."}

        try:
            client, active_keys = get_client()
            current_key = active_keys[current_index]

            # Build prompt
            prompt = f"""
Question: {data.Question}
Options: {data.Options}
Answer: {data.Answer}
Explanation: {data.Explanation}

👉 Please explain this question in simple terms for a learner.
"""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            # ✅ Success → rotate to next key
            current_index = (current_index + 1) % len(active_keys)
            return {"status": "success", "response": response.text}

        except Exception as e:
            last_error = str(e)
            # ❌ Mark current key as cooling down
            mark_key_as_bad(current_key)
            # Move index forward
            current_index = (current_index + 1) % max(1, len(get_active_keys()))

    return {"status": "error", "message": f"All API keys failed. Last error: {last_error}"}

@app.get("/")
def root():
    return {"message": "Hello from FastAPI"}