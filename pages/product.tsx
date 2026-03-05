import { useState, useRef } from 'react';
import SummaryDisplay from '../components/SummaryDisplay';

export default function Product() {
  const [patientName, setPatientName] = useState('');
  const [dateOfVisit, setDateOfVisit] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [summaryKey, setSummaryKey] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceRecording = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('organization_id', 'demo_org');
      formData.append('mode', 'auto');

      const response = await fetch('http://localhost:8000/api/consultation/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      if (data.success) {
        setNotes(notes ? notes + '\n\n' + data.transcription : data.transcription);
        alert('Voice transcription completed successfully!');
      } else {
        alert(`Transcription error: ${data.error}`);
      }

    } catch (error) {
      console.error('Error details:', error);
      alert('Failed to process voice recording. Make sure backend is running on http://localhost:8000');
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName || !notes) {
      alert('Please fill in patient name and consultation notes');
      return;
    }

    setIsLoading(true);
    setSummary('');
    setSummaryKey(prev => prev + 1);

    try {
      const response = await fetch('http://localhost:8000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          date_of_visit: dateOfVisit,
          notes: notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const text = line.substring(6);
            if (text.trim()) {
              // FIX: Decode \n tokens back into real newlines so ### headings
              // and bullet points are preserved for SummaryDisplay to parse
              accumulatedText += text.replace(/\\n/g, '\n');
              setSummary(accumulatedText);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">

      {/* Header — never scrolls */}
      <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="w-full px-10 py-4">
          <h1 className="text-3xl font-bold text-gray-900">MediNotes Pro</h1>
          <p className="text-gray-600">AI-Powered Medical Consultation Summaries</p>
        </div>
      </div>

      {/* Body — fills remaining height exactly, no page scroll */}
      <div className="flex-1 w-full px-10 py-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

          {/* Left Column — form scrolls independently */}
          <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Consultation Notes</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient's full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Visit</label>
                  <input
                    type="date"
                    value={dateOfVisit}
                    onChange={(e) => setDateOfVisit(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voice Recording</label>
                  <button
                    type="button"
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    disabled={isProcessingAudio}
                    className={`
                      w-full px-6 py-3 rounded-lg font-semibold text-white transition-all
                      ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3
                    `}
                  >
                    <span className="text-xl">{isRecording ? '⏹️' : ''}</span>
                    <span>{isRecording ? `Stop Recording (${formatTime(recordingTime)})` : 'Record Voice Notes'}</span>
                  </button>

                  {isRecording && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Recording...</span>
                    </div>
                  )}

                  {isProcessingAudio && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">Transcribing...</span>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Click to record. Audio will be transcribed and added to notes below.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter detailed consultation notes or use voice recording above..."
                    rows={7}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Type notes manually or use voice recording feature above
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isRecording || isProcessingAudio}
                  className={`
                    w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600
                    text-white rounded-lg font-semibold text-lg
                    hover:from-blue-700 hover:to-indigo-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all shadow-lg hover:shadow-xl
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating Summary...
                    </span>
                  ) : (
                    'Generate Summary'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column — summary scrolls independently, page never scrolls */}
          <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">AI Summary</h2>
            </div>

            {/* Only this div scrolls when summary is long */}
            <div className="flex-1 overflow-y-auto p-6">
              {summary ? (
                <SummaryDisplay key={summaryKey} content={summary} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">
                    {isLoading
                      ? 'Generating your summary...'
                      : 'Fill in the consultation notes and click "Generate Summary"'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}