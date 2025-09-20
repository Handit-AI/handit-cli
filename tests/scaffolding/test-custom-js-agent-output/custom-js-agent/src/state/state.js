/**
 * State definition for Custom JS Agent LangGraph
 */

import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

const AgentState = Annotation.Root({
    input: Annotation,
    messages: Annotation,
    context: Annotation,
    results: Annotation,
    currentStage: Annotation,
    error: Annotation,
    metadata: Annotation,
});

function createInitialState(inputData, options = {}) {
    /**
     * Create initial state for the graph.
     * 
     * @param {any} inputData - Initial input data
     * @param {object} options - Additional state parameters
     * @returns {object} Initial agent state
     */
    return {
        input: inputData,
        messages: [new HumanMessage(String(inputData))],
        context: options.context || {},
        results: options.results || {},
        currentStage: options.currentStage || null,
        error: options.error || null,
        metadata: options.metadata || {},
    };
}

function updateState(currentState, updates = {}) {
    /**
     * Update the current state with new values.
     * 
     * @param {object} currentState - Current state
     * @param {object} updates - State updates
     * @returns {object} Updated state
     */
    return {
        input: updates.input !== undefined ? updates.input : currentState.input,
        messages: updates.messages !== undefined ? updates.messages : currentState.messages,
        context: updates.context !== undefined ? updates.context : currentState.context,
        results: updates.results !== undefined ? updates.results : currentState.results,
        currentStage: updates.currentStage !== undefined ? updates.currentStage : currentState.currentStage,
        error: updates.error !== undefined ? updates.error : currentState.error,
        metadata: updates.metadata !== undefined ? updates.metadata : currentState.metadata,
    };
}

function getStageResult(state, stage) {
    /**
     * Get result from a specific stage.
     * 
     * @param {AgentState} state - Current state
     * @param {string} stage - Stage name
     * @returns {any} Stage result or null
     */
    return state.results[stage] || null;
}

function setStageResult(state, stage, result) {
    /**
     * Set result for a specific stage.
     * 
     * @param {AgentState} state - Current state
     * @param {string} stage - Stage name
     * @param {any} result - Stage result
     * @returns {AgentState} Updated state
     */
    const updatedResults = { ...state.results };
    updatedResults[stage] = result;
    
    return updateState(state, { results: updatedResults });
}

function addMessage(state, message) {
    /**
     * Add a message to the conversation.
     * 
     * @param {AgentState} state - Current state
     * @param {BaseMessage} message - Message to add
     * @returns {AgentState} Updated state
     */
    const updatedMessages = [...state.messages, message];
    return updateState(state, { messages: updatedMessages });
}

function setError(state, error) {
    /**
     * Set error in the state.
     * 
     * @param {AgentState} state - Current state
     * @param {string} error - Error message
     * @returns {AgentState} Updated state
     */
    return updateState(state, { error });
}

function clearError(state) {
    /**
     * Clear error from the state.
     * 
     * @param {AgentState} state - Current state
     * @returns {AgentState} Updated state
     */
    return updateState(state, { error: null });
}

export {
    AgentState,
    createInitialState,
    updateState,
    getStageResult,
    setStageResult,
    addMessage,
    setError,
    clearError
};
