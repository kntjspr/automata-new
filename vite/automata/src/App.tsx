
import { useState, useMemo } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import SequenceViewer from './components/SequenceViewer';
import ResultsPanel from './components/ResultsPanel';
import RNAPanel from './components/RNAPanel';
import XMLPanel from './components/XMLPanel';
import HelpModal from './components/HelpModal';
import { calculateStats, findMatchesAsync, type Match } from './utils/dnaUtils';

type TabType = 'dna' | 'rna' | 'xml';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dna');
  const [sequence, setSequence] = useState('');
  const [patternType, setPatternType] = useState('exact');
  const [pattern, setPattern] = useState('');
  const [maxMismatches, setMaxMismatches] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const stats = useMemo(() => calculateStats(sequence), [sequence]);

  const handleSearch = async () => {
    const results = await findMatchesAsync(sequence, pattern, patternType, maxMismatches);
    setMatches(results);
  };

  const tabs: { id: TabType; label: string; icon: string; automataType: string }[] = [
    { id: 'dna', label: 'DNA MATCH', icon: '🧬', automataType: 'FSM/DFA' },
    { id: 'rna', label: 'RNA STRUCT', icon: '🔬', automataType: 'PDA' },
    { id: 'xml', label: 'XML VALID', icon: '📄', automataType: 'PDA' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr auto',
      background: 'var(--bg-primary)'
    }}>
      <Header onHelp={() => setIsHelpOpen(true)} />

      {/* Brutalist Navigation Bar */}
      <nav style={{
        display: 'flex',
        borderBottom: 'var(--border-width-thick) solid var(--border-color)',
        background: 'var(--bg-secondary)',
        overflowX: 'auto',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '1.5rem 1rem',
              border: 'none',
              borderRight: '1px solid var(--border-color)',
              background: activeTab === tab.id ? 'var(--accent-acid)' : 'transparent',
              color: activeTab === tab.id ? 'black' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.05em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              minWidth: '150px',
              maxWidth: '300px',
              transition: 'background 0.1s'
            }}
          >
            <span style={{ fontSize: '1.5rem', filter: activeTab === tab.id ? 'none' : 'grayscale(1)' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{
              fontSize: '0.7em',
              opacity: 0.8,
              fontFamily: 'var(--font-mono)'
            }}>[{tab.automataType}]</span>
          </button>
        ))}
        {/* Fill remaining space */}
        <div style={{ flex: 1, background: 'var(--bg-tertiary)', opacity: 0.1 }}></div>
      </nav>

      {/* Main Content Area */}
      <main style={{
        padding: '0',
        maxWidth: '100vw',
        display: 'block',
        overflow: 'auto'
      }}>

        {/* DNA Pattern Matching Tab */}
        {activeTab === 'dna' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gridTemplateRows: 'minmax(300px, auto) auto',
            gap: '0',
            minHeight: 'calc(100vh - 200px)'
          }}>
            {/* Left Col: Controls */}
            <div style={{
              gridRow: '1 / 3',
              borderRight: 'var(--border-width-thick) solid var(--border-color)',
              background: 'var(--bg-secondary)',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 200px)'
            }}>
              <InputPanel
                sequence={sequence}
                setSequence={setSequence}
                patternType={patternType}
                setPatternType={setPatternType}
                pattern={pattern}
                setPattern={setPattern}
                maxMismatches={maxMismatches}
                setMaxMismatches={setMaxMismatches}
                onSearch={handleSearch}
                stats={stats}
              />
            </div>

            {/* Top Right: Sequence Viewer */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              borderBottom: 'var(--border-width-thick) solid var(--border-color)',
              background: 'var(--bg-primary)',
              maxHeight: '50vh'
            }}>
              <SequenceViewer
                sequence={sequence}
                matches={matches}
              />
            </div>

            {/* Bottom Right: Results Panel with Automaton */}
            <div style={{
              background: 'var(--bg-tertiary)',
              overflowY: 'auto',
              overflowX: 'auto',
              maxHeight: '50vh'
            }}>
              <ResultsPanel
                matches={matches}
                sequence={sequence}
                pattern={pattern}
              />
            </div>
          </div>
        )}

        {/* RNA Structure Tab */}
        {activeTab === 'rna' && (
          <div style={{
            padding: '4rem',
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%'
          }}>
            <div style={{
              border: 'var(--border-width-thick) solid var(--text-primary)',
              boxShadow: 'var(--shadow-hard)',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: 'var(--border-width) solid var(--border-color)',
                background: 'var(--accent-cyan)',
                color: 'black',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                <h2>// RNA_STRUCTURE_ANALYZER // PDA_MODE</h2>
              </div>
              <div style={{ padding: '2rem' }}>
                <RNAPanel />
              </div>
            </div>
          </div>
        )}

        {/* XML Validation Tab */}
        {activeTab === 'xml' && (
          <div style={{
            padding: '4rem',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%'
          }}>
            <div style={{
              border: 'var(--border-width-thick) solid var(--text-primary)',
              boxShadow: 'var(--shadow-hard)',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: 'var(--border-width) solid var(--border-color)',
                background: 'var(--accent-punk)',
                color: 'white',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                <h2>&lt;XML_VALIDATOR /&gt; :: PDA_MODE</h2>
              </div>
              <div style={{ padding: '2rem' }}>
                <XMLPanel />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{
        padding: '2rem',
        borderTop: 'var(--border-width-thick) solid var(--border-color)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        display: 'flex',
        justifyContent: 'space-between',
        background: 'black',
        color: 'var(--text-muted)'
      }}>
        <span>Automata/Theory/Explorer_v2.0</span>
        <span>
          <span style={{ color: 'var(--accent-neon)' }}>FSM</span> /
          <span style={{ color: 'var(--accent-cyan)' }}> DFA</span> /
          <span style={{ color: 'var(--accent-punk)' }}> PDA</span>
        </span>
      </footer>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

export default App;
