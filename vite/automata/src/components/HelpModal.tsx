
import React, { useState } from 'react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TutorialSection = 'overview' | 'automata' | 'nfa-dfa' | 'regex' | 'matching' | 'bio';

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [activeSection, setActiveSection] = useState<TutorialSection>('overview');

    if (!isOpen) return null;

    const sections: { id: TutorialSection; title: string; icon: string }[] = [
        { id: 'overview', title: 'Overview', icon: '📖' },
        { id: 'automata', title: 'What is an Automaton?', icon: '⚙️' },
        { id: 'nfa-dfa', title: 'NFA vs DFA', icon: '🔄' },
        { id: 'regex', title: 'Regex → NFA', icon: '📝' },
        { id: 'matching', title: 'How Matching Works', icon: '🎯' },
        { id: 'bio', title: 'DNA/RNA Context', icon: '🧬' },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div>
                        <h3 style={{ color: 'var(--accent-acid)', marginTop: 0 }}>Welcome to Automata Explorer</h3>
                        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            This tool demonstrates how <strong>finite automata theory</strong> applies to biological sequence analysis.
                            Search for patterns in DNA/RNA sequences using the power of state machines.
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem',
                            marginTop: '1.5rem'
                        }}>
                            <FeatureCard
                                icon="🔍"
                                title="Pattern Matching"
                                desc="Find exact or fuzzy matches using automata"
                            />
                            <FeatureCard
                                icon="📊"
                                title="Visualization"
                                desc="See NFA/DFA state machines in action"
                            />
                            <FeatureCard
                                icon="🧪"
                                title="Regex Support"
                                desc="Use wildcards and character classes"
                            />
                            <FeatureCard
                                icon="📈"
                                title="Step-by-Step"
                                desc="Watch how input is processed"
                            />
                        </div>

                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: 'rgba(0,255,255,0.1)',
                            border: '1px solid var(--accent-cyan)',
                            borderRadius: '4px'
                        }}>
                            <strong style={{ color: 'var(--accent-cyan)' }}>💡 Quick Start</strong>
                            <ol style={{
                                marginTop: '0.5rem',
                                paddingLeft: '1.5rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.8
                            }}>
                                <li>Enter a DNA sequence (e.g., ATGCATGCATG)</li>
                                <li>Enter a pattern to search (e.g., ATG or [AT]G+)</li>
                                <li>Click <strong>SEARCH</strong> to find matches</li>
                                <li>View the automaton and match results below</li>
                            </ol>
                        </div>
                    </div>
                );

            case 'automata':
                return (
                    <div>
                        <h3 style={{ color: 'var(--accent-acid)', marginTop: 0 }}>What is an Automaton?</h3>
                        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            An <strong>automaton</strong> (plural: automata) is an abstract machine that reads input
                            symbols and transitions between <strong>states</strong>. It's the foundation of pattern matching!
                        </p>

                        <div style={{
                            margin: '1.5rem 0',
                            padding: '1.5rem',
                            background: 'rgba(0,0,0,0.5)',
                            border: '2px solid var(--border-color)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                // Example: Automaton for pattern "ATG"
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <StateCircle label="q0" isStart />
                                <Arrow label="A" />
                                <StateCircle label="q1" />
                                <Arrow label="T" />
                                <StateCircle label="q2" />
                                <Arrow label="G" />
                                <StateCircle label="q3" isAccept />
                            </div>
                        </div>

                        <h4 style={{ color: 'var(--accent-cyan)', marginTop: '1.5rem' }}>Key Concepts</h4>
                        <ul style={{
                            color: 'var(--text-secondary)',
                            lineHeight: 1.8,
                            paddingLeft: '1.5rem'
                        }}>
                            <li><strong style={{ color: 'var(--accent-cyan)' }}>States (q0, q1, ...)</strong> — Positions in the matching process</li>
                            <li><strong style={{ color: 'var(--accent-acid)' }}>Transitions (→)</strong> — Rules for moving between states on input</li>
                            <li><strong style={{ color: 'var(--accent-cyan)' }}>Start State</strong> — Where we begin (q0)</li>
                            <li><strong style={{ color: 'var(--accent-acid)' }}>Accept State</strong> — Success! Pattern found (double circle)</li>
                        </ul>

                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(204,255,0,0.1)',
                            border: '1px solid var(--accent-acid)'
                        }}>
                            <strong style={{ color: 'var(--accent-acid)' }}>🎯 How it works:</strong>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: 1.6 }}>
                                The automaton reads your input sequence one character at a time.
                                On each character, it follows a transition to a new state.
                                If it reaches an <em>accept state</em>, a match is found!
                            </p>
                        </div>
                    </div>
                );

            case 'nfa-dfa':
                return (
                    <div>
                        <h3 style={{ color: 'var(--accent-acid)', marginTop: 0 }}>NFA vs DFA</h3>
                        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            There are two types of finite automata. Both recognize the same patterns,
                            but they work differently!
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(0,255,255,0.1)',
                                border: '2px solid var(--accent-cyan)'
                            }}>
                                <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
                                    NFA (Non-deterministic)
                                </h4>
                                <ul style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    paddingLeft: '1.2rem',
                                    lineHeight: 1.7,
                                    margin: 0
                                }}>
                                    <li>Multiple paths possible</li>
                                    <li>ε-transitions (free moves)</li>
                                    <li>Easy to construct from regex</li>
                                    <li>Explores all possibilities</li>
                                </ul>
                            </div>

                            <div style={{
                                padding: '1rem',
                                background: 'rgba(204,255,0,0.1)',
                                border: '2px solid var(--accent-acid)'
                            }}>
                                <h4 style={{ color: 'var(--accent-acid)', margin: '0 0 0.5rem 0' }}>
                                    DFA (Deterministic)
                                </h4>
                                <ul style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    paddingLeft: '1.2rem',
                                    lineHeight: 1.7,
                                    margin: 0
                                }}>
                                    <li>Exactly one path</li>
                                    <li>No ε-transitions</li>
                                    <li>Faster execution</li>
                                    <li>More states needed</li>
                                </ul>
                            </div>
                        </div>

                        <h4 style={{ color: 'var(--accent-cyan)', marginTop: '1.5rem' }}>
                            NFA → DFA Conversion (Subset Construction)
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            Every NFA can be converted to an equivalent DFA using <strong>subset construction</strong>:
                        </p>
                        <ol style={{
                            color: 'var(--text-secondary)',
                            paddingLeft: '1.5rem',
                            lineHeight: 1.8
                        }}>
                            <li>Each DFA state = a <em>set</em> of NFA states</li>
                            <li>Start: ε-closure of NFA start state</li>
                            <li>For each input symbol, compute reachable NFA states</li>
                            <li>DFA accepts if any NFA accept state is in the set</li>
                        </ol>

                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(255,0,128,0.1)',
                            border: '1px solid var(--accent-punk)'
                        }}>
                            <strong style={{ color: 'var(--accent-punk)' }}>⚡ In this tool:</strong>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: 1.6 }}>
                                Simple patterns → DFA (KMP algorithm)<br />
                                Regex with | or * → NFA (Thompson's construction)
                            </p>
                        </div>
                    </div>
                );

            case 'regex':
                return (
                    <div>
                        <h3 style={{ color: 'var(--accent-acid)', marginTop: 0 }}>Regex → NFA Construction</h3>
                        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            Regular expressions are converted to NFAs using <strong>Thompson's construction</strong>.
                            Each regex operator becomes a small NFA fragment.
                        </p>

                        <h4 style={{ color: 'var(--accent-cyan)', marginTop: '1.5rem' }}>Supported Syntax</h4>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.85rem',
                            marginTop: '0.5rem'
                        }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-color)' }}>Pattern</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-color)' }}>Meaning</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-color)' }}>Example</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: 'var(--text-secondary)' }}>
                                <tr>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>AB</td>
                                    <td style={{ padding: '0.5rem' }}>A followed by B</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>ATG</td>
                                </tr>
                                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>A|B</td>
                                    <td style={{ padding: '0.5rem' }}>A or B</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>A|T|G|C</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>A*</td>
                                    <td style={{ padding: '0.5rem' }}>Zero or more A's</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>AT*G</td>
                                </tr>
                                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>A+</td>
                                    <td style={{ padding: '0.5rem' }}>One or more A's</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>A+TG</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>A?</td>
                                    <td style={{ padding: '0.5rem' }}>Optional A</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>AT?G</td>
                                </tr>
                                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>[ABC]</td>
                                    <td style={{ padding: '0.5rem' }}>Character class</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>[AT][GC]</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-acid)' }}>.</td>
                                    <td style={{ padding: '0.5rem' }}>Any character</td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>A.G</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(204,255,0,0.1)',
                            border: '1px solid var(--accent-acid)'
                        }}>
                            <strong style={{ color: 'var(--accent-acid)' }}>🧬 DNA Example:</strong>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                                Pattern: <code style={{ color: 'var(--accent-cyan)' }}>ATG[ACGT]*T(AA|AG|GA)</code><br />
                                Matches: Start codon (ATG) + any bases + stop codon
                            </p>
                        </div>
                    </div>
                );

            case 'matching':
                return (
                    <div>
                        <h3 style={{ color: 'var(--accent-acid)', marginTop: 0 }}>How Pattern Matching Works</h3>
                        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            The automaton scans through your input sequence, processing one character at a time
                            and moving between states. Here's what happens:
                        </p>

                        <div style={{
                            margin: '1.5rem 0',
                            padding: '1rem',
                            background: 'rgba(0,0,0,0.5)',
                            border: '2px solid var(--border-color)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem'
                        }}>
                            <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                // Matching "ATG" in sequence "CATGC"
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <StepRow pos={0} char="C" state="q0 → q0" note="No match, stay at start" />
                                <StepRow pos={1} char="A" state="q0 → q1" note="First char matches!" isMatch />
                                <StepRow pos={2} char="T" state="q1 → q2" note="Second char matches!" isMatch />
                                <StepRow pos={3} char="G" state="q2 → q3" note="✓ ACCEPT! Pattern found!" isAccept />
                                <StepRow pos={4} char="C" state="q0 → q0" note="Continue scanning..." />
                            </div>
                        </div>

                        <h4 style={{ color: 'var(--accent-cyan)', marginTop: '1.5rem' }}>The Matching Process</h4>
                        <ol style={{
                            color: 'var(--text-secondary)',
                            paddingLeft: '1.5rem',
                            lineHeight: 1.8
                        }}>
                            <li><strong>Initialize:</strong> Start at state q0</li>
                            <li><strong>Read:</strong> Get next character from input</li>
                            <li><strong>Transition:</strong> Follow the edge for that character</li>
                            <li><strong>Check:</strong> If in accept state, record match</li>
                            <li><strong>Repeat:</strong> Continue until end of input</li>
                        </ol>

                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(0,255,255,0.1)',
                            border: '1px solid var(--accent-cyan)'
                        }}>
                            <strong style={{ color: 'var(--accent-cyan)' }}>🔧 Fuzzy Matching:</strong>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: 1.6 }}>
                                Enable "Max Mismatches" to allow approximate matches.
                                The automaton tracks edit distance (substitutions, insertions, deletions).
                            </p>
                        </div>
                    </div>
                );

            case 'bio':
                return (
                    <div>
                        <h3 style={{ color: 'var(--accent-acid)', marginTop: 0 }}>DNA/RNA Sequence Analysis</h3>
                        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                            Automata theory has powerful applications in <strong>bioinformatics</strong>.
                            Here's how this tool applies to biological sequences:
                        </p>

                        <h4 style={{ color: 'var(--accent-cyan)', marginTop: '1.5rem' }}>
                            🧬 Common Search Patterns
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <BioPatternCard
                                name="Start Codon"
                                pattern="ATG"
                                desc="Beginning of protein-coding region"
                            />
                            <BioPatternCard
                                name="Stop Codons"
                                pattern="TAA|TAG|TGA"
                                desc="End of protein-coding region"
                            />
                            <BioPatternCard
                                name="TATA Box"
                                pattern="TATA[AT]A[AT]"
                                desc="Promoter region for transcription"
                            />
                            <BioPatternCard
                                name="Restriction Sites"
                                pattern="GAATTC"
                                desc="EcoRI enzyme cut site"
                            />
                        </div>

                        <h4 style={{ color: 'var(--accent-cyan)', marginTop: '1.5rem' }}>
                            📊 Why Automata for Bioinformatics?
                        </h4>
                        <ul style={{
                            color: 'var(--text-secondary)',
                            paddingLeft: '1.5rem',
                            lineHeight: 1.8
                        }}>
                            <li><strong>Speed:</strong> Linear time O(n) scanning</li>
                            <li><strong>Flexibility:</strong> Regex patterns for degenerate bases</li>
                            <li><strong>Fuzzy matching:</strong> Find mutations/variants</li>
                            <li><strong>Multiple patterns:</strong> Search many patterns at once (Aho-Corasick)</li>
                        </ul>

                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(204,255,0,0.1)',
                            border: '1px solid var(--accent-acid)'
                        }}>
                            <strong style={{ color: 'var(--accent-acid)' }}>🔬 Try It:</strong>
                            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: 1.6 }}>
                                Load an example sequence from the dropdown, or paste your own FASTA sequence.
                                Search for biological motifs and see them highlighted!
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="modal" style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div className="modal-content" style={{
                background: 'var(--bg-secondary)',
                border: '3px solid var(--accent-acid)',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 40px rgba(204,255,0,0.2), 0 20px 60px rgba(0,0,0,0.8)'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.5rem',
                    borderBottom: '2px solid var(--border-color)',
                    background: 'var(--accent-acid)',
                    color: 'black'
                }}>
                    <h2 style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        📚 Tutorial & Documentation
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'black',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.3)',
                    overflowX: 'auto',
                    flexShrink: 0
                }}>
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            style={{
                                padding: '0.75rem 1rem',
                                background: activeSection === section.id ? 'var(--bg-secondary)' : 'transparent',
                                border: 'none',
                                borderBottom: activeSection === section.id ? '2px solid var(--accent-acid)' : '2px solid transparent',
                                color: activeSection === section.id ? 'var(--accent-acid)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: activeSection === section.id ? 600 : 400,
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span>{section.icon}</span>
                            <span>{section.title}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="modal-body" style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    fontSize: '0.9rem'
                }}>
                    {renderContent()}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '0.75rem 1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                }}>
                    <span>Use tabs above to navigate tutorials</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                        ESC or click outside to close
                    </span>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const FeatureCard: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div style={{
        padding: '1rem',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid var(--border-color)',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
    </div>
);

const StateCircle: React.FC<{ label: string; isStart?: boolean; isAccept?: boolean }> = ({ label, isStart, isAccept }) => (
    <div style={{
        width: isAccept ? '44px' : '36px',
        height: isAccept ? '44px' : '36px',
        borderRadius: '50%',
        border: `2px solid ${isAccept ? 'var(--accent-acid)' : isStart ? 'var(--accent-cyan)' : 'var(--text-primary)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isAccept ? 'rgba(204,255,0,0.2)' : 'transparent',
        outline: isAccept ? '2px solid var(--accent-acid)' : 'none',
        outlineOffset: '3px',
        color: isAccept ? 'var(--accent-acid)' : 'white',
        fontWeight: 'bold',
        fontSize: '0.75rem'
    }}>
        {label}
    </div>
);

const Arrow: React.FC<{ label: string }> = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-acid)' }}>
        <span style={{ fontSize: '0.7rem', marginRight: '2px' }}>{label}</span>
        <span>→</span>
    </div>
);

const StepRow: React.FC<{ pos: number; char: string; state: string; note: string; isMatch?: boolean; isAccept?: boolean }> =
    ({ pos, char, state, note, isMatch, isAccept }) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.3rem 0.5rem',
            background: isAccept ? 'rgba(204,255,0,0.2)' : isMatch ? 'rgba(0,255,255,0.1)' : 'transparent',
            borderLeft: isAccept ? '3px solid var(--accent-acid)' : isMatch ? '3px solid var(--accent-cyan)' : '3px solid transparent'
        }}>
            <span style={{ color: 'var(--text-muted)', width: '25px' }}>[{pos}]</span>
            <span style={{
                color: isAccept ? 'var(--accent-acid)' : isMatch ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 'bold',
                width: '20px'
            }}>{char}</span>
            <span style={{ color: 'var(--text-muted)', width: '80px' }}>{state}</span>
            <span style={{
                color: isAccept ? 'var(--accent-acid)' : 'var(--text-muted)',
                fontSize: '0.75rem'
            }}>{note}</span>
        </div>
    );

const BioPatternCard: React.FC<{ name: string; pattern: string; desc: string }> = ({ name, pattern, desc }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid var(--border-color)'
    }}>
        <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
        </div>
        <code style={{
            padding: '0.25rem 0.5rem',
            background: 'rgba(204,255,0,0.2)',
            color: 'var(--accent-acid)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem'
        }}>{pattern}</code>
    </div>
);

export default HelpModal;
