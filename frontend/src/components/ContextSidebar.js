import React from 'react';
import styled from 'styled-components';
import { FaPlus, FaTimes } from 'react-icons/fa';

const SidebarContainer = styled.div`
  width: 250px;
  height: 100%;
  background: linear-gradient(150deg, #f4f8ff 0%, #a1ceffff 100%);
  border-right: 1px solid #e9ecef;
  padding: 1rem;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.h2`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  color: #343a40;
  padding: 0 0.5rem;
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
  padding: 0.8rem 1rem;
  margin-bottom: 0.8rem; 
  border-radius: 20px;
  transition: all 0.2s ease-in-out;
  
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);

  &:hover {
    background-color: #e9ecef;
    transform: translateY(-2px);
  }
  
  &.active {
    background: rgba(0, 128, 255, 0.6);
    color: white;
    box-shadow: 0 5px 20px rgba(59, 130, 246, 0.3);
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
  padding: 0.8rem;
  background: rgba(0, 13, 255, 0.6);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background-color: #000dcaff;
  }

  &:disabled {
    background-color: #rgba(160, 199, 255, 0.5);
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
                <FaTimes />
              </DeleteButton>
            )}
          </ContextItem>
        ))}
      </ContextList>
      <NewChatButton onClick={onNewChat} disabled={contexts.length >= 3}>
        <FaPlus size="0.8em" /> 새로운 대화
      </NewChatButton>
    </SidebarContainer>
  );
};

export default ContextSidebar;