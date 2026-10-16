import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Layers,
  HelpCircle,
  Code2,
  ArrowRight,
  Check,
  Edit2,
  Lock,
  X,
} from 'lucide-react';
import { SAMPLE_SYLLABUS_TEXT } from '../services/mockData';
import PillTabs from '../components/common/PillTabs';
import Chip from '../components/common/Chip';
import { useToast } from '../context/ToastContext';

export function TeacherContentUploadPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeUploadTab, setActiveUploadTab] = useState('pdf');
  const [syllabusText, setSyllabusText] = useState(SAMPLE_SYLLABUS_TEXT);
  const [fileName, setFileName] = useState('cs201_data_structures_syllabus.pdf');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [activeTab, setActiveTab] = useState('concepts');
  const [published, setPublished] = useState(false);

  const [targetCourse, setTargetCourse] = useState('CS201 Data Structures & Algorithmic Problem Solving');
  const [detailLevel, setDetailLevel] = useState('Comprehensive (Concepts, Quizzes & Code)');
  const [validationRule, setValidationRule] = useState('Strict DAG (Cycle Validation)');

  const [editingItem, setEditingItem] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setSyllabusText(
        `Course Syllabus: ${file.name.replace(/\.[^/.]+$/, '')}\n\n` +
          `Module 1: Advanced Computing Foundations\n- Concept 1: Memory Layout & Pointers\n- Concept 2: Cache Hierarchies\n\nModule 2: Algorithmic Paradigms\n- Concept 3: Divide and Conquer Bounds\n- Concept 4: Dynamic Programming Invariants`
      );
      toast.info(`Loaded ${file.name}`);
    }
  };

  const handleRunLLMExtraction = async () => {
    setIsExtracting(true);
    setExtractionProgress(10);
    setCurrentStepText('Document stream ingested. Parsing modules and candidate concepts...');
    setPipelineLogs([
      '[01/04] Document stream ingested via in-memory stream buffer.',
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
      setCurrentStepText('Synthesizing diagnostic Quizzes with Bloom-aligned rationales...');
      setPipelineLogs((prev) => [
        ...prev,
        '[03/04] Formulated 2 diagnostic MCQs with distractor rationales.',
      ]);
    }, 1400);

    setTimeout(() => {
      setExtractionProgress(85);
      setCurrentStepText('Formulating isolated Coding Assessments & test suites...');
      setPipelineLogs((prev) => [
        ...prev,
        '[04/04] Formulated 2 coding challenges with 18 unit tests & viva prompts.',
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
            ],
            correct: 0,
            explanation: 'Quadratic probing offsets probes by quadratic polynomial increments, dispersing clusters across non-consecutive buckets.',
          },
        ],
        codingAssessments: [
          {
            id: 'ext_ca1',
            concept: 'Hash Tables & Quadratic Probing',
            title: 'LRU Cache Design (Doubly-Linked Sentinel)',
            difficulty: 'Medium',
            constraints: 'O(1) average time complexity for both get and put operations.',
            sampleTest: 'cache = LRUCache(2)\ncache.put(1, 1)\ncache.put(2, 2)\nassert cache.get(1) == 1',
          },
        ],
      });
      setIsExtracting(false);
      toast.success('Curriculum extracted and validated!');
    }, 2800);
  };

  const handlePublishCurriculum = () => {
    setPublished(true);
    toast.success('Curriculum successfully published to active student graph!');
  };

  const reviewTabs = [
    { id: 'concepts', label: 'Concepts', count: extractedData?.concepts?.length || 3 },
    { id: 'quizzes', label: 'Quizzes', count: extractedData?.quizzes?.length || 1 },
    { id: 'coding', label: 'Coding Challenges', count: extractedData?.codingAssessments?.length || 1 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Syllabus & Upload</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Instructor Syllabus Ingestion
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Syllabus & Curriculum Upload Studio
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Transform course syllabi into validated concept graphs, diagnostic quizzes, and coding challenges.
        </p>
      </div>

      {/* Main Upload Frame */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 340px)', gap: '24px', alignItems: 'start' }}>
          {/* Left: Upload Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={activeUploadTab === 'pdf' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                onClick={() => setActiveUploadTab('pdf')}
              >
                <FileText size={13} strokeWidth={1.5} />
                <span>Upload PDF / Document</span>
              </button>
              <button
                type="button"
                className={activeUploadTab === 'text' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                onClick={() => setActiveUploadTab('text')}
              >
                <span>Paste Syllabus Text</span>
              </button>
            </div>

            {activeUploadTab === 'pdf' ? (
              <label
                style={{
                  border: '2px dashed var(--border-hairline)',
                  background: 'var(--surface-muted)',
                  borderRadius: '16px',
                  padding: '36px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--coral)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-hairline)'; }}
              >
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--coral)',
                    marginBottom: '12px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <UploadCloud size={22} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Click to choose PDF or drag & drop
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {fileName ? `Selected: ${fileName}` : 'Supports PDF, Word, and text syllabi (up to 25MB)'}
                </div>
              </label>
            ) : (
              <textarea
                rows={8}
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-hairline)',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  background: 'var(--surface-muted)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          {/* Right: Extraction Configuration */}
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Target Course Curriculum
              </label>
              <select
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '12.5px',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="CS201 Data Structures & Algorithmic Problem Solving">
                  CS201 Data Structures
                </option>
                <option value="CS301 Advanced Algorithms & Graph Theory">
                  CS301 Advanced Algorithms
                </option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Prerequisite Graph Soundness
              </label>
              <select
                value={validationRule}
                onChange={(e) => setValidationRule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '12.5px',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
              >
                <option value="Strict DAG (Cycle Validation)">Strict DAG (Cycle Validation)</option>
                <option value="Relaxed Prerequisite Edges">Relaxed Prerequisite Edges</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-coral-pill"
              onClick={handleRunLLMExtraction}
              disabled={isExtracting}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {isExtracting ? 'Extracting Curriculum...' : 'Extract This Document'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <Lock size={13} strokeWidth={1.5} color="var(--mastery-solid)" />
              <span>Documents processed in-memory with acyclic validation.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extraction Terminal */}
      {isExtracting && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
              {currentStepText}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--coral)' }}>
              {extractionProgress}%
            </span>
          </div>

          <div style={{ width: '100%', height: '6px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: `${extractionProgress}%`, height: '100%', background: 'var(--coral)', transition: 'width 250ms ease' }} />
          </div>

          <div
            style={{
              background: '#16161A',
              color: '#ECEAE8',
              borderRadius: '14px',
              padding: '14px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: '1.6',
            }}
          >
            {pipelineLogs.map((log, i) => (
              <div key={i} style={{ color: log.includes('[COMPLETE]') ? '#17A673' : '#9E9EA8' }}>
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Curriculum Review Workspace */}
      {extractedData && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-card)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
                Review & Publish
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                Synthesized Curriculum Review
              </h2>
            </div>

            <button
              type="button"
              className={published ? 'btn-ghost-pill' : 'btn-coral-pill'}
              onClick={handlePublishCurriculum}
              disabled={published}
            >
              {published ? (
                <>
                  <Check size={14} strokeWidth={2} />
                  <span>Curriculum Live for Students</span>
                </>
              ) : (
                <>
                  <span>Approve & Publish to Curriculum</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>

          {/* Review Tabs */}
          <PillTabs tabs={reviewTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

          <div style={{ marginTop: '18px' }}>
            {/* TAB 1: CONCEPTS */}
            {activeTab === 'concepts' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {extractedData.concepts.map((concept) => (
                  <div
                    key={concept.id}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip variant="default" size="sm">{concept.module}</Chip>
                        <button
                          type="button"
                          className="icon-btn-circle"
                          style={{ width: '28px', height: '28px' }}
                          onClick={() => setEditingItem(concept)}
                        >
                          <Edit2 size={12} strokeWidth={1.5} />
                        </button>
                      </div>

                      <h3 style={{ fontSize: '15px', fontWeight: 600, marginTop: '8px', color: 'var(--text-main)', margin: '8px 0 4px 0' }}>
                        {concept.name}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                        {concept.description}
                      </p>

                      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>Prerequisite:</strong> {concept.prerequisite}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Objectives:</strong>
                      <ul style={{ paddingLeft: '16px', marginTop: '2px', margin: 0 }}>
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
                      padding: '18px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Chip variant="default" size="sm">Concept: {q.concept}</Chip>
                      <Chip variant="warning" size="sm">Diagnostic Item</Chip>
                    </div>

                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px' }}>
                      {q.prompt}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: i === q.correct ? 'var(--mastery-solid-soft)' : 'var(--surface)',
                            border: i === q.correct ? '1px solid var(--success-border)' : '1px solid var(--border-hairline)',
                            fontSize: '13px',
                            fontWeight: i === q.correct ? 600 : 400,
                            color: i === q.correct ? 'var(--mastery-solid)' : 'var(--text-main)',
                          }}
                        >
                          {i === q.correct ? '✓ Correct: ' : '• '} {opt}
                        </div>
                      ))}
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
                      padding: '18px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <Chip variant="default" size="sm">Concept: {ca.concept}</Chip>
                      <Chip variant="warning" size="sm">{ca.difficulty}</Chip>
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                      {ca.title}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <strong>Constraints:</strong> {ca.constraints}
                    </div>
                    <div style={{ padding: '12px 14px', background: '#16161A', color: '#ECEAE8', borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {ca.sampleTest}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div
            className="modal-dialog-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', borderRadius: '20px', border: '1px solid var(--border-hairline)' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Edit Concept Definition
              </h2>
              <button type="button" onClick={() => setEditingItem(null)} className="icon-btn-circle" style={{ width: '30px', height: '30px' }}>
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Concept Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-hairline)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea
                  rows={3}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-hairline)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '14px 20px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-ghost-pill btn-compact" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-coral-pill btn-compact"
                onClick={() => {
                  setExtractedData((prev) => ({
                    ...prev,
                    concepts: prev.concepts.map((c) => (c.id === editingItem.id ? editingItem : c)),
                  }));
                  setEditingItem(null);
                  toast.success('Concept definition saved');
                }}
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
