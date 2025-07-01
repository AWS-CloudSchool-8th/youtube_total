import React, { useEffect, useRef, useState } from 'react';
import TopBar from '../../components/TopBar/TopBar';
import Footer from '../../components/Footer/Footer';
import styles from './MainPage.module.css';
import Orb from '../../components/Orb/Orb';
import Aurora from '../../components/Aurora/Aurora';
import MetallicPaint, { parseLogoImage } from '../../components/MetallicPaint/MetallicPaint';
import logo from '../../assets/logos/react-bits-logo-small-black.svg';
import ClickSpark from '../../components/ClickSpark/ClickSpark'
import InputBox from '../../components/InputBox/InputBox';

const MainPage = () => {
  const [imageData, setImageData] = useState(null);
  const [velocity, setVelocity] = useState(1.0);
  const containerRef = useRef(null);

  useEffect(() => {
    async function loadImage() {
      try {
        const response = await fetch(logo);
        const blob = await response.blob();
        const file = new File([blob], 'logo.svg', { type: blob.type });
        const parsed = await parseLogoImage(file);
        setImageData(parsed?.imageData ?? null);
      } catch (err) {
        console.error('이미지 로딩 실패:', err);
      }
    }

    loadImage();
  }, []);

  return (
    <>
      {/* ✅ Aurora: 전체 화면 배경으로 고정 */}
      <div
        className="aurora-background"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Aurora
          colorStops={['#FF69B4', '#007BFF', '#7CFC00']}
          blend={0.3}
          amplitude={0.6}
          speed={0.4}
        />
      </div>

      {/* ✅ 상단 UI */}
      <ClickSpark
        sparkColor='#fff'
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
      <TopBar />

      {/* ✅ 본문 */}
      <main className={styles.mainArea} ref={containerRef}>
        <div className={styles.content}>
          <div className={styles.orbWrapper}>
            <Orb
              hoverIntensity={0.2}
              rotateOnHover={true}
              hue={0}
              forceHoverState={false}
            >
              <div className={styles.orbContent}>
                <h1 className={styles.mainTitle}>
                  유튜브 영상, 이제 읽듯이 확인하세요.
                </h1>
                <p className={styles.subText}>
                  핵심 요약부터 시각 자료까지, 영상 하나로 리포트를 완성합니다.
                </p>
                <p className={styles.subText}>
                  챗봇과 대화하며 원하는 정보를 쉽게 찾고, 요약 내용을 음성으로 들을 수도 있어요.
                </p>
                <InputBox />
                <div className={styles.guideText}>
                  예시: YouTube URL 또는 PDF/텍스트 파일을 드래그하세요
                </div>
              </div>
            </Orb>
          </div>
        </div>
      </main>
      </ClickSpark>

      {/* ✅ 하단 */}
      <Footer />
    </>
  );
};

export default MainPage; 