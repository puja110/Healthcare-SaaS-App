import { useState, useRef } from 'react';

export default function VoiceConsultation() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceConsultation(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceConsultation = async (audioBlob: Blob) => {
    setLoading(true);
    setTranscription('Processing audio...');
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('organization_id', 'demo_org');
      formData.append('mode', 'auto');
      
    //   const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    //   const response = await fetch(`${apiUrl}/api/consultation/voice`, {
    //     method: 'POST',
    //     body: formData,
    //   });
        const response = await fetch('http://localhost:8000/api/consultation/voice', {  // ← 8000
        method: 'POST',
        body: formData,
        });
      
      const data = await response.json();
      
      if (data.success) {
        setTranscription(data.transcription);
        setResponse(data.response);
      } else {
        setError(data.error || 'Failed to process voice consultation');
        setTranscription('');
      }
      
    } catch (error) {
      console.error('Error sending voice consultation:', error);
      setError('Failed to send voice consultation. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Voice Consultation</h1>
      
      <div className="space-y-6">
        <div>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
        
        {loading && (
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span>Processing audio...</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}
        
        {transcription && !loading && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Transcription:</h3>
            <p className="text-gray-800">{transcription}</p>
          </div>
        )}
        
        {response && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">AI Response:</h3>
            <p className="text-gray-800">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}