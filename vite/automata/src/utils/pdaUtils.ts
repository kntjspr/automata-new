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

// ============ Example Data ============
export const RNA_EXAMPLES = [
    { name: 'Simple Hairpin', structure: '((((....))))' },
    { name: 'Stem Loop', structure: '((((.....))))' },
    { name: 'Multi-loop', structure: '(((...)))...(((...)))' },
    { name: 'Invalid - Unbalanced', structure: '(((.....))' },
    { name: 'Invalid - Wrong Order', structure: '))(((' },
    { name: 'Pseudoknot Attempt', structure: '(([..))]' }
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
