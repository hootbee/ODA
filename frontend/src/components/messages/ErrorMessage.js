import React from 'react';
import styled from 'styled-components';

const ErrorMessage = ({ children }) => (
    <StyledError>{children}</StyledError>
);

export default ErrorMessage;

const StyledError = styled.div`
    background-color: #fff0f0;
    color: #c53030;
    padding: 10px 15px;
    border-radius: 15px;
    border: 1px solid #fdb8b8;
`;
