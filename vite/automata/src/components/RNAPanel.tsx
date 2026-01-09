import React, { useState } from 'react';
import {
    validateRNAStructureAsync,
    RNA_EXAMPLES,
    type PDAState,
    type RNAExample
} from '../utils/pdaUtils';
import CFGToPDAViz from './CFGToPDAViz';

interface RNAPanelProps { }

const RNAPanel: React.FC<RNAPanelProps> = () => {
    const [structure, setStructure] = useState('');
    const [sequence, setSequence] = useState('');
    const [description, setDescription] = useState('');
    const [source, setSource] = useState('');
    const [result, setResult] = useState<PDAState | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showCFGConversion, setShowCFGConversion] = useState(false);

    const handleValidate = async () => {
        const res = await validateRNAStructureAsync(structure);
        setResult(res);
    };

    const loadExample = (example: RNAExample) => {
        setStructure(example.structure);
        setSequence(example.sequence || '');
        setDescription(example.description || '');
        setSource(example.source || '');
        setResult(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h3 style={{
                    color: 'var(--accent-cyan)',
                    marginBottom: '0.5rem',
                    fontSize: '1.2rem',
                    textTransform: 'uppercase'
                }}>
                    RNA SECONDARY CALC
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    &gt; VALIDATES DOT-BRACKET NOTATION USING PUSHDOWN AUTOMATA.
                    <br />&gt; DETECTS NESTED PAIRS VIA STACK MEMORY.
                </p>
            </div>

            {/* Educational Info Toggle */}
            <button
                onClick={() => setShowInfo(!showInfo)}
                style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-cyan)',
                    padding: '0.5rem 1rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <span style={{ transform: showInfo ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                {showInfo ? 'HIDE' : 'SHOW'} HOW IT WORKS
            </button>

            {/* Educational Content */}
            {showInfo && (
                <div style={{
                    border: '1px solid var(--border-color)',
                    padding: '1.5rem',
                    background: 'rgba(0, 255, 255, 0.02)',
                    fontSize: '0.85rem',
                    lineHeight: 1.6
                }}>
                    <h4 style={{ color: 'var(--accent-acid)', margin: '0 0 1rem 0', fontSize: '1rem' }}>
                        WHAT IS DOT-BRACKET NOTATION?
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                        RNA (Ribonucleic acid) is single-stranded but <strong style={{ color: 'var(--text-primary)' }}>folds back on itself</strong> to form base pairs.
                        Dot-bracket notation represents this secondary structure:
                    </p>

                    {/* Symbol Legend */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '0.5rem 1rem',
                        background: 'black',
                        padding: '1rem',
                        fontFamily: 'var(--font-mono)',
                        marginBottom: '1rem'
                    }}>
                        <span style={{ color: 'var(--accent-punk)', fontSize: '1.2rem' }}>.</span>
                        <span style={{ color: 'var(--text-muted)' }}>Unpaired nucleotide (loop region)</span>
                        <span style={{ color: 'var(--accent-acid)', fontSize: '1.2rem' }}>(</span>
                        <span style={{ color: 'var(--text-muted)' }}>Opening base pair (5' side)</span>
                        <span style={{ color: 'var(--accent-acid)', fontSize: '1.2rem' }}>)</span>
                        <span style={{ color: 'var(--text-muted)' }}>Closing base pair (3' side) — matches with (</span>
                    </div>

                    {/* Base Pairing Rules */}
                    <h4 style={{ color: 'var(--accent-acid)', margin: '1rem 0 0.5rem 0', fontSize: '0.9rem' }}>
                        RNA BASE PAIRING RULES:
                    </h4>
                    <div style={{ fontFamily: 'var(--font-mono)', marginBottom: '1rem' }}>
                        <span style={{ color: '#FF6B6B' }}>A</span>
                        <span style={{ color: 'var(--text-muted)' }}> ═══ </span>
                        <span style={{ color: '#4ECDC4' }}>U</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '1rem' }}>(Adenine — Uracil)</span>
                        <br />
                        <span style={{ color: '#FFE66D' }}>G</span>
                        <span style={{ color: 'var(--text-muted)' }}> ≡≡≡ </span>
                        <span style={{ color: '#95E1D3' }}>C</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '1rem' }}>(Guanine — Cytosine)</span>
                    </div>

                    {/* Visual Example */}
                    <h4 style={{ color: 'var(--accent-acid)', margin: '1rem 0 0.5rem 0', fontSize: '0.9rem' }}>
                        EXAMPLE: HAIRPIN LOOP
                    </h4>
                    <pre style={{
                        background: 'black',
                        padding: '1rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        margin: '0 0 1rem 0',
                        overflowX: 'auto'
                    }}>
                        {`        A---A       ← Loop apex (unpaired)
       /     \\
      U       G     ← Loop sides
       \\     /
        C═══G       ← Stem (paired: ( and ))
        G═══C
        G═══C
        C═══G
         5'  3'

Sequence:  CGGGC UAAG GCCCG
Structure: ((((( .... )))))`}
                    </pre>

                    {/* Why PDA */}
                    <h4 style={{ color: 'var(--accent-acid)', margin: '1rem 0 0.5rem 0', fontSize: '0.9rem' }}>
                        WHY PUSHDOWN AUTOMATA?
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                        Regular expressions <strong style={{ color: 'var(--accent-punk)' }}>cannot count</strong> matching pairs.
                        A PDA uses a <strong style={{ color: 'var(--text-primary)' }}>stack</strong> to track nesting:
                    </p>
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        background: 'black',
                        padding: '1rem',
                        color: 'var(--text-muted)'
                    }}>
                        <div><span style={{ color: 'var(--accent-acid)' }}>See (</span> → PUSH onto stack</div>
                        <div><span style={{ color: 'var(--accent-acid)' }}>See )</span> → POP from stack (must match!)</div>
                        <div><span style={{ color: 'var(--accent-punk)' }}>See .</span> → SKIP (no stack op)</div>
                        <div><span style={{ color: 'var(--accent-cyan)' }}>End  </span> → Stack must be empty ✓</div>
                    </div>
                </div>
            )}

            {/* CFG to PDA Conversion Toggle */}
            <button
                onClick={() => setShowCFGConversion(!showCFGConversion)}
                style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-acid)',
                    padding: '0.5rem 1rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <span style={{ transform: showCFGConversion ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                {showCFGConversion ? 'HIDE' : 'SHOW'} CFG → PDA CONVERSION
            </button>

            {/* CFG to PDA Conversion Visualization */}
            {showCFGConversion && (
                <div style={{
                    border: '1px solid var(--accent-acid)',
                    padding: '1.5rem',
                    background: 'rgba(204, 255, 0, 0.02)'
                }}>
                    <CFGToPDAViz />
                </div>
            )}

            {/* Examples */}
            <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    LOAD PRESET DATA:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {RNA_EXAMPLES.map((ex, i) => (
                        <button
                            key={i}
                            onClick={() => loadExample(ex)}
                            style={{
                                fontSize: '0.8rem',
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-mono)'
                            }}
                        >
                            [{ex.name}]
                        </button>
                    ))}
                </div>
            </div>

            {/* Molecular Info Panel */}
            {description && (
                <div style={{
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0, 255, 255, 0.03)'
                }}>
                    <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        margin: '0 0 0.5rem 0',
                        lineHeight: 1.5
                    }}>
                        {description}
                    </p>
                    {source && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--accent-cyan)',
                            fontFamily: 'var(--font-mono)',
                            padding: '0.2rem 0.5rem',
                            border: '1px solid var(--accent-cyan)',
                            display: 'inline-block'
                        }}>
                            SRC: {source}
                        </span>
                    )}
                </div>
            )}

            {/* Sequence Input */}
            <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    RNA SEQUENCE [5' → 3'] (optional):
                </label>
                <textarea
                    value={sequence}
                    onChange={(e) => { setSequence(e.target.value.toUpperCase().replace(/T/g, 'U')); }}
                    placeholder="GCGCAAAAGCGC"
                    rows={2}
                    style={{
                        width: '100%',
                        fontFamily: 'var(--font-mono)',
                        background: 'black',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        color: 'var(--accent-acid)',
                        borderRadius: 0,
                        outline: 'none',
                        letterSpacing: '0.15em',
                        fontSize: '1rem'
                    }}
                />
                {sequence && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                        LENGTH: {sequence.length} nucleotides
                        {sequence.split('').map((base, i) => (
                            <span key={i} style={{
                                marginLeft: i === 0 ? '1rem' : '0.1rem',
                                color: base === 'A' ? '#FF6B6B' :
                                    base === 'U' ? '#4ECDC4' :
                                        base === 'G' ? '#FFE66D' :
                                            base === 'C' ? '#95E1D3' : 'var(--accent-punk)'
                            }}>
                                {base}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Length Mismatch Warning */}
            {sequence && structure && sequence.length !== structure.length && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 0, 153, 0.1)',
                    border: '1px solid var(--accent-punk)',
                    color: 'var(--accent-punk)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem'
                }}>
                    ⚠ LENGTH MISMATCH: Sequence has {sequence.length} chars, Structure has {structure.length} chars.
                    <br />They must be equal for 1-to-1 mapping!
                </div>
            )}

            {/* Base Pair Visualization */}
            {sequence && structure && sequence.length === structure.length && structure.length > 0 && (
                <div style={{
                    padding: '1rem',
                    background: 'black',
                    border: '1px solid var(--border-color)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    overflowX: 'auto'
                }}>
                    <div style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        BASE PAIR MAPPING:
                    </div>
                    {(() => {
                        const pairs: { pos1: number; base1: string; pos2: number; base2: string }[] = [];
                        const stack: number[] = [];
                        for (let i = 0; i < structure.length; i++) {
                            if (structure[i] === '(') {
                                stack.push(i);
                            } else if (structure[i] === ')' && stack.length > 0) {
                                const j = stack.pop()!;
                                pairs.push({ pos1: j + 1, base1: sequence[j], pos2: i + 1, base2: sequence[i] });
                            }
                        }
                        if (pairs.length === 0) {
                            return <span style={{ color: 'var(--text-muted)' }}>No base pairs (all unpaired)</span>;
                        }
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {pairs.map((p, i) => {
                                    const isValid = (p.base1 === 'G' && p.base2 === 'C') ||
                                        (p.base1 === 'C' && p.base2 === 'G') ||
                                        (p.base1 === 'A' && p.base2 === 'U') ||
                                        (p.base1 === 'U' && p.base2 === 'A') ||
                                        (p.base1 === 'G' && p.base2 === 'U') ||
                                        (p.base1 === 'U' && p.base2 === 'G');
                                    return (
                                        <div key={i}>
                                            <span style={{ color: 'var(--text-muted)' }}>Pos {p.pos1}</span>
                                            <span style={{
                                                color: p.base1 === 'A' ? '#FF6B6B' :
                                                    p.base1 === 'U' ? '#4ECDC4' :
                                                        p.base1 === 'G' ? '#FFE66D' :
                                                            p.base1 === 'C' ? '#95E1D3' : 'inherit',
                                                margin: '0 0.25rem'
                                            }}>{p.base1}</span>
                                            <span style={{ color: isValid ? 'var(--accent-acid)' : 'var(--accent-punk)' }}>
                                                {isValid ? '═══' : '─✗─'}
                                            </span>
                                            <span style={{
                                                color: p.base2 === 'A' ? '#FF6B6B' :
                                                    p.base2 === 'U' ? '#4ECDC4' :
                                                        p.base2 === 'G' ? '#FFE66D' :
                                                            p.base2 === 'C' ? '#95E1D3' : 'inherit',
                                                margin: '0 0.25rem'
                                            }}>{p.base2}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>Pos {p.pos2}</span>
                                            {!isValid && <span style={{ color: 'var(--accent-punk)', marginLeft: '0.5rem' }}>⚠ Invalid pair!</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Input */}
            <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    INPUT VECTOR [DOT BRACKET]:
                </label>
                <textarea
                    value={structure}
                    onChange={(e) => { setStructure(e.target.value); setResult(null); }}
                    placeholder="((((....))))"
                    rows={3}
                    style={{
                        width: '100%',
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

            <button
                onClick={handleValidate}
                className="glitch-hover"
                data-text="EXECUTE VALIDATION"
                style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--text-primary)',
                    color: 'black',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}
            >
                EXECUTE VALIDATION
            </button>

            {/* Result */}
            {result && (
                <div style={{
                    padding: '1rem',
                    border: `2px solid ${result.accepted ? 'var(--accent-acid)' : 'var(--accent-punk)'}`,
                    background: result.accepted ? 'rgba(204, 255, 0, 0.05)' : 'rgba(255, 0, 153, 0.05)',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2rem', lineHeight: 1 }}>{result.accepted ? 'PASS' : 'FAIL'}</span>
                        <span style={{
                            background: result.accepted ? 'var(--accent-acid)' : 'var(--accent-punk)',
                            color: 'black',
                            padding: '0.2rem 0.5rem',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                        }}>
                            {result.accepted ? 'VALID STRUCTURE' : 'INVALID STRUCTURE'}
                        </span>
                    </div>
                    {result.error && (
                        <p style={{ color: 'var(--accent-punk)', fontSize: '0.9rem', margin: 0, fontFamily: 'var(--font-mono)' }}>&gt; ERROR: {result.error}</p>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontFamily: 'var(--font-mono)' }}>
                        FINAL STATE: {result.currentState}
                    </p>
                </div>
            )}

            {/* PDA Trace */}
            {result && result.history.length > 0 && (
                <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                        EXECUTION TRACE
                    </h4>
                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        background: 'black',
                        border: '1px solid var(--border-color)',
                        padding: '0',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>
                                <tr style={{ color: 'var(--text-primary)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem' }}>#</th>
                                    <th style={{ padding: '0.5rem' }}>SYM</th>
                                    <th style={{ padding: '0.5rem' }}>OP</th>
                                    <th style={{ padding: '0.5rem' }}>STACK MEM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.history.map((step, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td style={{ padding: '0.5rem', color: 'var(--accent-cyan)' }}>{step.symbol}</td>
                                        <td style={{ padding: '0.5rem', color: 'white' }}>{step.stackAction}</td>
                                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>[{step.stack.join(' ')}]</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RNAPanel;
