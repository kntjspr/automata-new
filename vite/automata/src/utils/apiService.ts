/**
 * API Service for connecting to the C++ backend server
 * Endpoints mirror the Python Flask API at http://localhost:5000
 */

// API base URL - uses the C++ server running on port 5000
const API_BASE = 'http://localhost:5000/api';

export interface AnalyzeResponse {
    success: boolean;
    sequence?: string;
    length?: number;
    gcContent?: number;
    complement?: string;
    reverseComplement?: string;
    error?: string;
}

export interface MatchResult {
    start: number;
    end: number;
    text: string;
    distance: number;
    strand: 'forward' | 'reverse';
}

export interface MatchResponse {
    success: boolean;
    matches?: MatchResult[];
    count?: number;
    dfaStates?: number;
    matchType?: string;
    error?: string;
}

export interface HealthResponse {
    status: string;
    service: string;
    version: string;
}

/**
 * Check if the C++ API server is running
 */
export const checkHealth = async (): Promise<HealthResponse | null> => {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.warn('C++ API server not available:', error);
        return null;
    }
};

/**
 * Analyze a DNA sequence using the C++ backend
 */
export const analyzeSequence = async (sequence: string): Promise<AnalyzeResponse> => {
    try {
        const response = await fetch(`${API_BASE}/bio/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to connect to C++ API server' };
    }
};

/**
 * Find pattern matches using the C++ backend
 */
export const findMatchesAPI = async (
    sequence: string,
    pattern: string,
    maxDistance: number = 0,
    searchBothStrands: boolean = true
): Promise<MatchResponse> => {
    try {
        const response = await fetch(`${API_BASE}/bio/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sequence,
                pattern,
                maxDistance,
                searchBothStrands
            })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to connect to C++ API server' };
    }
};

/**
 * Helper to check if API is available (for hybrid mode)
 */
let apiAvailable: boolean | null = null;

export const isAPIAvailable = async (): Promise<boolean> => {
    if (apiAvailable !== null) return apiAvailable;
    const health = await checkHealth();
    apiAvailable = health !== null && health.status === 'healthy';
    return apiAvailable;
};

/**
 * Reset API availability check (useful after starting the server)
 */
export const resetAPICheck = (): void => {
    apiAvailable = null;
};

// ============ PDA API (RNA/XML Validation) ============

export interface PDAHistoryStep {
    state: string;
    symbol: string;
    stackAction: string;
    stack: string;
}

export interface RNAValidationResponse {
    success: boolean;
    accepted?: boolean;
    currentState?: string;
    stack?: string;
    error?: string | null;
    history?: PDAHistoryStep[];
}

export interface XMLTag {
    name: string;
    type: 'open' | 'close' | 'self-close';
    position: number;
}

export interface XMLValidationResponse {
    success: boolean;
    accepted?: boolean;
    currentState?: string;
    error?: string | null;
    tags?: XMLTag[];
    history?: PDAHistoryStep[];
}

/**
 * Validate RNA secondary structure using C++ PDA backend
 */
export const validateRNAAPI = async (structure: string): Promise<RNAValidationResponse> => {
    try {
        const response = await fetch(`${API_BASE}/pda/rna`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ structure })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to connect to C++ API server' };
    }
};

/**
 * Validate XML well-formedness using C++ PDA backend
 */
export const validateXMLAPI = async (xml: string): Promise<XMLValidationResponse> => {
    try {
        const response = await fetch(`${API_BASE}/pda/xml`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xml })
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to connect to C++ API server' };
    }
};
