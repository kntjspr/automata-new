
import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface MatchSimulatorProps {
    sequence: string;
    pattern: string;
    matches: { start: number; end: number; text: string }[];
}

interface SimulationStep {
    position: number;
    char: string;
    fromState: number;
    toState: number;
    transition: 'match' | 'fail' | 'accept';
    note: string;
}

// Check if pattern is regex
const isRegexPattern = (pat: string): boolean => {
    // Match: | * + ? [ ] ( ) ^ $ { }
    return /[|*+?[\]()^${}]/.test(pat);
};

const MatchSimulator: React.FC<MatchSimulatorProps> = ({ sequence, pattern, matches }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(500);

    // Build simulation steps
    const simulationSteps = useMemo(() => {
        if (!sequence || !pattern) return [];

        const steps: SimulationStep[] = [];
        const cleanPattern = pattern.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const upperSeq = sequence.toUpperCase();

        // Use simple DFA simulation for non-regex patterns
        if (!isRegexPattern(pattern) && cleanPattern.length > 0) {
            let state = 0; // Current state in DFA (0 to pattern.length)

            for (let i = 0; i < upperSeq.length; i++) {
                const char = upperSeq[i];
                const prevState = state;

                // KMP-like state transition
                if (state < cleanPattern.length && char === cleanPattern[state]) {
                    state++;
                    const isAccept = state === cleanPattern.length;

                    steps.push({
                        position: i,
                        char,
                        fromState: prevState,
                        toState: state,
                        transition: isAccept ? 'accept' : 'match',
                        note: isAccept
                            ? `✓ Pattern matched at position ${i - cleanPattern.length + 1}!`
                            : `Matched '${char}', advancing to state q${state}`
                    });

                    // After accept, continue looking for overlapping matches
                    if (isAccept) {
                        // Use failure function to continue
                        state = 0; // Simplified: reset to start (could use KMP for overlaps)
                    }
                } else {
                    // Mismatch - go back to q0 or appropriate failure state
                    steps.push({
                        position: i,
                        char,
                        fromState: prevState,
                        toState: 0,
                        transition: 'fail',
                        note: prevState === 0
                            ? `'${char}' ≠ '${cleanPattern[0]}', staying at q0`
                            : `Mismatch! Expected '${cleanPattern[prevState]}', got '${char}'. Reset to q0`
                    });

                    // Check if current char matches start of pattern
                    if (char === cleanPattern[0]) {
                        state = 1;
                        steps[steps.length - 1].toState = 1;
                        steps[steps.length - 1].note = `'${char}' = '${cleanPattern[0]}', starting new match attempt`;
                        steps[steps.length - 1].transition = 'match';
                    } else {
                        state = 0;
                    }
                }
            }
        }

        return steps;
    }, [sequence, pattern, matches]);

    // Auto-play animation
    useEffect(() => {
        if (!isPlaying) return;

        if (currentStep >= simulationSteps.length - 1) {
            setIsPlaying(false);
            return;
        }

        // Add a delay before advancing to ensure current step is visible
        const timer = setTimeout(() => {
            setCurrentStep(prev => prev + 1);
        }, speed);

        return () => clearTimeout(timer);
    }, [isPlaying, currentStep, speed, simulationSteps.length]);

    // Controls
    const handlePlay = useCallback(() => {
        if (currentStep >= simulationSteps.length - 1) {
            setCurrentStep(0);
        }
        setIsPlaying(true);
    }, [currentStep, simulationSteps.length]);

    const handlePause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const handleStep = useCallback(() => {
        setIsPlaying(false);
        setCurrentStep(prev => Math.min(prev + 1, simulationSteps.length - 1));
    }, [simulationSteps.length]);

    const handleReset = useCallback(() => {
        setIsPlaying(false);
        setCurrentStep(0);
    }, []);

    if (!sequence || !pattern) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                border: '2px dashed var(--border-color)',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>▶️</div>
                <div>MATCH SIMULATOR</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                    Enter a sequence and pattern, then search to see step-by-step matching
                </div>
            </div>
        );
    }

    if (isRegexPattern(pattern)) {
        return (
            <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                border: '2px solid var(--accent-cyan)',
                background: 'rgba(0,255,255,0.05)'
            }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔄</div>
                <div style={{ color: 'var(--accent-cyan)' }}>NFA SIMULATION MODE</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                    Regex patterns use NFA with multiple simultaneous states.<br />
                    See the NFA visualization above for the automaton structure.
                </div>
            </div>
        );
    }

    const currentStepData = simulationSteps[currentStep];
    const cleanPattern = pattern.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const displayPattern = cleanPattern.substring(0, 8); // Limit for display

    return (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)'
            }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                    MATCH SIMULATION
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Step {currentStep + 1} / {simulationSteps.length}
                </span>
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={handleReset}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)'
                    }}
                >
                    ⏮ Reset
                </button>
                {isPlaying ? (
                    <button
                        onClick={handlePause}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--accent-punk)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)'
                        }}
                    >
                        ⏸ Pause
                    </button>
                ) : (
                    <button
                        onClick={handlePlay}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--accent-acid)',
                            border: 'none',
                            color: 'black',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 'bold'
                        }}
                    >
                        ▶ Play
                    </button>
                )}
                <button
                    onClick={handleStep}
                    disabled={currentStep >= simulationSteps.length - 1}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: currentStep >= simulationSteps.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: currentStep >= simulationSteps.length - 1 ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--font-mono)'
                    }}
                >
                    ⏭ Step
                </button>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginLeft: 'auto'
                }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Speed:</span>
                    <input
                        type="range"
                        min="100"
                        max="1000"
                        step="100"
                        value={1100 - speed}
                        onChange={(e) => setSpeed(1100 - parseInt(e.target.value))}
                        style={{ width: '80px' }}
                    />
                </div>
            </div>

            {/* Sequence with highlight */}
            <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)',
                overflowX: 'auto'
            }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                    INPUT SEQUENCE (position: {currentStepData?.position ?? 0})
                </div>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1px',
                    fontSize: '0.9rem'
                }}>
                    {sequence.substring(0, 60).split('').map((char, i) => {
                        const isCurrent = currentStepData && i === currentStepData.position;
                        // Only highlight as "matched" if we're currently in a matching state (toState > 0)
                        // and the character is part of the current match attempt (between start and current)
                        const isPartOfCurrentMatch = currentStepData &&
                            currentStepData.toState > 0 &&
                            i < currentStepData.position &&
                            i >= currentStepData.position - currentStepData.toState + 1;

                        return (
                            <span
                                key={i}
                                style={{
                                    padding: '2px 4px',
                                    background: isCurrent
                                        ? currentStepData.transition === 'accept'
                                            ? 'var(--accent-acid)'
                                            : currentStepData.transition === 'match'
                                                ? 'var(--accent-cyan)'
                                                : 'var(--accent-punk)'
                                        : isPartOfCurrentMatch
                                            ? 'rgba(0,255,255,0.3)'
                                            : 'transparent',
                                    color: isCurrent ? 'black' : isPartOfCurrentMatch ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                    fontWeight: isCurrent ? 'bold' : 'normal',
                                    borderBottom: isCurrent ? '2px solid white' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {char}
                            </span>
                        );
                    })}
                    {sequence.length > 60 && (
                        <span style={{ color: 'var(--text-muted)' }}>... (+{sequence.length - 60} more)</span>
                    )}
                </div>
            </div>

            {/* DFA State Visualization */}
            <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.75rem' }}>
                    DFA STATE MACHINE
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    padding: '0.5rem 0'
                }}>
                    {Array.from({ length: displayPattern.length + 1 }).map((_, i) => {
                        const isCurrentFrom = currentStepData && currentStepData.fromState === i;
                        const isCurrentTo = currentStepData && currentStepData.toState === i;
                        const isAcceptState = i === displayPattern.length;

                        return (
                            <React.Fragment key={i}>
                                {/* State circle */}
                                <div style={{
                                    width: isAcceptState ? '48px' : '40px',
                                    height: isAcceptState ? '48px' : '40px',
                                    borderRadius: '50%',
                                    border: `3px solid ${isCurrentTo
                                        ? currentStepData?.transition === 'accept'
                                            ? 'var(--accent-acid)'
                                            : 'var(--accent-cyan)'
                                        : isCurrentFrom
                                            ? 'var(--accent-punk)'
                                            : isAcceptState
                                                ? 'var(--accent-acid)'
                                                : 'var(--text-muted)'
                                        }`,
                                    background: isCurrentTo
                                        ? currentStepData?.transition === 'accept'
                                            ? 'rgba(204,255,0,0.3)'
                                            : 'rgba(0,255,255,0.2)'
                                        : isAcceptState
                                            ? 'rgba(204,255,0,0.1)'
                                            : 'transparent',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    outline: isAcceptState ? '2px solid var(--accent-acid)' : 'none',
                                    outlineOffset: '3px',
                                    transition: 'all 0.2s',
                                    boxShadow: isCurrentTo ? '0 0 15px rgba(0,255,255,0.5)' : 'none'
                                }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        color: isCurrentTo ? 'white' : 'var(--text-secondary)'
                                    }}>
                                        q{i}
                                    </span>
                                    {isAcceptState && (
                                        <span style={{
                                            fontSize: '0.5rem',
                                            color: 'var(--accent-acid)',
                                            marginTop: '1px'
                                        }}>
                                            ACC
                                        </span>
                                    )}
                                </div>

                                {/* Transition arrow */}
                                {i < displayPattern.length && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: isCurrentFrom && currentStepData?.transition === 'match'
                                                ? 'var(--accent-cyan)'
                                                : 'var(--accent-acid)',
                                            fontWeight: 'bold'
                                        }}>
                                            {displayPattern[i]}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Current Step Info */}
            {currentStepData && (
                <div style={{
                    padding: '0.75rem',
                    background: currentStepData.transition === 'accept'
                        ? 'rgba(204,255,0,0.2)'
                        : currentStepData.transition === 'match'
                            ? 'rgba(0,255,255,0.1)'
                            : 'rgba(255,0,128,0.1)',
                    border: `2px solid ${currentStepData.transition === 'accept'
                        ? 'var(--accent-acid)'
                        : currentStepData.transition === 'match'
                            ? 'var(--accent-cyan)'
                            : 'var(--accent-punk)'
                        }`
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.5rem'
                    }}>
                        <span>
                            <span style={{ color: 'var(--text-muted)' }}>Position: </span>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>{currentStepData.position}</span>
                        </span>
                        <span>
                            <span style={{ color: 'var(--text-muted)' }}>Character: </span>
                            <span style={{
                                color: currentStepData.transition === 'accept' ? 'var(--accent-acid)' : 'var(--accent-cyan)',
                                fontWeight: 'bold'
                            }}>'{currentStepData.char}'</span>
                        </span>
                        <span>
                            <span style={{ color: 'var(--text-muted)' }}>Transition: </span>
                            <span style={{ color: 'white' }}>
                                q{currentStepData.fromState} → q{currentStepData.toState}
                            </span>
                        </span>
                    </div>
                    <div style={{
                        color: currentStepData.transition === 'accept'
                            ? 'var(--accent-acid)'
                            : 'var(--text-secondary)',
                        fontWeight: currentStepData.transition === 'accept' ? 'bold' : 'normal'
                    }}>
                        {currentStepData.note}
                    </div>
                </div>
            )}

            {/* Match summary */}
            {matches.length > 0 && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(204,255,0,0.1)',
                    border: '1px solid var(--accent-acid)'
                }}>
                    <span style={{ color: 'var(--accent-acid)', fontWeight: 'bold' }}>
                        ✓ {matches.length} MATCH{matches.length !== 1 ? 'ES' : ''} FOUND
                    </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '1rem', fontSize: '0.8rem' }}>
                        at positions: {matches.map(m => m.start).join(', ')}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MatchSimulator;
