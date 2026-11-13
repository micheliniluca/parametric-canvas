import { useCallback, useEffect, useRef, useState } from 'react';
const MAX_HISTORY = 100;
const COALESCE_MS = 500;
/**
 * Stato con annulla/ripeti.
 * - Durante un'interazione col puntatore (drag, resize, rotazione) le modifiche
 *   continue non creano voci: si registra un solo passo al rilascio.
 * - Le modifiche da tastiera ravvicinate (es. digitazione nei campi) vengono
 *   accorpate in un unico passo.
 */
export function useHistory(initial) {
    const [state, setStateRaw] = useState(initial);
    const committed = useRef(state);
    const past = useRef([]);
    const future = useRef([]);
    const pointerDown = useRef(false);
    const lastPush = useRef(0);
    const skipNext = useRef(false);
    const lastKey = useRef(0);
    const [, force] = useState(0);
    const commit = useCallback((next, coalesce) => {
        if (next === committed.current)
            return;
        const now = Date.now();
        const typing = now - lastKey.current < COALESCE_MS && now - lastPush.current < COALESCE_MS;
        if (!(coalesce && typing && past.current.length > 0)) {
            past.current.push(committed.current);
            if (past.current.length > MAX_HISTORY)
                past.current.shift();
        }
        lastPush.current = now;
        committed.current = next;
        future.current = [];
        force(n => n + 1);
    }, []);
    // Registra le modifiche quando non c'è un'interazione in corso
    useEffect(() => {
        if (skipNext.current) {
            skipNext.current = false;
            committed.current = state;
            return;
        }
        if (!pointerDown.current)
            commit(state, true);
    }, [state, commit]);
    // Traccia lo stato del puntatore a livello globale
    const stateRef = useRef(state);
    stateRef.current = state;
    useEffect(() => {
        const down = () => { pointerDown.current = true; };
        const key = () => { lastKey.current = Date.now(); };
        const up = () => {
            if (!pointerDown.current)
                return;
            pointerDown.current = false;
            // Al rilascio registra l'intera interazione come un solo passo
            setTimeout(() => commit(stateRef.current, false), 0);
        };
        window.addEventListener('pointerdown', down, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('blur', up);
        window.addEventListener('keydown', key, true);
        return () => {
            window.removeEventListener('keydown', key, true);
            window.removeEventListener('pointerdown', down, true);
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('blur', up);
        };
    }, [commit]);
    const undo = useCallback(() => {
        const prev = past.current.pop();
        if (prev === undefined)
            return;
        future.current.push(committed.current);
        committed.current = prev;
        skipNext.current = prev !== stateRef.current;
        setStateRaw(prev);
        force(n => n + 1);
    }, []);
    const redo = useCallback(() => {
        const next = future.current.pop();
        if (next === undefined)
            return;
        past.current.push(committed.current);
        committed.current = next;
        skipNext.current = next !== stateRef.current;
        setStateRaw(next);
        force(n => n + 1);
    }, []);
    /** Sostituisce lo stato azzerando la cronologia (es. apertura file) */
    const reset = useCallback((value) => {
        past.current = [];
        future.current = [];
        committed.current = value;
        skipNext.current = value !== stateRef.current;
        setStateRaw(value);
        force(n => n + 1);
    }, []);
    return {
        state,
        setState: setStateRaw,
        undo,
        redo,
        reset,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
    };
}
