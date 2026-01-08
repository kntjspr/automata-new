import React, { useState } from 'react';
import {
    validateXMLAsync,
    XML_EXAMPLES,
    type XMLValidationResult
} from '../utils/pdaUtils';

interface XMLPanelProps { }

const XMLPanel: React.FC<XMLPanelProps> = () => {
    const [xml, setXml] = useState('');
    const [result, setResult] = useState<XMLValidationResult | null>(null);

    const handleValidate = async () => {
        const res = await validateXMLAsync(xml);
        setResult(res);
    };

    const loadExample = (example: typeof XML_EXAMPLES[0]) => {
        setXml(example.xml);
        setResult(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h3 style={{
                    color: 'var(--accent-punk)',
                    marginBottom: '0.5rem',
                    fontSize: '1.2rem',
                    textTransform: 'uppercase'
                }}>
                    XML DOC VALIDATOR
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    &gt; VALIDATES NESTED TAGS VIA STACK-BASED PARSING.
                    <br />&gt; PUSHDOWN AUTOMATA REQUIRED FOR CONTEXT-FREE GRAMMARS.
                </p>
            </div>

            {/* Examples */}
            <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    LOAD PRESET DATA:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {XML_EXAMPLES.map((ex, i) => (
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

            {/* Input */}
            <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                    CONTENT [XML/HTML]:
                </label>
                <textarea
                    value={xml}
                    onChange={(e) => { setXml(e.target.value); setResult(null); }}
                    placeholder="<root><child></child></root>"
                    rows={6}
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
                data-text="EXECUTE XML PARSE"
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
                EXECUTE XML PARSE
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
                            {result.accepted ? 'VALID XML STRUCTURE' : 'INVALID XML STRUCTURE'}
                        </span>
                    </div>
                    {result.error && (
                        <p style={{ color: 'var(--accent-punk)', fontSize: '0.9rem', margin: 0, fontFamily: 'var(--font-mono)' }}>&gt; ERROR: {result.error}</p>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', fontFamily: 'var(--font-mono)' }}>
                        TAGS FOUND: {result.tags.length} | FINAL STATE: {result.currentState}
                    </p>
                </div>
            )}

            {/* Tag List */}
            {result && result.tags.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                        PARSED TAG STREAM
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {result.tags.map((tag, i) => (
                            <span
                                key={i}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.8rem',
                                    fontFamily: 'var(--font-mono)',
                                    background: tag.type === 'open' ? 'rgba(0, 255, 255, 0.1)' :
                                        tag.type === 'close' ? 'rgba(255, 0, 153, 0.1)' :
                                            'rgba(255, 255, 255, 0.1)',
                                    color: tag.type === 'open' ? 'var(--accent-cyan)' :
                                        tag.type === 'close' ? 'var(--accent-punk)' :
                                            'white'
                                }}
                            >
                                {tag.type === 'open' ? `<${tag.name}>` :
                                    tag.type === 'close' ? `</${tag.name}>` :
                                        `<${tag.name}/>`}
                            </span>
                        ))}
                    </div>
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
                                    <th style={{ padding: '0.5rem' }}>TAG</th>
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

export default XMLPanel;
