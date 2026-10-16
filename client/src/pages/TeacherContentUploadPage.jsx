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
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  Terminal,
  Cpu,
} from 'lucide-react';
import { SAMPLE_SYLLABUS_TEXT } from '../services/mockData';
import PillTabs from '../components/common/PillTabs';
import Chip from '../components/common/Chip';
import { useToast } from '../context/ToastContext';
import { syllabusAiService } from '../services/syllabusAiService';
import { learningService } from '../services/learningService';
import { ConceptDiagram } from '../components/common/ConceptDiagram';

export function TeacherContentUploadPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeUploadTab, setActiveUploadTab] = useState('text');
  const [syllabusText, setSyllabusText] = useState(SAMPLE_SYLLABUS_TEXT);
  const [fileName, setFileName] = useState('dsa_curriculum_syllabus.pdf');
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [activeTab, setActiveTab] = useState('concepts');
  const [quizTopicFilter, setQuizTopicFilter] = useState('all');
  const [published, setPublished] = useState(false);
  const [diagramViewMap, setDiagramViewMap] = useState({}); // { [id]: 'visual' | 'ascii' }

  const [targetCourse, setTargetCourse] = useState('CS201 Data Structures & Algorithmic Problem Solving (DSA)');
  const [detailLevel, setDetailLevel] = useState('Comprehensive (Concepts, Quizzes & Code)');
  const [validationRule, setValidationRule] = useState('Strict DAG (Cycle Validation)');

  const [editingItem, setEditingItem] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObj(file);
      setFileName(file.name);
      setSyllabusText(
        `Course Syllabus: ${file.name.replace(/\.[^/.]+$/, '')}\n\n` +
          `Module 1: Linear Sequence Structures & Buffers\n` +
          `- Topic 1: Arrays (Contiguous Memory Layout, O(1) Index Arithmetic, Geometric Doubling, Cache Locality)\n` +
          `- Topic 2: Strings (Byte Buffers, Substrings, In-Place Reversals, Sliding Window Paradigms)\n` +
          `- Topic 3: Stack (Last-In-First-Out Discipline, Activation Call Frames, Monotonic Stacks, Expression Parsing)\n\n` +
          `Module 2: Key-Value Mapping & Trees\n- Topic 4: Hash Tables & Open Addressing\n- Topic 5: Binary Search Trees`
      );
      toast.info(`Loaded ${file.name}`);
    }
  };

  const handleRunLLMExtraction = async () => {
    setIsExtracting(true);
    setExtractionProgress(10);
    setCurrentStepText('Document stream ingested. Parsing modules and candidate topics (Arrays, Strings, Stack)...');
    setPipelineLogs([
      '[01/05] Document stream ingested via in-memory stream buffer.',
      '[01/05] Identifying syllabus topic entities: Arrays, Strings, Stack...',
    ]);

    try {
      const result = await syllabusAiService.extractCurriculum({
        syllabusText,
        file: selectedFileObj,
        courseTitle: targetCourse,
        onProgress: (pct, msg) => {
          setExtractionProgress(pct);
          setCurrentStepText(msg);
          setPipelineLogs((prev) => [...prev, `[${Math.round(pct)}%] ${msg}`]);
        },
      });

      setExtractedData(result);
      setPublished(false);
      setPipelineLogs((prev) => [
        ...prev,
        `[COMPLETE] Extracted ${result.concepts.length} Topics (Text+Diagram+Example), ${result.quizzes.length} Quizzes (5 per topic), ${result.codingAssessments.length} Coding Challenges.`,
      ]);
      toast.success(
        `Curriculum extracted: ${result.concepts.length} Topics (Text+Diagram+Example), ${result.quizzes.length} Quizzes (5/topic), ${result.codingAssessments.length} Coding Challenges!`
      );
    } catch (err) {
      console.error('Curriculum extraction error:', err);
      toast.error('Failed to extract curriculum. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePublishCurriculum = async () => {
    if (!extractedData) return;
    try {
      await learningService.publishCurriculum(extractedData);
      setPublished(true);
      toast.success('Curriculum published! Concepts, 15 Quizzes, and Coding Assessments are now live in the student portal.');
    } catch (err) {
      console.error('Publish error:', err);
      toast.error('Failed to publish curriculum to student graph.');
    }
  };

  const toggleDiagramView = (conceptId) => {
    setDiagramViewMap((prev) => ({
      ...prev,
      [conceptId]: prev[conceptId] === 'ascii' ? 'visual' : 'ascii',
    }));
  };

  const reviewTabs = [
    { id: 'concepts', label: 'Topics & Content', count: extractedData?.concepts?.length || 3 },
    { id: 'quizzes', label: 'Quizzes (5 / Topic)', count: extractedData?.quizzes?.length || 15 },
    { id: 'coding', label: 'Coding Challenges', count: extractedData?.codingAssessments?.length || 3 },
  ];

  // Filter quizzes by topic if selected
  const filteredQuizzes = extractedData?.quizzes
    ? extractedData.quizzes.filter((q) => {
        if (quizTopicFilter === 'all') return true;
        return (q.conceptName || '').toLowerCase().includes(quizTopicFilter.toLowerCase());
      })
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Title & Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Syllabus & Upload</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Instructor Syllabus Ingestion Studio
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          Syllabus & Curriculum Upload Studio
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Ingest course syllabi (PDF or Text). For each topic (e.g. Arrays, Strings, Stack), the AI model synthesizes <strong>Proper Content (Text + Diagram + Example)</strong>, <strong>At least 5 Quizzes</strong>, and a <strong>Coding Assessment</strong>.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: '24px', alignItems: 'start' }}>
          {/* Left: Upload Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={activeUploadTab === 'text' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                onClick={() => setActiveUploadTab('text')}
              >
                <span>Paste Syllabus Text</span>
              </button>
              <button
                type="button"
                className={activeUploadTab === 'pdf' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                onClick={() => setActiveUploadTab('pdf')}
              >
                <FileText size={13} strokeWidth={1.5} />
                <span>Upload PDF / Document</span>
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Syllabus Text (DSA Topics: Arrays, Strings, Stack)
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', fontSize: '11.5px', color: 'var(--coral)', cursor: 'pointer', padding: 0 }}
                    onClick={() => setSyllabusText(SAMPLE_SYLLABUS_TEXT)}
                  >
                    Reset to DSA Sample
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-hairline)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                    background: 'var(--surface-muted)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: Extraction Configuration & Trigger */}
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
                <option value="CS201 Data Structures & Algorithmic Problem Solving (DSA)">
                  CS201 Data Structures & Algorithms (DSA)
                </option>
                <option value="CS301 Advanced Algorithms & Graph Invariants">
                  CS301 Advanced Algorithms
                </option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Generation Synthesis Depth
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                  Per-Topic Invariant Pipeline:
                </div>
                &bull; Content: Text + Visual/ASCII Diagram + Code Example<br />
                &bull; Assessment: At least 5 Quizzes + 1 Coding Challenge
              </div>
            </div>

            <button
              type="button"
              className="btn-coral-pill"
              onClick={handleRunLLMExtraction}
              disabled={isExtracting}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {isExtracting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  <span>Synthesizing Curriculum...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={1.5} />
                  <span>Extract & Synthesize Curriculum</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <Lock size={13} strokeWidth={1.5} color="var(--mastery-solid)" />
              <span>Connects to AI API Model with rich deterministic fallback.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extraction Terminal / Progress Monitor */}
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
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '12px',
              lineHeight: '1.6',
              maxHeight: '180px',
              overflowY: 'auto',
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
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Header & Publish Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
                Curriculum Review & Approval
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                Synthesized Curriculum: {extractedData.concepts.length} Topics &bull; {extractedData.quizzes.length} Quizzes &bull; {extractedData.codingAssessments.length} Coding Problems
              </h2>
            </div>

            <button
              type="button"
              className={published ? 'btn-ghost-pill' : 'btn-coral-pill'}
              onClick={handlePublishCurriculum}
              disabled={published}
              style={{
                background: published ? 'var(--mastery-solid-soft)' : undefined,
                color: published ? 'var(--mastery-solid)' : undefined,
                borderColor: published ? 'var(--success-border)' : undefined,
              }}
            >
              {published ? (
                <>
                  <Check size={15} strokeWidth={2.5} />
                  <span>Curriculum Live for Students</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} strokeWidth={1.5} />
                  <span>Approve & Publish to Student Graph</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>

          {/* Published Action Banner */}
          {published && (
            <div
              style={{
                background: 'var(--mastery-solid-soft)',
                border: '1px solid var(--success-border)',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="var(--mastery-solid)" strokeWidth={2} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--mastery-solid)' }}>
                    Published to Active Curriculum
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                    All 3 topics (Arrays, Strings, Stack), 15 quizzes, and coding challenges are now accessible to students.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-ghost-pill btn-compact"
                  onClick={() => navigate('/content/concepts')}
                >
                  <BookOpen size={13} strokeWidth={1.5} />
                  <span>Concept Map</span>
                </button>
                <button
                  type="button"
                  className="btn-ghost-pill btn-compact"
                  onClick={() => navigate('/content/quizzes')}
                >
                  <HelpCircle size={13} strokeWidth={1.5} />
                  <span>Quizzes ({extractedData.quizzes.length})</span>
                </button>
                <button
                  type="button"
                  className="btn-ghost-pill btn-compact"
                  onClick={() => navigate('/content/coding')}
                >
                  <Code2 size={13} strokeWidth={1.5} />
                  <span>Coding Sandbox</span>
                </button>
              </div>
            </div>
          )}

          {/* Review Tabs */}
          <PillTabs tabs={reviewTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

          {/* TAB 1: CONCEPTS & CONTENT (Text + Diagram + Example) */}
          {activeTab === 'concepts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Each topic contains <strong>Proper Technical Content (Text)</strong>, an <strong>Interactive Visual Diagram</strong>, and a <strong>Concrete Executable Example</strong>:
              </div>

              {extractedData.concepts.map((concept, idx) => {
                const isAscii = diagramViewMap[concept.id] === 'ascii';
                return (
                  <div
                    key={concept.id}
                    style={{
                      borderRadius: '18px',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-muted)',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <Chip variant="default" size="sm">{concept.module}</Chip>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Prerequisite: <strong>{concept.prerequisite}</strong>
                          </span>
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                          Topic {idx + 1}: {concept.name}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-ghost-pill btn-compact"
                          onClick={() => toggleDiagramView(concept.id)}
                        >
                          <Layers size={13} strokeWidth={1.5} />
                          <span>{isAscii ? 'Switch to Visual Diagram' : 'Switch to ASCII Memory Layout'}</span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn-circle"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => setEditingItem(concept)}
                          title="Edit Topic Content"
                        >
                          <Edit2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Complexity Badges */}
                    {concept.complexities && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-hairline)', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Time Complexity:</span>
                        {concept.complexities.access && <span><strong>Access:</strong> {concept.complexities.access} &bull;</span>}
                        {concept.complexities.search && <span><strong>Search:</strong> {concept.complexities.search} &bull;</span>}
                        {concept.complexities.insertion && <span><strong>Insert:</strong> {concept.complexities.insertion} &bull;</span>}
                        {concept.complexities.space && <span><strong>Space:</strong> {concept.complexities.space}</span>}
                      </div>
                    )}

                    {/* SECTION 1: PROPER TEXT CONTENT */}
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        1. Theoretical Text & Invariants
                      </div>
                      <div
                        style={{
                          padding: '16px',
                          background: 'var(--surface)',
                          borderRadius: '14px',
                          border: '1px solid var(--border-hairline)',
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: 'var(--text-main)',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '260px',
                          overflowY: 'auto',
                        }}
                      >
                        {concept.theory || concept.description}
                      </div>
                    </div>

                    {/* SECTION 2: PROPER DIAGRAM (Visual or ASCII) */}
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        2. Architectural Diagram ({isAscii ? 'Physical Memory Buffer' : 'Interactive Visual Model'})
                      </div>
                      {isAscii && concept.asciiDiagram ? (
                        <div
                          style={{
                            background: '#16161A',
                            color: '#00FF66',
                            padding: '16px',
                            borderRadius: '14px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '12px',
                            lineHeight: '1.4',
                            overflowX: 'auto',
                            whiteSpace: 'pre',
                          }}
                        >
                          {concept.asciiDiagram}
                        </div>
                      ) : (
                        <ConceptDiagram conceptName={concept.name} />
                      )}
                    </div>

                    {/* SECTION 3: PROPER CODE EXAMPLE */}
                    {concept.example && (
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                          3. Executable Code Implementation & Concrete Example
                        </div>
                        <div
                          style={{
                            background: '#16161A',
                            color: '#ECEAE8',
                            borderRadius: '14px',
                            padding: '16px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            overflowX: 'auto',
                            maxHeight: '280px',
                            overflowY: 'auto',
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: 'pre' }}>{concept.example}</pre>
                        </div>
                      </div>
                    )}

                    {/* Learning Objectives */}
                    {concept.learningObjectives?.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '12px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        <strong>Curriculum Objectives:</strong>
                        <ul style={{ paddingLeft: '18px', marginTop: '4px', margin: 0 }}>
                          {concept.learningObjectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: QUIZZES (At least 5 Quizzes per Topic) */}
          {activeTab === 'quizzes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={quizTopicFilter === 'all' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                    onClick={() => setQuizTopicFilter('all')}
                  >
                    All Quizzes ({extractedData.quizzes.length})
                  </button>
                  <button
                    type="button"
                    className={quizTopicFilter === 'array' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                    onClick={() => setQuizTopicFilter('array')}
                  >
                    Arrays (5 Questions)
                  </button>
                  <button
                    type="button"
                    className={quizTopicFilter === 'string' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                    onClick={() => setQuizTopicFilter('string')}
                  >
                    Strings (5 Questions)
                  </button>
                  <button
                    type="button"
                    className={quizTopicFilter === 'stack' ? 'btn-coral-pill btn-compact' : 'btn-ghost-pill btn-compact'}
                    onClick={() => setQuizTopicFilter('stack')}
                  >
                    Stack (5 Questions)
                  </button>
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredQuizzes.length}</strong> Bloom-aligned quiz items
                </div>
              </div>

              {/* Quiz Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredQuizzes.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Chip variant="default" size="sm">Topic: {q.conceptName}</Chip>
                        <Chip variant="warning" size="sm">{q.title || `Item #${idx + 1}`}</Chip>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        Item ID: {q.id}
                      </span>
                    </div>

                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {q.prompt}
                    </div>

                    {/* Options Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === q.correctIndex;
                        return (
                          <div
                            key={optIdx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: isCorrect ? 'var(--mastery-solid-soft)' : 'var(--surface)',
                              border: isCorrect ? '1.5px solid var(--success-border)' : '1px solid var(--border-hairline)',
                              fontSize: '13px',
                              fontWeight: isCorrect ? 600 : 400,
                              color: isCorrect ? 'var(--mastery-solid)' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>
                              <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                            </span>
                            {isCorrect && (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--mastery-solid)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={13} strokeWidth={2.5} />
                                Correct Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div
                        style={{
                          marginTop: '4px',
                          padding: '10px 14px',
                          background: 'var(--surface)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-hairline)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.5',
                        }}
                      >
                        <strong style={{ color: 'var(--text-main)' }}>Pedagogical Rationale:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CODING ASSESSMENTS (1 per Topic) */}
          {activeTab === 'coding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Each topic has a <strong>Proper Coding Assessment</strong> with starter code, constraints, unit test suites, and AI Viva interview prompts:
              </div>

              {extractedData.codingAssessments.map((ca, idx) => (
                <div
                  key={ca.id || idx}
                  style={{
                    padding: '22px',
                    borderRadius: '18px',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <Chip variant="default" size="sm">Topic: {ca.conceptName}</Chip>
                        <Chip variant="warning" size="sm">{ca.difficulty}</Chip>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Time Limit: 45 mins
                        </span>
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                        {ca.title}
                      </h3>
                    </div>

                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      Assessment ID: {ca.id}
                    </span>
                  </div>

                  <p style={{ fontSize: '13.5px', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                    {ca.description}
                  </p>

                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', padding: '10px 14px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-hairline)' }}>
                    <strong>Algorithmic Constraints:</strong> {ca.constraints}
                  </div>

                  {/* Starter Code */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Starter Scaffold (Python 3 / Sandbox)
                    </div>
                    <div style={{ padding: '14px 16px', background: '#16161A', color: '#ECEAE8', borderRadius: '12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre' }}>{ca.starterCode}</pre>
                    </div>
                  </div>

                  {/* Sample Tests */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Public Test Suite & Invariant Assertions
                    </div>
                    <div style={{ padding: '12px 14px', background: '#1E1E24', color: '#7EE787', borderRadius: '12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre' }}>
                        {ca.sampleTests && Array.isArray(ca.sampleTests)
                          ? ca.sampleTests.map((t, ti) => `# Test Case ${ti + 1}:\n# Input: ${t.input} -> Expected: ${t.expected}`).join('\n\n')
                          : 'assert solution.solve(input) == expected'}
                      </pre>
                    </div>
                  </div>

                  {/* Viva Prompt */}
                  {ca.vivaQuestion && (
                    <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '10px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--coral)' }}>AI Viva Oral Defense Prompt:</strong> "{ca.vivaQuestion}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Concept Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div
            className="modal-dialog-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', borderRadius: '20px', border: '1px solid var(--border-hairline)' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Edit Topic Definition & Theory
              </h2>
              <button type="button" onClick={() => setEditingItem(null)} className="icon-btn-circle" style={{ width: '30px', height: '30px' }}>
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Topic Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-hairline)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Theory & Text</label>
                <textarea
                  rows={6}
                  value={editingItem.theory || editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, theory: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-hairline)', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
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
                  toast.success('Topic definition saved');
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
