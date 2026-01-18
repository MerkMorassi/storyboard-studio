import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Agent } from '../services/agentService';
import { decode, decodeAudioData, encode } from '../utils/audio';
import { mythosTools } from '../services/geminiService';
import { retrieveLivedExperience } from '../services/localRagService';

export interface LiveTranscript {
    user: string;
    model: string;
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

interface UseLiveChatOptions {
    isMicMuted: boolean;
    isSpeakerMuted: boolean;
    onTurnComplete: (turn: LiveTranscript) => void;
}

export const useLiveChat = (agent: Agent, { isMicMuted, isSpeakerMuted, onTurnComplete }: UseLiveChatOptions) => {
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

    const isMicMutedRef = useRef(isMicMuted);
    useEffect(() => { isMicMutedRef.current = isMicMuted; }, [isMicMuted]);

    const stopLiveChat = useCallback(async () => {
        setIsLive(false);
        setConnectionState('idle');

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
            mediaStreamSourceRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            await inputAudioContextRef.current.close().catch(console.error);
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close().catch(console.error);
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

        transcriptBufferRef.current = { user: '', model: '' };
        setLiveTranscript({ user: '', model: '' });
    }, []);

    const startLiveChat = useCallback(async () => {
        if (isLive) return;

        if (!process.env.API_KEY) {
            console.error("Missing API Key for Live Session");
            setConnectionState('error');
            return;
        }

        setConnectionState('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            setIsLive(true);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstructionWithTools = `${agent.systemPrompt}\n\nYou have access to your LOREPACK (memory). If you need to recall specific facts, events, or details about your history or knowledge, you MUST use the 'lorepack_search' tool to find relevant context before answering.`;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: agent.voice || 'Kore' } } },
                    systemInstruction: systemInstructionWithTools,
                    tools: [{ functionDeclarations: mythosTools }],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
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
                            if (isMicMutedRef.current) return;

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
                            if (onTurnComplete && (transcriptBufferRef.current.user.trim() || transcriptBufferRef.current.model.trim())) {
                                onTurnComplete({ ...transcriptBufferRef.current });
                            }
                            transcriptBufferRef.current = { user: '', model: '' };
                            setLiveTranscript({ user: '', model: '' });
                        }

                        if (message.toolCall) {
                            const session = await sessionPromiseRef.current;
                            if (!session) return;
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'lorepack_search' && fc.args.query) {
                                    const experience = await retrieveLivedExperience(agent.id, fc.args.query);
                                    const context = experience ? experience.text : "No relevant experience found.";
                                    session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: context } } });
                                } else {
                                     session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: `Tool ${fc.name} not implemented in voice.` } } });
                                }
                            }
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current && !isSpeakerMuted) {
                            const audioCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                            const source = audioCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioCtx.destination);
                            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: any) => { console.error('Live chat error:', e); setConnectionState('error'); stopLiveChat(); },
                    onclose: () => { console.log('Live Session Closed'); setConnectionState('idle'); setIsLive(false); },
                },
            });
        } catch (err) {
            console.error('Failed to start live chat:', err);
            setConnectionState('error');
            setIsLive(false);
        }
    }, [isLive, agent.id, agent.voice, agent.systemPrompt, stopLiveChat, onTurnComplete, isSpeakerMuted]);

    return { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat };
};