import { useRef, useCallback } from 'react';

export function useTypingThrottle(sendJsonMessage: (data: any) => void, throttleMs: number = 2000) {
    const lastSentRef = useRef<number>(0);

    const sendTyping = useCallback(() => {
        const now = Date.now();
        if (now - lastSentRef.current > throttleMs) {
            sendJsonMessage({ type: 'typing' });
            lastSentRef.current = now;
        }
    }, [sendJsonMessage, throttleMs]);

    return sendTyping;
}
