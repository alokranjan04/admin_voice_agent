import React from 'react';

/**
 * Utility functions for formatting assistant messages
 * Handles lists, paragraphs, and structured content
 */

export interface FormattedMessage {
    type: 'paragraph' | 'list' | 'mixed';
    content: string | string[];
    listType?: 'numbered' | 'bulleted';
}

/**
 * Detects if text contains a numbered list
 */
const hasNumberedList = (text: string): boolean => {
    return /^\s*\d+[\.)]\s+/m.test(text);
};

/**
 * Detects if text contains a bulleted list
 */
const hasBulletedList = (text: string): boolean => {
    return /^\s*[-*•]\s+/m.test(text);
};

/**
 * Parses numbered list from text
 */
const parseNumberedList = (text: string): string[] => {
    const lines = text.split('\n');
    const items: string[] = [];
    let currentItem = '';

    for (const line of lines) {
        const match = line.match(/^\s*\d+[\.)]\s+(.+)$/);
        if (match) {
            if (currentItem) items.push(currentItem.trim());
            currentItem = match[1];
        } else if (line.trim() && currentItem) {
            currentItem += ' ' + line.trim();
        } else if (line.trim() && !currentItem) {
            // Text before list starts
            items.push(line.trim());
        }
    }
    if (currentItem) items.push(currentItem.trim());

    return items.filter(item => item.length > 0);
};

/**
 * Parses bulleted list from text
 */
const parseBulletedList = (text: string): string[] => {
    const lines = text.split('\n');
    const items: string[] = [];
    let currentItem = '';

    for (const line of lines) {
        const match = line.match(/^\s*[-*•]\s+(.+)$/);
        if (match) {
            if (currentItem) items.push(currentItem.trim());
            currentItem = match[1];
        } else if (line.trim() && currentItem) {
            currentItem += ' ' + line.trim();
        } else if (line.trim() && !currentItem) {
            // Text before list starts
            items.push(line.trim());
        }
    }
    if (currentItem) items.push(currentItem.trim());

    return items.filter(item => item.length > 0);
};

/**
 * Formats assistant message text into structured content
 */
export const formatMessage = (text: string): FormattedMessage => {
    if (!text || !text.trim()) {
        return { type: 'paragraph', content: '' };
    }

    // Check for lists
    if (hasNumberedList(text)) {
        const items = parseNumberedList(text);
        return {
            type: 'list',
            content: items,
            listType: 'numbered'
        };
    }

    if (hasBulletedList(text)) {
        const items = parseBulletedList(text);
        return {
            type: 'list',
            content: items,
            listType: 'bulleted'
        };
    }

    // Check for multiple paragraphs (double line breaks)
    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

    if (paragraphs.length > 1) {
        return {
            type: 'mixed',
            content: paragraphs
        };
    }

    // Single paragraph
    return {
        type: 'paragraph',
        content: text.trim()
    };
};

/**
 * Renders formatted message as React component
 */
export const renderFormattedMessage = (formatted: FormattedMessage): React.ReactElement => {
    if (formatted.type === 'paragraph') {
        return <p className="text-slate-700 leading-relaxed">{formatted.content as string}</p>;
    }

    if (formatted.type === 'list') {
        const items = formatted.content as string[];
        const ListTag = formatted.listType === 'numbered' ? 'ol' : 'ul';
        const listClass = formatted.listType === 'numbered'
            ? 'list-decimal list-inside space-y-2 text-slate-700'
            : 'list-disc list-inside space-y-2 text-slate-700';

        return (
            <ListTag className={listClass}>
                {items.map((item, index) => (
                    <li key={index} className="leading-relaxed">
                        {item}
                    </li>
                ))}
            </ListTag>
        );
    }

    if (formatted.type === 'mixed') {
        const paragraphs = formatted.content as string[];
        return (
            <div className="space-y-3">
                {paragraphs.map((para, index) => (
                    <p key={index} className="text-slate-700 leading-relaxed">
                        {para}
                    </p>
                ))}
            </div>
        );
    }

    return <p className="text-slate-700">{String(formatted.content)}</p>;
};
