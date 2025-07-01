import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, DataSet } from 'vis-network/standalone';
import * as d3 from 'd3';
import styles from './SmartVisualization.module.css';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SmartVisualization = ({ section }) => {
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  const networkRef = useRef(null);
  const flowRef = useRef(null);
  const d3Ref = useRef(null);
  const [networkInstance, setNetworkInstance] = useState(null);

  useEffect(() => {
    if (section.data?.type === 'network' && networkRef.current) {
      renderNetwork();
    } else if (section.data?.type === 'd3' && d3Ref.current) {
      renderD3Visualization();
    } else if (section.data?.type === 'diagram') {
      section.data.type = 'network';
      if (networkRef.current) {
        renderNetwork();
      }
    }
    return () => {
      if (networkInstance) {
        networkInstance.destroy();
        setNetworkInstance(null);
      }
    };
  }, [section.data]);

  // vis.js Network 렌더링
  const renderNetwork = () => {
    if (!networkRef.current) return;
    try {
      setError(null);
      if (networkInstance) networkInstance.destroy();
      let networkData = section.data?.data;
      if (!networkData || section.data?.type === 'diagram') {
        networkData = {
          nodes: [
            { id: 1, label: '노드 1', color: '#667eea' },
            { id: 2, label: '노드 2', color: '#f093fb' },
            { id: 3, label: '노드 3', color: '#4facfe' }
          ],
          edges: [
            { from: 1, to: 2, label: '연결 1-2' },
            { from: 2, to: 3, label: '연결 2-3' }
          ]
        };
      }
      const container = networkRef.current;
      const data = {
        nodes: new DataSet(networkData.nodes || []),
        edges: new DataSet(networkData.edges || [])
      };
      const options = section.data.options || {
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'LR',
            sortMethod: 'directed'
          }
        },
        physics: {
          enabled: true,
          hierarchicalRepulsion: {
            centralGravity: 0.0,
            springLength: 100,
            springConstant: 0.01,
            nodeDistance: 120
          }
        },
        nodes: {
          shape: 'box',
          margin: 10,
          font: { size: 14 }
        },
        edges: {
          arrows: 'to',
          smooth: true
        }
      };
      const network = new Network(container, data, options);
      setNetworkInstance(network);
    } catch (err) {
      setError(`네트워크 다이어그램 렌더링 실패: ${err.message}`);
    }
  };

  // D3.js 시각화 렌더링
  const renderD3Visualization = () => {
    if (!section.data?.data || !d3Ref.current) return;
    try {
      setError(null);
      d3.select(d3Ref.current).selectAll('*').remove();
      const container = d3Ref.current;
      const data = section.data.data;
      const config = section.data.config || {};
      const width = config.width || 800;
      const height = config.height || 400;
      const vizType = section.data.visualization_type;
      const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
      if (vizType === 'timeline') {
        let events = data.events || data.items || data.timeline || [];
        if (!Array.isArray(events)) {
          if (data.nodes && Array.isArray(data.nodes)) {
            events = data.nodes.map((node, index) => ({
              year: node.year || node.date || 2020 + index,
              name: node.name || node.label || node.title || `이벤트 ${index + 1}`,
              impact: node.impact || node.value || Math.random() * 100
            }));
          } else {
            events = [
              { year: 2020, name: '시작', impact: 30 },
              { year: 2021, name: '발전', impact: 60 },
              { year: 2022, name: '성장', impact: 80 },
              { year: 2023, name: '확장', impact: 90 },
              { year: 2024, name: '현재', impact: 100 }
            ];
          }
        }
        if (events.length === 0) throw new Error('Timeline 데이터가 비어있습니다');
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const xScale = d3.scaleLinear().domain(d3.extent(events, d => d.year)).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain([0, d3.max(events, d => d.impact)]).range([innerHeight, 0]);
        g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
        g.append('g').call(d3.axisLeft(yScale));
        const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.impact)).curve(d3.curveMonotoneX);
        g.append('path').datum(events).attr('fill', 'none').attr('stroke', '#667eea').attr('stroke-width', 3).attr('d', line);
        g.selectAll('.event-dot').data(events).enter().append('circle').attr('class', 'event-dot').attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.impact)).attr('r', 8).attr('fill', '#f093fb').attr('stroke', '#fff').attr('stroke-width', 3);
        g.selectAll('.event-label').data(events).enter().append('text').attr('class', 'event-label').attr('x', d => xScale(d.year)).attr('y', d => yScale(d.impact) - 15).attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', 'bold').attr('fill', '#333').text(d => d.name);
        g.append('text').attr('transform', 'rotate(-90)').attr('y', 0 - margin.left).attr('x', 0 - (innerHeight / 2)).attr('dy', '1em').style('text-anchor', 'middle').text('영향도');
        g.append('text').attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom})`).style('text-anchor', 'middle').text('연도');
      }
      // ... (force, treemap, sankey 등 추가 구현 가능)
    } catch (err) {
      setError(`D3 시각화 렌더링 실패: ${err.message}`);
      if (d3Ref.current) {
        d3.select(d3Ref.current).selectAll('*').remove();
        const svg = d3.select(d3Ref.current)
          .append('svg')
          .attr('width', '100%')
          .attr('height', '300px')
          .attr('viewBox', '0 0 400 300');
        svg.append('text')
          .attr('x', 200)
          .attr('y', 150)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px')
          .attr('fill', '#ef4444')
          .text(`시각화 오류: ${err.message}`);
      }
    }
  };

  const renderChart = () => {
    const { config } = section.data;
    if (!config) return null;
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: section.title }
      },
      ...config.options
    };
    const chartProps = { data: config.data, options: chartOptions, ref: chartRef };
    switch (config.type) {
      case 'bar': return <Bar {...chartProps} />;
      case 'line': return <Line {...chartProps} />;
      case 'pie': return <Pie {...chartProps} />;
      case 'doughnut': return <Doughnut {...chartProps} />;
      case 'radar': return <Radar {...chartProps} />;
      case 'scatter': return <Scatter {...chartProps} />;
      default: return <div>지원하지 않는 차트 타입: {config.type}</div>;
    }
  };

  const renderTable = () => {
    const { headers, rows, styling } = section.data;
    if (!headers || !rows) return null;
    return (
      <div className={styles.tableContainer}>
        <table className={styles.dataTable + (styling?.sortable ? ' ' + styles.sortable : '')}>
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th key={i} className={styling?.highlight_column === i ? styles.highlighted : ''}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={styling?.highlight_column === cellIndex ? styles.highlighted : ''}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAdvanced = () => (
    <div className={styles.advancedVisualizationPlaceholder}>
      <h4>{section.data.visualization_type} 시각화</h4>
      <p>고급 시각화는 추가 구현이 필요합니다.</p>
      <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', overflow: 'auto' }}>
        {JSON.stringify(section.data.data, null, 2)}
      </pre>
    </div>
  );

  const getPurposeIcon = (purpose) => {
    const icons = {
      overview: '🌐', detail: '🔍', comparison: '⚖️', process: '🔄', data: '📊', timeline: '📅', structure: '🏗️'
    };
    return icons[purpose] || '📊';
  };
  const getPurposeLabel = (purpose) => {
    const labels = {
      overview: '전체 개요', detail: '세부 분석', comparison: '비교', process: '프로세스', data: '데이터', timeline: '타임라인', structure: '구조'
    };
    return labels[purpose] || purpose;
  };

  return (
    <div className={styles.smartVisualization}>
      <div className={styles.visualizationHeader}>
        <h3>
          {getPurposeIcon(section.purpose)} {section.title}
          {section.purpose && (
            <span className={styles['purposeBadge'] + ' ' + styles['purpose' + (section.purpose.charAt(0).toUpperCase() + section.purpose.slice(1))]}>
              {getPurposeLabel(section.purpose)}
            </span>
          )}
        </h3>
      </div>
      <div className={styles.visualizationContent}>
        {section.data?.type === 'chart' && (
          <div className={styles.chartContainer}>{renderChart()}</div>
        )}
        {(section.data?.type === 'network' || section.data?.type === 'diagram') && (
          <div className={styles.networkContainer}>
            <div ref={networkRef} className={styles.visNetwork} style={{ height: '400px', width: '100%' }} />
            {error && <div className={styles.visualizationError}><p>⚠️ {error}</p></div>}
          </div>
        )}
        {section.data?.type === 'flow' && (
          <div className={styles.flowContainer} style={{ height: '400px', width: '100%' }} ref={flowRef}>
            <ReactFlow
              nodes={section.data?.data?.nodes || [
                { id: '1', type: 'input', position: { x: 0, y: 0 }, data: { label: '시작' } },
                { id: '2', position: { x: 100, y: 100 }, data: { label: '과정' } },
                { id: '3', type: 'output', position: { x: 200, y: 200 }, data: { label: '완료' } }
              ]}
              edges={section.data?.data?.edges || [
                { id: 'e1-2', source: '1', target: '2', label: '연결 1' },
                { id: 'e2-3', source: '2', target: '3', label: '연결 2' }
              ]}
              fitView
              attributionPosition="bottom-right"
            >
              <Background />
              <Controls />
            </ReactFlow>
            {error && <div className={styles.visualizationError}><p>⚠️ {error}</p></div>}
          </div>
        )}
        {section.data?.type === 'd3' && (
          <div className={styles.d3Container}>
            <div ref={d3Ref} className={styles.d3Visualization} style={{ width: '100%', minHeight: '400px' }} />
            {error && <div className={styles.visualizationError}><p>⚠️ {error}</p></div>}
          </div>
        )}
        {section.data?.type === 'table' && renderTable()}
        {section.data?.type === 'advanced' && renderAdvanced()}
        {!section.data && (
          <div className={styles.visualizationError}>
            <p>⚠️ 시각화 데이터가 없습니다</p>
            <pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
              섹션 전체 데이터: {JSON.stringify(section, null, 2)}
            </pre>
          </div>
        )}
      </div>
      {section.insight && (
        <div className={styles.visualizationInsight}>
          <h4>💡 핵심 인사이트</h4>
          <p>{section.insight}</p>
        </div>
      )}
      {section.user_benefit && (
        <div className={styles.visualizationBenefit}>
          <h4>🎯 이 시각화의 가치</h4>
          <p>{section.user_benefit}</p>
        </div>
      )}
    </div>
  );
};

export default SmartVisualization; 