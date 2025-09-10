from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.discovery import build

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


@app.get("/api/pdfs")
def list_pdfs():
    service = build("drive", "v3", developerKey=API_KEY)

    data = {}

    # Step 1: Get subfolders inside the main folder
    folder_results = service.files().list(
        q=f"'{FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'",
        fields="files(id, name)"
    ).execute()

    subfolders = folder_results.get("files", [])

    # Step 2: For each subfolder, get PDFs
    for folder in subfolders:
        subfolder_name = folder["name"]
        subfolder_id = folder["id"]

        pdf_results = service.files().list(
            q=f"'{subfolder_id}' in parents and mimeType='application/pdf'",
            fields="files(id, name)"
        ).execute()

        pdfs = []
        for file in pdf_results.get("files", []):
            pdf_url = f"https://drive.google.com/file/d/{file['id']}/preview"
            pdfs.append({
                "name": file["name"].replace(".pdf", ""),
                "url": pdf_url
            })

        data[subfolder_name] = pdfs

    return {"pdfs": data}



@app.get("/")
def root():
    return {"message": "Hello from FastAPI"}
