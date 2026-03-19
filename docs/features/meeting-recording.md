# Meeting Recording Feature

This document explains the technical implementation of the Meeting Recording feature, tracking the flow from the frontend capturing the screen/audio to the backend processing, uploading, transcription, and AI note generation.

## 1. Flow Overview

1. **Client-Side Capture (Frontend):** The application uses an offscreen hidden `<canvas>` to programmatically draw all active local and remote video streams in a grid. Audio from all sources is multiplexed using the Web Audio API. A `MediaRecorder` then captures a WebM video stream of this composite canvas and mixed audio.
2. **Upload (Frontend -> Backend):** Once the recording is stopped, the chunks are compiled into a `Blob` and sent to the backend server via a `multipart/form-data` POST request.
3. **Cloud Storage (Backend):** The backend receives the file buffer and streams it to Cloudinary as a `resource_type: "video"`. 
4. **Metadata Storage:** A database record (`MeetingRecording`) is immediately created and returned to the client so processing status ("pending") can be tracked.
5. **Background Transcription:** The audio is transcribed directly from the buffer. It uses either OpenAI API ("whisper-1") or a local Whisper Python script to extract both the full transcript and timestamped segments.
6. **AI Features:** Transcripts are used by GPT-4o endpoints to generate summarized Meeting Notes or to allow participants to chat with the AI about what happened in the meeting.

---

## 2. Frontend Implementation

**Key Files:**
- `frontend/src/hooks/useMeetingCall.js` (Contains the `MediaRecorder` and composite canvas logic)
- `frontend/src/components/MeetingModule.jsx` (UI integration, API calls to upload)

### Composite Recording Logic (`useMeetingCall.js`)
- **Canvas Generation:** Programmatically creates a 1280x720 canvas (`canvasRef.current`). Uses `requestAnimationFrame` to continually draw all `videoElements` onto the canvas in a responsive grid format with rounded borders.
- **Overlays:** Names are drawn over the videos using `ctx.fillText`.
- **Audio Mixing:** An `AudioContext` is created, and all tracks (local and remote) are routed through `audioCtx.createMediaStreamDestination()`.
- **MediaRecorder:** The canvas video stream (`captureStream(24)`) and the mixed audio stream are merged into a single `MediaStream`. A `MediaRecorder` is initialized using `video/webm;codecs=vp9,opus` (falling back to vp8) with a bitrate of 2.5 Mbps.
- **Output:** Returns a consolidated recording chunk containing composite video and audio, mapped loosely to the meeting host.

---

## 3. Backend Implementation

**Key Files:**
- `backend/routes/meeting.routes.js`
- `backend/controllers/meeting/recording.controller.js`

### Upload & Storage (`recording.controller.js -> uploadRecording`)
- **Validation:** Ensures `req.file` exists and that the requesting user is the host of the meeting.
- **Cloudinary:** Uses `cloudinary.uploader.upload_stream({ resource_type: "video", border: "meeting-recordings", format: "webm" })` to stream the video chunk into cloud storage. Resulting secure URL is fetched.
- **Database:** Creates the `MeetingRecording` document and issues a non-blocking background task to handle transcription.

### Transcription (`recording.controller.js -> transcribeRecording / transcribeRecordingLocal`)
- **Logic:** Temporarily writes the buffer to the OS's `tmpdir()` (`os.tmpdir()`).
- **OpenAI Whisper (Online):** 
  - Streams the file to `openai.audio.transcriptions.create` using the `whisper-1` model and `timestamp_granularities: ["segment"]`.
- **Local Whisper (Offline Fallback):**
  - Spawns a background subprocess referencing a local Python script (`WHISPER_SCRIPT`) inside a local virtual environment.
- **Updates DB:** Stores the `transcript` (String), `transcript_segments` (Array of start/end/text), and changes `transcription_status` to `"completed"`.

### AI Integrations
1. **Meeting Notes (`generateMeetingNotes`):**
   - Sends the full transcript to `gpt-4o` with a prompt asking for: Meeting Summary, Key Discussion Points, Decisions Made, Action Items, Important Details, and Follow-ups.
2. **Chat with AI (`chatWithNotes`):**
   - Allows users to query the transcript interactively. Passes the transcript, the notes, and recent history (up to 20 messages) to `gpt-4o`.

---

## 4. Data Models

**Key File:** `backend/models/MeetingRecording.js`

```javascript
{
    meeting_id: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    participant_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participant_name: { type: String },
    type: { type: String, enum: ["video", "audio", "screen"], required: true },
    
    // Cloud Storage
    cloudinary_url: { type: String, required: true },
    cloudinary_public_id: { type: String, required: true },
    
    // Timing
    started_at: { type: Date, required: true },
    ended_at: { type: Date, required: true },
    duration_seconds: { type: Number, min: 0 },
    
    // AI Transcription & Notes
    transcription_status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
    transcript: { type: String, default: null },
    transcript_segments: [
      { start: Number, end: Number, text: String }
    ],
    meeting_notes: { type: String, default: null },
}
```

## 5. Endpoints

- `GET /api/meetings/:id/recordings` &mdash; List all recordings for a meeting.
- `POST /api/meetings/:id/recordings` &mdash; Upload a new recording (host only). Requires `multipart/form-data` with `recording` file field.
- `POST /api/meetings/:id/recordings/:recordingId/generate-notes` &mdash; Uses GPT-4o to generate notes.
- `POST /api/meetings/:id/recordings/:recordingId/retry-transcription` &mdash; Re-downloads file from Cloudinary and retries Whisper AI transcribing.
- `POST /api/meetings/:id/recordings/:recordingId/chat` &mdash; Real-time AI chat query based on meeting transcript state.
