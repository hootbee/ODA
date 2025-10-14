import React from 'react';
import styled from 'styled-components';
import { FaExternalLinkAlt } from 'react-icons/fa';

const LinkMessage = ({ url }) => {
    if (!url) return null;

    return (
        <LinkContainer>
            <h3><span role="img" aria-label="icon">🔗</span> 외부 링크</h3>
            <p>아래 링크를 클릭하여 <strong>서울 열린데이터 광장</strong>으로 이동하세요.</p>
            <LinkButton href={url} target="_blank" rel="noopener noreferrer">
                <FaExternalLinkAlt />
                <span>{url}</span>
            </LinkButton>
        </LinkContainer>
    );
};

export default LinkMessage;

const LinkContainer = styled.div`
    background: white;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    padding: 20px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    
    h3 {
        font-size: 1.4em;
        color: #1a202c;
        margin-top: 0;
        margin-bottom: 16px;
        border-bottom: 2px solid #f1f5f9;
        padding-bottom: 12px;
    }

    p {
        color: #4a5568;
        margin-bottom: 16px;
    }
`;

const LinkButton = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 8px;

    background-color: #ecf8ffff;
    color: #0099ffff;
    padding: 8px 14px;
    border-radius: 20px;
    text-decoration: none;
    font-weight: 500;
    border: 1px solid #ecf8ffff; 
    word-break: break-all;

    transition: all 0.2s ease-in-out;

    &:hover {
        background-color: #ecf8ffff;
        border-color: #b3e5fc;
        color: #005a9e;
        box-shadow: 0 1px 3px rgba(0, 122, 204, 0.1); /* 호버 시 은은한 그림자 */
    }
`;