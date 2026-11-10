export const DEFAULT_READING_ASSISTANT = {defaultReadingRate:0.5,slowReadingRate:0.4,feedbackAutoPlay:true};
export type ReadingAssistantSettings = typeof DEFAULT_READING_ASSISTANT;
let current = {...DEFAULT_READING_ASSISTANT};
export function setReadingAssistantSettings(value: Partial<ReadingAssistantSettings>) { current={...DEFAULT_READING_ASSISTANT,...value}; }
export function getReadingAssistantSettings() { return current; }
