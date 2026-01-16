
import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Agent } from '../services/agentService';
import { decode, decodeAudioData, encode } from '../utils/audio';

interface LiveTranscript {
    user: string;
    model: string;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export const useLiveChat = (agent: Agent, onTurnComplete?: (transcript: LiveTranscript) => void) => {
    const [isLive, setIsLive] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [liveTranscript, setLiveTranscript] = useState<LiveTranscript>({ user: '', model: '' });

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptBufferRef = useRef<LiveTranscript>({ user: '', model: '' });

    const stopLiveChat = useCallback(async () => {
        setIsLive(false);
        setConnectionState('idle');

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;

        if (inputAudioContextRef.current) {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            await outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        audioSourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        audioSourcesRef.current.clear();

        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing live session:", e);
            }
            sessionPromiseRef.current = null;
        }

        const final = { ...transcriptBufferRef.current };
        transcriptBufferRef.current = { user: '', model: '' };
        setLiveTranscript({ user: '', model: '' });
        return final;
    }, []);

    const startLiveChat = useCallback(async () => {
        if (isLive) return;

        if (!process.env.API_KEY) {
            console.error("Missing API Key for Live Session");
            setConnectionState('error');
            setIsLive(false);
            return;
        }

        setIsLive(true);
        setConnectionState('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Fixed Model Name to 'gemini-2.5-flash-native-audio-preview-12-2025' for best reliability
            // Removed inputAudioTranscription and outputAudioTranscription to prevent tokenizer errors
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: agent.voice || 'Kore' } } },
                    systemInstruction: agent.systemPrompt,
                },
                callbacks: {
                    onopen: () => {
                        console.log('Live Session Established');
                        setConnectionState('connected');
                        
                        if (!inputAudioContextRef.current) return;
                        
                        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                const s = Math.max(-1, Math.min(1, inputData[i]));
                                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }
                            const pcmBlob: GenAIBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            
                            sessionPromiseRef.current?.then((session) => {
                                try {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                } catch (err) {
                                    console.warn("Input streaming failure:", err);
                                }
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            transcriptBufferRef.current.user += text;
                            setLiveTranscript(prev => ({ ...prev, user: prev.user + text }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            transcriptBufferRef.current.model += text;
                            setLiveTranscript(prev => ({ ...prev, model: prev.model + text }));
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            if (onTurnComplete && (transcriptBufferRef.current.user || transcriptBufferRef.current.model)) {
                                onTurnComplete({ ...transcriptBufferRef.current });
                            }
                            transcriptBufferRef.current = { user: '', model: '' };
                            setLiveTranscript({ user: '', model: '' });
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const audioCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);

                            const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                            const source = audioCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioCtx.destination);
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: any) => {
                        console.error('Live chat service error:', e);
                        setConnectionState('error');
                        setIsLive(false);
                    },
                    onclose: () => {
                        console.log('Live Session Closed by Server');
                        setConnectionState('idle');
                        setIsLive(false);
                    },
                },
            });
        } catch (err) {
            console.error('Failed to initiate live chat:', err);
            setConnectionState('error');
            setIsLive(false);
        }
    }, [isLive, agent.voice, agent.systemPrompt, stopLiveChat, onTurnComplete]);

    return { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat };
};
