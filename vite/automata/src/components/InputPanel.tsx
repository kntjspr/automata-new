
import React from 'react';
import { EXAMPLE_DATA } from '../utils/dnaUtils';

interface InputPanelProps {
    sequence: string;
    setSequence: (seq: string) => void;
    patternType: string;
    setPatternType: (type: string) => void;
    pattern: string;
    setPattern: (pattern: string) => void;
    maxMismatches: number;
    setMaxMismatches: (num: number) => void;
    onSearch: () => void;
    stats: {
        length: number;
        gcContent: string;
        baseRatio: string;
    };
}

const InputPanel: React.FC<InputPanelProps> = ({
    sequence,
    setSequence,
    patternType,
    setPatternType,
    pattern,
    setPattern,
    maxMismatches,
    setMaxMismatches,
    onSearch,
    stats
}) => {
    const loadExample = (example: typeof EXAMPLE_DATA[0]) => {
        setSequence(example.sequence);
        setPatternType(example.type);
        setPattern(example.pattern);
    };

    return (
        <section style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            padding: '2rem'
        }}>
            {/* Header */}
            <div>
                <h2 style={{
                    fontSize: '1rem',
                    color: 'var(--accent-acid)',
                    marginBottom: '1rem',
                    borderLeft: '4px solid var(--accent-acid)',
                    paddingLeft: '0.5rem'
                }}>
                    INPUT SEQUENCE
                </h2>

                <div style={{ position: 'relative' }}>
                    <select
                        onChange={(e) => {
                            const idx = parseInt(e.target.value);
                            if (!isNaN(idx) && EXAMPLE_DATA[idx]) {
                                loadExample(EXAMPLE_DATA[idx]);
                            }
                        }}
                        defaultValue=""
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            appearance: 'none',
                            borderRadius: 0
                        }}
                    >
                        <option value="" disabled>LOAD EXAMPLE DATA...</option>
                        {EXAMPLE_DATA.map((ex, i) => (
                            <option key={i} value={i}>[{i}] {ex.name}</option>
                        ))}
                    </select>
                    <div style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'var(--accent-acid)'
                    }}>▼</div>
                </div>
            </div>

            {/* Sequence Input */}
            <div>
                <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                }}>
                    RAW DATA ENTRY [A,C,G,T]:
                </label>
                <textarea
                    rows={8}
                    placeholder="ENTER SEQUENCE..."
                    value={sequence}
                    onChange={(e) => setSequence(e.target.value)}
                    style={{
                        width: '100%',
                        resize: 'vertical',
                        fontFamily: 'var(--font-mono)',
                        background: 'black',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        color: 'var(--text-primary)',
                        borderRadius: 0,
                        outline: 'none'
                    }}
                />
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1px',
                background: 'var(--border-color)',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>LENGTH</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{stats.length}</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>GC%</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-acid)' }}>{stats.gcContent}</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', gridColumn: 'span 2', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>BASE RATIO [A:T:G:C]</span>
                    <span style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'white' }}>{stats.baseRatio}</span>
                </div>
            </div>

            {/* Pattern Controls */}
            <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '2rem' }}>
                <h2 style={{
                    fontSize: '1rem',
                    color: 'var(--accent-punk)',
                    marginBottom: '1rem',
                    borderLeft: '4px solid var(--accent-punk)',
                    paddingLeft: '0.5rem'
                }}>
                    SEARCH PARAMS
                </h2>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>TYPE:</label>
                    <select
                        value={patternType}
                        onChange={(e) => setPatternType(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'white',
                            fontFamily: 'var(--font-mono)',
                            borderRadius: 0
                        }}
                    >
                        <option value="exact">EXACT MATCH</option>
                        <option value="regex">REGEX PATTERN</option>
                        <option value="restriction">RESTRICTION SITE</option>
                        <option value="motif">COMMON MOTIF</option>
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PATTERN:</label>
                    {patternType === 'restriction' ? (
                        <select value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: '#000', color: '#fff', border: '1px solid #333' }}>
                            <option value="">SELECT ENZYME...</option>
                            <option value="GAATTC">EcoRI (GAATTC)</option>
                            <option value="GGATCC">BamHI (GGATCC)</option>
                            <option value="AAGCTT">HindIII (AAGCTT)</option>
                            <option value="CTGCAG">PstI (CTGCAG)</option>
                            <option value="GCGGCCGC">NotI (GCGGCCGC)</option>
                        </select>
                    ) : patternType === 'motif' ? (
                        <select value={pattern} onChange={(e) => setPattern(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: '#000', color: '#fff', border: '1px solid #333' }}>
                            <option value="">SELECT MOTIF...</option>
                            <option value="ATG">Start Codon (ATG)</option>
                            <option value="TAA|TAG|TGA">Stop Codons (TAA/TAG/TGA)</option>
                            <option value="TATAAA">TATA Box (TATAAA)</option>
                            <option value="AATAAA">Poly-A Signal (AATAAA)</option>
                            <option value="GC[AT]GC">GC Box (GC[AT]GC)</option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            placeholder="PATTERN..."
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', background: '#000', color: '#fff', border: '1px solid #333' }}
                        />
                    )}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>FUZZY MATCH TOLERANCE</span>
                        <span style={{ color: 'var(--accent-punk)', fontWeight: 'bold' }}>[{maxMismatches}]</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={maxMismatches}
                        onChange={(e) => setMaxMismatches(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-punk)' }}
                    />
                </div>

                <button
                    onClick={onSearch}
                    className="glitch-hover"
                    data-text="EXECUTE SEARCH"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'var(--text-primary)',
                        color: 'black',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: 900,
                        letterSpacing: '0.1em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span>EXECUTE SEARCH</span>
                    <span>→</span>
                </button>

            </div>
        </section>
    );
};

export default InputPanel;
