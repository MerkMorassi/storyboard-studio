import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAIBlob, FunctionDeclaration, FunctionCall, Part } from '@google/genai';
import { Agent } from '../services/agentService';
import { decode, decodeAudioData, encode } from '../utils/audio';
import { mythosTools } from '../services/geminiService';
import { retrieveLivedExperience } from '../services/localRagService';
import { getGeminiApiKey } from '../services/apiKeyService';

export interface LiveTranscript {
    user: string;
    model: string;
}

export type ConnectionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

interface UseLiveChatOptions {
    isMicMuted: boolean;
    isSpeakerMuted: boolean;
    onTurnComplete: (turn: { user: string; model: string; toolCalls?: FunctionCall[], toolResponses?: any[] }) => void;
    onToolCall: (toolCalls: FunctionCall[]) => Promise<any[]>;
}

const fileToPart = async (file: File): Promise<Part> => {
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
    return {
        inlineData: {
            mimeType: file.type || 'application/octet-stream',
            data: base64
        }
    };
};

export const useLiveChat = (agent: Agent, { isMicMuted, isSpeakerMuted, onTurnComplete, onToolCall }: UseLiveChatOptions) => {
    const [isLive, setIsLive] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
    const [liveTranscript, setLiveTranscript] = useState<LiveTranscript>({ user: '', model: '' });

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptBufferRef = useRef<{ user: string; model: string; toolCalls?: FunctionCall[]; toolResponses?: any[] }>({ user: '', model: '' });

    const isMicMutedRef = useRef(isMicMuted);
    useEffect(() => { isMicMutedRef.current = isMicMuted; }, [isMicMuted]);

    const stopLiveChat = useCallback(async () => {
        setIsLive(false);
        setConnectionState('IDLE');

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            scriptProcessorRef.current.disconnect();
        }
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;

        if (inputAudioContextRef.current?.state !== 'closed') await inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current?.state !== 'closed') await outputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {}
            sessionPromiseRef.current = null;
        }

        transcriptBufferRef.current = { user: '', model: '' };
        setLiveTranscript({ user: '', model: '' });
    }, []);

    const sendTextMessage = useCallback(async (text: string) => {
        if (!sessionPromiseRef.current) return;
        const session = await sessionPromiseRef.current;
        session.sendRealtimeInput({ text });
    }, []);
    
    const sendFiles = useCallback(async (files: File[]) => {
        if (!sessionPromiseRef.current || files.length === 0) return;
        const session = await sessionPromiseRef.current;
        const parts = await Promise.all(files.map(fileToPart));
        session.sendRealtimeInput({ media: parts });
    }, []);

    const sendToolResponse = useCallback(async (responses: any[]) => {
        if (!sessionPromiseRef.current) return;
        const session = await sessionPromiseRef.current;
        session.sendToolResponse({ functionResponses: responses });
    }, []);

    const startLiveChat = useCallback(async () => {
        if (!agent?.id || isLive) return;
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            console.error("Missing API Key for Live Session");
            setConnectionState('ERROR');
            return;
        }

        setConnectionState('CONNECTING');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            setIsLive(true);

            const ai = new GoogleGenAI({ apiKey });
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
                        setConnectionState('CONNECTED');
                        const audioCtx = inputAudioContextRef.current;
                        if (!audioCtx) return;
                        const source = audioCtx.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = processor;
                        processor.onaudioprocess = (e) => {
                            if (isMicMutedRef.current) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAIBlob = { data: encode(new Uint8Array(new Int16Array(inputData.map(s => s * 32767)).buffer)), mimeType: 'audio/pcm;rate=16000' };
                            sessionPromiseRef.current?.then((s) => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(audioCtx.destination);
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
                        if (message.toolCall) {
                            onToolCall(message.toolCall.functionCalls);
                        }
                        if (message.serverContent?.turnComplete) {
                            onTurnComplete(transcriptBufferRef.current);
                            transcriptBufferRef.current = { user: '', model: '' };
                            setLiveTranscript({ user: '', model: '' });
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
                            audioSourcesRef.current.forEach(s => s.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: any) => { console.error('Live chat error:', e); setConnectionState('ERROR'); stopLiveChat(); },
                    onclose: () => { setConnectionState('IDLE'); setIsLive(false); },
                },
            });
        } catch (err) {
            console.error('Failed to start live chat:', err);
            setConnectionState('ERROR');
            setIsLive(false);
        }
    }, [agent.id, agent.voice, agent.systemPrompt, isLive, stopLiveChat, onTurnComplete, onToolCall, isSpeakerMuted]);
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopLiveChat();
        };
    }, [stopLiveChat]);
    
    return { isLive, connectionState, liveTranscript, startLiveChat, stopLiveChat, sendTextMessage, sendFiles, sendToolResponse };
};
