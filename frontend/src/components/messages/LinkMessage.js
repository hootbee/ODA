import React from 'react';
import styled from 'styled-components';

const LinkMessage = ({ url }) => {
    if (!url) return null;

    return (
        <LinkContainer>
            <h3><span role="img" aria-label="icon">🔗</span> 외부 링크</h3>
            <p>아래 링크를 클릭하여 관련 페이지로 이동하세요.</p>
            <LinkButton href={url} target="_blank" rel="noopener noreferrer">
                {url}
            </LinkButton>
        </LinkContainer>
    );
};

export default LinkMessage;

const LinkContainer = styled.div`
  background: white;
  border-radius: 16px;
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
  display: inline-block;
  background-color: #4299e1;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3182ce;
  }
`;
