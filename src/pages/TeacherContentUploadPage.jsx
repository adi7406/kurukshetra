import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Layers,
  HelpCircle,
  Code2,
  ArrowRight,
  RefreshCw,
  Check,
  Edit2,
  Lock,
  X,
  FileCode,
} from 'lucide-react';
import { SAMPLE_SYLLABUS_TEXT } from '../services/mockData';
import { learningService } from '../services/learningService';

export function TeacherContentUploadPage() {
  const [activeUploadTab, setActiveUploadTab] = useState('pdf'); // 'pdf' | 'text'
  const [syllabusText, setSyllabusText] = useState(SAMPLE_SYLLABUS_TEXT);
  const [fileName, setFileName] = useState('cs201_data_structures_syllabus.pdf');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [activeTab, setActiveTab] = useState('concepts'); // 'concepts' | 'quizzes' | 'coding'
  const [published, setPublished] = useState(false);

  // Form options matching Screenshot 2
  const [targetCourse, setTargetCourse] = useState('CS201 Data Structures & Algorithmic Problem Solving');
  const [detailLevel, setDetailLevel] = useState('Comprehensive (Concepts, Quizzes & Code)');
  const [validationRule, setValidationRule] = useState('Strict DAG (Cycle Validation)');

  // Edit modal
  const [editingItem, setEditingItem] = useState(null);

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
    setCurrentStepText('Document stream ingested. Parsing modules and candidate concepts...');
    setPipelineLogs([
      '[01/04] Document stream ingested via Multer in-memory stream buffer.',
      '[01/04] Parsed 2 modules, identifying candidate concept entities...',
    ]);

    setTimeout(() => {
      setExtractionProgress(35);
      setCurrentStepText('Building prerequisite-aware Directed Acyclic Graph (DAG)...');
      setPipelineLogs((prev) => [
        ...prev,
        '[02/04] Validating concept edges: Dynamic Arrays -> Hash Tables -> AVL Trees.',
        '[02/04] Cycle detection algorithm executed: No cycles detected. Valid DAG confirmed.',
      ]);
    }, 700);

    setTimeout(() => {
      setExtractionProgress(65);
      setCurrentStepText('Synthesizing diagnostic Quizzes with distractors & pedagogical explanations...');
      setPipelineLogs((prev) => [
        ...prev,
        '[03/04] Formulated 2 diagnostic MCQs with Bloom-aligned distractor rationales.',
      ]);
    }, 1400);

    setTimeout(() => {
      setExtractionProgress(85);
      setCurrentStepText('Formulating isolated Judge0 Coding Assessments & test suites...');
      setPipelineLogs((prev) => [
        ...prev,
        '[04/04] Formulated 2 coding challenges with 18 unit tests & post-submit viva prompts.',
      ]);
    }, 2100);

    setTimeout(() => {
      setExtractionProgress(100);
      setCurrentStepText('Extraction and structural validation complete.');
      setPipelineLogs((prev) => [
        ...prev,
        '[COMPLETE] All curriculum artifacts ready for instructor review and publication.',
      ]);

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
    }, 2800);
  };

  const handlePublishCurriculum = async () => {
    setPublished(true);
    setTimeout(() => {
      alert('Content successfully published to active student curriculum.');
    }, 200);
  };

  return (
    <div style={{ padding: '0 24px 32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Syllabus Document Ingestion & Pipeline</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Upload syllabus documents to extract prerequisite DAGs, diagnostic quizzes, and coding assessments.
          </p>
        </div>

        <div className="badge-clean blue">
          Multer In-Memory Processing Active
        </div>
      </div>

      {/* Main Studio Ingestion Window (Matching Reference Images 1 & 2) */}
      <div className="studio-window-card">
        {/* Titlebar with Mac Traffic Dots */}
        <div className="studio-titlebar">
          <div className="window-traffic-dots">
            <span className="traffic-dot red" />
            <span className="traffic-dot yellow" />
            <span className="traffic-dot green" />
          </div>

          <div className="studio-breadcrumb">
            <strong>Pathwise Studio</strong> / Syllabus Ingestion & Extraction Workspace
          </div>

          <div className="studio-status-pill">
            <span className="status-dot" />
            <span>Ready &bull; In-Memory Stream & AI Engine</span>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Upload Method Tabs matching Image 2 */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActiveUploadTab('pdf')}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                background: activeUploadTab === 'pdf' ? 'var(--primary-subtle)' : '#FFF',
                borderColor: activeUploadTab === 'pdf' ? 'var(--primary-border)' : 'var(--border)',
                color: activeUploadTab === 'pdf' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeUploadTab === 'pdf' ? '700' : '500',
              }}
            >
              <UploadCloud size={14} />
              <span>Upload PDF / DOCX</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActiveUploadTab('text')}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                background: activeUploadTab === 'text' ? 'var(--primary-subtle)' : '#FFF',
                borderColor: activeUploadTab === 'text' ? 'var(--primary-border)' : 'var(--border)',
                color: activeUploadTab === 'text' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeUploadTab === 'text' ? '700' : '500',
              }}
            >
              <FileText size={14} />
              <span>Paste Text</span>
            </button>
          </div>

          {/* Upload Dropzone (Directly matching Image 2 dropzone) */}
          {activeUploadTab === 'pdf' ? (
            <label className="studio-dropzone">
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
              <div className="studio-dropzone-icon">
                <UploadCloud size={20} />
              </div>

              <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                Drag and drop your syllabus here, or click to browse
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '14px' }}>
                PDF or DOCX documents up to 10 MB (Official syllabi, course guidelines, university curriculum)
              </div>

              <div className="btn-secondary" style={{ padding: '6px 16px', fontSize: '12.5px', pointerEvents: 'none' }}>
                Browse Document
              </div>

              {fileName && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>
                  Selected: {fileName}
                </div>
              )}
            </label>
          ) : (
            <textarea
              rows={6}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste syllabus text here..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
          )}

          {/* Form Controls matching Image 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                Target Course Title (Curriculum Grounding)
              </label>
              <input
                type="text"
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Extraction Detail Level
                </label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '12.5px',
                    background: '#FFF',
                  }}
                >
                  <option value="Comprehensive (Concepts, Quizzes & Code)">Comprehensive (Concepts, Quizzes & Code)</option>
                  <option value="Standard (Concepts & Quizzes)">Standard (Concepts & Quizzes)</option>
                  <option value="Fast (Concepts Only)">Fast (Concepts Only)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Prerequisite Graph Model
                </label>
                <select
                  value={validationRule}
                  onChange={(e) => setValidationRule(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '12.5px',
                    background: '#FFF',
                  }}
                >
                  <option value="Strict DAG (Cycle Validation)">Strict DAG (Cycle Validation)</option>
                  <option value="Relaxed Prerequisite Edges">Relaxed Prerequisite Edges</option>
                </select>
              </div>
            </div>

            {/* Action Button matching Image 2 */}
            <button
              type="button"
              className="btn-primary"
              onClick={handleRunLLMExtraction}
              disabled={isExtracting}
              style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '4px' }}
            >
              {isExtracting ? 'Extracting Curriculum via AI Pipeline...' : 'Extract This Document'}
            </button>

            {/* Privacy Guarantee line matching Image 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
              <Lock size={13} color="var(--success)" />
              <span><strong>Privacy Guarantee:</strong> Documents are processed in-memory and verified for acyclic prerequisite soundness.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extraction Multi-Stage Progress Terminal */}
      {isExtracting && (
        <div className="saas-card animate-fade-in" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
              {currentStepText}
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--primary)' }}>
              {extractionProgress}%
            </span>
          </div>

          <div style={{ width: '100%', height: '6px', background: 'var(--surface-muted)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '14px' }}>
            <div
              style={{
                width: `${extractionProgress}%`,
                height: '100%',
                background: 'var(--primary)',
                transition: 'width 250ms ease',
              }}
            />
          </div>

          <div
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              borderRadius: '8px',
              padding: '12px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              lineHeight: '1.6',
            }}
          >
            {pipelineLogs.map((log, i) => (
              <div key={i} style={{ color: log.includes('[COMPLETE]') ? '#34D399' : '#94A3B8' }}>
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Curriculum Review Workspace (3 Tabs) */}
      {extractedData && (
        <div className="saas-card animate-fade-in" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
                <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Synthesized Curriculum Review</h2>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Review generated Concepts, Quizzes on Concepts, and Coding Assessments before publishing.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ background: published ? 'var(--success)' : undefined, borderColor: published ? 'var(--success)' : undefined }}
              onClick={handlePublishCurriculum}
              disabled={published}
            >
              {published ? (
                <>
                  <Check size={14} />
                  <span>Curriculum Live for Students</span>
                </>
              ) : (
                <>
                  <ArrowRight size={14} />
                  <span>Approve & Publish to Curriculum</span>
                </>
              )}
            </button>
          </div>

          {/* 3 Review Tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                background: activeTab === 'concepts' ? 'var(--primary-subtle)' : '#FFF',
                borderColor: activeTab === 'concepts' ? 'var(--primary-border)' : 'var(--border)',
                color: activeTab === 'concepts' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'concepts' ? '700' : '500',
              }}
              onClick={() => setActiveTab('concepts')}
            >
              Concepts ({extractedData.concepts.length})
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                background: activeTab === 'quizzes' ? 'var(--primary-subtle)' : '#FFF',
                borderColor: activeTab === 'quizzes' ? 'var(--primary-border)' : 'var(--border)',
                color: activeTab === 'quizzes' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'quizzes' ? '700' : '500',
              }}
              onClick={() => setActiveTab('quizzes')}
            >
              Quizzes on Concepts ({extractedData.quizzes.length})
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                background: activeTab === 'coding' ? 'var(--primary-subtle)' : '#FFF',
                borderColor: activeTab === 'coding' ? 'var(--primary-border)' : 'var(--border)',
                color: activeTab === 'coding' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'coding' ? '700' : '500',
              }}
              onClick={() => setActiveTab('coding')}
            >
              Coding Assessments ({extractedData.codingAssessments.length})
            </button>
          </div>

          {/* TAB 1: CONCEPTS */}
          {activeTab === 'concepts' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {extractedData.concepts.map((concept) => (
                <div
                  key={concept.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge-clean blue">{concept.module}</span>
                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
                        onClick={() => setEditingItem(concept)}
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>

                    <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginTop: '6px', color: 'var(--text-main)' }}>
                      {concept.name}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {concept.description}
                    </p>

                    <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--text-light)' }}>
                      <strong>Prerequisite:</strong> {concept.prerequisite}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <strong>Objectives:</strong>
                    <ul style={{ paddingLeft: '14px', marginTop: '2px' }}>
                      {concept.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {extractedData.quizzes.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="badge-clean blue">Concept: {q.concept}</span>
                    <span className="badge-clean amber">Diagnostic Item</span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '10px' }}>
                    {q.prompt}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: i === q.correct ? 'var(--success-subtle)' : 'var(--surface)',
                          border: i === q.correct ? '1px solid var(--success-border)' : '1px solid var(--border)',
                          fontSize: '12.5px',
                          fontWeight: i === q.correct ? '600' : '400',
                          color: i === q.correct ? '#065F46' : 'var(--text-main)',
                        }}
                      >
                        {i === q.correct ? '✓ Correct: ' : '• '} {opt}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--surface-muted)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <strong>Pedagogical Rationale:</strong> {q.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: CODING */}
          {activeTab === 'coding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {extractedData.codingAssessments.map((ca) => (
                <div
                  key={ca.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="badge-clean blue">Concept: {ca.concept}</span>
                    <span className="badge-clean amber">{ca.difficulty}</span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {ca.title}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <strong>Constraints:</strong> {ca.constraints}
                  </div>
                  <div style={{ padding: '8px 12px', background: '#0F172A', color: '#F8FAFC', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                    {ca.sampleTest}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Edit Concept Definition</h2>
              <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Concept Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>
            </div>
            <div style={{ padding: '10px 16px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={() => setEditingItem(null)} style={{ padding: '5px 12px' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setExtractedData((prev) => ({
                    ...prev,
                    concepts: prev.concepts.map((c) => (c.id === editingItem.id ? editingItem : c)),
                  }));
                  setEditingItem(null);
                }}
                style={{ padding: '5px 12px' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherContentUploadPage;
