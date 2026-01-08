
import React, { useMemo } from 'react';
import { cleanSequence, type Match } from '../utils/dnaUtils';

interface SequenceViewerProps {
    sequence: string;
    matches: Match[];
}

const SequenceViewer: React.FC<SequenceViewerProps> = ({ sequence, matches }) => {
    const cleanSeq = useMemo(() => cleanSequence(sequence), [sequence]);

    const matchSet = useMemo(() => {
        const matched = new Set<number>();
        matches.forEach(m => {
            for (let i = m.start; i < m.end; i++) {
                matched.add(i);
            }
        });
        return matched;
    }, [matches]);

    const renderSequence = () => {
        if (!cleanSeq) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)'
                }}>
                    <span style={{ fontSize: '1rem', marginBottom: '1rem', opacity: 0.5 }}>NO DATA LOADED</span>
                    <p style={{ fontSize: '0.8rem' }}>WAITING FOR INPUT...</p>
                </div>
            );
        }

        const lineLength = 50;
        const lines = [];

        for (let i = 0; i < cleanSeq.length; i += lineLength) {
            const lineBases = [];
            // Line Number
            lineBases.push(
                <span key={`line-${i}`} style={{
                    display: 'inline-block',
                    width: '4em',
                    color: 'var(--text-muted)',
                    userSelect: 'none',
                    marginRight: '1rem',
                    textAlign: 'right',
                    opacity: 0.5
                }}>
                    {i.toString(16).toUpperCase().padStart(4, '0')}
                </span>
            );

            // Bases
            for (let j = i; j < Math.min(i + lineLength, cleanSeq.length); j++) {
                const base = cleanSeq[j];
                const isMatch = matchSet.has(j);

                let color = 'var(--text-secondary)';
                if (base === 'A') color = 'var(--dna-a)';
                if (base === 'T') color = 'var(--dna-t)';
                if (base === 'G') color = 'var(--dna-g)';
                if (base === 'C') color = 'var(--dna-c)';

                lineBases.push(
                    <span key={j} style={{
                        display: 'inline-block',
                        width: '1.2ch',
                        textAlign: 'center',
                        color: isMatch ? 'black' : color,
                        backgroundColor: isMatch ? 'var(--accent-acid)' : 'transparent',
                        fontWeight: isMatch ? 'bold' : 'normal',
                    }}>
                        {base}
                    </span>
                );
            }
            lines.push(<div key={i}>{lineBases}</div>);
        }

        return <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: '1.5' }}>{lines}</pre>;
    };

    return (
        <section style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline'
            }}>
                <h2 style={{
                    fontSize: '1rem',
                    color: 'white',
                    margin: 0
                }}>
                    SEQUENCE VIEWER
                </h2>
                <span style={{
                    color: 'var(--accent-acid)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem'
                }}>
                    [{matches.length} MATCHES FOUND]
                </span>
            </div>

            <div style={{ flex: 1 }}>
                {renderSequence()}
            </div>
        </section>
    );
};

export default SequenceViewer;
