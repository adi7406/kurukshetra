import React, { useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  FileText,
  CheckCircle2,
  Layers,
  HelpCircle,
  Code2,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  Edit2,
} from 'lucide-react';
import { SAMPLE_SYLLABUS_TEXT } from '../services/mockData';
import { learningService } from '../services/learningService';

export function TeacherContentUploadPage() {
  const [syllabusText, setSyllabusText] = useState(SAMPLE_SYLLABUS_TEXT);
  const [fileName, setFileName] = useState('cs201_syllabus_2026.pdf');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [activeTab, setActiveTab] = useState('concepts'); // 'concepts' | 'quizzes' | 'coding'
  const [published, setPublished] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setSyllabusText(
        `Course Syllabus: ${file.name.replace(/\.[^/.]+$/, '')}\n\n` +
          `Module 1: Advanced Computing Foundations\n- Concept 1: Memory Layout & Pointers\n- Concept 2: Cache Hierarchies\n\nModule 2: Algorithmic Paradigms\n- Concept 3: Divide and Conquer Bounds\n- Concept 4: Dynamic Programming Invariants`
      );
    }
  };

  const handleRunLLMExtraction = async () => {
    setIsExtracting(true);
    setExtractionProgress(10);
    setCurrentStepText('Analyzing document structure and extracting modules...');

    // Pipeline step simulation
    setTimeout(() => {
      setExtractionProgress(35);
      setCurrentStepText('Building prerequisite-aware Concept Graph with acyclic validation...');
    }, 800);

    setTimeout(() => {
      setExtractionProgress(65);
      setCurrentStepText('Generating diagnostic Quizzes with distractors & pedagogical explanations...');
    }, 1600);

    setTimeout(() => {
      setExtractionProgress(85);
      setCurrentStepText('Generating isolated Coding Assessments with sample and hidden test suites...');
    }, 2400);

    setTimeout(() => {
      setExtractionProgress(100);
      setCurrentStepText('Extraction and structural validation complete!');

      setExtractedData({
        concepts: [
          {
            id: 'ext_c1',
            name: 'Dynamic Arrays & Geometric Doubling',
            module: 'Module 1: Linear & Key-Value Structures',
            prerequisite: 'None (Foundational)',
            description: 'Contiguous memory allocation, O(1) amortized append, and geometric resizing factors.',
            objectives: [
              'Derive mathematical bounds for amortized geometric doubling',
              'Analyze spatial locality and hardware cache efficiency',
            ],
          },
          {
            id: 'ext_c2',
            name: 'Hash Tables & Quadratic Probing',
            module: 'Module 1: Linear & Key-Value Structures',
            prerequisite: 'Dynamic Arrays',
            description: 'Hash functions, uniform distribution, open addressing, and collision clustering.',
            objectives: [
              'Mitigate secondary clustering via double hashing',
              'Maintain load factor alpha below 0.75',
            ],
          },
          {
            id: 'ext_c3',
            name: 'Self-Balancing AVL Trees',
            module: 'Module 2: Hierarchical Tree & Graph Structures',
            prerequisite: 'Hash Tables & Dynamic Arrays',
            description: 'Binary search tree invariants, height balance factors, and single/double rotations.',
            objectives: [
              'Execute left and right AVL rotations',
              'Prove logarithmic worst-case bounds for lookups',
            ],
          },
        ],
        quizzes: [
          {
            id: 'ext_q1',
            concept: 'Hash Tables & Quadratic Probing',
            prompt: 'Why does quadratic probing reduce primary clustering compared to linear probing?',
            options: [
              'It uses variable probe intervals computed from i^2 rather than a fixed step of 1',
              'It permanently allocates twice as much RAM per element',
              'It converts the hash table into a circular linked list',
              'It eliminates the need for modulo arithmetic',
            ],
            correct: 0,
            explanation: 'Quadratic probing introduces non-linear intervals (h(k) + i^2) mod M, breaking contiguous runs of filled slots.',
          },
          {
            id: 'ext_q2',
            concept: 'Self-Balancing AVL Trees',
            prompt: 'Under what balance factor condition does a node in an AVL tree require a rotation?',
            options: [
              'When balance factor is 0',
              'When the balance factor becomes strictly greater than 1 or less than -1',
              'Whenever a new node is inserted at the leaf level',
              'When all leaves are at prime depths',
            ],
            correct: 1,
            explanation: 'The AVL property permits balance factors of only -1, 0, or +1. Any discrepancy beyond this triggers rebalancing rotations.',
          },
        ],
        codingAssessments: [
          {
            id: 'ext_code1',
            concept: 'Hash Tables & Collision Resolution',
            title: 'LRU Cache Design with Doubly-Linked Sentinel Nodes',
            difficulty: 'Medium',
            constraints: 'O(1) get and put time complexity; capacity <= 3000',
            sampleTest: 'Input: LRUCache(2), put(1,1), put(2,2), get(1) -> Expected: 1',
          },
          {
            id: 'ext_code2',
            concept: 'Dynamic Arrays & Geometric Doubling',
            title: 'In-Place Dynamic Array Compaction',
            difficulty: 'Easy',
            constraints: 'Time O(N), Extra Space O(1)',
            sampleTest: 'Input: [0,1,0,3,12] -> Expected: [1,3,12,0,0]',
          },
        ],
      });

      setIsExtracting(false);
    }, 3200);
  };

  const handlePublishCurriculum = async () => {
    setPublished(true);
    setTimeout(() => {
      alert('Content successfully published to the active student course curriculum!');
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>AI Syllabus Extractor & Curriculum Generator</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Upload your course syllabus. The LLM extracts modules, maps prerequisite dependencies, and generates Concept Theory, Diagnostic Quizzes, and Coding Assessments.
        </p>
      </div>

      {/* Upload & Syllabus Text Area */}
      <div className="studdy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Syllabus Document & Curriculum Outline</h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label className="btn-studdy btn-studdy-secondary" style={{ padding: '7px 14px', fontSize: '12.5px', cursor: 'pointer' }}>
              <UploadCloud size={15} />
              <span>Upload PDF/DOCX</span>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <button
              type="button"
              className="btn-studdy btn-studdy-secondary"
              style={{ padding: '7px 14px', fontSize: '12.5px' }}
              onClick={() => {
                setFileName('cs201_sample_syllabus.txt');
                setSyllabusText(SAMPLE_SYLLABUS_TEXT);
              }}
            >
              <RefreshCw size={14} />
              <span>Load Sample Syllabus</span>
            </button>
          </div>
        </div>

        {/* Selected File Chip */}
        {fileName && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--primary-subtle)', borderRadius: 'var(--pill-radius)', fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginBottom: '12px' }}>
            <FileText size={13} />
            <span>Active Document: {fileName}</span>
          </div>
        )}

        {/* Text Area */}
        <textarea
          rows={7}
          value={syllabusText}
          onChange={(e) => setSyllabusText(e.target.value)}
          placeholder="Paste syllabus topics, course modules, or lecture outlines..."
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: '1.5',
            backgroundColor: 'var(--surface-subtle)',
            outline: 'none',
          }}
        />

        {/* Action Button */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-studdy btn-studdy-primary"
            style={{ padding: '12px 24px', fontSize: '14px' }}
            onClick={handleRunLLMExtraction}
            disabled={isExtracting}
          >
            <Sparkles size={16} />
            <span>{isExtracting ? 'Extracting with LLM...' : 'Extract Content with AI (LLM Analysis)'}</span>
          </button>
        </div>
      </div>

      {/* Extraction Progress Pipeline */}
      {isExtracting && (
        <div className="studdy-card" style={{ background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>
              LLM CURRICULUM PIPELINE ACTIVE
            </span>
            <span style={{ fontSize: '13px', fontWeight: '800' }}>{extractionProgress}%</span>
          </div>

          <div style={{ width: '100%', height: '8px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ width: `${extractionProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 300ms ease' }} />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} className="spinner" />
            <span>{currentStepText}</span>
          </div>
        </div>
      )}

      {/* Extracted Artifacts View */}
      {extractedData && (
        <div className="studdy-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="ai-badge" style={{ marginBottom: '6px' }}>AI Extracted Curriculum</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Extracted Learning Artifacts</h2>
            </div>

            <button
              type="button"
              className="btn-studdy btn-studdy-primary"
              onClick={handlePublishCurriculum}
              disabled={published}
            >
              <Check size={16} />
              <span>{published ? 'Published to Student Portal' : 'Publish to Course Curriculum'}</span>
            </button>
          </div>

          {/* Sub-Tabs: CONCEPTS | QUIZZES ON THAT CONCEPT | CODING ASSESSMENT */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              background: 'var(--surface-muted)',
              padding: '4px',
              borderRadius: '16px',
              marginBottom: '20px',
              width: 'fit-content',
            }}
          >
            <button
              type="button"
              className="nav-pill"
              style={{
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: activeTab === 'concepts' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'concepts' ? '#FFFFFF' : 'var(--text-muted)',
              }}
              onClick={() => setActiveTab('concepts')}
            >
              <Layers size={14} />
              <span>1. CONCEPTS ({extractedData.concepts.length})</span>
            </button>

            <button
              type="button"
              className="nav-pill"
              style={{
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: activeTab === 'quizzes' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'quizzes' ? '#FFFFFF' : 'var(--text-muted)',
              }}
              onClick={() => setActiveTab('quizzes')}
            >
              <HelpCircle size={14} />
              <span>2. QUIZZES ON CONCEPTS ({extractedData.quizzes.length})</span>
            </button>

            <button
              type="button"
              className="nav-pill"
              style={{
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: activeTab === 'coding' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'coding' ? '#FFFFFF' : 'var(--text-muted)',
              }}
              onClick={() => setActiveTab('coding')}
            >
              <Code2 size={14} />
              <span>3. CODING ASSESSMENT ({extractedData.codingAssessments.length})</span>
            </button>
          </div>

          {/* TAB 1: CONCEPTS */}
          {activeTab === 'concepts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {extractedData.concepts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
                        {c.module}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{c.name}</h3>
                    </div>
                    <span className="role-badge student">Prereq: {c.prerequisite}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {c.description}
                  </p>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                      Learning Objectives:
                    </span>
                    <ul style={{ paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {c.objectives.map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: QUIZZES ON THAT CONCEPT */}
          {activeTab === 'quizzes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {extractedData.quizzes.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <span className="ai-badge" style={{ marginBottom: '6px' }}>Target: {q.concept}</span>
                  <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginTop: '4px', marginBottom: '12px' }}>
                    {q.prompt}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: i === q.correct ? 'var(--success-subtle)' : 'var(--surface)',
                          border: i === q.correct ? '1px solid #A7F3D0' : '1px solid var(--border-light)',
                          fontSize: '13px',
                          fontWeight: i === q.correct ? '700' : '400',
                          color: i === q.correct ? 'var(--success)' : 'var(--text-main)',
                        }}
                      >
                        {i === q.correct ? '✓ Correct: ' : '• '} {opt}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <strong>Pedagogical Explanation:</strong> {q.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: CODING ASSESSMENT */}
          {activeTab === 'coding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {extractedData.codingAssessments.map((ca) => (
                <div
                  key={ca.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="ai-badge">Concept: {ca.concept}</span>
                    <span className="role-badge teacher">{ca.difficulty}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px', marginBottom: '6px' }}>
                    {ca.title}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <strong>Constraints:</strong> {ca.constraints}
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-main)' }}>
                    {ca.sampleTest}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TeacherContentUploadPage;
