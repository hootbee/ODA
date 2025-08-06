import React from 'react';
import styled from 'styled-components';

const SidebarContainer = styled.div`
  width: 250px;
  height: 100%;
  background-color: #f8f9fa;
  border-right: 1px solid #e9ecef;
  padding: 1rem;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.h2`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  color: #343a40;
`;

const ContextList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ContextItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 5px;
  background-color: #fff;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #e9ecef;
    transform: translateY(-2px);
  }
  
  &.active {
    background-color: #007bff;
    color: white;
    border-color: #007bff;
  }
`;

const ContextTitle = styled.span`
  flex-grow: 1;
  cursor: pointer;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1rem;
  cursor: pointer;
  margin-left: 10px;
  padding: 0 5px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s, color 0.2s;

  &:hover {
    opacity: 1;
    color: #c82333;
  }

  ${ContextItem}.active & {
    color: white;
    &:hover {
      color: #ffc107; /* A lighter color for hover on active item */
    }
  }
`;

const NewChatButton = styled.button`
  margin-top: auto;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #a0c7ff;
    cursor: not-allowed;
  }
`;

const ContextSidebar = ({ contexts, activeContextId, onNewChat, onSwitchContext, onDeleteContext }) => {
  return (
    <SidebarContainer>
      <SidebarHeader>대화 목록</SidebarHeader>
      <ContextList>
        {contexts.map((context) => (
          <ContextItem 
            key={context.id}
            className={activeContextId === context.id ? 'active' : ''}
          >
            <ContextTitle onClick={() => onSwitchContext(context.id)}>
              {context.title}
            </ContextTitle>
            {context.id !== null && ( // '새 대화'는 삭제 버튼 없음
              <DeleteButton onClick={(e) => {
                e.stopPropagation(); // Prevent onSwitchContext from firing
                onDeleteContext(context.id);
              }}>
                X
              </DeleteButton>
            )}
          </ContextItem>
        ))}
      </ContextList>
      <NewChatButton onClick={onNewChat} disabled={contexts.length >= 3}>
        + 새 대화 시작하기
      </NewChatButton>
    </SidebarContainer>
  );
};

export default ContextSidebar;