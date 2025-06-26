import React, { useState, useRef, useEffect, useCallback } from 'react';
import AuroraBackground from './AuroraBackground';
import TopBar from './TopBar';
import Footer from './Footer';
import { colors } from '../styles/colors';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import BedrockChat from './BedrockChat';
import styled from 'styled-components';

const EditorLayout = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  width: 100vw;
  min-height: 100vh;
  background: #000;
  position: relative;
`;

const EditorMain = styled.div`
  flex: 1 1 0;
  max-width: ${({ showChatbot }) => (showChatbot ? 'calc(100vw - 420px)' : '900px')};
  transition: max-width 0.3s cubic-bezier(0.4,0,0.2,1);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SidePanel = styled.div`
  width: 420px;
  height: 100vh;
  background: #181a20;
  box-shadow: -4px 0 24px rgba(0,0,0,0.25);
  z-index: 1200;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.4,0,0.2,1);
  position: relative;

  @keyframes slideInRight {
    from { transform: translateX(440px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.7rem;
  cursor: pointer;
  z-index: 1300;
`;

const FloatingChatbotButton = styled.button`
  position: absolute;
  bottom: 40px;
  right: 40px;
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: background 0.2s;
  &:hover {
    background: #357ab8;
  }
`;

const ChatbotButton = styled.button`
  position: fixed;
  bottom: 36px;
  right: 36px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #4a90e2;
  color: #fff;
  border: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2000;
  transition: background 0.2s;
  &:hover {
    background: #357ab8;
  }
`;

const ChatbotModal = styled.div`
  position: fixed;
  bottom: 110px;
  right: 36px;
  width: 390px;
  max-width: 95vw;
  height: 560px;
  background: #181a20;
  border-radius: 22px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  z-index: 2100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChatbotModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 10px 22px;
  background: transparent;
  border-bottom: 1px solid #222;
`;

const ChatbotModalTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
`;

const ChatbotModalClose = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  margin-left: 10px;
`;

const FixedNotionEditor = () => {
  const location = useLocation();
  const [blocks, setBlocks] = useState([
    { id: 'intro', type: 'heading1', content: '', placeholder: '제목을 입력하세요...' },
    { id: 'desc', type: 'paragraph', content: '', placeholder: '내용을 입력하세요...' }
  ]);
  
  const [focusedBlock, setFocusedBlock] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectionInfo, setSelectionInfo] = useState({ blockId: null, range: null });
  const [showChatbot, setShowChatbot] = useState(false);

  const editorRefs = useRef({});
  const isComposing = useRef(false);

  const detectMarkdownAndConvert = useCallback((text, blockId) => {
    if (!text || isComposing.current) return false;

    if (text === '# ') {
      updateBlockType(blockId, 'heading1', '');
      return true;
    }
    if (text === '## ') {
      updateBlockType(blockId, 'heading2', '');
      return true;
    }
    if (text === '### ') {
      updateBlockType(blockId, 'heading3', '');
      return true;
    }
    if (text === '- ') {
      updateBlockType(blockId, 'bullet', '');
      return true;
    }
    if (text.match(/^\d+\. $/)) {
      updateBlockType(blockId, 'numbered', '');
      return true;
    }
    if (text === '- [ ] ') {
      updateBlockType(blockId, 'checkbox', '', false);
      return true;
    }
    if (text === '- [x] ') {
      updateBlockType(blockId, 'checkbox', '', true);
      return true;
    }
    if (text === '> ') {
      updateBlockType(blockId, 'quote', '');
      return true;
    }
    if (text === '```') {
      updateBlockType(blockId, 'code', '');
      return true;
    }
    
    // YouTube 링크 감지
    if (text.startsWith('https://www.youtube.com/watch') || text.startsWith('https://youtu.be/')) {
      updateBlockType(blockId, 'youtube', text);
      return true;
    }

    return false;
  }, []);

  const updateBlockType = useCallback((blockId, newType, newContent, checked = false) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId 
          ? { ...block, type: newType, content: newContent, checked }
          : block
      )
    );
    
    setTimeout(() => {
      const element = editorRefs.current[blockId];
      if (element) {
        element.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 0);
  }, []);

  const updateBlockContent = useCallback((blockId, newContent) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId 
          ? { ...block, content: newContent }
          : block
      )
    );
  }, []);

  const addNewBlock = useCallback((afterBlockId) => {
    const newBlockId = 'block_' + Date.now();
    const blockIndex = blocks.findIndex(b => b.id === afterBlockId);
    
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, {
      id: newBlockId,
      type: 'paragraph',
      content: '',
      placeholder: '내용을 입력하세요...'
    });
    
    setBlocks(newBlocks);
    
    setTimeout(() => {
      const element = editorRefs.current[newBlockId];
      if (element) element.focus();
    }, 10);
  }, [blocks]);

  const deleteBlock = useCallback((blockId) => {
    if (blocks.length <= 1) return;
    
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    const newBlocks = blocks.filter(b => b.id !== blockId);
    setBlocks(newBlocks);
    
    const prevBlock = newBlocks[Math.max(0, blockIndex - 1)];
    if (prevBlock) {
      setTimeout(() => {
        const element = editorRefs.current[prevBlock.id];
        if (element) element.focus();
      }, 10);
    }
  }, [blocks]);

  const handleKeyDown = useCallback((e, blockId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNewBlock(blockId);
    }
    
    if (e.key === 'Backspace') {
      const element = e.target;
      if (element.textContent === '') {
        e.preventDefault();
        deleteBlock(blockId);
      }
    }
  }, [addNewBlock, deleteBlock]);

  const handleInput = useCallback((e, blockId) => {
    if (isComposing.current) return;
    
    const element = e.target;
    const textContent = element.textContent || '';
    const htmlContent = element.innerHTML || '';
    
    if (detectMarkdownAndConvert(textContent, blockId)) {
      return;
    }
    
    // HTML 내용으로 상태 업데이트 (스타일 유지)
    const currentBlock = blocks.find(b => b.id === blockId);
    if (currentBlock && currentBlock.content !== htmlContent) {
      updateBlockContent(blockId, htmlContent);
    }
  }, [detectMarkdownAndConvert, updateBlockContent, blocks]);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();

    if (selectedText.length > 0) {
      let blockId = null;
      for (const [id, ref] of Object.entries(editorRefs.current)) {
        if (ref && ref.contains(range.commonAncestorContainer)) {
          blockId = id;
          break;
        }
      }

      if (blockId) {
        setSelectionInfo({ blockId, range: range.cloneRange() });
        
        const rect = range.getBoundingClientRect();
        const x = rect.left + (rect.width / 2);
        const y = rect.top - 60;
        
        setToolbarPosition({ x, y });
        setShowToolbar(true);
      }
    } else {
      setShowToolbar(false);
    }
  }, []);

  const applyStyleToSelection = useCallback((command) => {
    if (!selectionInfo.range) return;

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionInfo.range);

    if (command === 'bold') {
      // execCommand의 기본 토글 기능 사용
      document.execCommand('bold', false, null);
    } else if (command === 'italic') {
      // execCommand의 기본 토글 기능 사용
      document.execCommand('italic', false, null);
    } else if (command === 'underline') {
      document.execCommand('underline', false, null);
    } else if (command === 'highlight') {
      // 하이라이트는 수동으로 토글 구현
      const selectedText = selectionInfo.range.toString();
      const parentElement = selectionInfo.range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? selectionInfo.range.commonAncestorContainer.parentElement 
        : selectionInfo.range.commonAncestorContainer;
      
      const markParent = parentElement.closest('mark');
      if (markParent && markParent.textContent.trim() === selectedText.trim()) {
        // 스타일 제거: mark 태그의 내용으로 교체
        const textNode = document.createTextNode(selectedText);
        markParent.parentNode.replaceChild(textNode, markParent);
      } else {
        // 스타일 적용
        const styledText = `<mark style="background-color: #ffeb3b; color: #000;">${selectedText}</mark>`;
        document.execCommand('insertHTML', false, styledText);
      }
    }
    
    // 블록 내용 업데이트
    const blockId = selectionInfo.blockId;
    if (blockId) {
      setTimeout(() => {
        const element = editorRefs.current[blockId];
        if (element) {
          const newContent = element.innerHTML;
          updateBlockContent(blockId, newContent);
        }
      }, 10);
    }
    
    setShowToolbar(false);
  }, [selectionInfo, updateBlockContent]);

  const toggleCheckbox = useCallback((blockId) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === blockId
          ? { ...block, checked: !block.checked }
          : block
      )
    );
  }, []);

  const parseInlineMarkdown = useCallback((text) => {
    // **볼드** 처리
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // ==하이라이트== 처리 (노랑색 형광펜)
    text = text.replace(/==(.*?)==/g, '<mark style="background-color: #ffeb3b; color: #000;">$1</mark>');
    
    return text;
  }, []);

  const parseMarkdownToBlocks = useCallback((text) => {
    const lines = text.split('\n');
    const blocks = [];
    let blockId = 1;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      let content = '';
      let type = 'paragraph';

      // 제목 파싱
      if (trimmedLine.startsWith('### ')) {
        type = 'heading3';
        content = parseInlineMarkdown(trimmedLine.substring(4));
      } else if (trimmedLine.startsWith('## ')) {
        type = 'heading2';
        content = parseInlineMarkdown(trimmedLine.substring(3));
      } else if (trimmedLine.startsWith('# ')) {
        type = 'heading1';
        content = parseInlineMarkdown(trimmedLine.substring(2));
      }
      // 불릿 포인트 파싱
      else if (trimmedLine.startsWith('- ')) {
        type = 'bullet';
        content = parseInlineMarkdown(trimmedLine.substring(2));
      }
      // 번호 목록 파싱
      else if (/^\d+\.\s/.test(trimmedLine)) {
        type = 'numbered';
        content = parseInlineMarkdown(trimmedLine.replace(/^\d+\.\s/, ''));
      }
      // 인용구 파싱
      else if (trimmedLine.startsWith('> ')) {
        type = 'quote';
        content = parseInlineMarkdown(trimmedLine.substring(2));
      }
      // YouTube 링크 파싱
      else if (trimmedLine.startsWith('https://www.youtube.com/watch') || trimmedLine.startsWith('https://youtu.be/')) {
        type = 'youtube';
        content = trimmedLine; // 링크 그대로 저장
      }
      // 일반 텍스트
      else {
        content = parseInlineMarkdown(trimmedLine);
      }

      blocks.push({
        id: `block_${blockId++}`,
        type: type,
        content: content,
        placeholder: ''
      });
    });

    return blocks;
  }, [parseInlineMarkdown]);

  const convertAnalysisToBlocks = useCallback((analysisData) => {
    const blocks = [];
    let blockId = 1;

    // 제목 추가
    blocks.push({
      id: `block_${blockId++}`,
      type: 'heading1',
      content: '📺 YouTube 영상 분석 결과',
      placeholder: ''
    });

    // sections에 이미 youtube 블록이 있는지 확인
    const hasYoutubeBlock = analysisData.final_output?.sections?.some(
      section => section.type === 'youtube'
    );

    // YouTube URL 추가 (중복 방지)
    if (analysisData.final_output?.youtube_url && !hasYoutubeBlock) {
      blocks.push({
        id: `block_${blockId++}`,
        type: 'youtube',
        content: analysisData.final_output.youtube_url,
        placeholder: ''
      });
    }

    // 요약 제목
    blocks.push({
      id: `block_${blockId++}`,
      type: 'heading2',
      content: '📋 영상 요약',
      placeholder: ''
    });

    // 분석 결과의 각 섹션을 마크다운으로 파싱
    if (analysisData.final_output?.sections) {
      analysisData.final_output.sections.forEach(section => {
        const parsedBlocks = parseMarkdownToBlocks(section.content);
        blocks.push(...parsedBlocks.map(block => ({
          ...block,
          id: `block_${blockId++}`
        })));
      });
    }

    return blocks;
  }, [parseMarkdownToBlocks]);

  // blocks -> JSON 변환 함수 추가
  function blocksToJson(blocks) {
    return {
      format: 'json',
      sections: blocks
        .filter(b => b.type !== 'heading1' && b.type !== 'youtube')
        .map(b => ({
          type: 'paragraph',
          content: b.content.replace(/<[^>]+>/g, '') // HTML 태그 제거
        }))
    };
  }

  // 저장 함수
  const handleSave = async () => {
    const jsonData = blocksToJson(blocks);
    try {
      await axios.post('/api/report/save', jsonData);
      alert('저장되었습니다!');
    } catch (e) {
      alert('저장 실패: ' + (e?.message || e));
    }
  };

  useEffect(() => {
    // YouTube 분석 데이터가 있으면 블록으로 변환
    if (location.state?.analysisData) {
      const analysisBlocks = convertAnalysisToBlocks(location.state.analysisData);
      setBlocks(analysisBlocks);
    }

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.selection-toolbar')) {
        setTimeout(() => setShowToolbar(false), 100);
      }
    });
    
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection, location.state, convertAnalysisToBlocks]);

  const renderBlock = (block) => {
    const baseStyle = {
      border: 'none',
      outline: 'none',
      width: '100%',
      backgroundColor: 'transparent',
      fontFamily: 'inherit',
      padding: '4px 8px',
      margin: '1px 0',
      borderRadius: '8px',
      transition: 'all 0.2s ease-in-out',
      minHeight: '1.2em',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap'
    };

    const createEditor = (additionalStyle = {}) => {
      // 초기 렌더링시에만 dangerouslySetInnerHTML 사용
      // 이후 입력은 contentEditable의 자연스러운 동작에 맡김
      return (
        <div
          ref={el => {
            editorRefs.current[block.id] = el;
            // 초기 콘텐츠 설정 (HTML 포함)
            if (el && el.innerHTML !== block.content && !isComposing.current) {
              el.innerHTML = block.content;
            }
          }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={block.content ? '' : block.placeholder}
          style={{
            ...baseStyle,
            ...additionalStyle,
            position: 'relative'
          }}
          onInput={(e) => handleInput(e, block.id)}
          onKeyDown={(e) => handleKeyDown(e, block.id)}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            const element = e.target;
            const newContent = element.innerHTML || '';
            
            updateBlockContent(block.id, newContent);
          }}
          onFocus={(e) => {
            setFocusedBlock(block.id);
            e.target.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
          }}
          onBlur={(e) => {
            setFocusedBlock(null);
            e.target.style.boxShadow = 'none';
            // 블러 시에만 상태 동기화 (HTML 내용 유지)
            const content = e.target.innerHTML || '';
            if (content !== block.content) {
              updateBlockContent(block.id, content);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
          }}
        />
      );
    };

    switch (block.type) {
      case 'heading1':
        return (
          <div style={{ margin: '12px 0 8px 0' }}>
            {createEditor({
              fontSize: '2.25em',
              fontWeight: '800',
              color: colors.white,
              lineHeight: '1.2',
              textShadow: '0 0 12px rgba(255, 255, 255, 0.5)',
              placeholder: block.placeholder || '제목을 입력하세요...'
            })}
          </div>
        );

      case 'heading2':
        return (
          <div style={{ margin: '10px 0 6px 0' }}>
            {createEditor({
              fontSize: '1.75em',
              fontWeight: '700',
              color: colors.white,
              lineHeight: '1.3',
              textShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
            })}
          </div>
        );

      case 'heading3':
        return (
          <div style={{ margin: '16px 0 8px 0' }}>
            {createEditor({
              fontSize: '1.375em',
              fontWeight: '600',
              color: colors.white,
              lineHeight: '1.4',
              textShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
            })}
          </div>
        );

      case 'bullet':
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}>
            <span style={{ 
              marginRight: '12px', 
              color: '#667eea', 
              fontSize: '1.25em', 
              lineHeight: '1.5', 
              marginTop: '12px',
              fontWeight: 'bold'
            }}>•</span>
            <div style={{ flex: 1 }}>
              {createEditor({
                fontSize: '1em',
                lineHeight: '1.6'
              })}
            </div>
          </div>
        );

      case 'numbered':
        const blockIndex = blocks.findIndex(b => b.id === block.id);
        const numberedBlocks = blocks.slice(0, blockIndex + 1).filter(b => b.type === 'numbered');
        const number = numberedBlocks.length;
        
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}>
            <span style={{ 
              marginRight: '12px', 
              color: '#667eea', 
              minWidth: '24px', 
              lineHeight: '1.5', 
              marginTop: '12px',
              fontWeight: '600',
              fontSize: '0.95em'
            }}>{number}.</span>
            <div style={{ flex: 1 }}>
              {createEditor({
                fontSize: '1em',
                lineHeight: '1.6'
              })}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}>
            <input
              type="checkbox"
              checked={block.checked || false}
              onChange={() => toggleCheckbox(block.id)}
              style={{ 
                marginRight: '12px', 
                marginTop: '14px',
                transform: 'scale(1.2)',
                accentColor: '#667eea'
              }}
            />
            <div style={{ flex: 1 }}>
              {createEditor({
                textDecoration: block.checked ? 'line-through' : 'none',
                color: block.checked ? '#94a3b8' : 'inherit',
                fontSize: '1em',
                lineHeight: '1.6'
              })}
            </div>
          </div>
        );

      case 'quote':
        return (
          <div style={{ 
            borderLeft: '4px solid #667eea', 
            margin: '12px 0',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRadius: '8px',
            padding: '16px 20px'
          }}>
            {createEditor({
              fontStyle: 'italic',
              color: '#475569',
              fontSize: '1.05em',
              lineHeight: '1.6',
              fontWeight: '400'
            })}
          </div>
        );

      case 'code':
        return (
          <div style={{ 
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
            borderRadius: '12px',
            margin: '16px 0',
            padding: '20px',
            border: '1px solid #334155',
            boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.3)'
          }}>
            {createEditor({
              minHeight: '100px',
              fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
              fontSize: '0.9em',
              lineHeight: '1.6',
              color: '#e2e8f0'
            })}
          </div>
        );

      case 'youtube':
        const videoId = block.content.includes('watch?v=')
          ? block.content.split('watch?v=')[1].split('&')[0]
          : block.content.split('/').pop();
        return (
          <div style={{ margin: '16px 0' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px'
                }}
              />
            </div>
          </div>
        );

      default:
        return (
          <div style={{ margin: '6px 0' }}>
            {createEditor({
              fontSize: '1em',
              lineHeight: '1.7',
              color: colors.white
            })}
          </div>
        );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      padding: 0
    }}>
      <AuroraBackground />
      <TopBar />
      <div style={{
        maxWidth: '1200px',
        margin: '40px auto',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2rem 2rem 1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #111 0%, #222 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              💾 저장
            </button>
            <button
              onClick={() => setBlocks([
                { id: 'new_1', type: 'heading1', content: '', placeholder: '무제 문서' },
                { id: 'new_2', type: 'paragraph', content: '', placeholder: '여기서 작성을 시작하세요...' }
              ])}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #222 0%, #111 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🗑️ 새 문서
            </button>
          </div>
        </div>
        <div style={{
          padding: '2rem',
          lineHeight: '1.7',
          minHeight: '500px',
          background: 'rgba(255,255,255,0.05)'
        }}>
          {blocks.map((block) => (
            <div
              key={block.id}
              style={{
                marginBottom: '4px',
                position: 'relative',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderRadius = '8px';
                e.currentTarget.style.padding = '4px 8px';
                e.currentTarget.style.margin = '4px -8px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.padding = '0';
                e.currentTarget.style.margin = '0';
              }}
            >
              {renderBlock(block)}
            </div>
          ))}
        </div>
        <Footer />
      </div>
      <ChatbotButton onClick={() => setShowChatbot(true)} title="챗봇 열기">
        🤖
      </ChatbotButton>
      {showChatbot && (
        <ChatbotModal>
          <BedrockChat onClose={() => setShowChatbot(false)} />
        </ChatbotModal>
      )}
    </div>
  );
};

export default FixedNotionEditor;