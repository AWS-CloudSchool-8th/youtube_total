import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { colors } from '../../styles/colors';
import { apiService } from '../../config/api';
import { Routes, Route, Link } from 'react-router-dom';

const ChatContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background: ${colors.bgLight};
  border-radius: 18px;
  border: 2px solid ${colors.primary};
  box-shadow: 0 4px 20px 0 ${colors.navyDark}44;
  display: flex;
  flex-direction: column;
  height: 600px;
  color: ${colors.white};
`;

const ChatHeader = styled.div`
  padding: 20px 20px 12px 20px;
  border-bottom: 1px solid ${colors.gray};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;

const ChatTitle = styled.h2`
  color: ${colors.white};
  margin: 0;
  font-size: 1.3rem;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  /* 커스텀 스크롤바 */
  scrollbar-width: thin;
  scrollbar-color: #ff69b4 #222;

  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #ff69b4;
    border-radius: 6px;
    min-height: 40px;
  }
  &::-webkit-scrollbar-track {
    background: #222;
    border-radius: 6px;
  }
`;

const Message = styled.div`
  display: flex;
  justify-content: ${props => props.isUser ? 'flex-end' : 'flex-start'};
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background: ${props => props.isUser ? colors.primary : colors.bgDark};
  color: ${colors.white};
  font-size: 0.95rem;
  line-height: 1.4;
  word-wrap: break-word;
  
  ${props => !props.isUser && `
    border: 1px solid ${colors.gray};
  `}
`;

const InputContainer = styled.div`
  padding: 20px;
  border-top: 1px solid ${colors.gray};
  display: flex;
  gap: 10px;
`;

const MessageInput = styled.input`
  flex: 1;
  background: ${colors.bgDark};
  border: 1px solid ${colors.gray};
  border-radius: 12px;
  padding: 12px 16px;
  color: ${colors.white};
  font-size: 1rem;
  outline: none;
  
  &:focus {
    border-color: ${colors.primary};
  }
  
  &::placeholder {
    color: ${colors.gray};
  }
`;

const SendButton = styled.button`
  background: ${colors.primary};
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  color: ${colors.white};
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
  
  &:hover {
    background: #4a90e2;
  }
  
  &:disabled {
    background: ${colors.gray};
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  text-align: center;
  color: ${colors.gray};
  font-size: 0.9rem;
  margin: 10px 0;
`;

const BedrockChat = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '안녕하세요! YouTube 동영상에 대해 질문해주세요. 먼저 YouTube URL을 처리해주시면 더 정확한 답변을 드릴 수 있습니다.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // 메시지 목록 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 채팅 히스토리 로드 - 비활성화 (DB 저장 불필요)
  // useEffect(() => {
  //   loadChatHistory();
  // }, []);

  const loadChatHistory = async () => {
    try {
      const response = await apiService.getChatHistory();
      if (response.messages && response.messages.length > 0) {
        setMessages(response.messages);
      } else {
        // 초기 환영 메시지
        setMessages([
          {
            role: 'assistant',
            content: '안녕하세요! YouTube 동영상에 대해 질문해주세요. 먼저 YouTube URL을 처리해주시면 더 정확한 답변을 드릴 수 있습니다.',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('채팅 히스토리 로드 실패:', err);
      setMessages([
        {
          role: 'assistant',
          content: '안녕하세요! YouTube 동영상에 대해 질문해주세요.',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.askBedrockChatbot(inputValue.trim());
      
      if (response.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.answer,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || '응답 생성에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message);
      const errorMessage = {
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await apiService.clearChatHistory();
      setMessages([
        {
          role: 'assistant',
          content: '대화가 초기화되었습니다. 새로운 질문을 해주세요!',
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('채팅 초기화 실패:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
          <ChatTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span role="img" aria-label="chatbot">🤖</span> Bedrock 챗봇
          </ChatTitle>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', marginLeft: 12, cursor: 'pointer' }} title="닫기">×</button>
          )}
        </div>
      </ChatHeader>
      
      <MessagesContainer>
        {messages.map((message, index) => (
          <Message key={index} isUser={message.role === 'user'}>
            <MessageBubble isUser={message.role === 'user'}>
              {message.content.split('\n').map((line, i) => (
                <div key={i}>
                  {line}
                  {i < message.content.split('\n').length - 1 && <br />}
                </div>
              ))}
            </MessageBubble>
          </Message>
        ))}
        
        {loading && (
          <Message isUser={false}>
            <MessageBubble isUser={false}>
              💭 생각 중입니다...
            </MessageBubble>
          </Message>
        )}
        
        {error && (
          <StatusMessage style={{ color: colors.error }}>
            ⚠️ {error}
          </StatusMessage>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <MessageInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="질문을 입력하세요..."
          disabled={loading}
        />
        <SendButton onClick={sendMessage} disabled={loading || !inputValue.trim()}>
          전송
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default BedrockChat; 