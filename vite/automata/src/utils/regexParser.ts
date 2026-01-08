/**
 * Regex Parser for NFA Visualization
 * Parses regex patterns into an Abstract Syntax Tree (AST) for visualization
 */

export type NodeType =
    | 'char'
    | 'epsilon'
    | 'union'
    | 'concat'
    | 'star'
    | 'plus'
    | 'optional'
    | 'group'
    | 'charClass'
    | 'any'
    | 'startAnchor'
    | 'endAnchor'
    | 'repeatN';

export interface ASTNode {
    type: NodeType;
    value?: string;          // For char nodes
    charClass?: string[];    // For charClass nodes
    children?: ASTNode[];    // For composite nodes
    minRepeat?: number;      // For repeatN
    maxRepeat?: number;      // For repeatN (-1 = unlimited)
}

/**
 * Represents an NFA state for visualization
 */
export interface NFAState {
    id: number;
    label: string;
    isStart: boolean;
    isAccept: boolean;
    x?: number;
    y?: number;
}

/**
 * Represents an NFA transition for visualization
 */
export interface NFATransition {
    from: number;
    to: number;
    symbol: string;  // character, 'ε' for epsilon, or description
    isEpsilon: boolean;
}

/**
 * NFA structure for visualization
 */
export interface NFAGraph {
    states: NFAState[];
    transitions: NFATransition[];
    startState: number;
    acceptStates: number[];
}

class RegexParser {
    private pattern: string;
    private pos: number;

    constructor(pattern: string) {
        this.pattern = pattern;
        this.pos = 0;
    }

    parse(): ASTNode {
        if (this.pattern.length === 0) {
            return { type: 'epsilon' };
        }
        const result = this.parseUnion();
        if (!this.isAtEnd()) {
            throw new Error(`Unexpected character at position ${this.pos}: ${this.peek()}`);
        }
        return result;
    }

    private parseUnion(): ASTNode {
        let left = this.parseConcat();

        while (this.match('|')) {
            const right = this.parseConcat();
            left = {
                type: 'union',
                children: [left, right]
            };
        }

        return left;
    }

    private parseConcat(): ASTNode {
        const parts: ASTNode[] = [];

        while (!this.isAtEnd() && this.peek() !== '|' && this.peek() !== ')') {
            parts.push(this.parseRepeat());
        }

        if (parts.length === 0) {
            return { type: 'epsilon' };
        }

        if (parts.length === 1) {
            return parts[0];
        }

        // Build left-associative concat tree
        let result = parts[0];
        for (let i = 1; i < parts.length; i++) {
            result = {
                type: 'concat',
                children: [result, parts[i]]
            };
        }

        return result;
    }

    private parseRepeat(): ASTNode {
        let base = this.parseAtom();

        while (!this.isAtEnd()) {
            const c = this.peek();
            if (c === '*') {
                this.advance();
                base = { type: 'star', children: [base] };
            } else if (c === '+') {
                this.advance();
                base = { type: 'plus', children: [base] };
            } else if (c === '?') {
                this.advance();
                base = { type: 'optional', children: [base] };
            } else if (c === '{') {
                const quantifier = this.parseCountedQuantifier();
                if (quantifier) {
                    base = {
                        type: 'repeatN',
                        children: [base],
                        minRepeat: quantifier.min,
                        maxRepeat: quantifier.max
                    };
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        return base;
    }

    private parseAtom(): ASTNode {
        if (this.isAtEnd()) {
            return { type: 'epsilon' };
        }

        const c = this.peek();

        if (c === '(') {
            this.advance();
            const inner = this.parseUnion();
            if (!this.match(')')) {
                throw new Error('Missing closing parenthesis');
            }
            return { type: 'group', children: [inner] };
        }

        if (c === '[') {
            return this.parseCharClass();
        }

        if (c === '.') {
            this.advance();
            return { type: 'any' };
        }

        if (c === '^') {
            this.advance();
            return { type: 'startAnchor' };
        }

        if (c === '$') {
            this.advance();
            return { type: 'endAnchor' };
        }

        if (c === '\\') {
            this.advance();
            if (this.isAtEnd()) {
                throw new Error('Escape at end of pattern');
            }
            const escaped = this.advance();
            return { type: 'char', value: escaped };
        }

        // Check for metacharacters that shouldn't appear here
        if ('|)*+?{}'.includes(c)) {
            throw new Error(`Unexpected metacharacter: ${c}`);
        }

        this.advance();
        return { type: 'char', value: c };
    }

    private parseCharClass(): ASTNode {
        this.advance(); // consume '['
        const chars: string[] = [];
        let negate = false;

        if (this.peek() === '^') {
            negate = true;
            this.advance();
        }

        while (!this.isAtEnd() && this.peek() !== ']') {
            const start = this.advance();
            if (this.peek() === '-' && this.pos + 1 < this.pattern.length && this.pattern[this.pos + 1] !== ']') {
                this.advance(); // consume '-'
                const end = this.advance();
                // Add range
                for (let code = start.charCodeAt(0); code <= end.charCodeAt(0); code++) {
                    chars.push(String.fromCharCode(code));
                }
            } else {
                chars.push(start);
            }
        }

        if (!this.match(']')) {
            throw new Error('Missing closing bracket');
        }

        return { type: 'charClass', charClass: chars, value: negate ? '^' : '' };
    }

    private parseCountedQuantifier(): { min: number; max: number } | null {
        const startPos = this.pos;

        if (this.peek() !== '{') return null;
        this.advance();

        const min = this.parseNumber();
        if (min === null) {
            this.pos = startPos;
            return null;
        }

        if (this.peek() === '}') {
            this.advance();
            return { min, max: min };
        }

        if (this.peek() === ',') {
            this.advance();
            if (this.peek() === '}') {
                this.advance();
                return { min, max: -1 };
            }
            const max = this.parseNumber();
            if (max === null || this.peek() !== '}') {
                this.pos = startPos;
                return null;
            }
            this.advance();
            return { min, max };
        }

        this.pos = startPos;
        return null;
    }

    private parseNumber(): number | null {
        let num = 0;
        let hasDigit = false;

        while (!this.isAtEnd() && /\d/.test(this.peek())) {
            hasDigit = true;
            num = num * 10 + parseInt(this.advance(), 10);
        }

        return hasDigit ? num : null;
    }

    private peek(): string {
        return this.pattern[this.pos] || '\0';
    }

    private advance(): string {
        return this.pattern[this.pos++];
    }

    private match(c: string): boolean {
        if (this.peek() === c) {
            this.advance();
            return true;
        }
        return false;
    }

    private isAtEnd(): boolean {
        return this.pos >= this.pattern.length;
    }
}

/**
 * Build NFA graph from AST for visualization
 */
class NFABuilder {
    private stateCounter = 0;
    private states: NFAState[] = [];
    private transitions: NFATransition[] = [];

    buildFromAST(ast: ASTNode): NFAGraph {
        const { start, accept } = this.build(ast);

        this.states[start].isStart = true;
        this.states[accept].isAccept = true;

        return {
            states: this.states,
            transitions: this.transitions,
            startState: start,
            acceptStates: [accept]
        };
    }

    private newState(label?: string): number {
        const id = this.stateCounter++;
        this.states.push({
            id,
            label: label || `q${id}`,
            isStart: false,
            isAccept: false
        });
        return id;
    }

    private addTransition(from: number, to: number, symbol: string, isEpsilon: boolean = false) {
        this.transitions.push({ from, to, symbol, isEpsilon });
    }

    private build(node: ASTNode): { start: number; accept: number } {
        switch (node.type) {
            case 'epsilon': {
                const s = this.newState();
                const f = this.newState();
                this.addTransition(s, f, 'ε', true);
                return { start: s, accept: f };
            }

            case 'char': {
                const s = this.newState();
                const f = this.newState();
                this.addTransition(s, f, node.value || '?');
                return { start: s, accept: f };
            }

            case 'any': {
                const s = this.newState();
                const f = this.newState();
                this.addTransition(s, f, '.');
                return { start: s, accept: f };
            }

            case 'charClass': {
                const s = this.newState();
                const f = this.newState();
                const label = node.value === '^'
                    ? `[^${(node.charClass || []).slice(0, 3).join('')}...]`
                    : `[${(node.charClass || []).slice(0, 4).join('')}${(node.charClass?.length || 0) > 4 ? '...' : ''}]`;
                this.addTransition(s, f, label);
                return { start: s, accept: f };
            }

            case 'startAnchor':
            case 'endAnchor': {
                const s = this.newState();
                const f = this.newState();
                this.addTransition(s, f, node.type === 'startAnchor' ? '^' : '$', true);
                return { start: s, accept: f };
            }

            case 'union': {
                const s = this.newState();
                const f = this.newState();

                for (const child of node.children || []) {
                    const { start: childStart, accept: childAccept } = this.build(child);
                    this.addTransition(s, childStart, 'ε', true);
                    this.addTransition(childAccept, f, 'ε', true);
                }

                return { start: s, accept: f };
            }

            case 'concat': {
                const children = node.children || [];
                if (children.length === 0) {
                    return this.build({ type: 'epsilon' });
                }

                let { start, accept: prev } = this.build(children[0]);

                for (let i = 1; i < children.length; i++) {
                    const { start: nextStart, accept: nextAccept } = this.build(children[i]);
                    this.addTransition(prev, nextStart, 'ε', true);
                    prev = nextAccept;
                }

                return { start, accept: prev };
            }

            case 'star': {
                const s = this.newState();
                const f = this.newState();
                const child = node.children?.[0];

                if (child) {
                    const { start: childStart, accept: childAccept } = this.build(child);
                    this.addTransition(s, childStart, 'ε', true);
                    this.addTransition(s, f, 'ε', true);
                    this.addTransition(childAccept, childStart, 'ε', true);
                    this.addTransition(childAccept, f, 'ε', true);
                }

                return { start: s, accept: f };
            }

            case 'plus': {
                const s = this.newState();
                const f = this.newState();
                const child = node.children?.[0];

                if (child) {
                    const { start: childStart, accept: childAccept } = this.build(child);
                    this.addTransition(s, childStart, 'ε', true);
                    this.addTransition(childAccept, childStart, 'ε', true);
                    this.addTransition(childAccept, f, 'ε', true);
                }

                return { start: s, accept: f };
            }

            case 'optional': {
                const s = this.newState();
                const f = this.newState();
                const child = node.children?.[0];

                if (child) {
                    const { start: childStart, accept: childAccept } = this.build(child);
                    this.addTransition(s, childStart, 'ε', true);
                    this.addTransition(s, f, 'ε', true);
                    this.addTransition(childAccept, f, 'ε', true);
                }

                return { start: s, accept: f };
            }

            case 'group': {
                const child = node.children?.[0];
                if (child) {
                    return this.build(child);
                }
                return this.build({ type: 'epsilon' });
            }

            case 'repeatN': {
                const min = node.minRepeat || 0;
                const max = node.maxRepeat ?? min;
                const child = node.children?.[0];

                if (!child) {
                    return this.build({ type: 'epsilon' });
                }

                // Build: min required copies + (max-min) optional copies (or star if unlimited)
                let current = this.build({ type: 'epsilon' });

                // Required copies
                for (let i = 0; i < min; i++) {
                    const copy = this.build(child);
                    this.addTransition(current.accept, copy.start, 'ε', true);
                    current = { start: current.start, accept: copy.accept };
                }

                if (max === -1) {
                    // Unlimited: add star
                    const star = this.build({ type: 'star', children: [child] });
                    this.addTransition(current.accept, star.start, 'ε', true);
                    current = { start: current.start, accept: star.accept };
                } else {
                    // Optional copies
                    for (let i = min; i < max; i++) {
                        const opt = this.build({ type: 'optional', children: [child] });
                        this.addTransition(current.accept, opt.start, 'ε', true);
                        current = { start: current.start, accept: opt.accept };
                    }
                }

                return current;
            }

            default:
                return this.build({ type: 'epsilon' });
        }
    }
}

/**
 * Parse a regex pattern and build an NFA graph for visualization
 */
export function parseRegexToNFA(pattern: string): NFAGraph | null {
    try {
        const parser = new RegexParser(pattern);
        const ast = parser.parse();
        const builder = new NFABuilder();
        return builder.buildFromAST(ast);
    } catch (e) {
        console.error('Failed to parse regex:', e);
        return null;
    }
}

/**
 * Get a simplified description of the pattern for display
 */
export function describePattern(pattern: string): string[] {
    const parts: string[] = [];

    // Remove anchors for description
    let p = pattern;
    if (p.startsWith('^')) {
        parts.push('^ (start)');
        p = p.substring(1);
    }
    if (p.endsWith('$')) {
        parts.push('$ (end)');
        p = p.substring(0, p.length - 1);
    }

    // Very simple tokenization for display
    let i = 0;
    while (i < p.length) {
        const c = p[i];

        if (c === '(') {
            // Find matching )
            let depth = 1;
            let j = i + 1;
            while (j < p.length && depth > 0) {
                if (p[j] === '(') depth++;
                if (p[j] === ')') depth--;
                j++;
            }
            const group = p.substring(i, j);
            // Check for quantifier after
            if (j < p.length && '*+?{'.includes(p[j])) {
                let quant = p[j];
                j++;
                if (quant === '{') {
                    while (j < p.length && p[j] !== '}') j++;
                    if (j < p.length) j++;
                    quant = p.substring(p.indexOf('{', i), j);
                }
                parts.push(`${group}${quant}`);
            } else {
                parts.push(group);
            }
            i = j;
        } else if (c === '[') {
            let j = i + 1;
            while (j < p.length && p[j] !== ']') j++;
            if (j < p.length) j++;
            const charClass = p.substring(i, j);
            // Check for quantifier
            if (j < p.length && '*+?{'.includes(p[j])) {
                let quant = p[j];
                j++;
                if (quant === '{') {
                    while (j < p.length && p[j] !== '}') j++;
                    if (j < p.length) j++;
                    quant = p.substring(p.indexOf('{', i), j);
                }
                parts.push(`${charClass}${quant}`);
            } else {
                parts.push(charClass);
            }
            i = j;
        } else if (c === '|') {
            parts.push('|');
            i++;
        } else {
            // Regular character, possibly with quantifier
            let char = c;
            i++;
            if (i < p.length && '*+?{'.includes(p[i])) {
                let quant = p[i];
                i++;
                if (quant === '{') {
                    const start = i - 1;
                    while (i < p.length && p[i] !== '}') i++;
                    if (i < p.length) i++;
                    quant = p.substring(start, i);
                }
                parts.push(`${char}${quant}`);
            } else {
                parts.push(char);
            }
        }
    }

    return parts;
}

export { RegexParser, NFABuilder };
