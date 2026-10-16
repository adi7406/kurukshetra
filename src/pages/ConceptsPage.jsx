import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  GitFork,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
  List,
  Network,
} from 'lucide-react';
import { learningService } from '../services/learningService';
import LoadingState from '../components/feedback/LoadingState';
import MasteryBadge from '../components/common/MasteryBadge';
import ConceptMasteryDetailModal from '../components/mastery/ConceptMasteryDetailModal';
import { getMasteryLevel } from '../utils/mastery';

// Custom Concept Node for React Flow
function ConceptNode({ data }) {
  const meta = getMasteryLevel(data.score);
  const isRecommended = Boolean(data.isRecommended);

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'var(--surface)',
        border: isRecommended ? '2px solid #3B82F6' : `1px solid ${meta.border}`,
        boxShadow: isRecommended ? '0 0 16px rgba(59, 130, 246, 0.3)' : 'var(--card-shadow)',
        width: '210px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 120ms ease',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--primary)', width: 8, height: 8 }} />

      {isRecommended && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '12px',
            background: 'var(--primary)',
            color: '#FFFFFF',
            fontSize: '9px',
            fontWeight: '800',
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Next Up
        </div>
      )}

      <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.04em' }}>
        {data.moduleShort || 'Concept'}
      </div>

      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px', lineHeight: '1.3' }}>
        {data.label}
      </div>

      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MasteryBadge score={data.score} size="sm" />
        <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
          {data.score >= 70 ? '✓ Ready' : data.score >= 40 ? 'Developing' : 'Review'}
        </span>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--primary)', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = {
  conceptNode: ConceptNode,
};

export function ConceptsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'catalog'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcept, setSelectedConcept] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [loadedCourses, loadedProgress] = await Promise.all([
          learningService.getCourses(),
          learningService.getProgress(),
        ]);
        setCourses(loadedCourses || []);
        setProgressData(loadedProgress || null);
      } catch (err) {
        console.error('Failed to load concept graph:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const primaryCourse = courses[0];

  // Build DAG Nodes & Edges
  const initialNodes = useMemo(() => {
    return [
      {
        id: 'c_arrays',
        type: 'conceptNode',
        position: { x: 40, y: 160 },
        data: {
          label: 'Dynamic Arrays & Doubling',
          moduleShort: 'Module 1',
          module: 'Linear & Key-Value Structures',
          score: 94,
          isRecommended: false,
          prerequisite: 'None (Foundational)',
          description: 'Contiguous memory allocation, O(1) amortized append, and geometric resizing factors.',
        },
      },
      {
        id: 'c_linkedlists',
        type: 'conceptNode',
        position: { x: 330, y: 50 },
        data: {
          label: 'Linked Lists & Pointers',
          moduleShort: 'Module 1',
          module: 'Linear & Key-Value Structures',
          score: 72,
          isRecommended: false,
          prerequisite: 'Dynamic Arrays & Memory',
          description: 'Pointer manipulation, Floyd cycle detection, and memory overhead tradeoffs.',
        },
      },
      {
        id: 'c_hashtables',
        type: 'conceptNode',
        position: { x: 330, y: 180 },
        data: {
          label: 'Hash Tables & Collisions',
          moduleShort: 'Module 1',
          module: 'Linear & Key-Value Structures',
          score: 48,
          isRecommended: true,
          prerequisite: 'Dynamic Arrays & Memory',
          description: 'Hash functions, uniform distribution, open addressing, and load factor thresholds.',
        },
      },
      {
        id: 'c_recursion',
        type: 'conceptNode',
        position: { x: 330, y: 310 },
        data: {
          label: 'Recursion & Recurrences',
          moduleShort: 'Module 3',
          module: 'Algorithmic Paradigms',
          score: 86,
          isRecommended: false,
          prerequisite: 'Dynamic Arrays & Memory',
          description: 'Divide and conquer bounds, recursion trees, and Master Theorem analysis.',
        },
      },
      {
        id: 'c_bst',
        type: 'conceptNode',
        position: { x: 620, y: 110 },
        data: {
          label: 'AVL Trees & Rotations',
          moduleShort: 'Module 2',
          module: 'Hierarchical Tree & Graph Structures',
          score: 15,
          isRecommended: false,
          prerequisite: 'Linked Lists & Hash Tables',
          description: 'Binary search tree invariants, balance factors, and single/double rotations.',
        },
      },
      {
        id: 'c_dp',
        type: 'conceptNode',
        position: { x: 620, y: 310 },
        data: {
          label: 'Dynamic Programming',
          moduleShort: 'Module 3',
          module: 'Algorithmic Paradigms',
          score: 38,
          isRecommended: false,
          prerequisite: 'Recursion & Recurrences',
          description: 'Optimal substructure, overlapping subproblems, memoization vs tabulation.',
        },
      },
      {
        id: 'c_graphs',
        type: 'conceptNode',
        position: { x: 910, y: 110 },
        data: {
          label: 'Graph Representations',
          moduleShort: 'Module 2',
          module: 'Hierarchical Tree & Graph Structures',
          score: 20,
          isRecommended: false,
          prerequisite: 'AVL Trees & Rotations',
          description: 'Adjacency lists/matrices, BFS traversal, DFS traversal, cycle detection.',
        },
      },
    ];
  }, []);

  const initialEdges = useMemo(() => {
    return [
      {
        id: 'e_arrays_linkedlists',
        source: 'c_arrays',
        target: 'c_linkedlists',
        animated: false,
        style: { stroke: '#64748B', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
      },
      {
        id: 'e_arrays_hashtables',
        source: 'c_arrays',
        target: 'c_hashtables',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
      },
      {
        id: 'e_arrays_recursion',
        source: 'c_arrays',
        target: 'c_recursion',
        animated: false,
        style: { stroke: '#64748B', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
      },
      {
        id: 'e_linkedlists_bst',
        source: 'c_linkedlists',
        target: 'c_bst',
        animated: false,
        style: { stroke: '#64748B', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
      },
      {
        id: 'e_hashtables_bst',
        source: 'c_hashtables',
        target: 'c_bst',
        animated: false,
        style: { stroke: '#64748B', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
      },
      {
        id: 'e_recursion_dp',
        source: 'c_recursion',
        target: 'c_dp',
        animated: false,
        style: { stroke: '#64748B', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
      },
      {
        id: 'e_bst_graphs',
        source: 'c_bst',
        target: 'c_graphs',
        animated: false,
        style: { stroke: '#64748B', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748B' },
      },
    ];
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event, node) => {
    setSelectedConcept({
      id: node.id,
      name: node.data.label,
      module: node.data.module,
      mastery: node.data.score,
      prerequisite: node.data.prerequisite,
      description: node.data.description,
    });
  }, []);

  if (loading) {
    return <LoadingState message="Loading interactive concept map..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Interactive Concept Map
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {primaryCourse?.code}: {primaryCourse?.title} &bull; Directed prerequisite dependency graph
          </p>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--surface)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setViewMode('graph')}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: viewMode === 'graph' ? 'var(--primary-subtle)' : 'transparent',
              borderColor: viewMode === 'graph' ? 'var(--primary-border)' : 'transparent',
              color: viewMode === 'graph' ? '#60A5FA' : 'var(--text-muted)',
              fontWeight: viewMode === 'graph' ? '700' : '500',
            }}
          >
            <Network size={14} />
            <span>Interactive Graph</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('catalog')}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: viewMode === 'catalog' ? 'var(--primary-subtle)' : 'transparent',
              borderColor: viewMode === 'catalog' ? 'var(--primary-border)' : 'transparent',
              color: viewMode === 'catalog' ? '#60A5FA' : 'var(--text-muted)',
              fontWeight: viewMode === 'catalog' ? '700' : '500',
            }}
          >
            <List size={14} />
            <span>Module List</span>
          </button>
        </div>
      </div>

      {/* GRAPH VIEW MODE */}
      {viewMode === 'graph' ? (
        <div className="saas-card" style={{ padding: '0', overflow: 'hidden', height: '580px', display: 'flex', flexDirection: 'column' }}>
          {/* Legend and Graph Toolbar */}
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--surface-muted)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span>Click any node to view diagnostic evidence & prerequisite breakdown</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34D399' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                Solid (&gt;70%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FBBF24' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                Developing (40-70%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F87171' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                Weak (&lt;40%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60A5FA', fontWeight: '700' }}>
                <span style={{ width: '12px', height: '2px', background: '#3B82F6' }} />
                Recommended Path
              </span>
            </div>
          </div>

          {/* React Flow Canvas */}
          <div style={{ flex: 1, position: 'relative' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#1E293B" gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(n) => (n.data.score >= 70 ? '#10B981' : n.data.score >= 40 ? '#F59E0B' : '#EF4444')}
                maskColor="rgba(8, 12, 20, 0.7)"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              />
            </ReactFlow>
          </div>
        </div>
      ) : (
        /* MODULE CATALOG LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {primaryCourse?.modules?.map((module) => (
            <div key={module.id} className="saas-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>{module.title}</h2>
                <span className="badge-clean blue">{module.concepts?.length || 0} Concepts</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {module.concepts?.map((c) => {
                  const node = initialNodes.find((n) => n.id === c.id) || { data: { score: 50, prerequisite: 'None' } };
                  return (
                    <div
                      key={c.id}
                      onClick={() =>
                        setSelectedConcept({
                          id: c.id,
                          name: c.name,
                          module: module.title,
                          mastery: node.data.score,
                          prerequisite: node.data.prerequisite,
                          description: c.description,
                        })
                      }
                      style={{
                        padding: '14px',
                        background: 'var(--surface-muted)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>{c.name}</h3>
                        <MasteryBadge score={node.data.score} size="sm" />
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                        {c.description}
                      </p>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '8px' }}>
                        <strong>Prerequisite:</strong> {node.data.prerequisite}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Concept Mastery Detail Modal */}
      <ConceptMasteryDetailModal
        isOpen={Boolean(selectedConcept)}
        onClose={() => setSelectedConcept(null)}
        concept={selectedConcept}
      />
    </div>
  );
}

export default ConceptsPage;
