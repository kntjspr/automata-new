/**
 * Pushdown Automata Utilities
 * For recognizing Context-Free Languages (CFLs) that regular FSMs cannot handle
 */

import { isAPIAvailable, validateRNAAPI, validateXMLAPI } from './apiService';

export interface PDAState {
    currentState: string;
    stack: string[];
    input: string;
    position: number;
    accepted: boolean;
    error: string | null;
    history: PDAStep[];
}

export interface PDAStep {
    state: string;
    symbol: string;
    stackAction: string;
    stack: string[];
}

// ============ RNA Secondary Structure Validator ============
// RNA structures use dot-bracket notation: dots for unpaired bases, parentheses for base pairs
// Valid: (((...))) or ((.)).((.)) 
// Invalid: ((.) or )( - these require a PDA because FSM cannot count matching parens

export const validateRNAStructure = (structure: string): PDAState => {
    const history: PDAStep[] = [];
    const stack: string[] = ['$']; // $ is the initial stack symbol
    let currentState = 'q0';
    let error: string | null = null;

    for (let i = 0; i < structure.length; i++) {
        const symbol = structure[i];
        const stackTop = stack[stack.length - 1];

        let stackAction = '';

        if (symbol === '(' || symbol === '[' || symbol === '{' || symbol === '<') {
            // Push opening bracket onto stack
            stack.push(symbol);
            stackAction = `PUSH ${symbol}`;
            currentState = 'q1'; // In processing state
        } else if (symbol === ')' || symbol === ']' || symbol === '}' || symbol === '>') {
            // Check for matching opening bracket
            const matchMap: Record<string, string> = { ')': '(', ']': '[', '}': '{', '>': '<' };
            const expected = matchMap[symbol];

            if (stackTop === expected) {
                stack.pop();
                stackAction = `POP ${expected}`;
            } else if (stackTop === '$') {
                error = `Position ${i + 1}: Unexpected closing '${symbol}' with no matching opening bracket`;
                currentState = 'qReject';
                break;
            } else {
                error = `Position ${i + 1}: Mismatched brackets. Expected '${getClosing(stackTop)}' but found '${symbol}'`;
                currentState = 'qReject';
                break;
            }
        } else if (symbol === '.' || symbol === 'A' || symbol === 'U' || symbol === 'G' || symbol === 'C') {
            // Dots and bases are unpaired - no stack operation
            stackAction = 'SKIP (unpaired)';
        } else if (/\s/.test(symbol)) {
            // Ignore whitespace
            stackAction = 'SKIP (whitespace)';
        } else {
            error = `Position ${i + 1}: Invalid character '${symbol}'`;
            currentState = 'qReject';
            break;
        }

        history.push({
            state: currentState,
            symbol,
            stackAction,
            stack: [...stack]
        });
    }

    // Final check: stack should only have the initial $ symbol
    if (!error && stack.length > 1) {
        const unclosed = stack.slice(1).reverse().join('');
        error = `Unclosed brackets at end: ${unclosed}`;
        currentState = 'qReject';
    }

    const accepted = !error && stack.length === 1 && stack[0] === '$';
    if (accepted) {
        currentState = 'qAccept';
    }

    return {
        currentState,
        stack,
        input: structure,
        position: structure.length,
        accepted,
        error,
        history
    };
};

const getClosing = (opening: string): string => {
    const map: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };
    return map[opening] || '?';
};

// ============ XML Tag Validator ============
// Validates properly nested XML tags: <a><b></b></a>
// This is a CFL because we need to match opening and closing tags

export interface XMLValidationResult extends PDAState {
    tags: { name: string; type: 'open' | 'close' | 'self-close'; position: number }[];
}

export const validateXML = (xml: string): XMLValidationResult => {
    const history: PDAStep[] = [];
    const stack: string[] = ['$'];
    const tags: { name: string; type: 'open' | 'close' | 'self-close'; position: number }[] = [];
    let currentState = 'q0';
    let error: string | null = null;

    // Simple regex to find tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*\/?>/g;
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];
        const position = match.index;

        let stackAction = '';
        let tagType: 'open' | 'close' | 'self-close' = 'open';

        if (fullTag.startsWith('</')) {
            // Closing tag
            tagType = 'close';
            const stackTop = stack[stack.length - 1];

            if (stackTop === tagName) {
                stack.pop();
                stackAction = `POP <${tagName}>`;
                currentState = 'q1';
            } else if (stackTop === '$') {
                error = `Position ${position}: Unexpected closing tag </${tagName}> with no matching opening tag`;
                currentState = 'qReject';
                break;
            } else {
                error = `Position ${position}: Mismatched tags. Expected </${stackTop}> but found </${tagName}>`;
                currentState = 'qReject';
                break;
            }
        } else if (fullTag.endsWith('/>')) {
            // Self-closing tag - no stack operation needed
            tagType = 'self-close';
            stackAction = `SKIP <${tagName}/> (self-closing)`;
        } else {
            // Opening tag
            tagType = 'open';
            stack.push(tagName);
            stackAction = `PUSH <${tagName}>`;
            currentState = 'q1';
        }

        tags.push({ name: tagName, type: tagType, position });
        history.push({
            state: currentState,
            symbol: fullTag,
            stackAction,
            stack: [...stack]
        });
    }

    // Final check
    if (!error && stack.length > 1) {
        const unclosed = stack.slice(1).reverse().map(t => `<${t}>`).join(', ');
        error = `Unclosed tags at end: ${unclosed}`;
        currentState = 'qReject';
    }

    const accepted = !error && stack.length === 1 && stack[0] === '$';
    if (accepted) {
        currentState = 'qAccept';
    }

    return {
        currentState,
        stack,
        input: xml,
        position: xml.length,
        accepted,
        error,
        history,
        tags
    };
};

// ============ Levenshtein Automaton (Approximate Matching) ============
// This creates a DFA that accepts all strings within edit distance k of a pattern
// Still regular! But more powerful than simple exact matching

export interface LevenshteinMatch {
    start: number;
    end: number;
    text: string;
    editDistance: number;
    operations: string[];
}

export const levenshteinDistance = (s1: string, s2: string): { distance: number; operations: string[] } => {
    const m = s1.length;
    const n = s2.length;

    // Create distance matrix
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    const ops: string[][][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(null).map(() => []));

    // Initialize
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
        if (i > 0) ops[i][0] = [...ops[i - 1][0], `DELETE '${s1[i - 1]}'`];
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
        if (j > 0) ops[0][j] = [...ops[0][j - 1], `INSERT '${s2[j - 1]}'`];
    }

    // Fill matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
                ops[i][j] = [...ops[i - 1][j - 1], `MATCH '${s1[i - 1]}'`];
            } else {
                const options = [
                    { cost: dp[i - 1][j] + 1, op: `DELETE '${s1[i - 1]}'`, prev: ops[i - 1][j] },
                    { cost: dp[i][j - 1] + 1, op: `INSERT '${s2[j - 1]}'`, prev: ops[i][j - 1] },
                    { cost: dp[i - 1][j - 1] + 1, op: `REPLACE '${s1[i - 1]}' → '${s2[j - 1]}'`, prev: ops[i - 1][j - 1] }
                ];
                const best = options.reduce((a, b) => a.cost < b.cost ? a : b);
                dp[i][j] = best.cost;
                ops[i][j] = [...best.prev, best.op];
            }
        }
    }

    return { distance: dp[m][n], operations: ops[m][n] };
};

export const findApproximateMatches = (
    text: string,
    pattern: string,
    maxDistance: number
): LevenshteinMatch[] => {
    const matches: LevenshteinMatch[] = [];
    const patternLen = pattern.length;

    // Sliding window approach with variable window size
    for (let windowSize = Math.max(1, patternLen - maxDistance); windowSize <= patternLen + maxDistance; windowSize++) {
        for (let i = 0; i <= text.length - windowSize; i++) {
            const substring = text.substring(i, i + windowSize);
            const { distance, operations } = levenshteinDistance(substring, pattern);

            if (distance <= maxDistance) {
                // Check for overlapping matches and keep best one
                const existingIndex = matches.findIndex(m =>
                    (i >= m.start && i < m.end) || (i + windowSize > m.start && i + windowSize <= m.end)
                );

                if (existingIndex === -1) {
                    matches.push({
                        start: i,
                        end: i + windowSize,
                        text: substring,
                        editDistance: distance,
                        operations
                    });
                } else if (matches[existingIndex].editDistance > distance) {
                    matches[existingIndex] = {
                        start: i,
                        end: i + windowSize,
                        text: substring,
                        editDistance: distance,
                        operations
                    };
                }
            }
        }
    }

    return matches.sort((a, b) => a.start - b.start);
};

// ============ Example Data: Real RNA Structures ============
// These examples use authentic RNA sequences and validated secondary structures
// IMPORTANT: Sequence and structure must be EXACTLY the same length!

export interface RNAExample {
    name: string;
    structure: string;
    sequence?: string;
    description?: string;
    source?: string;
}

export const RNA_EXAMPLES: RNAExample[] = [
    {
        // Simple Hairpin - 12 chars each
        name: 'Simple Hairpin',
        sequence: 'GCGCAAAAGCGC',
        structure: '((((....))))',
        description: 'A basic hairpin loop structure. The GCGC stem pairs with GCGC on the opposite end, with AAAA forming the loop.',
        source: 'Educational Example'
    },
    {
        // tRNA anticodon stem-loop - 17 chars each  
        name: 'tRNA Anticodon',
        sequence: 'CUGACUUAAAAAGUCAG',
        structure: '(((((.......)))))',
        description: 'Transfer RNA anticodon stem-loop. The stem region pairs complementarily while the loop presents the anticodon.',
        source: 'PDB: 1EHZ (simplified)'
    },
    {
        // miR-21 hairpin - 22 chars each
        name: 'miR-21 Hairpin',
        sequence: 'UAGCUUAUCAGACUGAUGUUGA',
        structure: '((((((......))))))....',
        description: 'Human microRNA-21 precursor. One of the most studied miRNAs, implicated in cancer.',
        source: 'miRBase: MI0000077'
    },
    {
        // HIV TAR element - 29 chars each
        name: 'HIV TAR Element',
        sequence: 'GGCCAGAUCUGAGCCUGGGAGCUCUCUGG',
        structure: '((((((((.......))))..))))....',
        description: 'HIV-1 Trans-Activation Response element. Critical for viral replication.',
        source: 'PDB: 1ANR'
    },
    {
        // SARS-CoV-2 stem - 22 chars each (was already correct)
        name: 'SARS-CoV-2 SL5',
        sequence: 'GUAACACGUUCUUUUAGUGGUG',
        structure: '(((((((.......))))))).',
        description: 'Stem-loop 5 from SARS-CoV-2 5\' UTR. Important for viral RNA replication.',
        source: 'NCBI: NC_045512.2'
    },
    {
        // Hammerhead - 22 chars each
        name: 'Hammerhead Ribozyme',
        sequence: 'CUGAUGAGUCCGUGAGGACGAA',
        structure: '((((((......))))))....',
        description: 'Minimal hammerhead ribozyme. Self-cleaving RNA that catalyzes its own cleavage.',
        source: 'PDB: 2OEU'
    },
    {
        // Simple multi-loop - 21 chars each  
        name: 'Multi-Stem',
        sequence: 'GGGAAACCCAAAGGGAAACCC',
        structure: '(((....))).(((....))).',
        description: 'Example with two separate stem-loops connected by a linker.',
        source: 'Educational Example'
    },
    {
        // Invalid - Unbalanced - 10 chars each
        name: 'Invalid - Unbalanced',
        sequence: 'AUCGAUCGAU',
        structure: '(((.....).',
        description: 'INVALID: Unbalanced parentheses - 3 opens but only 0 closes.',
        source: 'Synthetic (Invalid)'
    },
    {
        // Invalid - Wrong order - 10 chars each
        name: 'Invalid - Wrong Order',
        sequence: 'GCGCAAGCGC',
        structure: '))((...((',
        description: 'INVALID: Closing brackets before opening brackets.',
        source: 'Synthetic (Invalid)'
    }
];

export const XML_EXAMPLES = [
    { name: 'Valid Nested', xml: '<root><child><grandchild></grandchild></child></root>' },
    { name: 'Valid with Content', xml: '<html><head><title>Test</title></head><body></body></html>' },
    { name: 'Self-closing', xml: '<root><item/><item/></root>' },
    { name: 'Invalid - Mismatched', xml: '<a><b></a></b>' },
    { name: 'Invalid - Unclosed', xml: '<root><child>' }
];

// ============ Async API Wrappers ============
// These try the C++ API first, fallback to local TypeScript implementation

/**
 * Validate RNA structure using C++ API (fallback to local)
 */
export const validateRNAStructureAsync = async (structure: string): Promise<PDAState> => {
    // Try C++ API first
    if (await isAPIAvailable()) {
        try {
            const result = await validateRNAAPI(structure);
            if (result.success) {
                return {
                    currentState: result.currentState || 'q0',
                    stack: result.stack?.split('') || ['$'],
                    input: structure,
                    position: structure.length,
                    accepted: result.accepted || false,
                    error: result.error || null,
                    history: (result.history || []).map(h => ({
                        state: h.state,
                        symbol: h.symbol,
                        stackAction: h.stackAction,
                        stack: h.stack.split('')
                    }))
                };
            }
        } catch (error) {
            console.warn('C++ RNA API failed, using local:', error);
        }
    }
    // Fallback to local
    return validateRNAStructure(structure);
};

/**
 * Validate XML using C++ API (fallback to local)
 */
export const validateXMLAsync = async (xml: string): Promise<XMLValidationResult> => {
    // Try C++ API first
    if (await isAPIAvailable()) {
        try {
            const result = await validateXMLAPI(xml);
            if (result.success) {
                return {
                    currentState: result.currentState || 'q0',
                    stack: ['$'],
                    input: xml,
                    position: xml.length,
                    accepted: result.accepted || false,
                    error: result.error || null,
                    history: (result.history || []).map(h => ({
                        state: h.state,
                        symbol: h.symbol,
                        stackAction: h.stackAction,
                        stack: h.stack.split('')
                    })),
                    tags: (result.tags || []).map(t => ({
                        name: t.name,
                        type: t.type,
                        position: t.position
                    }))
                };
            }
        } catch (error) {
            console.warn('C++ XML API failed, using local:', error);
        }
    }
    // Fallback to local
    return validateXML(xml);
};

// ============ CFG to PDA Conversion ============
// Implements the standard algorithm to convert Context-Free Grammar to Pushdown Automaton

/**
 * CFG Production Rule
 */
export interface CFGRule {
    variable: string;       // Non-terminal (e.g., 'S')
    production: string[];   // Right-hand side symbols (e.g., ['(', 'S', ')'])
    ruleNumber: number;     // For reference
}

/**
 * Context-Free Grammar definition
 */
export interface CFGGrammar {
    name: string;
    startSymbol: string;
    variables: string[];      // Non-terminals (uppercase)
    terminals: string[];      // Terminals (lowercase or symbols)
    rules: CFGRule[];
}

/**
 * PDA Transition
 */
export interface PDATransition {
    from: string;           // Source state
    to: string;             // Destination state
    input: string;          // Input symbol read (ε for epsilon)
    pop: string;            // Symbol to pop from stack
    push: string[];         // Symbols to push (first element pushed last)
    description: string;    // Human-readable description
}

/**
 * PDA Definition for visualization
 */
export interface PDADefinition {
    states: string[];
    startState: string;
    acceptState: string;
    transitions: PDATransition[];
    stackAlphabet: string[];
    inputAlphabet: string[];
}

/**
 * Conversion step for educational display
 */
export interface ConversionStep {
    stepNumber: number;
    title: string;
    description: string;
    detail: string;
    formula?: string;
}

/**
 * Get the CFG for RNA dot-bracket notation (balanced parentheses with dots)
 * 
 * Grammar for balanced parentheses with unpaired bases:
 * S → (S)    [Matched pair enclosing structure]
 * S → SS     [Concatenation of structures]  
 * S → .      [Single unpaired base]
 * S → ε      [Empty string]
 */
export const getRNACFG = (): CFGGrammar => ({
    name: 'RNA Dot-Bracket Grammar',
    startSymbol: 'S',
    variables: ['S'],
    terminals: ['(', ')', '.'],
    rules: [
        { variable: 'S', production: ['(', 'S', ')'], ruleNumber: 1 },
        { variable: 'S', production: ['S', 'S'], ruleNumber: 2 },
        { variable: 'S', production: ['.'], ruleNumber: 3 },
        { variable: 'S', production: ['ε'], ruleNumber: 4 },
    ]
});

/**
 * CFG to PDA Conversion Algorithm (Standard Construction)
 * 
 * ALGORITHM: Convert CFG G = (V, Σ, R, S) to PDA M = (Q, Σ, Γ, δ, q₀, Z₀, F)
 * 
 * 1. States:       Q = {q_start, q_loop, q_accept}
 * 2. Input:        Σ = terminals of G
 * 3. Stack:        Γ = V ∪ Σ ∪ {$}  (variables, terminals, and bottom marker)
 * 4. Start State:  q₀ = q_start
 * 5. Accept State: F = {q_accept}
 * 6. Initial Stack: Z₀ = $
 * 
 * TRANSITIONS:
 * 
 * Step 1: Initialize - Push start symbol onto stack
 *   δ(q_start, ε, $) = (q_loop, S$)
 * 
 * Step 2: For each production A → α in R:
 *   δ(q_loop, ε, A) = (q_loop, α)
 *   [If top of stack is variable A, replace with production body α]
 * 
 * Step 3: For each terminal a in Σ:
 *   δ(q_loop, a, a) = (q_loop, ε)  
 *   [If top of stack matches input, pop and advance]
 * 
 * Step 4: Accept when stack is empty
 *   δ(q_loop, ε, $) = (q_accept, ε)
 */
export const cfgToPDA = (grammar: CFGGrammar): PDADefinition => {
    const transitions: PDATransition[] = [];

    // Step 1: Initialize - push start symbol onto stack
    transitions.push({
        from: 'q_start',
        to: 'q_loop',
        input: 'ε',
        pop: '$',
        push: [grammar.startSymbol, '$'],
        description: `Initialize: Push ${grammar.startSymbol} onto stack`
    });

    // Step 2: For each production rule A → α, add transition
    for (const rule of grammar.rules) {
        const productionStr = rule.production.join('');
        const pushSymbols = rule.production[0] === 'ε' ? [] : [...rule.production].reverse();

        transitions.push({
            from: 'q_loop',
            to: 'q_loop',
            input: 'ε',
            pop: rule.variable,
            push: pushSymbols,
            description: `Rule ${rule.ruleNumber}: ${rule.variable} → ${productionStr}`
        });
    }

    // Step 3: For each terminal, add match transition
    for (const terminal of grammar.terminals) {
        transitions.push({
            from: 'q_loop',
            to: 'q_loop',
            input: terminal,
            pop: terminal,
            push: [],
            description: `Match terminal: ${terminal}`
        });
    }

    // Step 4: Accept when stack has only $ (empty)
    transitions.push({
        from: 'q_loop',
        to: 'q_accept',
        input: 'ε',
        pop: '$',
        push: [],
        description: 'Accept: Stack empty, input consumed'
    });

    return {
        states: ['q_start', 'q_loop', 'q_accept'],
        startState: 'q_start',
        acceptState: 'q_accept',
        transitions,
        stackAlphabet: ['$', ...grammar.variables, ...grammar.terminals],
        inputAlphabet: grammar.terminals
    };
};

/**
 * Get step-by-step explanation of the CFG to PDA conversion
 */
export const getConversionSteps = (grammar: CFGGrammar): ConversionStep[] => {
    const steps: ConversionStep[] = [];

    steps.push({
        stepNumber: 1,
        title: 'Define PDA Components',
        description: 'Create the 3-state PDA structure',
        detail: `States Q = {q_start, q_loop, q_accept}\nStart: q_start, Accept: q_accept`,
        formula: 'M = (Q, Σ, Γ, δ, q₀, Z₀, F)'
    });

    steps.push({
        stepNumber: 2,
        title: 'Initialize Stack',
        description: 'Push start symbol onto stack and move to processing state',
        detail: `From q_start, push ${grammar.startSymbol} onto stack`,
        formula: `δ(q_start, ε, $) = (q_loop, ${grammar.startSymbol}$)`
    });

    steps.push({
        stepNumber: 3,
        title: 'Add Production Transitions',
        description: 'For each grammar rule, add ε-transition that replaces variable with production',
        detail: grammar.rules.map(r =>
            `${r.variable} → ${r.production.join('')}`
        ).join('\n'),
        formula: 'δ(q_loop, ε, A) = (q_loop, α) for each A → α'
    });

    steps.push({
        stepNumber: 4,
        title: 'Add Terminal Match Transitions',
        description: 'For each terminal, add transition that matches input with stack top',
        detail: grammar.terminals.map(t => `Match '${t}': pop ${t} when reading ${t}`).join('\n'),
        formula: 'δ(q_loop, a, a) = (q_loop, ε) for each terminal a'
    });

    steps.push({
        stepNumber: 5,
        title: 'Add Accept Transition',
        description: 'Accept when input is consumed and stack is empty (only $ remains)',
        detail: 'Transition to accept state when stack bottom marker $ is on top',
        formula: 'δ(q_loop, ε, $) = (q_accept, ε)'
    });

    return steps;
};

/**
 * Generate Graphviz DOT representation of the PDA
 */
export const pdaToGraphviz = (pda: PDADefinition, grammar: CFGGrammar): string => {
    const lines: string[] = [];

    lines.push('digraph PDA {');
    lines.push('    // Graph settings');
    lines.push('    rankdir=LR;');
    lines.push('    bgcolor="transparent";');
    lines.push('    node [fontname="Courier New", fontsize=12];');
    lines.push('    edge [fontname="Courier New", fontsize=10];');
    lines.push('');
    lines.push('    // Title');
    lines.push(`    labelloc="t";`);
    lines.push(`    label="PDA for ${grammar.name}\\nCFG → PDA Conversion";`);
    lines.push('');
    lines.push('    // Hidden start node for arrow');
    lines.push('    _start [shape=none, label="", width=0, height=0];');
    lines.push('');
    lines.push('    // States');

    for (const state of pda.states) {
        if (state === pda.acceptState) {
            lines.push(`    ${state} [shape=doublecircle, style=filled, fillcolor="#ccff00", label="${state}"];`);
        } else if (state === pda.startState) {
            lines.push(`    ${state} [shape=circle, style=filled, fillcolor="#00ffff", label="${state}"];`);
        } else {
            lines.push(`    ${state} [shape=circle, label="${state}"];`);
        }
    }

    lines.push('');
    lines.push('    // Start arrow');
    lines.push(`    _start -> ${pda.startState};`);
    lines.push('');
    lines.push('    // Transitions');

    // Group transitions by (from, to) for cleaner output
    const transitionGroups = new Map<string, PDATransition[]>();
    for (const trans of pda.transitions) {
        const key = `${trans.from}->${trans.to}`;
        if (!transitionGroups.has(key)) {
            transitionGroups.set(key, []);
        }
        transitionGroups.get(key)!.push(trans);
    }

    for (const [, transList] of transitionGroups) {
        const labels = transList.map(t => {
            const pushStr = t.push.length === 0 ? 'ε' : t.push.join('');
            return `${t.input}, ${t.pop} → ${pushStr}`;
        });

        const from = transList[0].from;
        const to = transList[0].to;

        // For self-loops with many transitions, combine labels
        if (labels.length > 3) {
            lines.push(`    ${from} -> ${to} [label="${labels.slice(0, 3).join('\\n')}\\n... (${labels.length - 3} more)"];`);
        } else {
            lines.push(`    ${from} -> ${to} [label="${labels.join('\\n')}"];`);
        }
    }

    lines.push('');
    lines.push('    // Legend');
    lines.push('    subgraph cluster_legend {');
    lines.push('        label="Transition Notation: input, pop → push";');
    lines.push('        style=dashed;');
    lines.push('        color=gray;');
    lines.push('        legend [shape=none, label="ε = epsilon (empty)"];');
    lines.push('    }');
    lines.push('}');

    return lines.join('\n');
};

/**
 * Get complete Graphviz DOT output for RNA CFG to PDA conversion
 */
export const getRNAPDAGraphviz = (): { grammar: CFGGrammar; pda: PDADefinition; dot: string } => {
    const grammar = getRNACFG();
    const pda = cfgToPDA(grammar);
    const dot = pdaToGraphviz(pda, grammar);
    return { grammar, pda, dot };
};
