import { useState } from "react";
import type { CodeBlock } from "../../types";
import './CodeBlock.css';

type CodeBlockProps = {
    block: CodeBlock;
};

export function CodeBlockComponent({ block }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(block.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block-wrapper">
            <div className="code-block-header">
                <span className="code-language">{block.language}</span>
                <div className="code-actions">
                    <button onClick={handleCopy} className="code-btn">
                        {copied ? "✓ Copied" : "📋 Copy"}
                    </button>
                </div>
            </div>
            <pre className="code-block">
                <code>{block.code}</code>
            </pre>
        </div>
    );
}
