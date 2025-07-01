import React, { useState, useRef, useEffect, useCallback } from 'react';
import AuroraBackground from '../../components/AuroraBackground/AuroraBackground';
import TopBar from '../../components/TopBar/TopBar';
import Footer from '../../components/Footer/Footer';
import { colors } from '../../styles/colors';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import styles from './EditorPage.module.css';
import SmartVisualization from '../../components/SmartVisualization/SmartVisualization';
import AnalysisStatus from '../../components/AnalysisStatus/AnalysisStatus';
import BedrockChat from '../../components/BedrockChat/BedrockChat';
import styled from 'styled-components';

// ====== [테스트용 JSON 데이터 불러오기] ======
// 아래 주석을 해제하면 test.json의 report 데이터로 EditorPage를 테스트할 수 있습니다.
// const testReport = require('./test.json').report;

// Styled floating button for chat
const ChatbotButton = styled.button`
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 1000;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  background: ${colors.primary};
  color: ${colors.white};
  border: 2px solid ${colors.accent};
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  font-size: 2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, box-shadow 0.2s;
  &:hover {
    background: #222;
    box-shadow: 0 6px 24px rgba(0,0,0,0.35);
  }
`;

const EditorPage = () => {
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [blocks, setBlocks] = useState([
    { id: 'intro', type: 'heading1', content: '', placeholder: '제목을 입력하세요.' },
    { id: 'desc', type: 'paragraph', content: '', placeholder: '내용을 입력하세요.' }
  ]);
  const [focusedBlock, setFocusedBlock] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectionInfo, setSelectionInfo] = useState({ blockId: null, range: null });
  const editorRefs = useRef({});
  const isComposing = useRef(false);
  const [showChat, setShowChat] = useState(false);

  // detectMarkdownAndConvert, updateBlockType, updateBlockContent, addNewBlock, deleteBlock, handleKeyDown, handleInput, handleSelection, applyStyleToSelection, toggleCheckbox, parseInlineMarkdown, parseMarkdownToBlocks, convertAnalysisToBlocks, blocksToJson, handleSave 등 FixedNotionEditor의 모든 함수 구현

  // ... (아래에 FixedNotionEditor의 전체 함수 및 렌더링 코드가 들어갑니다) ...

  // --- detectMarkdownAndConvert ---
  const detectMarkdownAndConvert = useCallback((text, blockId) => {
    if (!text || isComposing.current) return false;
    if (text === '# ') { updateBlockType(blockId, 'heading1', ''); return true; }
    if (text === '## ') { updateBlockType(blockId, 'heading2', ''); return true; }
    if (text === '### ') { updateBlockType(blockId, 'heading3', ''); return true; }
    if (text === '- ') { updateBlockType(blockId, 'bullet', ''); return true; }
    if (text.match(/^\d+\. $/)) { updateBlockType(blockId, 'numbered', ''); return true; }
    if (text === '- [ ] ') { updateBlockType(blockId, 'checkbox', '', false); return true; }
    if (text === '- [x] ') { updateBlockType(blockId, 'checkbox', '', true); return true; }
    if (text === '> ') { updateBlockType(blockId, 'quote', ''); return true; }
    if (text === '```') { updateBlockType(blockId, 'code', ''); return true; }
    if (text.startsWith('https://www.youtube.com/watch') || text.startsWith('https://youtu.be/')) { updateBlockType(blockId, 'youtube', text); return true; }
    return false;
  }, []);

  // --- updateBlockType ---
  const updateBlockType = useCallback((blockId, newType, newContent, checked = false) => {
    setBlocks(prevBlocks => prevBlocks.map(block => block.id === blockId ? { ...block, type: newType, content: newContent, checked } : block));
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

  // --- updateBlockContent ---
  const updateBlockContent = useCallback((blockId, newContent) => {
    setBlocks(prevBlocks => prevBlocks.map(block => block.id === blockId ? { ...block, content: newContent } : block));
  }, []);

  // --- addNewBlock ---
  const addNewBlock = useCallback((afterBlockId) => {
    const newBlockId = 'block_' + Date.now();
    const blockIndex = blocks.findIndex(b => b.id === afterBlockId);
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, { id: newBlockId, type: 'paragraph', content: '', placeholder: '내용을 입력하세요...' });
    setBlocks(newBlocks);
    setTimeout(() => {
      const element = editorRefs.current[newBlockId];
      if (element) element.focus();
    }, 10);
  }, [blocks]);

  // --- deleteBlock ---
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

  // --- handleKeyDown ---
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

  // --- handleInput ---
  const handleInput = useCallback((e, blockId) => {
    if (isComposing.current) return;
    const element = e.target;
    const textContent = element.textContent || '';
    const htmlContent = element.innerHTML || '';
    if (detectMarkdownAndConvert(textContent, blockId)) return;
    const currentBlock = blocks.find(b => b.id === blockId);
    if (currentBlock && currentBlock.content !== htmlContent) {
      updateBlockContent(blockId, htmlContent);
    }
  }, [detectMarkdownAndConvert, updateBlockContent, blocks]);

  // --- handleSelection ---
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

  // --- applyStyleToSelection ---
  const applyStyleToSelection = useCallback((command) => {
    if (!selectionInfo.range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionInfo.range);
    if (command === 'bold') {
      document.execCommand('bold', false, null);
    } else if (command === 'italic') {
      document.execCommand('italic', false, null);
    } else if (command === 'underline') {
      document.execCommand('underline', false, null);
    } else if (command === 'highlight') {
      const selectedText = selectionInfo.range.toString();
      const parentElement = selectionInfo.range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? selectionInfo.range.commonAncestorContainer.parentElement 
        : selectionInfo.range.commonAncestorContainer;
      const markParent = parentElement.closest('mark');
      if (markParent && markParent.textContent.trim() === selectedText.trim()) {
        const textNode = document.createTextNode(selectedText);
        markParent.parentNode.replaceChild(textNode, markParent);
      } else {
        const styledText = `<mark style="background-color: #ffeb3b; color: #000;">${selectedText}</mark>`;
        document.execCommand('insertHTML', false, styledText);
      }
    }
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

  // --- toggleCheckbox ---
  const toggleCheckbox = useCallback((blockId) => {
    setBlocks(prevBlocks => prevBlocks.map(block => block.id === blockId ? { ...block, checked: !block.checked } : block));
  }, []);

  // --- parseInlineMarkdown ---
  const parseInlineMarkdown = useCallback((text) => {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/==(.*?)==/g, '<mark style="background-color: #ffeb3b; color: #000;">$1</mark>');
    return text;
  }, []);

  // --- parseMarkdownToBlocks ---
  const parseMarkdownToBlocks = useCallback((text) => {
    const safeText = typeof text === 'string' ? text : '';
    const lines = safeText.split('\n');
    const blocks = [];
    let blockId = 1;
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      let content = '';
      let type = 'paragraph';
      if (trimmedLine.startsWith('### ')) { type = 'heading3'; content = parseInlineMarkdown(trimmedLine.substring(4)); }
      else if (trimmedLine.startsWith('## ')) { type = 'heading2'; content = parseInlineMarkdown(trimmedLine.substring(3)); }
      else if (trimmedLine.startsWith('# ')) { type = 'heading1'; content = parseInlineMarkdown(trimmedLine.substring(2)); }
      else if (trimmedLine.startsWith('- ')) { type = 'bullet'; content = parseInlineMarkdown(trimmedLine.substring(2)); }
      else if (/^\d+\.\s/.test(trimmedLine)) { type = 'numbered'; content = parseInlineMarkdown(trimmedLine.replace(/^\d+\.\s/, '')); }
      else if (trimmedLine.startsWith('> ')) { type = 'quote'; content = parseInlineMarkdown(trimmedLine.substring(2)); }
      else if (trimmedLine.startsWith('https://www.youtube.com/watch') || trimmedLine.startsWith('https://youtu.be/')) { type = 'youtube'; content = trimmedLine; }
      else { content = parseInlineMarkdown(trimmedLine); }
      blocks.push({ id: `block_${blockId++}`, type, content, placeholder: '' });
    });
    return blocks;
  }, [parseInlineMarkdown]);

  // --- convertAnalysisToBlocks ---
  const convertAnalysisToBlocks = useCallback((analysisData) => {
    const blocks = [];
    let blockId = 1;
    blocks.push({ id: `block_${blockId++}`, type: 'heading1', content: '📺 YouTube 영상 분석 결과', placeholder: '' });
    const hasYoutubeBlock = analysisData.report?.sections?.some(section => section.type === 'youtube');
    if (analysisData.report?.youtube_url && !hasYoutubeBlock) {
      blocks.push({ id: `block_${blockId++}`, type: 'youtube', content: analysisData.report.youtube_url, placeholder: '' });
    }
    blocks.push({ id: `block_${blockId++}`, type: 'heading2', content: '📋 영상 요약', placeholder: '' });
    if (analysisData.report?.sections) {
      analysisData.report.sections.forEach(section => {
        const parsedBlocks = parseMarkdownToBlocks(section.content);
        blocks.push(...parsedBlocks.map(block => ({ ...block, id: `block_${blockId++}` })));
      });
    }
    return blocks;
  }, [parseMarkdownToBlocks]);

  // --- blocksToJson ---
  function blocksToJson(blocks) {
    return {
      format: 'json',
      sections: blocks.filter(b => b.type !== 'heading1' && b.type !== 'youtube').map(b => ({ type: 'paragraph', content: b.content.replace(/<[^>]+>/g, '') }))
    };
  }

  // --- handleSave ---
  const handleSave = async () => {
    const jsonData = blocksToJson(blocks);
    try {
      await axios.post('/api/report/save', jsonData);
      alert('저장되었습니다!');
    } catch (e) {
      alert('저장 실패: ' + (e?.message || e));
    }
  };

  // --- useEffect ---
  useEffect(() => {
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
    if (location.state?.analysisData?.report) {
      setReport(location.state.analysisData.report);
    }
    // ====== [테스트용 JSON 데이터 적용] ======
    // 아래 주석을 해제하면 test.json의 report 데이터로 EditorPage를 테스트할 수 있습니다.
    // setReport(testReport);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection, location.state, convertAnalysisToBlocks]);

  // --- renderBlock ---
  const renderBlock = (block) => {
    const baseStyle = {
      border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent', fontFamily: 'inherit', padding: '4px 8px', margin: '1px 0', borderRadius: '8px', transition: 'all 0.2s ease-in-out', minHeight: '1.2em', wordWrap: 'break-word', whiteSpace: 'pre-wrap', position: 'relative'
    };
    const createEditor = (additionalStyle = {}) => (
      <div
        ref={el => {
          editorRefs.current[block.id] = el;
          if (el && el.innerHTML !== block.content && !isComposing.current) {
            el.innerHTML = block.content;
          }
        }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={block.content ? '' : block.placeholder}
        style={{ ...baseStyle, ...additionalStyle }}
        onInput={e => handleInput(e, block.id)}
        onKeyDown={e => handleKeyDown(e, block.id)}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={e => { isComposing.current = false; const element = e.target; const newContent = element.innerHTML || ''; updateBlockContent(block.id, newContent); }}
        onFocus={e => { setFocusedBlock(block.id); e.target.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)'; }}
        onBlur={e => { setFocusedBlock(null); e.target.style.boxShadow = 'none'; const content = e.target.innerHTML || ''; if (content !== block.content) { updateBlockContent(block.id, content); } }}
        onPaste={e => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, text); }}
      />
    );
    switch (block.type) {
      case 'heading1': return <div style={{ margin: '12px 0 8px 0' }}>{createEditor({ fontSize: '2.25em', fontWeight: '800', color: colors.white, lineHeight: '1.2', textShadow: '0 0 12px rgba(255, 255, 255, 0.5)' })}</div>;
      case 'heading2': return <div style={{ margin: '10px 0 6px 0' }}>{createEditor({ fontSize: '1.75em', fontWeight: '700', color: colors.white, lineHeight: '1.3', textShadow: '0 0 8px rgba(255, 255, 255, 0.5)' })}</div>;
      case 'heading3': return <div style={{ margin: '16px 0 8px 0' }}>{createEditor({ fontSize: '1.375em', fontWeight: '600', color: colors.white, lineHeight: '1.4', textShadow: '0 0 8px rgba(255, 255, 255, 0.5)' })}</div>;
      case 'bullet': return <div style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}><span style={{ marginRight: '12px', color: '#667eea', fontSize: '1.25em', lineHeight: '1.5', marginTop: '12px', fontWeight: 'bold' }}>•</span><div style={{ flex: 1 }}>{createEditor({ fontSize: '1em', lineHeight: '1.6' })}</div></div>;
      case 'numbered': const blockIndex = blocks.findIndex(b => b.id === block.id); const numberedBlocks = blocks.slice(0, blockIndex + 1).filter(b => b.type === 'numbered'); const number = numberedBlocks.length; return <div style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}><span style={{ marginRight: '12px', color: '#667eea', minWidth: '24px', lineHeight: '1.5', marginTop: '12px', fontWeight: '600', fontSize: '0.95em' }}>{number}.</span><div style={{ flex: 1 }}>{createEditor({ fontSize: '1em', lineHeight: '1.6' })}</div></div>;
      case 'checkbox': return <div style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}><input type="checkbox" checked={block.checked || false} onChange={() => toggleCheckbox(block.id)} style={{ marginRight: '12px', marginTop: '14px', transform: 'scale(1.2)', accentColor: '#667eea' }} /><div style={{ flex: 1 }}>{createEditor({ textDecoration: block.checked ? 'line-through' : 'none', color: block.checked ? '#94a3b8' : 'inherit', fontSize: '1em', lineHeight: '1.6' })}</div></div>;
      case 'quote': return <div style={{ borderLeft: '4px solid #667eea', margin: '12px 0', background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)', borderRadius: '8px', padding: '16px 20px' }}>{createEditor({ fontStyle: 'italic', color: '#475569', fontSize: '1.05em', lineHeight: '1.6', fontWeight: '400' })}</div>;
      case 'code': return <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px', margin: '16px 0', padding: '20px', border: '1px solid #334155', boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.3)' }}>{createEditor({ minHeight: '100px', fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace', fontSize: '0.9em', lineHeight: '1.6', color: '#e2e8f0' })}</div>;
      case 'youtube': const videoId = block.content.includes('watch?v=') ? block.content.split('watch?v=')[1].split('&')[0] : block.content.split('/').pop(); return <div style={{ margin: '16px 0' }}><div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}><iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube video" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '12px' }} /></div></div>;
      default: return <div style={{ margin: '6px 0' }}>{createEditor({ fontSize: '1em', lineHeight: '1.7', color: colors.white })}</div>;
    }
  };

  return (
    <div className={styles.container}>
      <AuroraBackground />
      <TopBar />
      <div className={styles.main}>
        {showToolbar && (
          <div
            className={styles.toolbar}
            style={{
              left: `${toolbarPosition.x}px`,
              top: `${toolbarPosition.y}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <button onClick={() => applyStyleToSelection('bold')}><strong>B</strong></button>
            <button onClick={() => applyStyleToSelection('italic')} style={{ fontStyle: 'italic' }}>I</button>
            <button onClick={() => applyStyleToSelection('underline')} style={{ textDecoration: 'underline' }}>U</button>
            <button onClick={() => applyStyleToSelection('highlight')} className={styles.highlight}>H</button>
          </div>
        )}
        <div className={styles.editorWrapper}>
          <div className={styles.editorHeader}>
            <button className={styles.button} onClick={handleSave}>💾 Save</button>
            <button className={`${styles.button} ${styles.secondary}`} onClick={() => setBlocks([
              { id: 'new_1', type: 'heading1', content: '', placeholder: '무제 문서' },
              { id: 'new_2', type: 'paragraph', content: '', placeholder: '여기서 작성을 시작하세요.' }
            ])}>🗑️ Add</button>
          </div>
          <div className={styles.editorBody}>
            {report && Array.isArray(report.sections) ? (
              report.sections.map((section, idx) => (
                section.type === 'visualization' ? (
                  <SmartVisualization key={section.id || idx} section={section} />
                ) : (
                  <div key={section.id || idx} className={styles.block}>
                    {renderBlock(section)}
                  </div>
                )
              ))
            ) : (
              <>
                {blocks.map((block) => (
                  <div key={block.id} className={styles.block}>
                    {renderBlock(block)}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      {showChat && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }} onClick={() => setShowChat(false)} />
          <div style={{ position: 'fixed', bottom: 100, right: 40, zIndex: 1000 }}>
            <BedrockChat onClose={() => setShowChat(false)} />
          </div>
        </>
      )}
      <ChatbotButton
        onClick={() => setShowChat(true)}
        aria-label="챗봇 열기"
      >
        <span role="img" aria-label="chatbot">🤖</span>
      </ChatbotButton>
      <Footer />
    </div>
  );
};

export default EditorPage; 