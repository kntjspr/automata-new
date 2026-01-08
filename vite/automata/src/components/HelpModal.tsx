
import React from 'react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal" style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(2px)'
        }} onClick={onClose}>
            <div className="modal-content" style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>DNA Pattern Matcher Help</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        &times;
                    </button>
                </div>
                <div className="modal-body" style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginTop: 0 }}>Overview</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        This tool finds DNA patterns using finite automata theory. It converts your search pattern into an efficient state machine for fast matching.
                    </p>

                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginTop: 'var(--spacing-md)' }}>Pattern Types</h3>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <li><strong>Exact Match:</strong> Find exact occurrences (e.g., "ATG").</li>
                        <li><strong>Regex:</strong> Use wildcards like <code>[ACGT]</code> or <code>*</code>.</li>
                        <li><strong>Restriction Site:</strong> Common enzyme cuts.</li>
                        <li><strong>Motif:</strong> Biological signals like TATA boxes.</li>
                    </ul>

                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginTop: 'var(--spacing-md)' }}>Fuzzy Matching</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Use the slider to allow mistakes (mismatches) in your pattern search. Useful for finding variations or mutations.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
