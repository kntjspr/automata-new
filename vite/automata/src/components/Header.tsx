import React from 'react';

interface HeaderProps {
    onHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHelp }) => {
    return (
        <header style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            background: 'black',
            borderBottom: 'var(--border-width-thick) solid var(--border-color)',
            height: '80px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0 2rem',
                borderRight: 'var(--border-width) solid var(--border-color)',
                background: 'var(--accent-acid)'
            }}>
                <span style={{ fontSize: '3rem', lineHeight: 1 }}>🧬</span>
            </div>

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 2rem'
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.03em'
                }}>
                    DNA Matcher
                </h1>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em'
                }}>

                </span>
            </div>

            <button
                onClick={onHelp}
                title="Help"
                style={{
                    width: '80px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-tertiary)',
                    border: 'none',
                    borderLeft: 'var(--border-width) solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                ?
            </button>
        </header>
    );
};

export default Header;
