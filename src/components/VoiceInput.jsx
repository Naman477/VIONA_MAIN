import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled }) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // English (India)

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript && onTranscript) {
                onTranscript(transcript);
            }
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [onTranscript]);

    function toggleListening() {
        if (!recognitionRef.current) {
            alert('Voice input is not supported in this browser. Try Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }

    // Don't render if not supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    return (
        <button
            type="button"
            className={`chat-btn chat-mic-btn ${isListening ? 'recording' : ''}`}
            onClick={toggleListening}
            disabled={disabled}
            title={isListening ? 'Stop recording' : 'Voice input'}
        >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
    );
}
