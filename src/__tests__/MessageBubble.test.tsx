import React from 'react';
import { render } from '@testing-library/react';
import { MessageBubble } from '../components/MessageBubble';
import { CodeBlock } from '../types';

// Mocking CodeBlockComponent for testing purposes
jest.mock('../components/CodeBlock', () => ({ CodeBlockComponent: ({ block }: { block: CodeBlock }) => <pre>{block.code}</pre> }));

describe('parseCodeBlocks', () => {
    import { parseCodeBlocks } from '../components/MessageBubble';

    test('parses code blocks correctly', () => {
        const input = 'Here is some code:\n```js\nconsole.log(\"Hello, World!\");\n```\nAnd some text.';
        const expectedOutput = [
            'Here is some code:\n',
            { language: 'js', code: 'console.log(\"Hello, World!\");\n' },
            'And some text.'
        ];
        expect(parseCodeBlocks(input)).toEqual(expectedOutput);
    });
});

describe('MessageBubble', () => {
    test('renders message bubble correctly', () => {
        const message = { role: 'user', content: 'Hello!' };
        const { getByText } = render(<MessageBubble message={message} />);
        expect(getByText('You')).toBeInTheDocument();
        expect(getByText('Hello!')).toBeInTheDocument();
    });
});